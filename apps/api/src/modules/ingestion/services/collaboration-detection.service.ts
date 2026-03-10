import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { GitHubApiService } from '../github-api.service.js';
import type { ContributionIngestedEvent } from '@edin/shared';
import type { CollaborationRole } from '../../../../generated/prisma/client/enums.js';

interface DetectedCollaborator {
  contributorId: string;
  role: CollaborationRole;
  detectionSource: string;
}

const CO_AUTHOR_REGEX = /Co-authored-by:\s*(.+?)\s*<(.+?)>/gi;
const ATTRIBUTION_METRICS_KEY = 'ingestion:collaboration-attribution-metrics';

@Injectable()
export class CollaborationDetectionService {
  private readonly logger = new Logger(CollaborationDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
    private readonly githubApiService: GitHubApiService,
  ) {}

  @OnEvent('contribution.*.ingested')
  async handleContributionIngested(event: ContributionIngestedEvent): Promise<void> {
    this.logger.log('Collaboration detection triggered', {
      contributionId: event.contributionId,
      contributionType: event.contributionType,
      correlationId: event.correlationId,
    });

    if (!event.contributionId) {
      return;
    }

    await this.detectCollaborators(event.contributionId, event.correlationId);
  }

  async detectCollaborators(contributionId: string, correlationId: string): Promise<void> {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      select: {
        id: true,
        contributorId: true,
        contributionType: true,
        rawData: true,
      },
    });

    if (!contribution) {
      this.logger.warn('Contribution not found for collaboration detection', {
        contributionId,
        correlationId,
      });
      return;
    }

    // Skip code reviews — reviews are individual
    if (contribution.contributionType === 'CODE_REVIEW') {
      this.logger.debug('Skipping collaboration detection for code review', {
        contributionId,
        correlationId,
      });
      return;
    }

    const rawData = contribution.rawData as Record<string, unknown>;
    const extracted = rawData?.extracted as Record<string, unknown> | undefined;
    const detectedCollaborators: DetectedCollaborator[] = [];

    if (contribution.contributionType === 'PULL_REQUEST') {
      // 1. Extract co-author trailers from PR body
      const body = (extracted?.body as string) || (rawData?.body as string) || '';
      const coAuthorsFromBody = await this.parseCoAuthors(body, correlationId);
      detectedCollaborators.push(...coAuthorsFromBody);

      // 2. Extract co-authors from commits if available
      const coAuthors = extracted?.coAuthors as Array<{ name: string; email: string }> | undefined;
      if (coAuthors && Array.isArray(coAuthors)) {
        for (const coAuthor of coAuthors) {
          const resolved = await this.resolveCollaborator(
            null,
            null,
            coAuthor.email,
            correlationId,
          );
          if (resolved && !detectedCollaborators.some((d) => d.contributorId === resolved)) {
            detectedCollaborators.push({
              contributorId: resolved,
              role: 'CO_AUTHOR',
              detectionSource: 'CO_AUTHOR_TRAILER',
            });
          }
        }
      }

      const commits = extracted?.commits as Array<{ message?: string | null }> | undefined;
      if (commits && Array.isArray(commits)) {
        for (const commit of commits) {
          const commitCoAuthors = await this.parseCoAuthors(commit.message ?? '', correlationId);
          for (const collaborator of commitCoAuthors) {
            if (
              !detectedCollaborators.some((d) => d.contributorId === collaborator.contributorId)
            ) {
              detectedCollaborators.push(collaborator);
            }
          }
        }
      }

      // 3. Detect multiple committers
      const commitAuthors = extracted?.commitAuthors as
        | Array<{ githubId: number; username: string; email?: string }>
        | undefined;
      if (commitAuthors && Array.isArray(commitAuthors)) {
        for (const author of commitAuthors) {
          const resolved = await this.resolveCollaborator(
            author.githubId,
            author.username,
            author.email || null,
            correlationId,
          );
          if (resolved && !detectedCollaborators.some((d) => d.contributorId === resolved)) {
            detectedCollaborators.push({
              contributorId: resolved,
              role: 'COMMITTER',
              detectionSource: 'PR_COMMITTER',
            });
          }
        }
      }

      // 4. Extract linked issue assignees
      const linkedIssues = extracted?.linkedIssues as string[] | undefined;
      if (linkedIssues && linkedIssues.length > 0) {
        const repoFullName = await this.getRepositoryFullName(contribution.id);
        if (repoFullName) {
          const [owner, repo] = repoFullName.split('/');
          for (const issueNumber of linkedIssues) {
            const assignees = await this.fetchIssueAssignees(
              owner,
              repo,
              Number(issueNumber),
              correlationId,
            );
            for (const assignee of assignees) {
              if (!detectedCollaborators.some((d) => d.contributorId === assignee)) {
                detectedCollaborators.push({
                  contributorId: assignee,
                  role: 'ISSUE_ASSIGNEE',
                  detectionSource: 'ISSUE_ASSIGNEE',
                });
              }
            }
          }
        }
      }
    } else if (contribution.contributionType === 'COMMIT') {
      // Parse commit message for Co-authored-by trailers
      const message = (extracted?.message as string) || (rawData?.message as string) || '';
      const coAuthors = await this.parseCoAuthors(message, correlationId);
      detectedCollaborators.push(...coAuthors);
    }

    // Filter out the primary contributor
    const primaryContributorId = contribution.contributorId;
    const externalCollaborators = detectedCollaborators.filter(
      (d) => d.contributorId !== primaryContributorId,
    );

    if (externalCollaborators.length === 0) {
      this.logger.debug('No collaborators detected', { contributionId, correlationId });
      return;
    }

    if (!primaryContributorId) {
      this.logger.debug('No primary contributor to create collaboration records for', {
        contributionId,
        correlationId,
      });
      return;
    }

    await this.createCollaborationRecords(
      contributionId,
      primaryContributorId,
      externalCollaborators,
      contribution.contributionType,
      correlationId,
    );
  }

  async createCollaborationRecords(
    contributionId: string,
    primaryContributorId: string,
    detectedCollaborators: DetectedCollaborator[],
    contributionType: 'COMMIT' | 'PULL_REQUEST' | 'CODE_REVIEW' | 'DOCUMENTATION',
    correlationId: string,
  ): Promise<void> {
    const totalParticipants = 1 + detectedCollaborators.length;
    const splitPercentage = Math.round((100 / totalParticipants) * 100) / 100;

    await this.prisma.$transaction(async (tx) => {
      // Create record for primary author
      await tx.contributionCollaboration.upsert({
        where: {
          contributionId_contributorId_isCurrent: {
            contributionId,
            contributorId: primaryContributorId,
            isCurrent: true,
          },
        },
        create: {
          contributionId,
          contributorId: primaryContributorId,
          role: 'PRIMARY_AUTHOR',
          splitPercentage,
          status: 'DETECTED',
          detectionSource: 'PR_COMMITTER',
        },
        update: {},
      });

      // Create records for each collaborator
      for (const collaborator of detectedCollaborators) {
        await tx.contributionCollaboration.upsert({
          where: {
            contributionId_contributorId_isCurrent: {
              contributionId,
              contributorId: collaborator.contributorId,
              isCurrent: true,
            },
          },
          create: {
            contributionId,
            contributorId: collaborator.contributorId,
            role: collaborator.role,
            splitPercentage,
            status: 'DETECTED',
            detectionSource: collaborator.detectionSource,
          },
          update: {},
        });
      }

      // Create audit log
      await this.auditService.log(
        {
          actorId: null,
          action: 'contribution.collaboration.detected',
          entityType: 'ContributionCollaboration',
          entityId: contributionId,
          details: {
            primaryContributorId,
            collaborators: detectedCollaborators.map((c) => ({
              contributorId: c.contributorId,
              role: c.role,
            })),
            splitPercentage,
          },
          correlationId,
        },
        tx,
      );
    });

    this.logger.log('Collaboration records created', {
      contributionId,
      contributionType,
      collaboratorCount: detectedCollaborators.length,
      splitPercentage,
      correlationId,
    });

    await this.updateAttributionMetrics(correlationId);

    // Emit domain event
    this.eventEmitter.emit('contribution.collaboration.detected', {
      contributionId,
      collaborators: detectedCollaborators.map((c) => ({
        contributorId: c.contributorId,
        role: c.role,
      })),
      correlationId,
    });

    // Publish SSE events to each collaborator
    const allContributorIds = [
      primaryContributorId,
      ...detectedCollaborators.map((c) => c.contributorId),
    ];

    for (const contributorId of allContributorIds) {
      const channel = `contributions:contributor:${contributorId}`;
      await this.redisService.publish(
        channel,
        JSON.stringify({
          type: 'contribution.collaboration.detected',
          contributionId,
          contributionType,
        }),
      );
    }
  }

  private async parseCoAuthors(
    text: string,
    correlationId: string,
  ): Promise<DetectedCollaborator[]> {
    const collaborators: DetectedCollaborator[] = [];
    const regex = new RegExp(CO_AUTHOR_REGEX.source, CO_AUTHOR_REGEX.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const email = match[2];
      const resolved = await this.resolveCollaborator(null, null, email, correlationId);
      if (resolved && !collaborators.some((c) => c.contributorId === resolved)) {
        collaborators.push({
          contributorId: resolved,
          role: 'CO_AUTHOR',
          detectionSource: 'CO_AUTHOR_TRAILER',
        });
      }
    }

    return collaborators;
  }

  private async resolveCollaborator(
    githubId: number | null,
    username: string | null,
    email: string | null,
    correlationId: string,
  ): Promise<string | null> {
    // Try GitHub ID first
    if (githubId != null) {
      const contributor = await this.prisma.contributor.findUnique({
        where: { githubId },
        select: { id: true },
      });
      if (contributor) return contributor.id;
    }

    // Try GitHub username
    if (username) {
      const contributor = await this.prisma.contributor.findUnique({
        where: { githubUsername: username },
        select: { id: true },
      });
      if (contributor) return contributor.id;
    }

    // Try email
    if (email) {
      const contributor = await this.prisma.contributor.findUnique({
        where: { email },
        select: { id: true },
      });
      if (contributor) return contributor.id;
    }

    this.logger.debug('Collaborator not a registered contributor, skipping', {
      githubId,
      username,
      email,
      correlationId,
    });
    return null;
  }

  private async getRepositoryFullName(contributionId: string): Promise<string | null> {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      select: {
        repository: {
          select: { fullName: true },
        },
      },
    });
    return contribution?.repository.fullName ?? null;
  }

  private async fetchIssueAssignees(
    owner: string,
    repo: string,
    issueNumber: number,
    correlationId: string,
  ): Promise<string[]> {
    try {
      const response = await this.githubApiService.getIssue(owner, repo, issueNumber);
      const assignees: string[] = [];

      if (response?.assignees) {
        for (const assignee of response.assignees) {
          if (assignee.githubId) {
            const resolved = await this.resolveCollaborator(
              assignee.githubId,
              assignee.username,
              null,
              correlationId,
            );
            if (resolved) {
              assignees.push(resolved);
            }
          }
        }
      }

      return assignees;
    } catch (error) {
      this.logger.warn('Failed to fetch issue assignees', {
        owner,
        repo,
        issueNumber,
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async updateAttributionMetrics(correlationId: string): Promise<void> {
    const [totalDetected, totalOverridden] = await Promise.all([
      this.prisma.contribution.count({
        where: {
          collaborations: {
            some: { isCurrent: true },
          },
        },
      }),
      this.prisma.contribution.count({
        where: {
          collaborations: {
            some: { isCurrent: true, status: 'OVERRIDDEN' },
          },
        },
      }),
    ]);

    const overrideRate =
      totalDetected === 0 ? 0 : Number(((totalOverridden / totalDetected) * 100).toFixed(2));

    await this.redisService.set(
      ATTRIBUTION_METRICS_KEY,
      {
        totalDetected,
        totalOverridden,
        overrideRate,
        acceptanceRate: Number((100 - overrideRate).toFixed(2)),
        updatedAt: new Date().toISOString(),
      },
      60 * 60,
    );

    this.logger.debug('Updated collaboration attribution metrics', {
      totalDetected,
      totalOverridden,
      overrideRate,
      correlationId,
    });
  }
}
