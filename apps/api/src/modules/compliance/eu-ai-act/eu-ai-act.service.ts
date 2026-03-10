import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ERROR_CODES } from '@edin/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { AuditService } from '../audit/audit.service.js';

export interface ComplianceDocumentDto {
  id: string;
  documentType: string;
  version: number;
  format: string;
  generatedAt: string;
  legalReviewedAt: string | null;
  legalReviewedBy: string | null;
  reviewNotes: string | null;
  retiredAt: string | null;
  correlationId: string | null;
}

export interface ComplianceDocumentDetailDto extends ComplianceDocumentDto {
  content: unknown;
}

@Injectable()
export class EuAiActService {
  private readonly logger = new Logger(EuAiActService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async generateDocument(
    documentType: string,
    correlationId: string,
  ): Promise<ComplianceDocumentDetailDto> {
    this.logger.log('Generating compliance document', {
      module: 'compliance',
      documentType,
      correlationId,
    });

    let content: Record<string, unknown>;

    switch (documentType) {
      case 'MODEL_CARD': {
        const models = await this.prisma.evaluationModel.findMany({
          orderBy: { createdAt: 'desc' },
        });
        content = {
          documentType: 'MODEL_CARD',
          title: 'AI Model Cards — Edin Platform',
          generatedAt: new Date().toISOString(),
          models: models.map((m) => ({
            id: m.id,
            name: m.name,
            version: m.version,
            provider: m.provider,
            status: m.status,
            configHash: m.configHash,
            deployedAt: m.deployedAt?.toISOString() ?? null,
            retiredAt: m.retiredAt?.toISOString() ?? null,
            createdAt: m.createdAt.toISOString(),
          })),
          purpose: 'Automated evaluation of contributor code and documentation submissions',
          riskClassification: 'Limited risk — decision support for human reviewers',
        };
        break;
      }
      case 'EVALUATION_CRITERIA': {
        const rubrics = await this.prisma.evaluationRubric.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        });
        const latestFormula = await this.prisma.scoringFormulaVersion.findFirst({
          orderBy: { version: 'desc' },
        });
        content = {
          documentType: 'EVALUATION_CRITERIA',
          title: 'Evaluation Criteria and Scoring Methodology',
          generatedAt: new Date().toISOString(),
          rubrics: rubrics.map((r) => ({
            id: r.id,
            evaluationType: r.evaluationType,
            documentType: r.documentType,
            version: r.version,
            isActive: r.isActive,
            parameters: r.parameters,
            createdAt: r.createdAt.toISOString(),
          })),
          scoringFormula: latestFormula
            ? {
                id: latestFormula.id,
                version: latestFormula.version,
                aiEvalWeight: Number(latestFormula.aiEvalWeight),
                peerFeedbackWeight: Number(latestFormula.peerFeedbackWeight),
                complexityWeight: Number(latestFormula.complexityWeight),
                domainNormWeight: Number(latestFormula.domainNormWeight),
                effectiveFrom: latestFormula.effectiveFrom.toISOString(),
                effectiveTo: latestFormula.effectiveTo?.toISOString() ?? null,
              }
            : null,
        };
        break;
      }
      case 'HUMAN_OVERSIGHT_REPORT': {
        const reviewsByStatus = await this.prisma.evaluationReview.groupBy({
          by: ['status'],
          _count: { id: true },
        });
        const resolvedReviews = await this.prisma.evaluationReview.findMany({
          where: { status: { in: ['CONFIRMED', 'OVERRIDDEN'] }, resolvedAt: { not: null } },
          select: { flaggedAt: true, resolvedAt: true },
        });
        let avgResolutionTimeMs: number | null = null;
        if (resolvedReviews.length > 0) {
          const totalMs = resolvedReviews.reduce((sum, r) => {
            return sum + (r.resolvedAt!.getTime() - r.flaggedAt.getTime());
          }, 0);
          avgResolutionTimeMs = totalMs / resolvedReviews.length;
        }
        content = {
          documentType: 'HUMAN_OVERSIGHT_REPORT',
          title: 'Human Oversight Report — Evaluation Reviews',
          generatedAt: new Date().toISOString(),
          reviewCountByStatus: reviewsByStatus.map((r) => ({
            status: r.status,
            count: r._count.id,
          })),
          totalReviewed: resolvedReviews.length,
          averageResolutionTimeMs: avgResolutionTimeMs,
          averageResolutionTimeHours: avgResolutionTimeMs
            ? Math.round((avgResolutionTimeMs / (1000 * 60 * 60)) * 100) / 100
            : null,
          purpose: 'Demonstrates human-in-the-loop oversight of AI-generated evaluations',
        };
        break;
      }
      case 'DATA_PROCESSING_RECORD': {
        content = {
          documentType: 'DATA_PROCESSING_RECORD',
          title: 'Data Processing Record — Edin Platform',
          generatedAt: new Date().toISOString(),
          dataController: 'Edin Platform',
          processingActivities: [
            {
              activity: 'Contributor profile management',
              dataCategories: ['name', 'email', 'GitHub username', 'avatar URL', 'bio'],
              legalBasis: 'Consent (GDPR Art. 6(1)(a))',
              retentionPeriod: 'Until account deletion or data erasure request',
            },
            {
              activity: 'Contribution ingestion and evaluation',
              dataCategories: ['code contributions', 'pull requests', 'documentation'],
              legalBasis: 'Legitimate interest (GDPR Art. 6(1)(f))',
              retentionPeriod: 'Duration of platform membership',
            },
            {
              activity: 'AI-assisted evaluation scoring',
              dataCategories: ['contribution content', 'evaluation scores', 'narratives'],
              legalBasis: 'Consent with right to human review (GDPR Art. 22)',
              retentionPeriod: 'Duration of platform membership',
            },
            {
              activity: 'Peer feedback collection',
              dataCategories: ['ratings', 'comments'],
              legalBasis: 'Legitimate interest (GDPR Art. 6(1)(f))',
              retentionPeriod: 'Duration of platform membership',
            },
          ],
          dataSubjectRights: [
            'Right of access (Art. 15)',
            'Right to rectification (Art. 16)',
            'Right to erasure (Art. 17)',
            'Right to data portability (Art. 20)',
            'Right to object to automated decision-making (Art. 22)',
          ],
        };
        break;
      }
      default: {
        content = {
          documentType,
          title: `Compliance Document — ${documentType}`,
          generatedAt: new Date().toISOString(),
        };
        break;
      }
    }

