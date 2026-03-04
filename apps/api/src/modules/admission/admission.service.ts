import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ERROR_CODES } from '@edin/shared';
import type {
  Prisma,
  ContributorDomain,
  ApplicationStatus,
  ReviewRecommendation,
} from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import type { CreateApplicationDto } from './dto/create-application.dto.js';
import type { SubmitReviewDto } from './dto/submit-review.dto.js';
import type { ListApplicationsQueryDto } from './dto/list-applications-query.dto.js';

@Injectable()
export class AdmissionService {
  private readonly logger = new Logger(AdmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createApplication(
    dto: CreateApplicationDto,
    correlationId?: string,
    contributorId?: string,
  ) {
    this.logger.log('Creating application', {
      domain: dto.domain,
      hasContributorContext: Boolean(contributorId),
      correlationId,
    });

    const now = new Date();

    let application;
    try {
      application = await this.prisma.$transaction(async (tx) => {
        const created = await tx.application.create({
          data: {
            applicantName: dto.applicantName,
            applicantEmail: dto.applicantEmail,
            domain: dto.domain,
            statementOfInterest: dto.statementOfInterest,
            microTaskDomain: dto.domain,
            microTaskResponse: dto.microTaskResponse,
            microTaskSubmissionUrl: dto.microTaskSubmissionUrl || null,
            gdprConsentVersion: '1.0',
            gdprConsentedAt: now,
            status: 'PENDING',
            contributorId: contributorId || null,
          },
        });

        await tx.consentRecord.create({
          data: {
            entityType: 'Application',
            entityId: created.id,
            consentType: 'GDPR_DATA_PROCESSING',
            consentVersion: '1.0',
            accepted: true,
            acceptedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: contributorId || null,
            action: 'admission.application.submitted',
            entityType: 'Application',
            entityId: created.id,
            details: {
              domain: dto.domain,
              hasContributorContext: Boolean(contributorId),
            },
            correlationId,
          },
        });

        return created;
      });
    } catch (error) {
      if (this.isUniqueConstraintViolation(error, 'applications_applicant_email_key')) {
        throw new DomainException(
          ERROR_CODES.APPLICATION_ALREADY_EXISTS,
          'An application already exists for this email address',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }

    this.logger.log('Application created successfully', {
      applicationId: application.id,
      domain: application.domain,
      correlationId,
    });

    this.eventEmitter.emit('admission.application.submitted', {
      applicationId: application.id,
      applicantEmail: application.applicantEmail,
      domain: application.domain,
      correlationId,
    });

    return application;
  }

  async getApplicationById(applicationId: string, correlationId?: string) {
    this.logger.log('Fetching application status', {
      applicationId,
      correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        status: true,
        declineReason: true,
        createdAt: true,
      },
    });

    if (!application) {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_FOUND,
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return application;
  }

  async getActiveMicroTaskByDomain(domain: string, correlationId?: string) {
    this.logger.log('Fetching micro-task for domain', {
      domain,
      correlationId,
    });

    const microTask = await this.prisma.microTask.findFirst({
      where: {
        domain: domain as ContributorDomain,
        isActive: true,
      },
    });

    if (!microTask) {
      throw new DomainException(
        ERROR_CODES.DOMAIN_MICRO_TASK_NOT_FOUND,
        `No active micro-task found for domain: ${domain}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return microTask;
  }

  async listApplications(filters: ListApplicationsQueryDto, correlationId?: string) {
    this.logger.log('Listing applications', {
      domain: filters.domain,
      status: filters.status,
      cursor: filters.cursor,
      limit: filters.limit,
      correlationId,
    });

    const where: Prisma.ApplicationWhereInput = {};
    if (filters.domain) {
      where.domain = filters.domain as ContributorDomain;
    }
    if (filters.status) {
      where.status = filters.status as ApplicationStatus;
    }

    const take = filters.limit + 1;

    const findManyArgs: Prisma.ApplicationFindManyArgs = {
      where,
      take,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        applicantName: true,
        domain: true,
        status: true,
        createdAt: true,
        reviews: {
          select: {
            id: true,
            reviewer: { select: { id: true, name: true, domain: true } },
            recommendation: true,
          },
        },
      },
    };

    if (filters.cursor) {
      findManyArgs.cursor = { id: filters.cursor };
      findManyArgs.skip = 1;
    }

    const applications = await this.prisma.application.findMany(findManyArgs);

    const hasMore = applications.length > filters.limit;
    const items = hasMore ? applications.slice(0, filters.limit) : applications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const total = await this.prisma.application.count({ where });

    return {
      items,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
      },
    };
  }

  async getApplicationFull(
    applicationId: string,
    correlationId?: string,
    requesterId?: string,
    requesterRole?: string,
  ) {
    this.logger.log('Fetching full application detail', {
      applicationId,
      correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, domain: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        contributor: {
          select: { id: true, name: true, domain: true },
        },
        reviewedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!application) {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_FOUND,
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (requesterRole !== 'ADMIN' && requesterId) {
      const isAssignedReviewer = application.reviews.some(
        (review) => review.reviewerId === requesterId,
      );

      if (!isAssignedReviewer) {
        throw new DomainException(
          ERROR_CODES.AUTHORIZATION_DENIED,
          'You are not authorized to view this application',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    return application;
  }

  async assignReviewer(
    applicationId: string,
    contributorId: string,
    adminId: string,
    correlationId?: string,
  ) {
    this.logger.log('Assigning reviewer to application', {
      applicationId,
      contributorId,
      adminId,
      correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { reviews: { select: { reviewerId: true } } },
    });

    if (!application) {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_FOUND,
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (application.status !== 'PENDING' && application.status !== 'UNDER_REVIEW') {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_REVIEWABLE,
        'Application is not in a reviewable state',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const reviewer = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
    });

    if (!reviewer) {
      throw new DomainException(
        ERROR_CODES.REVIEWER_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const alreadyAssigned = application.reviews.some((r) => r.reviewerId === contributorId);
    if (alreadyAssigned) {
      throw new DomainException(
        ERROR_CODES.REVIEWER_ALREADY_ASSIGNED,
        'This contributor is already assigned as a reviewer',
        HttpStatus.CONFLICT,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const review = await tx.applicationReview.create({
        data: {
          applicationId,
          reviewerId: contributorId,
          recommendation: null,
          feedback: null,
        },
      });

      if (application.status === 'PENDING') {
        await tx.application.update({
          where: { id: applicationId },
          data: { status: 'UNDER_REVIEW' },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'admission.reviewer.assigned',
          entityType: 'Application',
          entityId: applicationId,
          details: { reviewerId: contributorId },
          correlationId,
        },
      });

      return review;
    });

    this.eventEmitter.emit('admission.reviewer.assigned', {
      applicationId,
      reviewerId: contributorId,
      adminId,
      correlationId,
    });

    this.logger.log('Reviewer assigned successfully', {
      applicationId,
      reviewerId: contributorId,
      correlationId,
    });

    return result;
  }

  async submitReview(
    applicationId: string,
    reviewerId: string,
    dto: SubmitReviewDto,
    correlationId?: string,
  ) {
    this.logger.log('Submitting review', {
      applicationId,
      reviewerId,
      recommendation: dto.recommendation,
      correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        reviews: {
          select: { id: true, reviewerId: true, feedback: true, recommendation: true },
        },
      },
    });

    if (!application) {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_FOUND,
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (application.status !== 'UNDER_REVIEW') {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_REVIEWABLE,
        'Application is not under review',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const existingReview = application.reviews.find((r) => r.reviewerId === reviewerId);

    if (!existingReview) {
      throw new DomainException(
        ERROR_CODES.AUTHORIZATION_DENIED,
        'You are not assigned as a reviewer for this application',
        HttpStatus.FORBIDDEN,
      );
    }

    if (existingReview.feedback && existingReview.feedback.length > 0) {
      throw new DomainException(
        ERROR_CODES.APPLICATION_ALREADY_REVIEWED,
        'You have already submitted a review for this application',
        HttpStatus.CONFLICT,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const review = await tx.applicationReview.update({
        where: {
          id: (await tx.applicationReview.findFirst({
            where: { applicationId, reviewerId },
          }))!.id,
        },
        data: {
          recommendation: dto.recommendation as ReviewRecommendation,
          feedback: dto.feedback,
          submittedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'admission.review.submitted',
          entityType: 'Application',
          entityId: applicationId,
          details: { recommendation: dto.recommendation },
          correlationId,
        },
      });

      return review;
    });

    this.eventEmitter.emit('admission.review.submitted', {
      applicationId,
      reviewerId,
      recommendation: dto.recommendation,
      correlationId,
    });

    this.logger.log('Review submitted successfully', {
      applicationId,
      reviewerId,
      recommendation: dto.recommendation,
      correlationId,
    });

    return result;
  }

  async approveApplication(
    applicationId: string,
    adminId: string,
    reason?: string,
    correlationId?: string,
  ) {
    this.logger.log('Approving application', {
      applicationId,
      adminId,
      correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_FOUND,
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (application.status !== 'UNDER_REVIEW') {
      throw new DomainException(
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        `Cannot approve application with status ${application.status}. Application must be UNDER_REVIEW.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          reviewedById: adminId,
          reviewedAt: now,
          ignitionStartedAt: now,
        },
      });

      if (application.contributorId) {
        await tx.contributor.update({
          where: { id: application.contributorId },
          data: { role: 'CONTRIBUTOR' },
        });

        this.logger.log('Contributor role promoted to CONTRIBUTOR', {
          contributorId: application.contributorId,
          applicationId,
          correlationId,
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'admission.application.approved',
          entityType: 'Application',
          entityId: applicationId,
          details: {
            reason: reason || null,
            contributorPromoted: Boolean(application.contributorId),
          },
          correlationId,
        },
      });

      return updated;
    });

    this.eventEmitter.emit('admission.application.approved', {
      applicationId,
      adminId,
      correlationId,
    });

    this.logger.log('Application approved successfully', {
      applicationId,
      adminId,
      correlationId,
    });

    return result;
  }

