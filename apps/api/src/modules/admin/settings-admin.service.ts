import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ERROR_CODES } from '@edin/shared';
import type {
  SettingsSectionKey,
  SettingsUpdatedEvent,
  PlatformSettingsSection,
} from '@edin/shared';
import { SettingsService } from '../settings/settings.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const VALID_SECTIONS: SettingsSectionKey[] = ['github', 'feedback', 'onboarding'];

const SECTION_LABELS: Record<SettingsSectionKey, string> = {
  github: 'GitHub Repositories',
  feedback: 'Feedback Assignment Rules',
  onboarding: 'Onboarding Parameters',
};

const SETTINGS_DEFAULTS: Record<string, Record<string, unknown>> = {
  github: {
    'github.monitored_repos': [],
  },
  feedback: {
    'feedback.sla_threshold_hours': 48,
    'feedback.max_concurrent_assignments': 3,
    'feedback.auto_reassignment_hours': 72,
  },
  onboarding: {
    'onboarding.ignition_timeline_hours': 72,
    'onboarding.buddy_assignment_rules': { maxAssignments: 3, domainMatch: true },
  },
};

@Injectable()
export class SettingsAdminService {
  private readonly logger = new Logger(SettingsAdminService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private validateSection(section: string): SettingsSectionKey {
    if (!VALID_SECTIONS.includes(section as SettingsSectionKey)) {
      throw new DomainException(
        ERROR_CODES.ADMIN_SETTINGS_SECTION_NOT_FOUND,
        `Unknown settings section: ${section}. Valid sections: ${VALID_SECTIONS.join(', ')}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return section as SettingsSectionKey;
  }

  async getAllSections(): Promise<PlatformSettingsSection[]> {
    const sections: PlatformSettingsSection[] = [];

    for (const section of VALID_SECTIONS) {
      const sectionData = await this.getSection(section);
      sections.push(sectionData);
    }

    return sections;
  }

  async getSection(sectionKey: string): Promise<PlatformSettingsSection> {
    const section = this.validateSection(sectionKey);
    const defaults = SETTINGS_DEFAULTS[section] ?? {};
    const settings: Record<string, unknown> = {};
    let latestUpdatedAt: string | null = null;

    for (const key of Object.keys(defaults)) {
      const setting = await this.settingsService.getSetting(key);
      settings[key] = setting?.value ?? defaults[key];

      if (setting?.updatedAt) {
        const updatedAtStr = setting.updatedAt.toISOString();
        if (!latestUpdatedAt || updatedAtStr > latestUpdatedAt) {
          latestUpdatedAt = updatedAtStr;
        }
      }
    }

    return {
      section,
      label: SECTION_LABELS[section],
      settings,
      updatedAt: latestUpdatedAt,
    };
  }

  async updateSection(
    sectionKey: string,
    updates: Record<string, unknown>,
    adminId: string,
    correlationId?: string,
  ): Promise<PlatformSettingsSection> {
    const section = this.validateSection(sectionKey);
    const defaults = SETTINGS_DEFAULTS[section] ?? {};
    const validKeys = Object.keys(defaults);
    const updatedKeys: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!validKeys.includes(key)) {
        this.logger.warn('Ignored unknown settings key', { section, key, adminId });
        continue;
      }

      await this.settingsService.updateSetting(key, value, adminId, correlationId);
      updatedKeys.push(key);
    }

    if (updatedKeys.length > 0) {
      const event: SettingsUpdatedEvent = {
        eventType: 'platform.settings.updated',
        timestamp: new Date().toISOString(),
        correlationId,
        actorId: adminId,
        payload: { section, updatedKeys },
      };
      this.eventEmitter.emit('platform.settings.updated', event);

      this.logger.log('Platform settings section updated', {
        section,
        updatedKeys,
        adminId,
        correlationId,
      });
    }

    return this.getSection(section);
  }
}
