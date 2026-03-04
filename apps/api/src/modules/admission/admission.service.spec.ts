import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdmissionService } from './admission.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockPrisma = {
  application: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  applicationReview: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  microTask: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  contributor: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  consentRecord: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: any) => unknown) => callback(mockPrisma)),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('AdmissionService', () => {
  let service: AdmissionService;

  const validDto = {
    applicantName: 'Jane Doe',
    applicantEmail: 'jane@example.com',
    domain: 'Technology' as const,
    statementOfInterest: 'I want to contribute to open source.',
    microTaskResponse: 'Here is my micro-task response with detailed implementation.',
    microTaskSubmissionUrl: 'https://github.com/jane/project',
    gdprConsent: true,
  };

  const mockApplication = {
    id: 'app-uuid-1',
    applicantName: 'Jane Doe',
    applicantEmail: 'jane@example.com',
    domain: 'Technology',
    statementOfInterest: 'I want to contribute to open source.',
    microTaskDomain: 'Technology',
    microTaskResponse: 'Here is my micro-task response with detailed implementation.',
    microTaskSubmissionUrl: 'https://github.com/jane/project',
    gdprConsentVersion: '1.0',
    gdprConsentedAt: new Date(),
    status: 'PENDING',
    contributorId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMicroTask = {
    id: 'task-uuid-1',
    domain: 'Technology',
    title: 'Build a REST API endpoint',
    description: 'Design and implement a REST API endpoint.',
    expectedDeliverable: 'A working API endpoint with source code.',
    estimatedEffort: '2-4 hours',
    submissionFormat: 'GitHub repository link or gist',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AdmissionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(AdmissionService);
  });

  describe('createApplication', () => {
    it('creates application with audit log and consent record in transaction', async () => {
      mockPrisma.application.create.mockResolvedValueOnce(mockApplication);
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.createApplication(validDto, 'corr-1');

      expect(result).toEqual(mockApplication);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.application.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicantName: 'Jane Doe',
          applicantEmail: 'jane@example.com',
          domain: 'Technology',
          microTaskDomain: 'Technology',
          status: 'PENDING',
          gdprConsentVersion: '1.0',
        }),
      });
    });

    it('creates consent record within the transaction', async () => {
      mockPrisma.application.create.mockResolvedValueOnce(mockApplication);
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.createApplication(validDto, 'corr-2');

      expect(mockPrisma.consentRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'Application',
          entityId: 'app-uuid-1',
          consentType: 'GDPR_DATA_PROCESSING',
          consentVersion: '1.0',
          accepted: true,
        }),
      });
    });

    it('creates audit log entry with correct action and correlationId', async () => {
      mockPrisma.application.create.mockResolvedValueOnce(mockApplication);
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.createApplication(validDto, 'corr-3');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'admission.application.submitted',
          entityType: 'Application',
          entityId: 'app-uuid-1',
          correlationId: 'corr-3',
          details: {
            domain: 'Technology',
            hasContributorContext: false,
          },
        }),
      });
    });

    it('throws APPLICATION_ALREADY_EXISTS when applicant email already exists', async () => {
      mockPrisma.application.create.mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['applications_applicant_email_key'] },
      });

      let caughtError: DomainException | undefined;
      try {
        await service.createApplication(validDto, 'corr-duplicate');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('APPLICATION_ALREADY_EXISTS');
      expect(caughtError!.getStatus()).toBe(409);
    });

    it('emits admission.application.submitted event after creation', async () => {
      mockPrisma.application.create.mockResolvedValueOnce(mockApplication);
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.createApplication(validDto, 'corr-4');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('admission.application.submitted', {
        applicationId: 'app-uuid-1',
        applicantEmail: 'jane@example.com',
        domain: 'Technology',
        correlationId: 'corr-4',
      });
    });

    it('stores null for microTaskSubmissionUrl when not provided', async () => {
      const dtoWithoutUrl = { ...validDto, microTaskSubmissionUrl: '' };
      mockPrisma.application.create.mockResolvedValueOnce({
        ...mockApplication,
        microTaskSubmissionUrl: null,
      });
      mockPrisma.consentRecord.create.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.createApplication(dtoWithoutUrl, 'corr-5');

      expect(mockPrisma.application.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          microTaskSubmissionUrl: null,
        }),
      });
    });
  });

  describe('getApplicationById', () => {
    it('returns application status when found', async () => {
      const statusResult = {
        id: 'app-uuid-1',
        status: 'PENDING',
        createdAt: new Date(),
      };
      mockPrisma.application.findUnique.mockResolvedValueOnce(statusResult);

      const result = await service.getApplicationById('app-uuid-1', 'corr-6');

      expect(result).toEqual(statusResult);
      expect(mockPrisma.application.findUnique).toHaveBeenCalledWith({
        where: { id: 'app-uuid-1' },
        select: { id: true, status: true, declineReason: true, createdAt: true },
      });
    });

    it('throws APPLICATION_NOT_FOUND when application does not exist', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce(null);

      let caughtError: DomainException | undefined;
      try {
        await service.getApplicationById('nonexistent-uuid', 'corr-7');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('APPLICATION_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });
  });

  describe('getActiveMicroTaskByDomain', () => {
    it('returns active micro-task for given domain', async () => {
      mockPrisma.microTask.findFirst.mockResolvedValueOnce(mockMicroTask);

      const result = await service.getActiveMicroTaskByDomain('Technology', 'corr-8');

      expect(result).toEqual(mockMicroTask);
      expect(mockPrisma.microTask.findFirst).toHaveBeenCalledWith({
        where: { domain: 'Technology', isActive: true },
      });
    });

    it('throws DOMAIN_MICRO_TASK_NOT_FOUND when no active task exists', async () => {
      mockPrisma.microTask.findFirst.mockResolvedValueOnce(null);

      let caughtError: DomainException | undefined;
      try {
        await service.getActiveMicroTaskByDomain('Technology', 'corr-9');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('DOMAIN_MICRO_TASK_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });
  });

  // ─── Story 3-2 Tests ───────────────────────────────────────────

  describe('listApplications', () => {
    it('returns paginated applications sorted oldest first', async () => {
      const apps = [
        {
          id: 'app-1',
          applicantName: 'Alice',
          domain: 'Technology',
          status: 'PENDING',
          createdAt: new Date(),
          reviews: [],
        },
        {
          id: 'app-2',
          applicantName: 'Bob',
          domain: 'Fintech',
          status: 'UNDER_REVIEW',
          createdAt: new Date(),
          reviews: [],
        },
      ];
      mockPrisma.application.findMany.mockResolvedValueOnce(apps);
      mockPrisma.application.count.mockResolvedValueOnce(2);

      const result = await service.listApplications({ limit: 20 }, 'corr-list');

      expect(result.items).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.total).toBe(2);
    });

    it('filters by domain and status', async () => {
      mockPrisma.application.findMany.mockResolvedValueOnce([]);
      mockPrisma.application.count.mockResolvedValueOnce(0);

      await service.listApplications(
        { domain: 'Technology', status: 'PENDING', limit: 20 },
        'corr-filter',
      );

      expect(mockPrisma.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { domain: 'Technology', status: 'PENDING' },
        }),
      );
    });

    it('returns hasMore=true when more items exist', async () => {
      const apps = Array.from({ length: 21 }, (_, i) => ({
        id: `app-${i}`,
        applicantName: `User ${i}`,
        domain: 'Technology',
        status: 'PENDING',
        createdAt: new Date(),
        reviews: [],
      }));
      mockPrisma.application.findMany.mockResolvedValueOnce(apps);
      mockPrisma.application.count.mockResolvedValueOnce(50);

      const result = await service.listApplications({ limit: 20 }, 'corr-more');

      expect(result.items).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBe('app-19');
    });
  });

  describe('getApplicationFull', () => {
    it('returns full application with reviews', async () => {
      const fullApp = {
        ...mockApplication,
        reviews: [],
        contributor: null,
        reviewedBy: null,
      };
      mockPrisma.application.findUnique.mockResolvedValueOnce(fullApp);

      const result = await service.getApplicationFull('app-uuid-1', 'corr-full');

      expect(result).toEqual(fullApp);
    });

    it('throws APPLICATION_NOT_FOUND when not found', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce(null);

      await expect(service.getApplicationFull('nonexistent', 'corr-notfound')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('assignReviewer', () => {
    it('assigns reviewer and transitions PENDING to UNDER_REVIEW', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'PENDING',
        reviews: [],
      });
      mockPrisma.contributor.findUnique.mockResolvedValueOnce({
        id: 'reviewer-1',
        name: 'Reviewer',
      });
      mockPrisma.applicationReview.create.mockResolvedValueOnce({ id: 'review-1' });
      mockPrisma.application.update.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.assignReviewer(
        'app-uuid-1',
        'reviewer-1',
        'admin-1',
        'corr-assign',
      );

      expect(result).toEqual({ id: 'review-1' });
      expect(mockPrisma.application.update).toHaveBeenCalledWith({
        where: { id: 'app-uuid-1' },
        data: { status: 'UNDER_REVIEW' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'admission.reviewer.assigned',
        expect.any(Object),
      );
    });

    it('throws REVIEWER_ALREADY_ASSIGNED for duplicate reviewer', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'UNDER_REVIEW',
        reviews: [{ reviewerId: 'reviewer-1' }],
      });
      mockPrisma.contributor.findUnique.mockResolvedValueOnce({ id: 'reviewer-1' });

      await expect(
        service.assignReviewer('app-uuid-1', 'reviewer-1', 'admin-1', 'corr-dup'),
      ).rejects.toThrow(DomainException);
    });

    it('throws REVIEWER_NOT_FOUND for invalid contributor', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'PENDING',
        reviews: [],
      });
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.assignReviewer('app-uuid-1', 'nonexistent', 'admin-1', 'corr-nf'),
      ).rejects.toThrow(DomainException);
    });

    it('throws APPLICATION_NOT_REVIEWABLE for already-decided application', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'APPROVED',
        reviews: [],
      });

      await expect(
        service.assignReviewer('app-uuid-1', 'reviewer-1', 'admin-1', 'corr-decided'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('submitReview', () => {
    it('submits review for assigned reviewer', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'UNDER_REVIEW',
        reviews: [{ reviewerId: 'reviewer-1', feedback: '' }],
      });
      mockPrisma.applicationReview.findFirst.mockResolvedValueOnce({ id: 'review-1' });
      mockPrisma.applicationReview.update.mockResolvedValueOnce({
        id: 'review-1',
        recommendation: 'APPROVE',
        feedback: 'Great application',
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.submitReview(
        'app-uuid-1',
        'reviewer-1',
        { recommendation: 'APPROVE', feedback: 'Great application' },
        'corr-submit',
      );

      expect(result.recommendation).toBe('APPROVE');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'admission.review.submitted',
        expect.any(Object),
      );
    });

    it('throws error for unauthorized reviewer', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'UNDER_REVIEW',
        reviews: [{ reviewerId: 'other-reviewer', feedback: '' }],
      });

      await expect(
        service.submitReview(
          'app-uuid-1',
          'reviewer-1',
          { recommendation: 'APPROVE', feedback: 'Test' },
          'corr-unauth',
        ),
      ).rejects.toThrow(DomainException);
    });

    it('throws APPLICATION_ALREADY_REVIEWED for duplicate review', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'UNDER_REVIEW',
        reviews: [{ reviewerId: 'reviewer-1', feedback: 'Already reviewed' }],
      });

      await expect(
        service.submitReview(
          'app-uuid-1',
          'reviewer-1',
          { recommendation: 'APPROVE', feedback: 'Test' },
          'corr-alr',
        ),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('approveApplication', () => {
    it('approves application and promotes contributor role', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'UNDER_REVIEW',
        contributorId: 'contributor-1',
      });
      mockPrisma.application.update.mockResolvedValueOnce({
        ...mockApplication,
        status: 'APPROVED',
      });
      mockPrisma.contributor.update.mockResolvedValueOnce({});
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.approveApplication(
        'app-uuid-1',
        'admin-1',
        'Good fit',
        'corr-approve',
      );

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.contributor.update).toHaveBeenCalledWith({
        where: { id: 'contributor-1' },
        data: { role: 'CONTRIBUTOR' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'admission.application.approved',
        expect.any(Object),
      );
    });

    it('throws INVALID_STATUS_TRANSITION for non-UNDER_REVIEW application', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'PENDING',
      });

      await expect(
        service.approveApplication('app-uuid-1', 'admin-1', undefined, 'corr-invalid'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('declineApplication', () => {
    it('declines application with reason', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'UNDER_REVIEW',
      });
      mockPrisma.application.update.mockResolvedValueOnce({
        ...mockApplication,
        status: 'DECLINED',
        declineReason: 'Insufficient experience',
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.declineApplication(
        'app-uuid-1',
        'admin-1',
        'Insufficient experience',
        'corr-decline',
      );

      expect(result.status).toBe('DECLINED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'admission.application.declined',
        expect.any(Object),
      );
    });

    it('throws INVALID_STATUS_TRANSITION for non-UNDER_REVIEW application', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'PENDING',
      });

      await expect(
        service.declineApplication('app-uuid-1', 'admin-1', 'Reason', 'corr-invalid-dec'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('requestMoreInfo', () => {
    it('creates audit log entry and keeps application under review', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'UNDER_REVIEW',
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.requestMoreInfo(
        'app-uuid-1',
        'admin-1',
        'Please clarify your micro-task approach',
        'corr-info',
      );

      expect(result.status).toBe('UNDER_REVIEW');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'admission.application.info.requested',
          entityId: 'app-uuid-1',
        }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'admission.application.info.requested',
        expect.any(Object),
      );
    });

    it('throws INVALID_STATUS_TRANSITION for non-UNDER_REVIEW application', async () => {
      mockPrisma.application.findUnique.mockResolvedValueOnce({
        ...mockApplication,
        status: 'PENDING',
      });

      await expect(
        service.requestMoreInfo('app-uuid-1', 'admin-1', 'Need more info', 'corr-info-invalid'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('listAvailableReviewers', () => {
    it('returns active contributors eligible for review', async () => {
      const reviewers = [
        { id: 'r-1', name: 'Alice', domain: 'Technology', avatarUrl: null },
        { id: 'r-2', name: 'Bob', domain: 'Fintech', avatarUrl: null },
      ];
      mockPrisma.contributor.findMany.mockResolvedValueOnce(reviewers);

      const result = await service.listAvailableReviewers(undefined, 'corr-reviewers');

      expect(result).toHaveLength(2);
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            role: {
              in: ['CONTRIBUTOR', 'EDITOR', 'FOUNDING_CONTRIBUTOR', 'WORKING_GROUP_LEAD', 'ADMIN'],
            },
          }),
        }),
      );
    });
  });

  describe('getMyReviews', () => {
    it('returns reviews assigned to the given reviewer', async () => {
      const reviews = [
        {
          id: 'review-1',
          recommendation: 'APPROVE',
          feedback: '',
          createdAt: new Date(),
          application: {
            id: 'app-1',
            applicantName: 'Test',
            domain: 'Technology',
            status: 'UNDER_REVIEW',
            createdAt: new Date(),
          },
        },
      ];
      mockPrisma.applicationReview.findMany.mockResolvedValueOnce(reviews);

      const result = await service.getMyReviews('reviewer-1', 'corr-my');

      expect(result).toHaveLength(1);
      expect(mockPrisma.applicationReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reviewerId: 'reviewer-1' },
        }),
      );
    });
  });

  // ─── Story 3-3 Micro-task Admin Tests ─────────────────────────

  describe('listMicroTasks', () => {
    it('returns paginated micro-tasks ordered by domain then createdAt', async () => {
      const tasks = [
        { ...mockMicroTask, id: 'mt-1', domain: 'Fintech' },
        { ...mockMicroTask, id: 'mt-2', domain: 'Technology' },
      ];
      mockPrisma.microTask.findMany.mockResolvedValueOnce(tasks);
      mockPrisma.microTask.count.mockResolvedValueOnce(2);

      const result = await service.listMicroTasks({ limit: 50 }, 'corr-list-mt');

      expect(result.items).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.total).toBe(2);
    });

    it('filters by domain and isActive', async () => {
      mockPrisma.microTask.findMany.mockResolvedValueOnce([]);
      mockPrisma.microTask.count.mockResolvedValueOnce(0);

      await service.listMicroTasks(
        { domain: 'Technology', isActive: true, limit: 50 },
        'corr-filter-mt',
      );

      expect(mockPrisma.microTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { domain: 'Technology', isActive: true },
        }),
      );
    });
  });

  describe('createMicroTask', () => {
    const createDto = {
      domain: 'Technology' as const,
      title: 'New Task',
      description: 'Task description',
      expectedDeliverable: 'Deliverable',
      estimatedEffort: '2-4 hours',
      submissionFormat: 'GitHub repo',
    };

    it('creates micro-task and auto-deactivates previous active task for same domain', async () => {
      const existingActive = { ...mockMicroTask, id: 'old-active' };
      mockPrisma.microTask.findFirst.mockResolvedValueOnce(existingActive);
      mockPrisma.microTask.update.mockResolvedValueOnce({});
      mockPrisma.microTask.create.mockResolvedValueOnce({
        id: 'new-task',
        ...createDto,
        isActive: true,
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.createMicroTask(createDto, 'admin-1', 'corr-create-mt');

      expect(result.id).toBe('new-task');
      expect(mockPrisma.microTask.update).toHaveBeenCalledWith({
        where: { id: 'old-active' },
        data: { isActive: false, deactivatedAt: expect.any(Date) },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'admission.microtask.created',
          entityType: 'MicroTask',
        }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'admission.microtask.created',
        expect.any(Object),
      );
    });

    it('creates micro-task without deactivating when no existing active task', async () => {
      mockPrisma.microTask.findFirst.mockResolvedValueOnce(null);
      mockPrisma.microTask.create.mockResolvedValueOnce({
        id: 'new-task',
        ...createDto,
        isActive: true,
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.createMicroTask(createDto, 'admin-1', 'corr-create-mt-new');

      expect(mockPrisma.microTask.update).not.toHaveBeenCalled();
    });

    it('throws MICRO_TASK_DOMAIN_ACTIVE_EXISTS when active-domain unique constraint is hit', async () => {
      mockPrisma.microTask.findFirst.mockResolvedValueOnce(null);
      mockPrisma.microTask.create.mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: 'micro_tasks_one_active_per_domain' },
      });

      await expect(service.createMicroTask(createDto, 'admin-1', 'corr-unique')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('updateMicroTask', () => {
    it('updates micro-task fields', async () => {
      mockPrisma.microTask.findUnique.mockResolvedValueOnce({
        ...mockMicroTask,
        id: 'mt-1',
        isActive: true,
      });
      mockPrisma.microTask.update.mockResolvedValueOnce({
        ...mockMicroTask,
        id: 'mt-1',
        title: 'Updated Title',
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.updateMicroTask(
        'mt-1',
        { title: 'Updated Title' },
        'admin-1',
        'corr-update-mt',
      );

      expect(result.title).toBe('Updated Title');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'admission.microtask.updated',
        }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'admission.microtask.updated',
        expect.any(Object),
      );
    });

    it('auto-deactivates current active task when activating an inactive task', async () => {
      mockPrisma.microTask.findUnique.mockResolvedValueOnce({
        ...mockMicroTask,
        id: 'mt-inactive',
        isActive: false,
      });
      const currentActive = { ...mockMicroTask, id: 'mt-current-active' };
      mockPrisma.microTask.findFirst.mockResolvedValueOnce(currentActive);
      mockPrisma.microTask.update
        .mockResolvedValueOnce({}) // deactivate current
        .mockResolvedValueOnce({ ...mockMicroTask, id: 'mt-inactive', isActive: true }); // activate target
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.updateMicroTask('mt-inactive', { isActive: true }, 'admin-1', 'corr-activate');

      expect(mockPrisma.microTask.update).toHaveBeenCalledWith({
        where: { id: 'mt-current-active' },
        data: { isActive: false, deactivatedAt: expect.any(Date) },
      });
    });

    it('throws MICRO_TASK_NOT_FOUND when task does not exist', async () => {
      mockPrisma.microTask.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateMicroTask('nonexistent', { title: 'Test' }, 'admin-1', 'corr-nf'),
      ).rejects.toThrow(DomainException);
    });

    it('throws MICRO_TASK_DOMAIN_ACTIVE_EXISTS when activation conflicts on unique index', async () => {
      mockPrisma.microTask.findUnique.mockResolvedValueOnce({
        ...mockMicroTask,
        id: 'mt-inactive',
        isActive: false,
      });
      mockPrisma.microTask.findFirst.mockResolvedValueOnce(null);
      mockPrisma.microTask.update.mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: 'micro_tasks_one_active_per_domain' },
      });

      await expect(
        service.updateMicroTask('mt-inactive', { isActive: true }, 'admin-1', 'corr-conflict'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('deactivateMicroTask', () => {
    it('deactivates an active micro-task with audit log', async () => {
      mockPrisma.microTask.findUnique.mockResolvedValueOnce({
        ...mockMicroTask,
        id: 'mt-1',
        isActive: true,
      });
      mockPrisma.microTask.update.mockResolvedValueOnce({
        ...mockMicroTask,
        id: 'mt-1',
        isActive: false,
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.deactivateMicroTask('mt-1', 'admin-1', 'corr-deact');

      expect(result.isActive).toBe(false);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'admission.microtask.deactivated',
        }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'admission.microtask.deactivated',
        expect.any(Object),
      );
    });

    it('returns unchanged task when already inactive', async () => {
      const inactiveTask = { ...mockMicroTask, id: 'mt-1', isActive: false };
      mockPrisma.microTask.findUnique.mockResolvedValueOnce(inactiveTask);

      const result = await service.deactivateMicroTask('mt-1', 'admin-1', 'corr-already');

      expect(result).toEqual(inactiveTask);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws MICRO_TASK_NOT_FOUND when task does not exist', async () => {
      mockPrisma.microTask.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.deactivateMicroTask('nonexistent', 'admin-1', 'corr-nf'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getMicroTaskById', () => {
    it('returns micro-task by ID', async () => {
      mockPrisma.microTask.findUnique.mockResolvedValueOnce(mockMicroTask);

      const result = await service.getMicroTaskById('task-uuid-1', 'corr-get-mt');

      expect(result).toEqual(mockMicroTask);
    });

    it('throws MICRO_TASK_NOT_FOUND when not found', async () => {
      mockPrisma.microTask.findUnique.mockResolvedValueOnce(null);

      await expect(service.getMicroTaskById('nonexistent', 'corr-nf')).rejects.toThrow(
        DomainException,
      );
    });
  });
});