  async declineApplication(
    applicationId: string,
    adminId: string,
    reason: string,
    correlationId?: string,
  ) {
    this.logger.log('Declining application', {
      applicationId,
      adminId,
      correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_FOUND,
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (application.status !== 'UNDER_REVIEW') {
      throw new DomainException(
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        `Cannot decline application with status ${application.status}. Application must be UNDER_REVIEW.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: 'DECLINED',
          reviewedById: adminId,
          reviewedAt: now,
          declineReason: reason,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'admission.application.declined',
          entityType: 'Application',
          entityId: applicationId,
          details: { reason },
          correlationId,
        },
      });

      return updated;
    });

    this.eventEmitter.emit('admission.application.declined', {
      applicationId,
      adminId,
      correlationId,
    });

    this.logger.log('Application declined', {
      applicationId,
      adminId,
      correlationId,
    });

    return result;
  }

  async requestMoreInfo(
    applicationId: string,
    adminId: string,
    reason: string,
    correlationId?: string,
  ) {
    this.logger.log('Requesting more information for application', {
      applicationId,
      adminId,
      correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new DomainException(
        ERROR_CODES.APPLICATION_NOT_FOUND,
        'Application not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (application.status !== 'UNDER_REVIEW') {
      throw new DomainException(
        ERROR_CODES.INVALID_STATUS_TRANSITION,
        `Cannot request more info for application with status ${application.status}. Application must be UNDER_REVIEW.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'admission.application.info.requested',
        entityType: 'Application',
        entityId: applicationId,
        details: { reason },
        correlationId,
      },
    });

    this.eventEmitter.emit('admission.application.info.requested', {
      applicationId,
      adminId,
      reason,
      correlationId,
    });

    return application;
  }

  async getMyReviews(reviewerId: string, correlationId?: string) {
    this.logger.log('Fetching reviews assigned to contributor', {
      reviewerId,
      correlationId,
    });

    const reviews = await this.prisma.applicationReview.findMany({
      where: { reviewerId },
      include: {
        application: {
          select: {
            id: true,
            applicantName: true,
            domain: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return reviews;
  }

  async listAvailableReviewers(domain?: string, correlationId?: string) {
    this.logger.log('Listing available reviewers', {
      domain,
      correlationId,
    });

    const where: Prisma.ContributorWhereInput = {
      isActive: true,
      role: {
        in: ['CONTRIBUTOR', 'EDITOR', 'FOUNDING_CONTRIBUTOR', 'WORKING_GROUP_LEAD', 'ADMIN'],
      },
    };

    const reviewers = await this.prisma.contributor.findMany({
      where,
      select: {
        id: true,
        name: true,
        domain: true,
        avatarUrl: true,
      },
      orderBy: [{ name: 'asc' as const }],
    });

    if (!domain) {
      return reviewers;
    }

    return reviewers.sort((a, b) => {
      const aScore = a.domain === domain ? 0 : 1;
      const bScore = b.domain === domain ? 0 : 1;

      if (aScore !== bScore) {
        return aScore - bScore;
      }

      return a.name.localeCompare(b.name);
    });
  }

  private isUniqueConstraintViolation(error: unknown, constraintName?: string): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const prismaError = error as Prisma.PrismaClientKnownRequestError & {
      meta?: { target?: string[] | string };
    };

    if (prismaError.code !== 'P2002') {
      return false;
    }

    if (!constraintName) {
      return true;
    }

    const target = prismaError.meta?.target;
    if (Array.isArray(target)) {
      return target.includes(constraintName) || target.includes('applicant_email');
    }

    if (typeof target === 'string') {
      return target.includes(constraintName) || target.includes('applicant_email');
    }

    return false;
  }
}
