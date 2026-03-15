import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../compliance/audit/audit.service.js';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getSetting(key: string) {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key },
    });

    if (!setting) return null;

    return {
      key: setting.key,
      value: setting.value,
      updatedAt: setting.updatedAt,
    };
  }

  async getSettingValue<T>(key: string, defaultValue: T): Promise<T> {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key },
    });

    if (!setting) return defaultValue;

    return setting.value as T;
  }

  async updateSetting(
    key: string,
    value: unknown,
    adminId: string,
    correlationId?: string,
    options?: { redactAudit?: boolean },
  ) {
    const existing = await this.prisma.platformSetting.findUnique({
      where: { key },
    });

    const oldValue = existing?.value ?? null;
    const redact = options?.redactAudit === true;
    const auditOldValue = redact ? '[REDACTED]' : oldValue;
    const auditNewValue = redact ? '[REDACTED]' : value;

    const setting = await this.prisma.$transaction(async (tx) => {
      const result = await tx.platformSetting.upsert({
        where: { key },
        update: { value: value as never, updatedBy: adminId },
        create: { key, value: value as never, updatedBy: adminId },
      });

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'SETTING_UPDATED',
          entityType: 'PlatformSetting',
          entityId: key,
          previousState: { value: auditOldValue },
          newState: { value: auditNewValue },
          details: { key, oldValue: auditOldValue, newValue: auditNewValue },
          correlationId: correlationId ?? null,
        },
        tx,
      );

      return result;
    });

    this.logger.log('Platform setting updated', {
      module: 'settings',
      key,
      adminId,
      correlationId,
    });

    return setting;
  }
}
