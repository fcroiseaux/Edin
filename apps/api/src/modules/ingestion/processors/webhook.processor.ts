import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job, Queue } from 'bullmq';
import type { ContributionType } from '../../../../generated/prisma/client/enums.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

export interface WebhookJobData {
  eventType: string;
  repositoryFullName: string;
  payload: Record<string, unknown>;
  deliveryId: string;
}

interface ExtractedCommit {
  sha: string;
  authorGithubId: number | null;
  authorUsername: string | null;
  authorEmail: string | null;
  message: string;
  timestamp: string;
  filesAdded: string[];
  filesRemoved: string[];
  filesModified: string[];
  additions: number;
  deletions: number;
}

interface ExtractedPullRequest {
  number: number;
  title: string;
  body: string | null;
  authorGithubId: number | null;
  state: string;
  requestedReviewers: string[];
  merged: boolean;
  mergeCommitSha: string | null;
  headRef: string;
  baseRef: string;
  linkedIssues: string[];
}

interface ExtractedReview {
  reviewId: number;
  reviewerGithubId: number | null;
  body: string | null;
  state: string;
  submittedAt: string;
  prNumber: number;
}

interface NormalizedContribution {
  contributorId: string | null;
  repositoryId: string;
  source: 'GITHUB';
  sourceRef: string;
  contributionType: ContributionType;
  title: string;
  description: string | null;
  rawData: Record<string, unknown>;
}

const STALE_PROCESSING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

