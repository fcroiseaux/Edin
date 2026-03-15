import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ZenhubConfigService } from './zenhub-config.service.js';
import { ZenhubGraphqlClient, ZenhubRateLimitError } from './zenhub-graphql.client.js';
import type { ZenhubPollCompletedEvent, ZenhubPollFailedEvent } from '@edin/shared';
import { ERROR_CODES } from '@edin/shared';

export interface ZenhubPollingJobData {
  correlationId: string;
  triggeredBy: 'schedule' | 'manual';
}

const SPRINTS_QUERY = `
  query GetSprints($workspaceId: ID!, $after: String) {
    workspace(id: $workspaceId) {
      sprints(first: 50, after: $after) {
        nodes {
          id
          name
          startAt
          endAt
          state
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const ISSUES_QUERY = `
  query GetIssues($workspaceId: ID!, $after: String) {
    workspace(id: $workspaceId) {
      issues(first: 100, after: $after) {
        nodes {
          id
          number
          title
          estimate { value }
          pipelineIssue { pipeline { id name } }
          sprints { nodes { id name } }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface SprintsResponse {
  workspace: { sprints: { nodes: unknown[]; pageInfo: PageInfo } };
}

interface IssuesResponse {
  workspace: { issues: { nodes: unknown[]; pageInfo: PageInfo } };
}

@Injectable()
export class ZenhubPollingService implements OnModuleInit {
  private readonly logger = new Logger(ZenhubPollingService.name);

  constructor(
    private readonly graphqlClient: ZenhubGraphqlClient,
    private readonly prisma: PrismaService,
    private readonly zenhubConfigService: ZenhubConfigService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('zenhub-polling')
    private readonly pollingQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const intervalMs = await this.zenhubConfigService.resolvePollingInterval();

      // Remove existing repeatable jobs before adding new one
      const existingJobs = await this.pollingQueue.getRepeatableJobs();
      for (const job of existingJobs) {
        await this.pollingQueue.removeRepeatableByKey(job.key);
      }

      await this.pollingQueue.add(
        'sync-sprint-data',
        {
          correlationId: `poll-scheduled-${Date.now()}`,
          triggeredBy: 'schedule' as const,
        },
        {
          repeat: { every: intervalMs },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log('Zenhub polling scheduled', { intervalMs });
    } catch (error) {
      this.logger.warn('Failed to schedule Zenhub polling — will retry on next restart', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async executePoll(correlationId: string): Promise<void> {
    const startTime = Date.now();

    const apiToken = await this.zenhubConfigService.resolveApiToken();
    if (!apiToken) {
      this.logger.warn('Zenhub API token not configured, skipping poll', { correlationId });
      return;
    }

    const workspaceMapping = await this.zenhubConfigService.resolveWorkspaceMapping();
    if (!workspaceMapping || Object.keys(workspaceMapping).length === 0) {
      this.logger.warn('No Zenhub workspace mapping configured, skipping poll', { correlationId });
      return;
    }

    const deliveryId = `poll-${Date.now()}-${randomUUID().slice(0, 8)}`;

    // Create sync record
    const syncRecord = await this.prisma.zenhubSync.create({
      data: {
        deliveryId,
        syncType: 'POLL',
        status: 'RECEIVED',
        eventType: 'poll.sync',
        correlationId,
      },
    });

    try {
      let totalSprints = 0;
      let totalIssues = 0;

      for (const workspaceId of Object.keys(workspaceMapping)) {
        const sprints = await this.fetchAllSprints(workspaceId, correlationId);
        const issues = await this.fetchAllIssues(workspaceId, correlationId);
        totalSprints += sprints.length;
        totalIssues += issues.length;
      }

      const durationMs = Date.now() - startTime;

      // Update sync record to COMPLETED
      await this.prisma.zenhubSync.update({
        where: { id: syncRecord.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          payload: { sprintCount: totalSprints, issueCount: totalIssues, durationMs } as never,
        },
      });

      this.logger.log('Zenhub poll completed', {
        syncId: syncRecord.id,
        sprintCount: totalSprints,
        issueCount: totalIssues,
        durationMs,
        correlationId,
      });

      const event: ZenhubPollCompletedEvent = {
        eventType: 'zenhub.poll.completed',
        timestamp: new Date().toISOString(),
        correlationId,
        payload: {
          syncId: syncRecord.id,
          sprintCount: totalSprints,
          issueCount: totalIssues,
          durationMs,
        },
      };
      this.eventEmitter.emit('zenhub.poll.completed', event);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode =
        error instanceof ZenhubRateLimitError
          ? ERROR_CODES.ZENHUB_API_RATE_LIMITED
          : ERROR_CODES.ZENHUB_API_UNREACHABLE;

      // Update sync record to FAILED
      await this.prisma.zenhubSync.update({
        where: { id: syncRecord.id },
        data: {
          status: 'FAILED',
          errorMessage,
          processedAt: new Date(),
        },
      });

      this.logger.error('Zenhub poll failed', {
        syncId: syncRecord.id,
        errorMessage,
        errorCode,
        durationMs,
        correlationId,
      });

      const event: ZenhubPollFailedEvent = {
        eventType: 'zenhub.poll.failed',
        timestamp: new Date().toISOString(),
        correlationId,
        payload: {
          syncId: syncRecord.id,
          errorMessage,
          errorCode,
        },
      };
      this.eventEmitter.emit('zenhub.poll.failed', event);

      throw error;
    }
  }

  private async fetchAllSprints(workspaceId: string, correlationId: string): Promise<unknown[]> {
    const allSprints: unknown[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const result: SprintsResponse = await this.graphqlClient.query<SprintsResponse>(
        SPRINTS_QUERY,
        { workspaceId, after: cursor },
        correlationId,
      );

      const { nodes, pageInfo } = result.workspace.sprints;
      allSprints.push(...nodes);
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    }

    return allSprints;
  }

  private async fetchAllIssues(workspaceId: string, correlationId: string): Promise<unknown[]> {
    const allIssues: unknown[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const result: IssuesResponse = await this.graphqlClient.query<IssuesResponse>(
        ISSUES_QUERY,
        { workspaceId, after: cursor },
        correlationId,
      );

      const { nodes, pageInfo } = result.workspace.issues;
      allIssues.push(...nodes);
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    }

    return allIssues;
  }
}
