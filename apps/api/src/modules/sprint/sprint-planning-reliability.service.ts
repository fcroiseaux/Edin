import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  SprintMetricCalculatedEvent,
  PlanningReliabilityDto,
  ContributorPlanningReliabilitySummary,
  PlanningReliabilityCalculatedEvent,
  CrossDomainCollaborationDto,
  CrossDomainCollaborationSummary,
  CrossDomainCollaborationDetectedEvent,
} from '@edin/shared';

@Injectable()
export class SprintPlanningReliabilityService {
  private readonly logger = new Logger(SprintPlanningReliabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Calculate planning reliability for all contributors in a sprint.
   * Uses data from ContributorSprintEstimation (committed/delivered points).
   * Idempotent: upserts results into PlanningReliability table (AC3).
   */
  async calculateSprintReliability(
    sprintId: string,
    correlationId?: string,
  ): Promise<{ calculated: number }> {
    this.logger.log({
      msg: 'Calculating planning reliability for sprint',
      sprintId,
      correlationId,
    });

    // Find SprintMetric(s) for this sprintId (may have domain-specific variants)
    const metrics = await this.prisma.sprintMetric.findMany({
      where: { sprintId },
      include: { contributorEstimations: true },
    });

    if (metrics.length === 0) {
      this.logger.debug({
        msg: 'No sprint metrics found for reliability calculation',
        sprintId,
      });
      return { calculated: 0 };
    }

    // Aggregate per-contributor across all domain variants
    const contributorData = new Map<string, { committedPoints: number; deliveredPoints: number }>();

    for (const metric of metrics) {
      for (const estimation of metric.contributorEstimations) {
        const existing = contributorData.get(estimation.contributorId);
        if (existing) {
          existing.committedPoints += estimation.plannedPoints;
          existing.deliveredPoints += estimation.deliveredPoints;
        } else {
          contributorData.set(estimation.contributorId, {
            committedPoints: estimation.plannedPoints,
            deliveredPoints: estimation.deliveredPoints,
          });
        }
      }
    }

    let calculated = 0;
    const deliveryRatios: number[] = [];

    for (const [contributorId, data] of contributorData) {
      const deliveryRatio =
        data.committedPoints > 0 ? data.deliveredPoints / data.committedPoints : null;
      const estimationVariance =
        data.committedPoints > 0
          ? (Math.abs(data.deliveredPoints - data.committedPoints) / data.committedPoints) * 100
          : null;

      await this.prisma.planningReliability.upsert({
        where: {
          contributorId_sprintId: { contributorId, sprintId },
        },
        update: {
          committedPoints: data.committedPoints,
          deliveredPoints: data.deliveredPoints,
          deliveryRatio,
          estimationVariance,
        },
        create: {
          contributorId,
          sprintId,
          committedPoints: data.committedPoints,
          deliveredPoints: data.deliveredPoints,
          deliveryRatio,
          estimationVariance,
        },
      });

      if (deliveryRatio !== null) {
        deliveryRatios.push(deliveryRatio);
      }
      calculated++;
    }

    const averageDeliveryRatio =
      deliveryRatios.length > 0
        ? deliveryRatios.reduce((sum, r) => sum + r, 0) / deliveryRatios.length
        : null;

    const event: PlanningReliabilityCalculatedEvent = {
      eventType: 'sprint.planning.reliability.calculated',
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? '',
      payload: {
        sprintId,
        contributorCount: calculated,
        averageDeliveryRatio,
      },
    };
    this.eventEmitter.emit('sprint.planning.reliability.calculated', event);

    this.logger.log({
      msg: 'Planning reliability calculated',
      sprintId,
      contributorCount: calculated,
      averageDeliveryRatio,
      correlationId,
    });

    return { calculated };
  }

  /**
   * Detect cross-domain collaboration in a sprint.
   * Looks at ContributionSprintContext → core.Contribution → core.Contributor
   * to find contributors from different domains working in the same sprint/epic.
   * Idempotent: upserts into CrossDomainCollaboration (AC3).
   */
  async detectCrossDomainCollaboration(
    sprintId: string,
    correlationId?: string,
  ): Promise<{ detected: number }> {
    this.logger.log({
      msg: 'Detecting cross-domain collaboration for sprint',
      sprintId,
      correlationId,
    });

    // Get all contribution sprint contexts for this sprint
    const contexts = await this.prisma.contributionSprintContext.findMany({
      where: { sprintId },
    });

    if (contexts.length === 0) {
      this.logger.debug({
        msg: 'No contribution sprint contexts found for collaboration detection',
        sprintId,
      });
      return { detected: 0 };
    }

    // Get all contribution IDs to look up contributors
    const contributionIds = [...new Set(contexts.map((c) => c.contributionId))];

    // Fetch contributions with their contributor IDs
    const contributions = await this.prisma.contribution.findMany({
      where: { id: { in: contributionIds } },
      select: { id: true, contributorId: true },
    });

    const contributionToContributor = new Map<string, string>();
    for (const c of contributions) {
      if (c.contributorId) {
        contributionToContributor.set(c.id, c.contributorId);
      }
    }

    // Fetch contributor domains
    const contributorIds = [...new Set(contributionToContributor.values())];
    const contributors = await this.prisma.contributor.findMany({
      where: { id: { in: contributorIds } },
      select: { id: true, domain: true },
    });

    const contributorDomain = new Map<string, string>();
    for (const c of contributors) {
      if (c.domain) {
        contributorDomain.set(c.id, c.domain);
      }
    }

    // Group by epicId and sprint-level
    type CollabGroup = { domains: Set<string>; contributorIds: Set<string> };
    const epicGroups = new Map<string, CollabGroup>();
    const sprintGroup: CollabGroup = {
      domains: new Set(),
      contributorIds: new Set(),
    };

    for (const ctx of contexts) {
      const contributorId = contributionToContributor.get(ctx.contributionId);
      if (!contributorId) continue;

      const domain = contributorDomain.get(contributorId);
      if (!domain) continue;

      // Sprint-level group
      sprintGroup.domains.add(domain);
      sprintGroup.contributorIds.add(contributorId);

      // Epic-level group
      if (ctx.epicId) {
        if (!epicGroups.has(ctx.epicId)) {
          epicGroups.set(ctx.epicId, {
            domains: new Set(),
            contributorIds: new Set(),
          });
        }
        const epicGroup = epicGroups.get(ctx.epicId)!;
        epicGroup.domains.add(domain);
        epicGroup.contributorIds.add(contributorId);
      }
    }

    let detected = 0;

    // Record sprint-level collaboration if 2+ domains
    if (sprintGroup.domains.size >= 2) {
      const domains = [...sprintGroup.domains].sort();
      const contribIds = [...sprintGroup.contributorIds];

      const existing = await this.prisma.crossDomainCollaboration.findFirst({
        where: { sprintId, epicId: null, collaborationType: 'sprint' },
      });

      if (existing) {
        await this.prisma.crossDomainCollaboration.update({
          where: { id: existing.id },
          data: { domains, contributorIds: contribIds, detectedAt: new Date() },
        });
      } else {
        await this.prisma.crossDomainCollaboration.create({
          data: {
            sprintId,
            domains,
            contributorIds: contribIds,
            collaborationType: 'sprint',
          },
        });
      }

      const event: CrossDomainCollaborationDetectedEvent = {
        eventType: 'sprint.collaboration.detected',
        timestamp: new Date().toISOString(),
        correlationId: correlationId ?? '',
        payload: {
          sprintId,
          epicId: null,
          domains,
          contributorCount: contribIds.length,
        },
      };
      this.eventEmitter.emit('sprint.collaboration.detected', event);
      detected++;
    }

    // Record epic-level collaborations if 2+ domains
    for (const [epicId, group] of epicGroups) {
      if (group.domains.size >= 2) {
        const domains = [...group.domains].sort();
        const contribIds = [...group.contributorIds];

        await this.prisma.crossDomainCollaboration.upsert({
          where: {
            sprintId_epicId_collaborationType: {
              sprintId,
              epicId,
              collaborationType: 'epic',
            },
          },
          update: {
            domains,
            contributorIds: contribIds,
            detectedAt: new Date(),
          },
          create: {
            sprintId,
            epicId,
            domains,
            contributorIds: contribIds,
            collaborationType: 'epic',
          },
        });

        const event: CrossDomainCollaborationDetectedEvent = {
          eventType: 'sprint.collaboration.detected',
          timestamp: new Date().toISOString(),
          correlationId: correlationId ?? '',
          payload: {
            sprintId,
            epicId,
            domains,
            contributorCount: contribIds.length,
          },
        };
        this.eventEmitter.emit('sprint.collaboration.detected', event);
        detected++;
      }
    }

    this.logger.log({
      msg: 'Cross-domain collaboration detection complete',
      sprintId,
      detected,
      correlationId,
    });

    return { detected };
  }

  /**
   * Triggered when sprint metrics are recalculated.
   * Recalculates planning reliability and detects cross-domain collaboration.
   */
  @OnEvent('sprint.metrics.recalculated')
  async handleMetricsRecalculated(event: SprintMetricCalculatedEvent): Promise<void> {
    const sprintId = event.payload.sprintId;
    this.logger.log({
      msg: 'Handling metrics recalculated for reliability calculation',
      sprintId,
      correlationId: event.correlationId,
    });

    try {
      await this.calculateSprintReliability(sprintId, event.correlationId);
      await this.detectCrossDomainCollaboration(sprintId, event.correlationId);
    } catch (error) {
      this.logger.error({
        msg: 'Failed to calculate reliability after metrics recalculation',
        sprintId,
        error: error instanceof Error ? error.message : String(error),
        correlationId: event.correlationId,
      });
    }
  }

  /**
   * Get planning reliability for a specific contributor across sprints.
   */
  async getContributorReliability(
    contributorId: string,
    limit = 12,
  ): Promise<PlanningReliabilityDto[]> {
    const records = await this.prisma.planningReliability.findMany({
      where: { contributorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((r) => this.toReliabilityDto(r));
  }

  /**
   * Get planning reliability summary for all contributors (dashboard view).
   */
  async getReliabilitySummary(options?: {
    domain?: string;
    limit?: number;
  }): Promise<ContributorPlanningReliabilitySummary[]> {
    const allRecords = await this.prisma.planningReliability.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (allRecords.length === 0) return [];

    // Get unique contributor IDs
    const contributorIds = [...new Set(allRecords.map((r) => r.contributorId))];

    // Fetch contributor info (cross-schema lookup)
    const contributors = await this.prisma.contributor.findMany({
      where: { id: { in: contributorIds } },
      select: { id: true, name: true, domain: true, githubUsername: true },
    });

    const contributorMap = new Map(contributors.map((c) => [c.id, c]));

    // Filter by domain if specified
    const filteredContributorIds = options?.domain
      ? contributorIds.filter((id) => contributorMap.get(id)?.domain === options.domain)
      : contributorIds;

    // Get sprint info for trend data
    const sprintIds = [...new Set(allRecords.map((r) => r.sprintId))];
    const sprintMetrics = await this.prisma.sprintMetric.findMany({
      where: { sprintId: { in: sprintIds }, domain: null },
      select: { sprintId: true, sprintName: true, sprintEnd: true },
    });
    const sprintMap = new Map(sprintMetrics.map((s) => [s.sprintId, s]));

    // Build summaries
    const summaries: ContributorPlanningReliabilitySummary[] = [];

    for (const contributorId of filteredContributorIds) {
      const records = allRecords.filter((r) => r.contributorId === contributorId);
      if (records.length === 0) continue;

      const contributor = contributorMap.get(contributorId);

      const ratios = records.filter((r) => r.deliveryRatio !== null).map((r) => r.deliveryRatio!);
      const variances = records
        .filter((r) => r.estimationVariance !== null)
        .map((r) => r.estimationVariance!);

      const averageDeliveryRatio =
        ratios.length > 0 ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length : null;
      const averageEstimationVariance =
        variances.length > 0 ? variances.reduce((sum, v) => sum + v, 0) / variances.length : null;

      const trend = records.map((r) => {
        const sprint = sprintMap.get(r.sprintId);
        return {
          sprintId: r.sprintId,
          sprintName: sprint?.sprintName ?? r.sprintId,
          sprintEnd: sprint?.sprintEnd?.toISOString() ?? '',
          deliveryRatio: r.deliveryRatio,
          estimationVariance: r.estimationVariance,
        };
      });

      summaries.push({
        contributorId,
        contributorName: contributor?.name ?? null,
        githubUsername: contributor?.githubUsername ?? null,
        domain: contributor?.domain ?? null,
        sprintCount: records.length,
        averageDeliveryRatio,
        averageEstimationVariance,
        trend,
      });
    }

    // Sort by sprint count desc, then by delivery ratio desc
    summaries.sort((a, b) => {
      if (b.sprintCount !== a.sprintCount) return b.sprintCount - a.sprintCount;
      return (b.averageDeliveryRatio ?? 0) - (a.averageDeliveryRatio ?? 0);
    });

    const limit = options?.limit ?? 12;
    return summaries.slice(0, limit);
  }

  /**
   * Get cross-domain collaboration events.
   */
  async getCollaborations(options?: {
    sprintId?: string;
    limit?: number;
  }): Promise<CrossDomainCollaborationDto[]> {
    const records = await this.prisma.crossDomainCollaboration.findMany({
      where: options?.sprintId ? { sprintId: options.sprintId } : undefined,
      orderBy: { detectedAt: 'desc' },
      take: options?.limit ?? 20,
    });

    return records.map((r) => this.toCollaborationDto(r));
  }

  /**
   * Get collaboration summary (domain pairs and counts).
   */
  async getCollaborationSummary(): Promise<CrossDomainCollaborationSummary> {
    const records = await this.prisma.crossDomainCollaboration.findMany({
      orderBy: { detectedAt: 'desc' },
    });

    // Count domain pairs
    const pairCounts = new Map<string, number>();
    for (const record of records) {
      const key = [...record.domains].sort().join(',');
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }

    const domainPairs = [...pairCounts.entries()]
      .map(([key, count]) => ({
        domains: key.split(','),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalCollaborations: records.length,
      domainPairs,
      recentCollaborations: records.slice(0, 10).map((r) => this.toCollaborationDto(r)),
    };
  }

  private toReliabilityDto(record: {
    id: string;
    contributorId: string;
    sprintId: string;
    committedPoints: number;
    deliveredPoints: number;
    deliveryRatio: number | null;
    estimationVariance: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): PlanningReliabilityDto {
    return {
      id: record.id,
      contributorId: record.contributorId,
      sprintId: record.sprintId,
      committedPoints: record.committedPoints,
      deliveredPoints: record.deliveredPoints,
      deliveryRatio: record.deliveryRatio,
      estimationVariance: record.estimationVariance,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toCollaborationDto(record: {
    id: string;
    sprintId: string;
    epicId: string | null;
    domains: string[];
    contributorIds: string[];
    collaborationType: string;
    detectedAt: Date;
  }): CrossDomainCollaborationDto {
    return {
      id: record.id,
      sprintId: record.sprintId,
      epicId: record.epicId,
      domains: record.domains,
      contributorIds: record.contributorIds,
      collaborationType: record.collaborationType,
      detectedAt: record.detectedAt.toISOString(),
    };
  }
}
