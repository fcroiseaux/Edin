import { Injectable, Logger } from '@nestjs/common';
import { ZenhubConfigService } from './zenhub-config.service.js';

const ZENHUB_GRAPHQL_ENDPOINT = 'https://api.zenhub.com/public/graphql';
const MAX_RETRIES = 2;

@Injectable()
export class ZenhubGraphqlClient {
  private readonly logger = new Logger(ZenhubGraphqlClient.name);

  constructor(private readonly zenhubConfigService: ZenhubConfigService) {}

  async query<T = unknown>(
    graphqlQuery: string,
    variables?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<T> {
    const apiToken = await this.zenhubConfigService.resolveApiToken();
    if (!apiToken) {
      throw new ZenhubApiError('Zenhub API token is not configured');
    }

    return this.executeWithRetry(apiToken, graphqlQuery, variables, correlationId);
  }

  private async executeWithRetry<T>(
    apiToken: string,
    graphqlQuery: string,
    variables: Record<string, unknown> | undefined,
    correlationId: string | undefined,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(ZENHUB_GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: graphqlQuery, variables }),
        });

        if (response.status === 429) {
          if (attempt < MAX_RETRIES) {
            const retryAfterMs = this.getRetryAfterMs(response, attempt);
            this.logger.warn('Zenhub API rate limited, retrying after delay', {
              attempt: attempt + 1,
              maxRetries: MAX_RETRIES,
              retryAfterMs,
              correlationId,
            });
            await this.delay(retryAfterMs);
            continue;
          }
          throw new ZenhubRateLimitError('Zenhub API rate limit exceeded after retries');
        }

        if (!response.ok) {
          throw new ZenhubApiError(
            `Zenhub API responded with status ${response.status}: ${response.statusText}`,
          );
        }

        const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

        if (json.errors && json.errors.length > 0) {
          throw new ZenhubApiError(
            `Zenhub GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`,
          );
        }

        return json.data as T;
      } catch (error) {
        lastError = error;
        if (error instanceof ZenhubRateLimitError || error instanceof ZenhubApiError) {
          throw error;
        }
        // Network error
        throw new ZenhubApiError(error instanceof Error ? error.message : 'Zenhub API unreachable');
      }
    }

    throw lastError;
  }

  private getRetryAfterMs(response: Response, attempt: number): number {
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
    // Exponential backoff: 1s, 2s
    return 1000 * Math.pow(2, attempt);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class ZenhubApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZenhubApiError';
  }
}

export class ZenhubRateLimitError extends Error {
  readonly status = 429;

  constructor(message: string) {
    super(message);
    this.name = 'ZenhubRateLimitError';
  }
}
