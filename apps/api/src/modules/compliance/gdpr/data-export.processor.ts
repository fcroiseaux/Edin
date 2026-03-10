import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

export interface DataExportJobData {
  requestId: string;
  contributorId: string;
  correlationId: string;
}

@Processor('gdpr-export')
export class DataExportProcessor extends WorkerHost {
  private readonly logger = new Logger(DataExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<DataExportJobData>): Promise<void> {
    const { contributorId, requestId: exportRequestId, correlationId } = job.data;

    this.logger.log('Starting data export', {
      module: 'gdpr',
      jobId: job.id,
      exportRequestId,
      contributorId,
      correlationId,
    });

    try {
      await this.prisma.dataExportRequest.update({
        where: { id: exportRequestId },
        data: { status: 'PROCESSING' },
      });

      const profile = await this.prisma.contributor.findUnique({
        where: { id: contributorId },
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          avatarUrl: true,
          domain: true,
          skillAreas: true,
          role: true,
          createdAt: true,
        },
      });

      const contributions = await this.prisma.contribution.findMany({
        where: { contributorId },
      });

      const evaluations = await this.prisma.evaluation.findMany({
        where: { contributorId },
        select: {
          compositeScore: true,
          narrative: true,
          dimensionScores: true,
          createdAt: true,
        },
      });

      const peerFeedback = await this.prisma.peerFeedback.findMany({
        where: { reviewerId: contributorId },
        select: {
          ratings: true,
          comments: true,
          submittedAt: true,
        },
      });

      const publications = await this.prisma.article.findMany({
        where: { authorId: contributorId },
        select: {
          title: true,
          abstract: true,
          status: true,
          publishedAt: true,
        },
      });

      const scores = await this.prisma.contributionScore.findMany({
        where: { contributorId },
      });

      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          OR: [{ actorId: contributorId }, { entityId: contributorId }],
        },
      });

      const exportData = {
        profile,
        contributions,
        evaluations,
        peerFeedback,
        publications,
        scores,
        auditLogs,
        exportedAt: new Date().toISOString(),
      };

      const jsonContent = JSON.stringify(exportData, null, 2);

      const exportsDir = join(process.cwd(), 'data', 'exports');
      await mkdir(exportsDir, { recursive: true });

      const fileName = `export-${exportRequestId}.json`;
      const filePath = join(exportsDir, fileName);
      await writeFile(filePath, jsonContent);

      const downloadUrl = `/api/v1/contributors/me/data-export/${exportRequestId}/download`;

      await this.prisma.dataExportRequest.update({
        where: { id: exportRequestId },
        data: {
          status: 'READY',
          downloadUrl,
          fileName,
          completedAt: new Date(),
        },
      });

      await this.auditService.log({
        actorId: contributorId,
        action: 'data.export.completed',
        entityType: 'DataExportRequest',
        entityId: exportRequestId,
        correlationId,
      });

      this.logger.log('Data export completed', {
        module: 'gdpr',
        exportRequestId,
        contributorId,
        fileName,
        correlationId,
      });
    } catch (error) {
      this.logger.error('Data export failed', {
        module: 'gdpr',
        exportRequestId,
        contributorId,
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.prisma.dataExportRequest
        .update({
          where: { id: exportRequestId },
          data: {
            status: 'FAILED',
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        })
        .catch(() => {
          /* best effort */
        });

      throw error;
    }
  }
}
