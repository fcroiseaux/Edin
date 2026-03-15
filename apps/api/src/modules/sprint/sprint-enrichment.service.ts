import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ZenhubPollCompletedEvent,
  ContributionEnrichedEvent,
  ContributionSprintContextDto,
} from '@edin/shared';
import type { ContributionSprintContext } from '../../../generated/prisma/client/client.js';

@Injectable()
export class SprintEnrichmentService {
  private readonly logger = new Logger(SprintEnrichmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Enrich a single contribution with sprint context.
   * Uses upsert — safe to call multiple times (AC4).
   * Verifies contribution exists before creating context (architecture rule).
   * Returns null if contribution not found (AC5 — enrichment is optional).
   */
  async enrichContribution(data: {
    contributionId: string;
    sprintId: string;
    storyPoints?: number;
    zenhubIssueId: string;
    epicId?: string;
    pipelineStatus?: string;
    correlationId?: string;
  }): Promise<ContributionSprintContext | null> {
    // Verify contribution exists in core.contributions
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: data.contributionId },
    });

    if (!contribution) {
      this.logger.debug({
        msg: 'Contribution not found, skipping enrichment',
        contributionId: data.contributionId,
        correlationId: data.correlationId,
      });
      return null;
    }

    const context = await this.prisma.contributionSprintContext.upsert({
      where: {
        contributionId_sprintId: {
          contributionId: data.contributionId,
          sprintId: data.sprintId,
        },
      },
      update: {
        storyPoints: data.storyPoints ?? null,
        zenhubIssueId: data.zenhubIssueId,
        epicId: data.epicId ?? null,
        pipelineStatus: data.pipelineStatus ?? null,
      },
      create: {
        contributionId: data.contributionId,
        sprintId: data.sprintId,
        storyPoints: data.storyPoints ?? null,
        zenhubIssueId: data.zenhubIssueId,
        epicId: data.epicId ?? null,
        pipelineStatus: data.pipelineStatus ?? null,
      },
    });

    const event: ContributionEnrichedEvent = {
      eventType: 'sprint.contribution.enriched',
      timestamp: new Date().toISOString(),
      correlationId: data.correlationId ?? '',
      payload: {
        contributionId: data.contributionId,
        sprintId: data.sprintId,
        zenhubIssueId: data.zenhubIssueId,
        storyPoints: data.storyPoints ?? null,
        epicId: data.epicId ?? null,
        pipelineStatus: data.pipelineStatus ?? null,
      },
    };
    this.eventEmitter.emit('sprint.contribution.enriched', event);

    this.logger.log({
      msg: 'Contribution enriched with sprint context',
      contributionId: data.contributionId,
      sprintId: data.sprintId,
      zenhubIssueId: data.zenhubIssueId,
      correlationId: data.correlationId,
    });

    return context;
  }

  /**
   * Batch enrich contributions for a sprint.
   * Maps Zenhub issues to contributions via issue number matching in sourceRef.
   */
  async enrichSprintContributions(data: {
    sprintId: string;
    issues: Array<{
      zenhubIssueId: string;
      issueNumber: number;
      storyPoints?: number;
      epicId?: string;
      pipelineStatus?: string;
    }>;
    correlationId?: string;
  }): Promise<{ enriched: number; skipped: number }> {
    let enriched = 0;
    let skipped = 0;

    for (const issue of data.issues) {
      try {
        // Find contributions linked to this issue number.
        // Contributions have sourceRef containing PR numbers (e.g., "pull/42")
        // or titles referencing issues (e.g., "Fix #42 — improve auth flow").
        // Use endsWith for sourceRef to avoid partial matches (e.g., "pull/142" matching issue #42).
        const issueNum = String(issue.issueNumber);
        const contributions = await this.prisma.contribution.findMany({
          where: {
            OR: [
              { sourceRef: { endsWith: `/${issueNum}` } },
              { title: { contains: `#${issueNum} ` } },
              { title: { endsWith: `#${issueNum}` } },
            ],
          },
          select: { id: true },
        });

        if (contributions.length === 0) {
          skipped++;
          continue;
        }

        for (const contribution of contributions) {
          const result = await this.enrichContribution({
            contributionId: contribution.id,
            sprintId: data.sprintId,
            storyPoints: issue.storyPoints,
            zenhubIssueId: issue.zenhubIssueId,
            epicId: issue.epicId,
            pipelineStatus: issue.pipelineStatus,
            correlationId: data.correlationId,
          });

          if (result) {
            enriched++;
          } else {
            skipped++;
          }
        }
      } catch (error) {
        this.logger.error({
          msg: 'Failed to enrich contribution for issue',
          zenhubIssueId: issue.zenhubIssueId,
          issueNumber: issue.issueNumber,
          error: error instanceof Error ? error.message : String(error),
          correlationId: data.correlationId,
        });
        skipped++;
      }
    }

    this.logger.log({
      msg: 'Sprint contribution enrichment completed',
      sprintId: data.sprintId,
      enriched,
      skipped,
      totalIssues: data.issues.length,
      correlationId: data.correlationId,
    });

    return { enriched, skipped };
  }

  /**
   * Handle poll completion — enrich contributions from synced issue data.
   */
  @OnEvent('zenhub.poll.completed')
  async handlePollCompleted(event: ZenhubPollCompletedEvent): Promise<void> {
    this.logger.log({
      msg: 'Processing poll completion for contribution enrichment',
      syncId: event.payload.syncId,
      correlationId: event.correlationId,
    });

    const syncRecord = await this.prisma.zenhubSync.findUnique({
      where: { id: event.payload.syncId },
    });

    if (!syncRecord?.payload) {
      this.logger.warn({
        msg: 'Poll sync record has no payload data for enrichment',
        syncId: event.payload.syncId,
      });
      return;
    }

    const payload = syncRecord.payload as Record<string, unknown>;
    const issues = (payload.issues as Array<Record<string, unknown>>) ?? [];

    // Build a map of issue sprints for enrichment
    for (const issue of issues) {
      const issueSprints =
        (issue.sprints as { nodes?: Array<Record<string, unknown>> })?.nodes ?? [];

      if (issueSprints.length === 0) continue;

      const issueNumber = issue.number as number;
      const zenhubIssueId = issue.id as string;
      const estimate = issue.estimate as { value?: number } | null;
      const storyPoints = estimate?.value;
      const pipelineInfo = issue.pipelineIssue as { pipeline?: { name?: string } } | null;
      const pipelineStatus = pipelineInfo?.pipeline?.name ?? null;

      for (const sprint of issueSprints) {
        const sprintId = sprint.id as string;
        if (!sprintId || !zenhubIssueId) continue;

        try {
          await this.enrichSprintContributions({
            sprintId,
            issues: [
              {
                zenhubIssueId,
                issueNumber,
                storyPoints,
                pipelineStatus: pipelineStatus ?? undefined,
              },
            ],
            correlationId: event.correlationId,
          });
        } catch (error) {
          this.logger.error({
            msg: 'Failed to enrich contributions for issue from poll',
            zenhubIssueId,
            issueNumber,
            sprintId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  /**
   * Get enrichment contexts for a specific contribution.
   */
  async getContributionSprintContexts(
    contributionId: string,
  ): Promise<ContributionSprintContextDto[]> {
    const contexts = await this.prisma.contributionSprintContext.findMany({
      where: { contributionId },
      orderBy: { createdAt: 'desc' },
    });

    return contexts.map((ctx) => this.toDto(ctx));
  }

  /**
   * Get all enrichment contexts for a sprint.
   */
  async getSprintContributions(sprintId: string): Promise<ContributionSprintContextDto[]> {
    const contexts = await this.prisma.contributionSprintContext.findMany({
      where: { sprintId },
      orderBy: { createdAt: 'desc' },
    });

    return contexts.map((ctx) => this.toDto(ctx));
  }

  private toDto(context: ContributionSprintContext): ContributionSprintContextDto {
    return {
      id: context.id,
      contributionId: context.contributionId,
      sprintId: context.sprintId,
      storyPoints: context.storyPoints,
      zenhubIssueId: context.zenhubIssueId,
      epicId: context.epicId,
      pipelineStatus: context.pipelineStatus,
      createdAt: context.createdAt.toISOString(),
      updatedAt: context.updatedAt.toISOString(),
    };
  }
}
