import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import type { AppConfig } from '../../config/app.config.js';

interface CreateWebhookResult {
  webhookId: number;
}

@Injectable()
export class GitHubApiService {
  private readonly logger = new Logger(GitHubApiService.name);
  private readonly octokit: Octokit;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const token = this.configService.get('GITHUB_APP_TOKEN', { infer: true });
    this.octokit = new Octokit({ auth: token || undefined });
  }

  async createWebhook(
    owner: string,
    repo: string,
    secret: string,
    correlationId?: string,
  ): Promise<CreateWebhookResult> {
    const webhookBaseUrl = this.configService.get('INGESTION_WEBHOOK_BASE_URL', { infer: true });
    const webhookUrl = `${webhookBaseUrl}/api/v1/ingestion/github/webhook`;

    this.logger.debug('Creating GitHub webhook', { owner, repo, webhookUrl, correlationId });

    const startTime = Date.now();
    try {
      const response = await this.octokit.repos.createWebhook({
        owner,
        repo,
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret,
          insecure_ssl: '0',
        },
        events: ['push', 'pull_request', 'pull_request_review'],
        active: true,
      });

      this.logger.debug('GitHub webhook created', {
        owner,
        repo,
        webhookId: response.data.id,
        responseTimeMs: Date.now() - startTime,
        correlationId,
      });

      return { webhookId: response.data.id };
    } catch (error: unknown) {
      const responseTimeMs = Date.now() - startTime;
      this.logger.warn('GitHub webhook creation failed', {
        owner,
        repo,
        responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
        correlationId,
      });

      if (this.isRateLimited(error)) {
        throw new GitHubRateLimitError('GitHub API rate limit exceeded');
      }

      throw new GitHubApiError(error instanceof Error ? error.message : 'Failed to create webhook');
    }
  }

  async deleteWebhook(
    owner: string,
    repo: string,
    webhookId: number,
    correlationId?: string,
  ): Promise<void> {
    this.logger.debug('Deleting GitHub webhook', { owner, repo, webhookId, correlationId });

    const startTime = Date.now();
    try {
      await this.octokit.repos.deleteWebhook({
        owner,
        repo,
        hook_id: webhookId,
      });

      this.logger.debug('GitHub webhook deleted', {
        owner,
        repo,
        webhookId,
        responseTimeMs: Date.now() - startTime,
        correlationId,
      });
    } catch (error: unknown) {
      const responseTimeMs = Date.now() - startTime;
      this.logger.warn('GitHub webhook deletion failed', {
        owner,
        repo,
        webhookId,
        responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
        correlationId,
      });

      if (this.isRateLimited(error)) {
        throw new GitHubRateLimitError('GitHub API rate limit exceeded');
      }

      throw new GitHubApiError(error instanceof Error ? error.message : 'Failed to delete webhook');
    }
  }

  async verifyRepository(owner: string, repo: string, correlationId?: string): Promise<boolean> {
    this.logger.debug('Verifying GitHub repository', { owner, repo, correlationId });

    const startTime = Date.now();
    try {
      await this.octokit.repos.get({ owner, repo });

      this.logger.debug('GitHub repository verified', {
        owner,
        repo,
        responseTimeMs: Date.now() - startTime,
        correlationId,
      });

      return true;
    } catch (error: unknown) {
      this.logger.debug('GitHub repository verification failed', {
        owner,
        repo,
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        correlationId,
      });

      return false;
    }
  }

  private isRateLimited(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
      return (error as { status: number }).status === 429;
    }
    return false;
  }
}

export class GitHubApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export class GitHubRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubRateLimitError';
  }
}
