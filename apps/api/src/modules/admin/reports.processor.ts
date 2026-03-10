import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { ReportConfig } from '@edin/shared';
import { KPI_DEFINITIONS } from '@edin/shared';

interface ReportJobData {
  config: ReportConfig;
  createdBy: string;
}

interface KpiDataRow {
  kpiId: string;
  label: string;
  category: string;
  value: number | null;
  target: number | null;
  unit: string;
}

@Processor('admin-reports')
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ReportJobData>): Promise<{ filePath: string; completedAt: string }> {
    const { config, createdBy } = job.data;
    this.logger.log(`Processing report ${job.id} for user ${createdBy}`);

    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);

    const rows = await this.gatherKpiData(config.kpiIds, startDate, endDate);

    const reportsDir = join(process.cwd(), 'data', 'reports');
    if (!existsSync(reportsDir)) {
      await mkdir(reportsDir, { recursive: true });
    }

    const ext = config.format;
    const filePath = join(reportsDir, `${job.id}.${ext}`);

    if (ext === 'json') {
      await writeFile(
        filePath,
        JSON.stringify(
          {
            reportId: job.id,
            generatedAt: new Date().toISOString(),
            dateRange: { start: config.startDate, end: config.endDate },
            data: rows,
          },
          null,
          2,
        ),
      );
    } else {
      const csvEscape = (v: string | number | null): string => {
        const s = v === null ? 'N/A' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };
      const header = 'KPI ID,Label,Category,Value,Target,Unit\n';
      const csvRows = rows
        .map((r) =>
          [r.kpiId, r.label, r.category, r.value, r.target, r.unit].map(csvEscape).join(','),
        )
        .join('\n');
      await writeFile(filePath, header + csvRows);
    }

    const completedAt = new Date().toISOString();
    this.logger.log(`Report ${job.id} completed: ${filePath}`);

    return { filePath, completedAt };
  }

  private async gatherKpiData(
    kpiIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<KpiDataRow[]> {
    const rows: KpiDataRow[] = [];

    for (const kpiId of kpiIds) {
      const definition = KPI_DEFINITIONS.find((k) => k.id === kpiId);
      if (!definition) continue;

      const value = await this.computeKpiValue(kpiId, startDate, endDate);

      rows.push({
        kpiId,
        label: definition.label,
        category: definition.category,
        value,
        target: definition.target,
        unit: definition.unit,
      });
    }

    return rows;
  }

  private async computeKpiValue(
    kpiId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number | null> {
    switch (kpiId) {
      case 'application-rate': {
        const count = await this.prisma.application.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        });
        const weeks = Math.max(
          1,
          (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return Math.round((count / weeks) * 10) / 10;
      }
      case 'active-contributor-count':
        return this.prisma.contributor.count({
          where: { isActive: true, createdAt: { lte: endDate } },
        });
      case 'contribution-frequency': {
        const contributions = await this.prisma.contribution.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        });
        const active = await this.prisma.contributor.count({ where: { isActive: true } });
        const weeks = Math.max(
          1,
          (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return active > 0 ? Math.round((contributions / active / weeks) * 10) / 10 : 0;
      }
      case 'publication-submission-rate': {
        const articles = await this.prisma.article.count({
          where: { submittedAt: { gte: startDate, lte: endDate } },
        });
        const weeks = Math.max(
          1,
          (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        return Math.round((articles / weeks) * 10) / 10;
      }
      case 'contribution-quality-trend': {
        const avg = await this.prisma.evaluation.aggregate({
          where: { status: 'COMPLETED', completedAt: { gte: startDate, lte: endDate } },
          _avg: { compositeScore: true },
        });
        return avg._avg.compositeScore
          ? Math.round(Number(avg._avg.compositeScore) * 10) / 10
          : null;
      }
      case '30-day-retention': {
        const thirtyDaysBefore = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const joined = await this.prisma.contributor.count({
          where: { createdAt: { gte: startDate, lte: thirtyDaysBefore }, role: { not: 'PUBLIC' } },
        });
        const retained = await this.prisma.contributor.count({
          where: {
            createdAt: { gte: startDate, lte: thirtyDaysBefore },
            role: { not: 'PUBLIC' },
            isActive: true,
          },
        });
        return joined > 0 ? Math.round((retained / joined) * 100) : 0;
      }
      case 'author-to-editor-conversion': {
        const total = await this.prisma.contributor.count({
          where: { role: { not: 'PUBLIC' }, isActive: true },
        });
        const editors = await this.prisma.contributor.count({
          where: { role: 'EDITOR', isActive: true },
        });
        return total > 0 ? Math.round((editors / total) * 100) : 0;
      }
      default:
        return null;
    }
  }
}
