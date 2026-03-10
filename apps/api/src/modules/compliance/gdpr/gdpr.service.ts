import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { join } from 'path';
import { ERROR_CODES } from '@edin/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { AuditService } from '../audit/audit.service.js';

const COOLING_OFF_DAYS = 30;
const EXPORT_EXPIRY_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ExportRequestDto {
  id: string;
  contributorId: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  downloadUrl: string | null;
  fileName: string | null;
}

export interface DeletionRequestDto {
  id: string;
  contributorId: string;
  status: string;
  requestedAt: string;
  coolingOffEndsAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  pseudonymId: string | null;
  daysRemaining: number;
}

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @InjectQueue('gdpr-export') private readonly exportQueue: Queue,
    @InjectQueue('gdpr-deletion') private readonly deletionQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async requestExport(contributorId: string, correlationId: string): Promise<ExportRequestDto> {
    const existing = await this.prisma.dataExportRequest.findFirst({
      where: {
        contributorId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (existing) {
      throw new DomainException(
        ERROR_CODES.DATA_EXPORT_ALREADY_PENDING,
        'A data export request is already pending or processing',
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPORT_EXPIRY_DAYS * MS_PER_DAY);

    const request = await this.prisma.dataExportRequest.create({
      data: {
        contributorId,
        status: 'PENDING',
        expiresAt,
        correlationId,
      },
    });

    await this.exportQueue.add(
      'process-export',
      {
        requestId: request.id,
        contributorId,
        correlationId,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.auditService.log({
      actorId: contributorId,
      action: 'data.export.requested',
      entityType: 'DataExportRequest',
      entityId: request.id,
      details: { correlationId },
      correlationId,
    });

    this.logger.log('Data export requested', {
      module: 'gdpr',
      requestId: request.id,
      contributorId,
      correlationId,
    });

    return this.toExportDto(request);
  }

  async getExportStatus(requestId: string, contributorId: string): Promise<ExportRequestDto> {
    const request = await this.prisma.dataExportRequest.findFirst({
      where: { id: requestId, contributorId },
    });

    if (!request) {
      throw new DomainException(
        ERROR_CODES.DATA_EXPORT_NOT_FOUND,
        'Data export request not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toExportDto(request);
  }

  async getExportFile(
    requestId: string,
    contributorId: string,
  ): Promise<{ filePath: string; fileName: string }> {
    const request = await this.prisma.dataExportRequest.findFirst({
      where: { id: requestId, contributorId },
    });

    if (!request) {
      throw new DomainException(
        ERROR_CODES.DATA_EXPORT_NOT_FOUND,
        'Data export request not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (request.status !== 'READY') {
      throw new DomainException(
        ERROR_CODES.DATA_EXPORT_NOT_FOUND,
        'Export is not ready for download',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (request.expiresAt && request.expiresAt < new Date()) {
      throw new DomainException(
        ERROR_CODES.DATA_EXPORT_NOT_FOUND,
        'Export has expired',
        HttpStatus.GONE,
      );
    }

    const fileName = request.fileName ?? `export-${requestId}.json`;
    const filePath = join(process.cwd(), 'data', 'exports', fileName);

    return { filePath, fileName };
  }

  async requestDeletion(contributorId: string, correlationId: string): Promise<DeletionRequestDto> {
    const existing = await this.prisma.dataDeletionRequest.findFirst({
      where: {
        contributorId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (existing) {
      throw new DomainException(
        ERROR_CODES.DATA_DELETION_ALREADY_PENDING,
        'A data deletion request is already pending or confirmed',
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    const coolingOffEndsAt = new Date(now.getTime() + COOLING_OFF_DAYS * MS_PER_DAY);

    const request = await this.prisma.dataDeletionRequest.create({
      data: {
        contributorId,
        status: 'PENDING',
        coolingOffEndsAt,
        correlationId,
      },
    });

    await this.auditService.log({
      actorId: contributorId,
      action: 'data.deletion.requested',
      entityType: 'DataDeletionRequest',
      entityId: request.id,
      details: { coolingOffEndsAt: coolingOffEndsAt.toISOString(), correlationId },
      correlationId,
    });

    this.logger.log('Data deletion requested', {
      module: 'gdpr',
      requestId: request.id,
      contributorId,
      coolingOffEndsAt: coolingOffEndsAt.toISOString(),
      correlationId,
    });

    return this.toDeletionDto(request);
  }

  async confirmDeletion(
    requestId: string,
    contributorId: string,
    correlationId: string,
  ): Promise<DeletionRequestDto> {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: { id: requestId, contributorId },
    });

    if (!request) {
      throw new DomainException(
        ERROR_CODES.DATA_DELETION_NOT_FOUND,
        'Data deletion request not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (request.status !== 'PENDING') {
      throw new DomainException(
        ERROR_CODES.DATA_DELETION_ALREADY_COMPLETED,
        `Cannot confirm deletion request with status ${request.status}`,
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    if (request.coolingOffEndsAt > now) {
      throw new DomainException(
        ERROR_CODES.DATA_DELETION_COOLING_OFF_ACTIVE,
        'Cooling-off period has not yet expired',
        HttpStatus.BAD_REQUEST,
      );
    }

    const salt = this.configService.get<string>('PSEUDONYM_SALT');
    if (!salt) {
      this.logger.warn(
        'PSEUDONYM_SALT not configured — using fallback. Set PSEUDONYM_SALT (min 32 chars) for production.',
        { module: 'gdpr' },
      );
    }
    const effectiveSalt = salt ?? 'edin-gdpr-dev-fallback-do-not-use-in-production';
    const pseudonymId = createHash('sha256')
      .update(`${contributorId}:${effectiveSalt}`)
      .digest('hex');

    const updated = await this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: now,
        pseudonymId,
      },
    });

    await this.deletionQueue.add(
      'process-deletion',
      {
        requestId,
        contributorId,
        pseudonymId,
        correlationId,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await this.auditService.log({
      actorId: contributorId,
      action: 'data.deletion.confirmed',
      entityType: 'DataDeletionRequest',
      entityId: requestId,
      details: { pseudonymId, correlationId },
      correlationId,
    });

    this.logger.log('Data deletion confirmed', {
      module: 'gdpr',
      requestId,
      contributorId,
      pseudonymId,
      correlationId,
    });

    return this.toDeletionDto(updated);
  }

  async cancelDeletion(
    requestId: string,
    contributorId: string,
    correlationId: string,
  ): Promise<DeletionRequestDto> {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: { id: requestId, contributorId },
    });

    if (!request) {
      throw new DomainException(
        ERROR_CODES.DATA_DELETION_NOT_FOUND,
        'Data deletion request not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (request.status !== 'PENDING') {
      throw new DomainException(
        ERROR_CODES.DATA_DELETION_ALREADY_COMPLETED,
        `Cannot cancel deletion request with status ${request.status}`,
        HttpStatus.CONFLICT,
      );
    }

    const now = new Date();
    const updated = await this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
      },
    });

    await this.auditService.log({
      actorId: contributorId,
      action: 'data.deletion.cancelled',
      entityType: 'DataDeletionRequest',
      entityId: requestId,
      details: { correlationId },
      correlationId,
    });

    this.logger.log('Data deletion cancelled', {
      module: 'gdpr',
      requestId,
      contributorId,
      correlationId,
    });

    return this.toDeletionDto(updated);
  }

  private toExportDto(request: {
    id: string;
    contributorId: string;
    status: string;
    requestedAt: Date;
    completedAt: Date | null;
    expiresAt: Date | null;
    downloadUrl: string | null;
    fileName: string | null;
  }): ExportRequestDto {
    return {
      id: request.id,
      contributorId: request.contributorId,
      status: request.status,
      requestedAt: request.requestedAt.toISOString(),
      completedAt: request.completedAt?.toISOString() ?? null,
      expiresAt: request.expiresAt?.toISOString() ?? null,
      downloadUrl: request.downloadUrl ?? null,
      fileName: request.fileName ?? null,
    };
  }

  private toDeletionDto(request: {
    id: string;
    contributorId: string;
    status: string;
    requestedAt: Date;
    coolingOffEndsAt: Date;
    confirmedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    pseudonymId: string | null;
  }): DeletionRequestDto {
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((request.coolingOffEndsAt.getTime() - now.getTime()) / MS_PER_DAY),
    );

    return {
      id: request.id,
      contributorId: request.contributorId,
      status: request.status,
      requestedAt: request.requestedAt.toISOString(),
      coolingOffEndsAt: request.coolingOffEndsAt.toISOString(),
      confirmedAt: request.confirmedAt?.toISOString() ?? null,
      completedAt: request.completedAt?.toISOString() ?? null,
      cancelledAt: request.cancelledAt?.toISOString() ?? null,
      pseudonymId: request.pseudonymId ?? null,
      daysRemaining,
    };
  }
}
