import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ERROR_CODES } from '@edin/shared';
import type {
  Prisma,
  ContributorDomain,
  ApplicationStatus,
  ReviewRecommendation,
  OnboardingMilestoneType,
} from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import type { CreateApplicationDto } from './dto/create-application.dto.js';
import type { SubmitReviewDto } from './dto/submit-review.dto.js';
import type { ListApplicationsQueryDto } from './dto/list-applications-query.dto.js';
import type { CreateMicroTaskDto } from './dto/create-micro-task.dto.js';
import type { UpdateMicroTaskDto } from './dto/update-micro-task.dto.js';
import type { ListMicroTasksQueryDto } from './dto/list-micro-tasks-query.dto.js';
import type { OverrideBuddyDto } from './dto/override-buddy.dto.js';
import type { ListBuddyAssignmentsQueryDto } from './dto/list-buddy-assignments-query.dto.js';

@Injectable()
export class AdmissionService {
  private readonly logger = new Logger(AdmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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

        await this.auditService.log(
          {
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
          tx,
        );

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

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'admission.reviewer.assigned',
          entityType: 'Application',
          entityId: applicationId,
          details: { reviewerId: contributorId },
          correlationId,
        },
        tx,
      );

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

      await this.auditService.log(
        {
          actorId: reviewerId,
          action: 'admission.review.submitted',
          entityType: 'Application',
          entityId: applicationId,
          details: { recommendation: dto.recommendation },
          correlationId,
        },
        tx,
      );

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

