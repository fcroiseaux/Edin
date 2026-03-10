import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import { ModerationService } from './moderation.service.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('ModerationService', () => {
  let service: ModerationService;
  let mockAuditService: { log: ReturnType<typeof vi.fn> };
  let prisma: { [key: string]: { [key: string]: ReturnType<typeof vi.fn> } };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let queue: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };
    prisma = {
      article: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      moderationReport: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma)),
    };

    eventEmitter = { emit: vi.fn() };
    queue = { add: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: getQueueToken('plagiarism-check'), useValue: queue },
      ],
    }).compile();

    service = module.get(ModerationService);
  });

  describe('enqueuePlagiarismCheck', () => {
    it('should create pending report and enqueue job', async () => {
      const article = {
        id: 'a1',
        authorId: 'u1',
        domain: 'TECHNOLOGY',
        title: 'Test Article',
        body: 'Article body content',
      };
      prisma.article.findUnique.mockResolvedValue(article);
      prisma.moderationReport.create.mockResolvedValue({ id: 'r1' });
      queue.add.mockResolvedValue(undefined);

      await service.enqueuePlagiarismCheck('a1', 'corr-1');

      expect(prisma.moderationReport.create).toHaveBeenCalledWith({
        data: { articleId: 'a1', status: 'PENDING' },
      });
      expect(queue.add).toHaveBeenCalledWith('plagiarism-check', {
        articleId: 'a1',
        authorId: 'u1',
        domain: 'TECHNOLOGY',
        title: 'Test Article',
        body: 'Article body content',
        correlationId: 'corr-1',
      });
    });

    it('should throw if article not found', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      await expect(service.enqueuePlagiarismCheck('missing', 'corr-1')).rejects.toThrow(
        'Article missing not found',
      );
    });
  });

  describe('handleModerationCompleted (CLEAN)', () => {
    it('should emit moderation.cleared event for clean articles', async () => {
      prisma.article.findUnique.mockResolvedValue({
        domain: 'TECHNOLOGY',
        title: 'Test',
        authorId: 'u1',
      });

      await service.handleModerationCompleted({
        articleId: 'a1',
        authorId: 'u1',
        isFlagged: false,
        flagType: null,
        plagiarismScore: 0.05,
        aiContentScore: 0.1,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.moderation.cleared',
        expect.objectContaining({ articleId: 'a1', authorId: 'u1' }),
      );
    });

    it('should not emit cleared event if article not found', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      await service.handleModerationCompleted({
        articleId: 'missing',
        authorId: 'u1',
        isFlagged: false,
        flagType: null,
        plagiarismScore: 0,
        aiContentScore: 0,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
      });

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'publication.article.moderation.cleared',
        expect.anything(),
      );
    });
  });

  describe('handleModerationCompleted (FLAGGED)', () => {
    it('should emit notification for flagged articles', async () => {
      await service.handleModerationCompleted({
        articleId: 'a1',
        authorId: 'u1',
        isFlagged: true,
        flagType: 'PLAGIARISM',
        plagiarismScore: 0.5,
        aiContentScore: 0.1,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.enqueue',
        expect.objectContaining({ type: 'MODERATION_FLAG', entityId: 'a1' }),
      );
    });

    it('should not emit cleared event for flagged articles', async () => {
      await service.handleModerationCompleted({
        articleId: 'a1',
        authorId: 'u1',
        isFlagged: true,
        flagType: 'AI_CONTENT',
        plagiarismScore: 0.1,
        aiContentScore: 0.8,
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
      });

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        'publication.article.moderation.cleared',
        expect.anything(),
      );
    });
  });

  describe('adminDismissFlag', () => {
    it('should dismiss flag and trigger editorial flow', async () => {
      const report = { id: 'r1', articleId: 'a1', isFlagged: true, status: 'FLAGGED' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockResolvedValue({
        ...report,
        status: 'DISMISSED',
        adminId: 'admin1',
        adminAction: 'DISMISS',
        adminReason: 'False positive',
        resolvedAt: new Date(),
        plagiarismScore: 0.4,
        aiContentScore: 0.1,
        flagType: 'PLAGIARISM',
        flaggedPassages: null,
        createdAt: new Date(),
      });

      prisma.article.findUnique.mockResolvedValue({
        authorId: 'u1',
        domain: 'TECHNOLOGY',
        title: 'Test',
      });

      const result = await service.adminDismissFlag('a1', 'admin1', 'False positive', 'corr-1');

      expect(result.status).toBe('DISMISSED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.moderated',
        expect.objectContaining({ action: 'DISMISS' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.moderation.cleared',
        expect.objectContaining({ articleId: 'a1' }),
      );
    });

    it('should throw if no flagged report found', async () => {
      prisma.moderationReport.findFirst.mockResolvedValue(null);

      await expect(service.adminDismissFlag('a1', 'admin1', 'reason', 'corr-1')).rejects.toThrow(
        'No flagged moderation report found',
      );
    });
  });

  describe('adminRequestCorrections', () => {
    it('should request corrections and notify author', async () => {
      const report = { id: 'r1', articleId: 'a1', isFlagged: true, status: 'FLAGGED' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockResolvedValue({
        ...report,
        status: 'CORRECTIONS_REQUESTED',
        adminAction: 'REQUEST_CORRECTIONS',
        adminReason: 'Please revise section 2',
        adminId: 'admin1',
        resolvedAt: new Date(),
        plagiarismScore: 0.3,
        aiContentScore: 0,
        flagType: 'PLAGIARISM',
        flaggedPassages: null,
        createdAt: new Date(),
      });
      prisma.article.update.mockResolvedValue({});

      prisma.article.findUnique.mockResolvedValue({ authorId: 'u1' });

      const result = await service.adminRequestCorrections(
        'a1',
        'admin1',
        'Please revise section 2',
        'corr-1',
      );

      expect(result.adminAction).toBe('REQUEST_CORRECTIONS');
      expect(result.status).toBe('CORRECTIONS_REQUESTED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.enqueue',
        expect.objectContaining({ type: 'MODERATION_CORRECTIONS_REQUESTED' }),
      );
    });

    it('should throw if no flagged report found', async () => {
      prisma.moderationReport.findFirst.mockResolvedValue(null);

      await expect(
        service.adminRequestCorrections('a1', 'admin1', 'reason', 'corr-1'),
      ).rejects.toThrow();
    });
  });

  describe('adminRejectArticle', () => {
    it('should reject article and notify author', async () => {
      const report = { id: 'r1', articleId: 'a1', isFlagged: true, status: 'FLAGGED' };
      prisma.moderationReport.findFirst.mockResolvedValue(report);
      prisma.moderationReport.update.mockResolvedValue({
        ...report,
        status: 'REJECTED',
        adminAction: 'REJECT',
        adminReason: 'Plagiarism confirmed',
        adminId: 'admin1',
        resolvedAt: new Date(),
        plagiarismScore: 0.8,
        aiContentScore: 0,
        flagType: 'PLAGIARISM',
        flaggedPassages: null,
        createdAt: new Date(),
      });
      prisma.article.update.mockResolvedValue({});

      prisma.article.findUnique.mockResolvedValue({ authorId: 'u1' });

      const result = await service.adminRejectArticle(
        'a1',
        'admin1',
        'Plagiarism confirmed',
        'corr-1',
      );

      expect(result.status).toBe('REJECTED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'notification.enqueue',
        expect.objectContaining({ type: 'MODERATION_ARTICLE_REJECTED' }),
      );
    });

    it('should throw if no flagged report found', async () => {
      prisma.moderationReport.findFirst.mockResolvedValue(null);

      await expect(
        service.adminRejectArticle('a1', 'admin1', 'reason', 'corr-1'),
      ).rejects.toThrow();
    });
  });

  describe('adminUnpublishArticle', () => {
    it('should archive published article', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'PUBLISHED',
        authorId: 'u1',
      });
      prisma.article.update.mockResolvedValue({});

      await service.adminUnpublishArticle('a1', 'admin1', 'Policy violation', 'corr-1');

      expect(prisma.article.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { status: 'ARCHIVED' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.moderated',
        expect.objectContaining({ articleId: 'a1' }),
      );
    });

    it('should throw if article not published', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        status: 'DRAFT',
        authorId: 'u1',
      });

      await expect(
        service.adminUnpublishArticle('a1', 'admin1', 'reason', 'corr-1'),
      ).rejects.toThrow('Only published articles can be unpublished');
    });
  });

  describe('getFlaggedArticles', () => {
    it('should return paginated flagged articles', async () => {
      const reports = [
        {
          id: 'r1',
          articleId: 'a1',
          plagiarismScore: 0.5,
          aiContentScore: 0.1,
          flagType: 'PLAGIARISM',
          isFlagged: true,
          flaggedPassages: null,
          status: 'FLAGGED',
          adminId: null,
          adminAction: null,
          adminReason: null,
          resolvedAt: null,
          createdAt: new Date(),
          article: {
            id: 'a1',
            title: 'Test',
            slug: 'test',
            domain: 'TECHNOLOGY',
            submittedAt: new Date(),
            author: { id: 'u1', name: 'Author' },
          },
        },
      ];

      prisma.moderationReport.findMany.mockResolvedValue(reports);

      const result = await service.getFlaggedArticles(undefined, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].articleTitle).toBe('Test');
      expect(result.pagination.hasMore).toBe(false);
    });
  });
});