@Processor('github-ingestion')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('github-ingestion-dlq')
    private readonly githubIngestionDlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { eventType, repositoryFullName, payload, deliveryId } = job.data;

    this.logger.log('Processing webhook event', {
      jobId: job.id,
      eventType,
      repository: repositoryFullName,
      deliveryId,
    });

    // Idempotency check (Task 5)
    const repository = await this.prisma.monitoredRepository.findUnique({
      where: { fullName: repositoryFullName },
    });

    if (!repository) {
      this.logger.warn('Repository not found for webhook, skipping', {
        repositoryFullName,
        deliveryId,
      });
      return;
    }

    const existingDelivery = await this.prisma.webhookDelivery.findUnique({
      where: { deliveryId },
    });

    if (existingDelivery) {
      if (existingDelivery.status === 'COMPLETED') {
        this.logger.log('Duplicate webhook delivery, skipping', { deliveryId });
        return;
      }

      if (existingDelivery.status === 'PROCESSING') {
        const age = Date.now() - existingDelivery.createdAt.getTime();
        if (age < STALE_PROCESSING_THRESHOLD_MS) {
          this.logger.log('Webhook delivery already processing, skipping', { deliveryId });
          return;
        }
        this.logger.warn('Stale webhook delivery detected, reprocessing', {
          deliveryId,
          ageMs: age,
        });
      }
    }

    // Record delivery as PROCESSING (Task 5.2)
    await this.prisma.webhookDelivery.upsert({
      where: { deliveryId },
      create: {
        deliveryId,
        repositoryId: repository.id,
        eventType,
        status: 'PROCESSING',
        payload: payload as object,
      },
      update: {
        status: 'PROCESSING',
      },
    });

    try {
      // Extract and normalize based on event type (Tasks 3, 4)
      const contributions = await this.processEvent(eventType, payload, repository.id, deliveryId);

      if (contributions.length === 0) {
        this.logger.log('No contributions extracted from webhook', {
          eventType,
          deliveryId,
        });
      } else {
        // Persist contributions in transaction (Task 4.5)
        const persistedContributions = await this.persistContributions(contributions, deliveryId);

        // Emit domain events (Task 4.6)
        for (const contribution of persistedContributions) {
          this.eventEmitter.emit(
            `contribution.${this.eventName(contribution.contributionType)}.ingested`,
            {
              contributionId: contribution.id,
              contributionType: contribution.contributionType,
              contributorId: contribution.contributorId,
              repositoryId: contribution.repositoryId,
              correlationId: deliveryId,
            },
          );
        }
      }

      if (contributions.length === 0) {
        await this.prisma.webhookDelivery.update({
          where: { deliveryId },
          data: { status: 'COMPLETED', processedAt: new Date() },
        });
      }

      this.logger.log('Webhook processing completed', {
        eventType,
        deliveryId,
        contributionsCreated: contributions.length,
      });
    } catch (error) {
      // Check if this is a rate limit error (Task 6)
      if (this.isRateLimitError(error)) {
        const resetTime = this.extractRateLimitResetTime(error);
        if (resetTime) {
          const delayMs = Math.max(resetTime * 1000 - Date.now(), 1000);
          this.logger.warn('GitHub API rate limit hit, delaying job', {
            deliveryId,
            resetTime: new Date(resetTime * 1000).toISOString(),
            delayMs,
          });
          await job.moveToDelayed(Date.now() + delayMs);
          return;
        }
      }

      // Check if this is the final attempt (Task 7)
      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts || 3;

      if (attemptsMade >= maxAttempts) {
        // Final attempt failed — mark as FAILED (Task 5.4)
        await this.prisma.webhookDelivery.update({
          where: { deliveryId },
          data: { status: 'FAILED' },
        });

        await this.githubIngestionDlqQueue.add(
          'dead-letter-webhook',
          {
            ...job.data,
            failedAt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        this.logger.warn('Webhook processing failed after all retries', {
          deliveryId,
          eventType,
          jobId: job.id,
          attempts: attemptsMade,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        this.logger.warn('Webhook processing attempt failed, will retry', {
          deliveryId,
          eventType,
          jobId: job.id,
          attempt: attemptsMade,
          maxAttempts,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      throw error;
    }
  }

  private async processEvent(
    eventType: string,
    payload: Record<string, unknown>,
    repositoryId: string,
    deliveryId: string,
  ): Promise<NormalizedContribution[]> {
    switch (eventType) {
      case 'push':
        return this.processPushEvent(payload, repositoryId, deliveryId);
      case 'pull_request':
        return this.processPullRequestEvent(payload, repositoryId, deliveryId);
      case 'pull_request_review':
        return this.processPullRequestReviewEvent(payload, repositoryId, deliveryId);
      default:
        this.logger.log('Unsupported webhook event type, skipping', {
          eventType,
          deliveryId,
        });
        return [];
    }
  }

  // Task 3.2: Push event handler
  private async processPushEvent(
    payload: Record<string, unknown>,
    repositoryId: string,
    deliveryId: string,
  ): Promise<NormalizedContribution[]> {
    const commits = payload.commits as Array<Record<string, unknown>> | undefined;
    if (!commits || !Array.isArray(commits)) {
      this.logger.warn('Push event has no commits array', { deliveryId });
      return [];
    }

    const contributions: NormalizedContribution[] = [];

    for (const commit of commits) {
      try {
        const extracted = this.extractCommit(commit, payload);
        const contributorId = await this.resolveContributor(extracted.authorGithubId, deliveryId);

        // Task 4.2: Map commit to Contribution
        const firstLine = extracted.message.split('\n')[0] || extracted.message;
        contributions.push({
          contributorId,
          repositoryId,
          source: 'GITHUB',
          sourceRef: extracted.sha,
          contributionType: 'COMMIT',
          title: firstLine.substring(0, 255),
          description: extracted.message,
          rawData: {
            ...commit,
            extracted: {
              sha: extracted.sha,
              authorGithubId: extracted.authorGithubId,
              authorUsername: extracted.authorUsername,
              authorEmail: extracted.authorEmail,
              timestamp: extracted.timestamp,
              filesChanged: {
                added: extracted.filesAdded,
                removed: extracted.filesRemoved,
                modified: extracted.filesModified,
              },
              additions: extracted.additions,
              deletions: extracted.deletions,
            },
          },
        });
      } catch (error) {
        this.logger.warn('Failed to process commit in push event', {
          deliveryId,
          commitSha: (commit.id as string) || 'unknown',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return contributions;
  }

  // Task 3.3: Pull request event handler
  private async processPullRequestEvent(
    payload: Record<string, unknown>,
    repositoryId: string,
    deliveryId: string,
  ): Promise<NormalizedContribution[]> {
    const pr = payload.pull_request as Record<string, unknown> | undefined;
    if (!pr) {
      this.logger.warn('pull_request event missing pull_request object', { deliveryId });
      return [];
    }

    try {
      const extracted = this.extractPullRequest(pr);
      const contributorId = await this.resolveContributor(extracted.authorGithubId, deliveryId);

      // Task 4.3: Map PR to Contribution
      return [
        {
          contributorId,
          repositoryId,
          source: 'GITHUB',
          sourceRef: String(extracted.number),
          contributionType: 'PULL_REQUEST',
          title: extracted.title.substring(0, 255),
          description: extracted.body,
          rawData: pr,
        },
      ];
    } catch (error) {
      this.logger.warn('Failed to process pull request event', {
        deliveryId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  // Task 3.4: Pull request review event handler
  private async processPullRequestReviewEvent(
    payload: Record<string, unknown>,
    repositoryId: string,
    deliveryId: string,
  ): Promise<NormalizedContribution[]> {
    const review = payload.review as Record<string, unknown> | undefined;
    if (!review) {
      this.logger.warn('pull_request_review event missing review object', { deliveryId });
      return [];
    }

    try {
      const extracted = this.extractReview(review, payload);
      const contributorId = await this.resolveContributor(extracted.reviewerGithubId, deliveryId);

      // Task 4.4: Map review to Contribution
      return [
        {
          contributorId,
          repositoryId,
          source: 'GITHUB',
          sourceRef: `review-${extracted.reviewId}`,
          contributionType: 'CODE_REVIEW',
          title: `Review on PR #${extracted.prNumber}: ${extracted.state}`.substring(0, 255),
          description: extracted.body,
          rawData: review,
        },
      ];
    } catch (error) {
      this.logger.warn('Failed to process pull request review event', {
        deliveryId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  // Task 3.2: Extract commit details
  private extractCommit(
    commit: Record<string, unknown>,
    pushPayload: Record<string, unknown>,
  ): ExtractedCommit {
    const author = commit.author as Record<string, unknown> | undefined;
    const sender = pushPayload.sender as Record<string, unknown> | undefined;

    return {
      sha: (commit.id as string) || '',
      authorGithubId: sender?.id != null ? Number(sender.id) : null,
      authorUsername: (sender?.login as string) || null,
      authorEmail: (author?.email as string) || null,
      message: (commit.message as string) || '',
      timestamp: (commit.timestamp as string) || new Date().toISOString(),
      filesAdded: (commit.added as string[]) || [],
      filesRemoved: (commit.removed as string[]) || [],
      filesModified: (commit.modified as string[]) || [],
      additions: Array.isArray(commit.added) ? commit.added.length : 0,
      deletions: Array.isArray(commit.removed) ? commit.removed.length : 0,
    };
  }

  // Task 3.3: Extract pull request details
  private extractPullRequest(pr: Record<string, unknown>): ExtractedPullRequest {
    const user = pr.user as Record<string, unknown> | undefined;
    const head = pr.head as Record<string, unknown> | undefined;
    const base = pr.base as Record<string, unknown> | undefined;
    const requestedReviewers = pr.requested_reviewers as Array<Record<string, unknown>> | undefined;

    // Extract linked issues from PR body
    const body = (pr.body as string) || '';
    const linkedIssues: string[] = [];
    const issuePattern = /#(\d+)/g;
    let match;
    while ((match = issuePattern.exec(body)) !== null) {
      linkedIssues.push(match[1]);
    }

    return {
      number: (pr.number as number) || 0,
      title: (pr.title as string) || '',
      body: body || null,
      authorGithubId: user?.id != null ? Number(user.id) : null,
      state: (pr.state as string) || '',
      requestedReviewers: requestedReviewers?.map((r) => (r.login as string) || '') || [],
      merged: Boolean(pr.merged),
      mergeCommitSha: (pr.merge_commit_sha as string) || null,
      headRef: (head?.ref as string) || '',
      baseRef: (base?.ref as string) || '',
      linkedIssues,
    };
  }

  // Task 3.4: Extract review details
  private extractReview(
    review: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): ExtractedReview {
    const user = review.user as Record<string, unknown> | undefined;
    const pr = payload.pull_request as Record<string, unknown> | undefined;

    return {
      reviewId: (review.id as number) || 0,
      reviewerGithubId: user?.id != null ? Number(user.id) : null,
      body: (review.body as string) || null,
      state: (review.state as string) || '',
      submittedAt: (review.submitted_at as string) || new Date().toISOString(),
      prNumber: (pr?.number as number) || 0,
    };
  }

  // Task 3.5: Resolve GitHub user to Contributor ID
  private async resolveContributor(
    githubId: number | null,
    deliveryId: string,
  ): Promise<string | null> {
    if (githubId == null) {
      return null;
    }

    const contributor = await this.prisma.contributor.findUnique({
      where: { githubId },
      select: { id: true },
    });

    if (!contributor) {
      this.logger.warn('Contributor not found for GitHub user, storing with null contributorId', {
        githubId,
        deliveryId,
      });
      return null;
    }

    return contributor.id;
  }

  // Task 4.5: Persist contributions in batch within transaction
  private async persistContributions(
    contributions: NormalizedContribution[],
    deliveryId: string,
  ): Promise<Array<NormalizedContribution & { id: string }>> {
    const persistedContributions = await this.prisma.$transaction(async (tx) => {
      const persistedContributions: Array<NormalizedContribution & { id: string }> = [];

      for (const contribution of contributions) {
        const persistedContribution = await tx.contribution.upsert({
          where: {
            source_repositoryId_sourceRef: {
              source: contribution.source,
              repositoryId: contribution.repositoryId,
              sourceRef: contribution.sourceRef,
            },
          },
          create: {
            contributorId: contribution.contributorId,
            repositoryId: contribution.repositoryId,
            source: contribution.source,
            sourceRef: contribution.sourceRef,
            contributionType: contribution.contributionType,
            title: contribution.title,
            description: contribution.description,
            rawData: contribution.rawData as object,
            status: 'INGESTED',
          },
          update: {
            contributorId: contribution.contributorId,
            title: contribution.title,
            description: contribution.description,
            rawData: contribution.rawData as object,
            normalizedAt: new Date(),
          },
        });

        persistedContributions.push({
          ...contribution,
          id: persistedContribution.id,
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'contribution.batch.ingested',
          entityType: 'Contribution',
          entityId: deliveryId,
          details: {
            count: contributions.length,
            types: contributions.map((c) => c.contributionType),
          },
          correlationId: deliveryId,
        },
      });

      await tx.webhookDelivery.update({
        where: { deliveryId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      });

      return persistedContributions;
    });

    this.logger.log('Contributions persisted', {
      count: contributions.length,
      deliveryId,
    });

    return persistedContributions;
  }

  // Task 6: Rate limit detection
  private isRateLimitError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
      return (error as { status: number }).status === 429;
    }
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response: { status?: number } }).response;
      return response?.status === 429;
    }
    return false;
  }

  // Task 6.2: Extract rate limit reset time
  private extractRateLimitResetTime(error: unknown): number | null {
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response: { headers?: Record<string, string> } }).response;
      const resetHeader = response?.headers?.['x-ratelimit-reset'];
      if (resetHeader) {
        return Number(resetHeader);
      }
    }
    return null;
  }

  private eventName(type: ContributionType): string {
    switch (type) {
      case 'COMMIT':
        return 'commit';
      case 'PULL_REQUEST':
        return 'pull_request';
      case 'CODE_REVIEW':
        return 'review';
    }
  }
}