      await this.auditService.log(
        {
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
        tx,
      );

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

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'admission.application.declined',
          entityType: 'Application',
          entityId: applicationId,
          details: { reason },
          correlationId,
        },
        tx,
      );

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

    await this.auditService.log({
      actorId: adminId,
      action: 'admission.application.info.requested',
      entityType: 'Application',
      entityId: applicationId,
      details: { reason },
      correlationId,
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

  // ─── Micro-task admin methods (Story 3-3) ─────────────────────────────

  async listMicroTasks(filters: ListMicroTasksQueryDto, correlationId?: string) {
    this.logger.log('Listing micro-tasks', {
      domain: filters.domain,
      isActive: filters.isActive,
      cursor: filters.cursor,
      limit: filters.limit,
      correlationId,
    });

    const where: Prisma.MicroTaskWhereInput = {};
    if (filters.domain) {
      where.domain = filters.domain as ContributorDomain;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const take = filters.limit + 1;

    const findManyArgs: Prisma.MicroTaskFindManyArgs = {
      where,
      take,
      orderBy: [{ domain: 'asc' }, { createdAt: 'desc' }],
    };

    if (filters.cursor) {
      findManyArgs.cursor = { id: filters.cursor };
      findManyArgs.skip = 1;
    }

    const microTasks = await this.prisma.microTask.findMany(findManyArgs);

    const hasMore = microTasks.length > filters.limit;
    const items = hasMore ? microTasks.slice(0, filters.limit) : microTasks;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const total = await this.prisma.microTask.count({ where });

    return {
      items,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
      },
    };
  }

  async createMicroTask(dto: CreateMicroTaskDto, adminId: string, correlationId?: string) {
    this.logger.log('Creating micro-task', {
      domain: dto.domain,
      adminId,
      correlationId,
    });

    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        // Auto-deactivate existing active task for same domain
        const existingActive = await tx.microTask.findFirst({
          where: { domain: dto.domain as ContributorDomain, isActive: true },
        });

        if (existingActive) {
          await tx.microTask.update({
            where: { id: existingActive.id },
            data: { isActive: false, deactivatedAt: new Date() },
          });

          this.logger.log('Auto-deactivated previous active micro-task', {
            deactivatedId: existingActive.id,
            domain: dto.domain,
            correlationId,
          });
        }

        const created = await tx.microTask.create({
          data: {
            domain: dto.domain as ContributorDomain,
            title: dto.title,
            description: dto.description,
            expectedDeliverable: dto.expectedDeliverable,
            estimatedEffort: dto.estimatedEffort,
            submissionFormat: dto.submissionFormat,
            isActive: true,
          },
        });

        await this.auditService.log(
          {
            actorId: adminId,
            action: 'admission.microtask.created',
            entityType: 'MicroTask',
            entityId: created.id,
            details: {
              domain: dto.domain,
              title: dto.title,
              previousActiveDeactivated: existingActive?.id ?? null,
            },
            correlationId,
          },
          tx,
        );

        return created;
      });
    } catch (error) {
      if (this.isUniqueConstraintViolation(error, 'micro_tasks_one_active_per_domain')) {
        throw new DomainException(
          ERROR_CODES.MICRO_TASK_DOMAIN_ACTIVE_EXISTS,
          `An active micro-task already exists for domain ${dto.domain}`,
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

    this.eventEmitter.emit('admission.microtask.created', {
      microTaskId: result.id,
      domain: dto.domain,
      adminId,
      correlationId,
    });

    this.logger.log('Micro-task created successfully', {
      microTaskId: result.id,
      domain: dto.domain,
      correlationId,
    });

    return result;
  }

  async updateMicroTask(
    id: string,
    dto: UpdateMicroTaskDto,
    adminId: string,
    correlationId?: string,
  ) {
    this.logger.log('Updating micro-task', {
      microTaskId: id,
      adminId,
      correlationId,
    });

    const existing = await this.prisma.microTask.findUnique({ where: { id } });
    if (!existing) {
      throw new DomainException(
        ERROR_CODES.MICRO_TASK_NOT_FOUND,
        'Micro-task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        // If activating, auto-deactivate existing active task for same domain
        if (dto.isActive === true && !existing.isActive) {
          const currentActive = await tx.microTask.findFirst({
            where: {
              domain: existing.domain,
              isActive: true,
              id: { not: id },
            },
          });

          if (currentActive) {
            await tx.microTask.update({
              where: { id: currentActive.id },
              data: { isActive: false, deactivatedAt: new Date() },
            });

            this.logger.log('Auto-deactivated previous active micro-task during update', {
              deactivatedId: currentActive.id,
              domain: existing.domain,
              correlationId,
            });
          }
        }

        const updateData: Prisma.MicroTaskUpdateInput = {};
        if (dto.title !== undefined) updateData.title = dto.title;
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.expectedDeliverable !== undefined)
          updateData.expectedDeliverable = dto.expectedDeliverable;
        if (dto.estimatedEffort !== undefined) updateData.estimatedEffort = dto.estimatedEffort;
        if (dto.submissionFormat !== undefined) updateData.submissionFormat = dto.submissionFormat;
        if (dto.isActive !== undefined) {
          updateData.isActive = dto.isActive;
          if (!dto.isActive) {
            updateData.deactivatedAt = new Date();
          } else if (dto.isActive && !existing.isActive) {
            updateData.deactivatedAt = null;
          }
        }

        const updated = await tx.microTask.update({
          where: { id },
          data: updateData,
        });

        await this.auditService.log(
          {
            actorId: adminId,
            action: 'admission.microtask.updated',
            entityType: 'MicroTask',
            entityId: id,
            details: {
              changedFields: Object.keys(dto),
            },
            correlationId,
          },
          tx,
        );

        return updated;
      });
    } catch (error) {
      if (this.isUniqueConstraintViolation(error, 'micro_tasks_one_active_per_domain')) {
        throw new DomainException(
          ERROR_CODES.MICRO_TASK_DOMAIN_ACTIVE_EXISTS,
          `An active micro-task already exists for domain ${existing.domain}`,
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }

    this.eventEmitter.emit('admission.microtask.updated', {
      microTaskId: id,
      adminId,
      correlationId,
    });

    this.logger.log('Micro-task updated successfully', {
      microTaskId: id,
      correlationId,
    });

    return result;
  }

  async deactivateMicroTask(id: string, adminId: string, correlationId?: string) {
    this.logger.log('Deactivating micro-task', {
      microTaskId: id,
      adminId,
      correlationId,
    });

    const existing = await this.prisma.microTask.findUnique({ where: { id } });
    if (!existing) {
      throw new DomainException(
        ERROR_CODES.MICRO_TASK_NOT_FOUND,
        'Micro-task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!existing.isActive) {
      return existing;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.microTask.update({
        where: { id },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      });

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'admission.microtask.deactivated',
          entityType: 'MicroTask',
          entityId: id,
          details: {
            domain: existing.domain,
          },
          correlationId,
        },
        tx,
      );

      return updated;
    });

    this.eventEmitter.emit('admission.microtask.deactivated', {
      microTaskId: id,
      domain: existing.domain,
      adminId,
      correlationId,
    });

    this.logger.log('Micro-task deactivated', {
      microTaskId: id,
      domain: existing.domain,
      correlationId,
    });

    return result;
  }

  async getMicroTaskById(id: string, correlationId?: string) {
    this.logger.log('Fetching micro-task by ID', {
      microTaskId: id,
      correlationId,
    });

    const microTask = await this.prisma.microTask.findUnique({ where: { id } });

    if (!microTask) {
      throw new DomainException(
        ERROR_CODES.MICRO_TASK_NOT_FOUND,
        'Micro-task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return microTask;
  }

  // ─── Buddy assignment methods (Story 3-4) ────────────────────────────

  async assignBuddy(contributorId: string, correlationId?: string) {
    this.logger.log('Assigning buddy to contributor', {
      contributorId,
      correlationId,
    });

    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: { id: true, domain: true, role: true },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // Check if already has an active buddy
    const existingAssignment = await this.prisma.buddyAssignment.findFirst({
      where: { contributorId, isActive: true },
    });

    if (existingAssignment) {
      throw new DomainException(
        ERROR_CODES.BUDDY_ALREADY_ASSIGNED,
        'Contributor already has an active buddy assignment',
        HttpStatus.CONFLICT,
      );
    }

    // Find eligible buddy
    const eligibleBuddies = await this.getEligibleBuddies(
      contributor.domain || undefined,
      contributorId,
    );

    if (eligibleBuddies.length === 0) {
      this.logger.warn('No eligible buddies found', {
        contributorId,
        domain: contributor.domain,
        correlationId,
      });
      return null;
    }

    const selectedBuddy = eligibleBuddies[0];
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const result = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.buddyAssignment.create({
        data: {
          contributorId,
          buddyId: selectedBuddy.id,
          expiresAt,
          isActive: true,
        },
        include: {
          buddy: {
            select: { id: true, name: true, bio: true, avatarUrl: true, domain: true },
          },
        },
      });

      await this.auditService.log(
        {
          actorId: null,
          action: 'admission.buddy.assigned',
          entityType: 'BuddyAssignment',
          entityId: assignment.id,
          details: {
            contributorId,
            buddyId: selectedBuddy.id,
            domain: contributor.domain,
            isAutomatic: true,
          },
          correlationId,
        },
        tx,
      );

      return assignment;
    });

    this.eventEmitter.emit('admission.buddy.assigned', {
      contributorId,
      buddyId: selectedBuddy.id,
      domain: contributor.domain,
      isAutomatic: true,
      correlationId,
    });

    this.logger.log('Buddy assigned successfully', {
      assignmentId: result.id,
      contributorId,
      buddyId: selectedBuddy.id,
      correlationId,
    });

    return result;
  }

  async overrideBuddyAssignment(
    assignmentId: string,
    dto: OverrideBuddyDto,
    adminId: string,
    correlationId?: string,
  ) {
    this.logger.log('Overriding buddy assignment', {
      assignmentId,
      newBuddyId: dto.newBuddyId,
      adminId,
      correlationId,
    });

    const existing = await this.prisma.buddyAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!existing) {
      throw new DomainException(
        ERROR_CODES.BUDDY_NOT_FOUND,
        'Buddy assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const newBuddy = await this.prisma.contributor.findUnique({
      where: { id: dto.newBuddyId },
      select: { id: true, isActive: true },
    });

    if (!newBuddy || !newBuddy.isActive) {
      throw new DomainException(
        ERROR_CODES.BUDDY_NOT_FOUND,
        'New buddy not found or inactive',
        HttpStatus.NOT_FOUND,
      );
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      // Deactivate the old assignment
      await tx.buddyAssignment.update({
        where: { id: assignmentId },
        data: { isActive: false },
      });

      // Create new assignment
      const newAssignment = await tx.buddyAssignment.create({
        data: {
          contributorId: existing.contributorId,
          buddyId: dto.newBuddyId,
          expiresAt,
          isActive: true,
          notes: `Admin override by ${adminId}`,
        },
        include: {
          buddy: {
            select: { id: true, name: true, bio: true, avatarUrl: true, domain: true },
          },
        },
      });

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'admission.buddy.overridden',
          entityType: 'BuddyAssignment',
          entityId: newAssignment.id,
          details: {
            previousAssignmentId: assignmentId,
            previousBuddyId: existing.buddyId,
            newBuddyId: dto.newBuddyId,
            contributorId: existing.contributorId,
          },
          correlationId,
        },
        tx,
      );

      return newAssignment;
    });

    this.eventEmitter.emit('admission.buddy.overridden', {
      assignmentId: result.id,
      previousBuddyId: existing.buddyId,
      newBuddyId: dto.newBuddyId,
      contributorId: existing.contributorId,
      adminId,
      correlationId,
    });

    this.logger.log('Buddy assignment overridden', {
      newAssignmentId: result.id,
      contributorId: existing.contributorId,
      correlationId,
    });

    return result;
  }

  async getBuddyAssignment(contributorId: string) {
    const assignment = await this.prisma.buddyAssignment.findFirst({
      where: { contributorId, isActive: true },
      include: {
        buddy: {
          select: { id: true, name: true, bio: true, avatarUrl: true, domain: true },
        },
      },
    });

    if (!assignment) {
      return null;
    }

    // Check expiry — treat expired as "completed" not "expired"
    const isExpired = new Date() > new Date(assignment.expiresAt);

    return {
      ...assignment,
      isExpired,
    };
  }

  async listBuddyAssignments(filters: ListBuddyAssignmentsQueryDto, correlationId?: string) {
    this.logger.log('Listing buddy assignments', {
      domain: filters.domain,
      isActive: filters.isActive,
      cursor: filters.cursor,
      limit: filters.limit,
      correlationId,
    });

    const where: Prisma.BuddyAssignmentWhereInput = {};
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.domain) {
      where.contributor = { domain: filters.domain as ContributorDomain };
    }

    const take = filters.limit + 1;

    const findManyArgs: Prisma.BuddyAssignmentFindManyArgs = {
      where,
      take,
      orderBy: { assignedAt: 'desc' },
      include: {
        contributor: {
          select: { id: true, name: true, domain: true, avatarUrl: true },
        },
        buddy: {
          select: { id: true, name: true, domain: true, avatarUrl: true },
        },
      },
    };

    if (filters.cursor) {
      findManyArgs.cursor = { id: filters.cursor };
      findManyArgs.skip = 1;
    }

    const assignments = await this.prisma.buddyAssignment.findMany(findManyArgs);

    const hasMore = assignments.length > filters.limit;
    const items = hasMore ? assignments.slice(0, filters.limit) : assignments;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const total = await this.prisma.buddyAssignment.count({ where });

    return {
      items,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
      },
    };
  }

  async updateBuddyOptIn(contributorId: string, optIn: boolean, correlationId?: string) {
    this.logger.log('Updating buddy opt-in', {
      contributorId,
      optIn,
      correlationId,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.contributor.update({
        where: { id: contributorId },
        data: { buddyOptIn: optIn },
        select: { id: true, buddyOptIn: true },
      });

      await this.auditService.log(
        {
          actorId: contributorId,
          action: 'admission.buddy.optin.changed',
          entityType: 'Contributor',
          entityId: contributorId,
          details: { optIn },
          correlationId,
        },
        tx,
      );

      return updated;
    });

    this.logger.log('Buddy opt-in updated', {
      contributorId,
      optIn,
      correlationId,
    });

    return result;
  }

  async getEligibleBuddies(domain?: string, excludeContributorId?: string) {
    const where: Prisma.ContributorWhereInput = {
      buddyOptIn: true,
      isActive: true,
      role: {
        in: ['CONTRIBUTOR', 'EDITOR', 'FOUNDING_CONTRIBUTOR', 'WORKING_GROUP_LEAD', 'ADMIN'],
      },
    };

    if (excludeContributorId) {
      where.id = { not: excludeContributorId };
    }

    const buddies = await this.prisma.contributor.findMany({
      where,
      select: {
        id: true,
        name: true,
        bio: true,
        avatarUrl: true,
        domain: true,
      },
    });

    // Sort: domain match first, then random within each group
    if (domain) {
      const domainMatch = buddies.filter((b) => b.domain === domain);
      const otherDomain = buddies.filter((b) => b.domain !== domain);

      // Shuffle each group
      this.shuffleArray(domainMatch);
      this.shuffleArray(otherDomain);

      return [...domainMatch, ...otherDomain];
    }

    this.shuffleArray(buddies);
    return buddies;
  }

  // ─── First task recommendation (Story 3-4) ──────────────────────────

  async getFirstTaskRecommendation(contributorId: string) {
    this.logger.log('Getting first task recommendation', { contributorId });

    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: { domain: true, skillAreas: true },
    });

    if (!contributor || !contributor.domain) {
      return null;
    }

    const microTasks = await this.prisma.microTask.findMany({
      where: {
        domain: contributor.domain,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (microTasks.length === 0) {
      return null;
    }

    const skillAreasCount = contributor.skillAreas?.length ?? 0;
    const targetHours = this.inferTargetEffortHours(skillAreasCount);

    const selectedTask = microTasks.reduce((best, candidate) => {
      const bestHours = this.parseEstimatedEffortHours(best.estimatedEffort);
      const candidateHours = this.parseEstimatedEffortHours(candidate.estimatedEffort);

      if (bestHours === null && candidateHours !== null) {
        return candidate;
      }
      if (bestHours !== null && candidateHours === null) {
        return best;
      }
      if (bestHours === null && candidateHours === null) {
        return best;
      }

      const resolvedBestHours = bestHours as number;
      const resolvedCandidateHours = candidateHours as number;

      return Math.abs(resolvedCandidateHours - targetHours) <
        Math.abs(resolvedBestHours - targetHours)
        ? candidate
        : best;
    });

    return {
      taskTitle: selectedTask.title,
      taskDescription: selectedTask.description,
      estimatedEffort: selectedTask.estimatedEffort,
      domain: selectedTask.domain,
      claimable: false, // Stub — Epic 5 will add real task claiming
    };
  }

  // ─── Event listener for auto-assignment (Story 3-4) ──────────────────

  @OnEvent('admission.application.approved')
  async handleApplicationApproved(payload: {
    applicationId: string;
    adminId: string;
    correlationId?: string;
  }) {
    this.logger.log('Handling application approval for buddy assignment', {
      applicationId: payload.applicationId,
      correlationId: payload.correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: payload.applicationId },
      select: { contributorId: true },
    });

    if (!application?.contributorId) {
      this.logger.warn('No contributor linked to approved application', {
        applicationId: payload.applicationId,
      });
      return;
    }

    try {
      const assignment = await this.assignBuddy(application.contributorId, payload.correlationId);

      if (!assignment) {
        this.logger.warn('No eligible buddies for auto-assignment, contributor can still onboard', {
          contributorId: application.contributorId,
          correlationId: payload.correlationId,
        });

        // Store notification intent in audit log
        await this.auditService.log({
          actorId: null,
          action: 'admission.buddy.assignment.skipped',
          entityType: 'Application',
          entityId: payload.applicationId,
          details: {
            contributorId: application.contributorId,
            reason: 'no_eligible_buddies',
          },
          correlationId: payload.correlationId,
        });
      } else {
        // Store buddy notification payload for future delivery
        await this.auditService.log({
          actorId: null,
          action: 'admission.buddy.notification.pending',
          entityType: 'BuddyAssignment',
          entityId: assignment.id,
          details: {
            buddyId: assignment.buddyId,
            contributorId: application.contributorId,
            message: 'You have been paired with a new contributor',
          },
          correlationId: payload.correlationId,
        });
      }
    } catch (error) {
      // Graceful degradation — don't fail the approval if buddy assignment fails
      this.logger.error('Failed to auto-assign buddy', {
        contributorId: application.contributorId,
        error: error instanceof Error ? error.message : String(error),
        correlationId: payload.correlationId,
      });
    }
  }

  // ─── Onboarding tracking (Story 3-5) ─────────────────────────────────

  async recordMilestone(
    contributorId: string,
    milestoneType: OnboardingMilestoneType,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ) {
    this.logger.log('Recording onboarding milestone', {
      contributorId,
      milestoneType,
      correlationId,
    });

    try {
      const milestone = await this.prisma.$transaction(async (tx) => {
        const record = await tx.onboardingMilestone.create({
          data: {
            contributorId,
            milestoneType,
            metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });

        await this.auditService.log(
          {
            actorId: contributorId,
            action: 'admission.onboarding.milestone.completed',
            entityType: 'OnboardingMilestone',
            entityId: record.id,
            details: {
              milestoneType,
              metadata: (metadata ?? null) as Prisma.InputJsonValue | null,
            } as unknown,
            correlationId,
          },
          tx,
        );

        return record;
      });

      this.logger.log('Onboarding milestone recorded', {
        milestoneId: milestone.id,
        contributorId,
        milestoneType,
        correlationId,
      });

      return milestone;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        this.logger.log('Milestone already completed, skipping', {
          contributorId,
          milestoneType,
          correlationId,
        });
        return null;
      }
      throw error;
    }
  }

  async getOnboardingStatus(contributorId: string, correlationId?: string) {
    this.logger.log('Fetching onboarding status', {
      contributorId,
      correlationId,
    });

    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: {
        id: true,
        name: true,
        domain: true,
        applications: {
          where: { status: 'APPROVED' },
          select: { ignitionStartedAt: true },
          orderBy: { reviewedAt: 'desc' },
          take: 1,
        },
        onboardingMilestones: {
          orderBy: { completedAt: 'asc' },
        },
      },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const ignitionStartedAt = contributor.applications[0]?.ignitionStartedAt ?? null;
    const milestones = contributor.onboardingMilestones;

    return {
      contributorId: contributor.id,
      contributorName: contributor.name,
      contributorDomain: contributor.domain,
      ignitionStartedAt: ignitionStartedAt?.toISOString() ?? null,
      milestones: milestones.map((m) => ({
        id: m.id,
        contributorId: m.contributorId,
        milestoneType: m.milestoneType,
        completedAt: m.completedAt.toISOString(),
        metadata: m.metadata as Record<string, unknown> | null,
      })),
      ...this.computeOnboardingFlags(ignitionStartedAt, milestones.length),
    };
  }

  async listOnboardingStatuses(
    query: { status?: string; cursor?: string; limit: number },
    correlationId?: string,
  ) {
    this.logger.log('Listing onboarding statuses', {
      ...query,
      correlationId,
    });

    // Get all contributors who have approved applications (ignitionStartedAt set)
    const where: Prisma.ContributorWhereInput = {
      applications: {
        some: {
          status: 'APPROVED',
          ignitionStartedAt: { not: null },
        },
      },
    };

    const cursorClause = query.cursor ? { id: query.cursor } : undefined;

    const contributors = await this.prisma.contributor.findMany({
      where,
      cursor: cursorClause,
      skip: cursorClause ? 1 : 0,
      take: query.limit + 1,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        domain: true,
        applications: {
          where: { status: 'APPROVED' },
          select: { ignitionStartedAt: true },
          orderBy: { reviewedAt: 'desc' },
          take: 1,
        },
        onboardingMilestones: {
          orderBy: { completedAt: 'asc' },
        },
      },
    });

    const hasMore = contributors.length > query.limit;
    const items = hasMore ? contributors.slice(0, query.limit) : contributors;

    const statuses = items.map((contributor) => {
      const ignitionStartedAt = contributor.applications[0]?.ignitionStartedAt ?? null;
      const milestones = contributor.onboardingMilestones;

      return {
        contributorId: contributor.id,
        contributorName: contributor.name,
        contributorDomain: contributor.domain,
        ignitionStartedAt: ignitionStartedAt?.toISOString() ?? null,
        milestones: milestones.map((m) => ({
          id: m.id,
          contributorId: m.contributorId,
          milestoneType: m.milestoneType,
          completedAt: m.completedAt.toISOString(),
          metadata: m.metadata as Record<string, unknown> | null,
        })),
        ...this.computeOnboardingFlags(ignitionStartedAt, milestones.length),
      };
    });

    // Filter by status if specified
    const filtered = query.status
      ? statuses.filter((s) => {
          switch (query.status) {
            case 'at-risk':
              return s.isAtRisk;
            case 'in-progress':
              return s.isWithin72Hours && !s.isComplete && !s.isAtRisk;
            case 'completed':
              return s.isComplete;
            case 'expired':
              return s.isExpired;
            default:
              return true;
          }
        })
      : statuses;

    const total = await this.prisma.contributor.count({ where });

    return {
      data: filtered,
      pagination: {
        cursor: items.length > 0 ? items[items.length - 1].id : null,
        hasMore,
        total,
      },
    };
  }

  private computeOnboardingFlags(ignitionStartedAt: Date | null, milestoneCount: number) {
    if (!ignitionStartedAt) {
      return {
        isWithin72Hours: false,
        isComplete: false,
        isAtRisk: false,
        isExpired: false,
        hoursElapsed: null,
      };
    }

    const now = new Date();
    const hoursElapsed = (now.getTime() - ignitionStartedAt.getTime()) / (1000 * 60 * 60);
    const isWithin72Hours = hoursElapsed <= 72;
    const isComplete = milestoneCount >= 5;
    const isAtRisk = isWithin72Hours && milestoneCount < 3 && hoursElapsed > 48;
    const isExpired = !isWithin72Hours && !isComplete;

    return {
      isWithin72Hours,
      isComplete,
      isAtRisk,
      isExpired,
      hoursElapsed: Math.round(hoursElapsed * 10) / 10,
    };
  }

  // ─── Onboarding event listeners (Story 3-5) ────────────────────────

  @OnEvent('admission.application.approved')
  async handleApprovedForOnboarding(payload: { applicationId: string; correlationId?: string }) {
    this.logger.log('Recording ACCOUNT_ACTIVATED milestone on approval', {
      applicationId: payload.applicationId,
      correlationId: payload.correlationId,
    });

    const application = await this.prisma.application.findUnique({
      where: { id: payload.applicationId },
      select: { contributorId: true },
    });

    if (!application?.contributorId) {
      return;
    }

    try {
      await this.recordMilestone(
        application.contributorId,
        'ACCOUNT_ACTIVATED',
        { applicationId: payload.applicationId },
        payload.correlationId,
      );
    } catch (error) {
      this.logger.error('Failed to record ACCOUNT_ACTIVATED milestone', {
        contributorId: application.contributorId,
        error: error instanceof Error ? error.message : String(error),
        correlationId: payload.correlationId,
      });
    }
  }

  @OnEvent('admission.buddy.assigned')
  async handleBuddyAssignedForOnboarding(payload: {
    contributorId: string;
    buddyId: string;
    domain?: string | null;
    isAutomatic?: boolean;
    correlationId?: string;
  }) {
    this.logger.log('Recording BUDDY_ASSIGNED milestone', {
      contributorId: payload.contributorId,
      correlationId: payload.correlationId,
    });

    try {
      await this.recordMilestone(
        payload.contributorId,
        'BUDDY_ASSIGNED',
        { buddyId: payload.buddyId },
        payload.correlationId,
      );
    } catch (error) {
      this.logger.error('Failed to record BUDDY_ASSIGNED milestone', {
        contributorId: payload.contributorId,
        error: error instanceof Error ? error.message : String(error),
        correlationId: payload.correlationId,
      });
    }
  }

  // Stub listeners for future epics
  // TODO: Epic 5 — task management will emit 'task.claimed' event
  @OnEvent('task.claimed')
  async handleTaskClaimedForOnboarding(payload: {
    contributorId: string;
    taskId: string;
    correlationId?: string;
  }) {
    try {
      await this.recordMilestone(
        payload.contributorId,
        'FIRST_TASK_CLAIMED',
        { taskId: payload.taskId },
        payload.correlationId,
      );
    } catch (error) {
      this.logger.error('Failed to record FIRST_TASK_CLAIMED milestone', {
        contributorId: payload.contributorId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // TODO: Epic 4 — GitHub contribution ingestion will emit 'contribution.submitted' event
  @OnEvent('contribution.submitted')
  async handleContributionSubmittedForOnboarding(payload: {
    contributorId: string;
    contributionId: string;
    correlationId?: string;
  }) {
    try {
      await this.recordMilestone(
        payload.contributorId,
        'FIRST_CONTRIBUTION_SUBMITTED',
        { contributionId: payload.contributionId },
        payload.correlationId,
      );
    } catch (error) {
      this.logger.error('Failed to record FIRST_CONTRIBUTION_SUBMITTED milestone', {
        contributorId: payload.contributorId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private inferTargetEffortHours(skillAreasCount: number): number {
    if (skillAreasCount <= 1) {
      return 3;
    }
    if (skillAreasCount <= 3) {
      return 5;
    }
    return 7;
  }

  private parseEstimatedEffortHours(effort: string): number | null {
    const matches = effort.match(/\d+/g);
    if (!matches || matches.length === 0) {
      return null;
    }

    const values = matches.map((value) => Number.parseInt(value, 10));
    if (values.some(Number.isNaN)) {
      return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
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