    content.legalReviewStatus = 'PENDING';
    content.legalReviewWatermark = 'LEGAL REVIEW PENDING — Not approved for external distribution';

    const latestDoc = await this.prisma.complianceDocument.findFirst({
      where: { documentType },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latestDoc?.version ?? 0) + 1;

    const document = await this.prisma.complianceDocument.create({
      data: {
        id: randomUUID(),
        documentType,
        version: nextVersion,
        content: JSON.stringify(content),
        format: 'json',
        correlationId,
      },
    });

    await this.auditService.log({
      actorId: null,
      action: 'compliance.document.generated',
      entityType: 'ComplianceDocument',
      entityId: document.id,
      details: { documentType, version: nextVersion },
      correlationId,
    });

    this.logger.log('Compliance document generated', {
      module: 'compliance',
      documentId: document.id,
      documentType,
      version: nextVersion,
      correlationId,
    });

    return this.toDetailDto(document);
  }

  async listDocuments(
    cursor?: string,
    limit: number = 20,
  ): Promise<{ items: ComplianceDocumentDto[]; nextCursor: string | null }> {
    const take = Math.min(limit, 100);

    const documents = await this.prisma.complianceDocument.findMany({
      take: take + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      orderBy: { generatedAt: 'desc' },
    });

    const hasMore = documents.length > take;
    const items = hasMore ? documents.slice(0, take) : documents;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      items: items.map((doc) => this.toDto(doc)),
      nextCursor,
    };
  }

  async getDocument(docId: string): Promise<ComplianceDocumentDetailDto> {
    const document = await this.prisma.complianceDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      throw new DomainException(
        ERROR_CODES.COMPLIANCE_DOCUMENT_NOT_FOUND,
        'Compliance document not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toDetailDto(document);
  }

  async reviewDocument(
    docId: string,
    reviewerId: string,
    reviewNotes: string,
    correlationId: string,
  ): Promise<ComplianceDocumentDetailDto> {
    const document = await this.prisma.complianceDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      throw new DomainException(
        ERROR_CODES.COMPLIANCE_DOCUMENT_NOT_FOUND,
        'Compliance document not found',
        HttpStatus.NOT_FOUND,
      );
    }

    let updatedContent = document.content;
    try {
      const parsed = JSON.parse(document.content) as Record<string, unknown>;
      parsed.legalReviewStatus = 'REVIEWED';
      delete parsed.legalReviewWatermark;
      updatedContent = JSON.stringify(parsed);
    } catch {
      /* keep original content if not parseable */
    }

    const updated = await this.prisma.complianceDocument.update({
      where: { id: docId },
      data: {
        legalReviewedAt: new Date(),
        legalReviewedBy: reviewerId,
        reviewNotes,
        content: updatedContent,
      },
    });

    await this.auditService.log({
      actorId: reviewerId,
      action: 'compliance.document.reviewed',
      entityType: 'ComplianceDocument',
      entityId: docId,
      details: { reviewNotes },
      correlationId,
    });

    this.logger.log('Compliance document reviewed', {
      module: 'compliance',
      documentId: docId,
      reviewerId,
      correlationId,
    });

    return this.toDetailDto(updated);
  }

  private toDto(doc: {
    id: string;
    documentType: string;
    version: number;
    format: string;
    generatedAt: Date;
    legalReviewedAt: Date | null;
    legalReviewedBy: string | null;
    reviewNotes: string | null;
    retiredAt: Date | null;
    correlationId: string | null;
  }): ComplianceDocumentDto {
    return {
      id: doc.id,
      documentType: doc.documentType,
      version: doc.version,
      format: doc.format,
      generatedAt: doc.generatedAt.toISOString(),
      legalReviewedAt: doc.legalReviewedAt?.toISOString() ?? null,
      legalReviewedBy: doc.legalReviewedBy ?? null,
      reviewNotes: doc.reviewNotes ?? null,
      retiredAt: doc.retiredAt?.toISOString() ?? null,
      correlationId: doc.correlationId ?? null,
    };
  }

  private toDetailDto(doc: {
    id: string;
    documentType: string;
    version: number;
    content: string;
    format: string;
    generatedAt: Date;
    legalReviewedAt: Date | null;
    legalReviewedBy: string | null;
    reviewNotes: string | null;
    retiredAt: Date | null;
    correlationId: string | null;
  }): ComplianceDocumentDetailDto {
    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(doc.content);
    } catch {
      parsedContent = doc.content;
    }

    return {
      ...this.toDto(doc),
      content: parsedContent,
    };
  }
}
