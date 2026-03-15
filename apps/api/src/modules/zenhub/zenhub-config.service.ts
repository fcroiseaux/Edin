import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AppConfig } from '../../config/app.config.js';
import { SettingsService } from '../settings/settings.service.js';
import type { ZenhubConfigResponse, ZenhubConfigUpdatedEvent } from '@edin/shared';

/** Platform setting keys for Zenhub config. */
const KEYS = {
  API_TOKEN: 'zenhub.api_token',
  WEBHOOK_URL: 'zenhub.webhook_url',
  WEBHOOK_SECRET: 'zenhub.webhook_secret',
  POLLING_INTERVAL_MS: 'zenhub.polling_interval_ms',
  WORKSPACE_MAPPING: 'zenhub.workspace_mapping',
} as const;

const DEFAULT_POLLING_INTERVAL_MS = 900_000; // 15 minutes

@Injectable()
export class ZenhubConfigService {
  private readonly logger = new Logger(ZenhubConfigService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getConfig(): Promise<ZenhubConfigResponse> {
    const [apiToken, webhookUrl, webhookSecret, pollingInterval, workspaceMapping] =
      await Promise.all([
        this.resolveApiToken(),
        this.resolveWebhookUrl(),
        this.resolveWebhookSecret(),
        this.resolvePollingInterval(),
        this.resolveWorkspaceMapping(),
      ]);

    return {
      apiTokenConfigured: apiToken !== null,
      apiTokenHint: apiToken ? this.maskToken(apiToken) : null,
      webhookUrl,
      webhookSecretConfigured: webhookSecret !== null,
      pollingIntervalMs: pollingInterval,
      workspaceMapping,
    };
  }

  async updateConfig(
    updates: {
      apiToken?: string;
      webhookUrl?: string;
      webhookSecret?: string;
      pollingIntervalMs?: number;
      workspaceMapping?: Record<string, string>;
    },
    adminId: string,
    correlationId?: string,
  ): Promise<ZenhubConfigResponse> {
    const updatedKeys: string[] = [];

    if (updates.apiToken !== undefined) {
      await this.settingsService.updateSetting(
        KEYS.API_TOKEN,
        updates.apiToken,
        adminId,
        correlationId,
        { redactAudit: true },
      );
      updatedKeys.push('apiToken');
      this.logger.log('Zenhub API token updated', { adminId, correlationId });
    }

    if (updates.webhookUrl !== undefined) {
      await this.settingsService.updateSetting(
        KEYS.WEBHOOK_URL,
        updates.webhookUrl,
        adminId,
        correlationId,
      );
      updatedKeys.push('webhookUrl');
    }

    if (updates.webhookSecret !== undefined) {
      // Preserve old secret for rotation support (AC4)
      const currentSecret = await this.resolveWebhookSecret();
      if (currentSecret) {
        await this.settingsService.updateSetting(
          'zenhub.webhook_secret_previous',
          currentSecret,
          adminId,
          correlationId,
          { redactAudit: true },
        );
        await this.settingsService.updateSetting(
          'zenhub.webhook_secret_rotated_at',
          new Date().toISOString(),
          adminId,
          correlationId,
        );
      }

      await this.settingsService.updateSetting(
        KEYS.WEBHOOK_SECRET,
        updates.webhookSecret,
        adminId,
        correlationId,
        { redactAudit: true },
      );
      updatedKeys.push('webhookSecret');
    }

    if (updates.pollingIntervalMs !== undefined) {
      await this.settingsService.updateSetting(
        KEYS.POLLING_INTERVAL_MS,
        updates.pollingIntervalMs,
        adminId,
        correlationId,
      );
      updatedKeys.push('pollingIntervalMs');
    }

    if (updates.workspaceMapping !== undefined) {
      await this.settingsService.updateSetting(
        KEYS.WORKSPACE_MAPPING,
        updates.workspaceMapping,
        adminId,
        correlationId,
      );
      updatedKeys.push('workspaceMapping');
    }

    if (updatedKeys.length > 0) {
      const event: ZenhubConfigUpdatedEvent = {
        eventType: 'zenhub.config.updated',
        timestamp: new Date().toISOString(),
        correlationId,
        actorId: adminId,
        payload: { updatedKeys },
      };
      this.eventEmitter.emit('zenhub.config.updated', event);

      this.logger.log('Zenhub configuration updated', {
        updatedKeys,
        adminId,
        correlationId,
      });
    }

    return this.getConfig();
  }

  /** Resolve API token: DB setting takes precedence over env var. */
  async resolveApiToken(): Promise<string | null> {
    const dbValue = await this.settingsService.getSettingValue<string | null>(KEYS.API_TOKEN, null);
    if (dbValue) return dbValue;
    return this.configService.get('ZENHUB_API_TOKEN', { infer: true }) ?? null;
  }

  /** Resolve webhook secret: DB setting takes precedence over env var. */
  async resolveWebhookSecret(): Promise<string | null> {
    const dbValue = await this.settingsService.getSettingValue<string | null>(
      KEYS.WEBHOOK_SECRET,
      null,
    );
    if (dbValue) return dbValue;
    return this.configService.get('ZENHUB_WEBHOOK_SECRET', { infer: true }) ?? null;
  }

  /** Resolve polling interval: DB setting takes precedence over env var. */
  async resolvePollingInterval(): Promise<number> {
    const dbValue = await this.settingsService.getSettingValue<number | null>(
      KEYS.POLLING_INTERVAL_MS,
      null,
    );
    if (dbValue !== null) return dbValue;
    return (
      this.configService.get('ZENHUB_POLLING_INTERVAL_MS', { infer: true }) ??
      DEFAULT_POLLING_INTERVAL_MS
    );
  }

  /** Resolve webhook URL from DB. No env var fallback — always set via admin panel. */
  private async resolveWebhookUrl(): Promise<string | null> {
    return this.settingsService.getSettingValue<string | null>(KEYS.WEBHOOK_URL, null);
  }

  /** Resolve workspace mapping: DB setting takes precedence over env var. */
  async resolveWorkspaceMapping(): Promise<Record<string, string> | null> {
    const dbValue = await this.settingsService.getSettingValue<Record<string, string> | null>(
      KEYS.WORKSPACE_MAPPING,
      null,
    );
    if (dbValue) return dbValue;

    const envWorkspaceId = this.configService.get('ZENHUB_WORKSPACE_ID', { infer: true });
    if (envWorkspaceId) {
      return { default: envWorkspaceId };
    }
    return null;
  }

  /** Mask a token to show only the last 4 characters. */
  private maskToken(token: string): string {
    if (token.length <= 4) return '****';
    return '****' + token.slice(-4);
  }
}
