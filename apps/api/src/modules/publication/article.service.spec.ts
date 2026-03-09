import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ArticleService } from './article.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockArticle = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  authorId: 'author-uuid',
  title: 'Test Article',
  slug: 'test-article-abc123',
  abstract: 'A test abstract that is at least fifty characters long for validation purposes.',
  body: 'A'.repeat(500),
  domain: 'Technology' as const,
  status: 'DRAFT' as const,
  version: 1,
  editorId: null,
  createdAt: new Date('2026-03-09T10:00:00Z'),
  updatedAt: new Date('2026-03-09T10:00:00Z'),
  submittedAt: null,
  publishedAt: null,
};

const mockPrismaService = {
  article: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('ArticleService', () => {
  let service: ArticleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(ArticleService);
    vi.clearAllMocks();
  });

  describe('createArticle', () => {
    it('should create a draft article with generated slug', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null); // slug uniqueness check
      mockPrismaService.article.create.mockResolvedValue(mockArticle);

      const result = await service.createArticle('author-uuid', {
        title: 'Test Article',
        abstract: '',
        body: '',
        domain: 'Technology',
      });

      expect(result.id).toBe(mockArticle.id);
      expect(result.status).toBe('DRAFT');
      expect(result.authorId).toBe('author-uuid');
      expect(mockPrismaService.article.create).toHaveBeenCalledOnce();
    });
  });

  describe('getArticle', () => {
    it('should return article for the owner', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      const result = await service.getArticle(mockArticle.id, 'author-uuid');
      expect(result.id).toBe(mockArticle.id);
    });

    it('should throw NOT_FOUND for non-existent article', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(null);

      await expect(service.getArticle('non-existent', 'author-uuid')).rejects.toThrow(
        DomainException,
      );
    });

    it('should throw FORBIDDEN for non-owner', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);

      try {
        await service.getArticle(mockArticle.id, 'other-user');
        expect.fail('Expected DomainException');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });
  });

  describe('updateArticle', () => {
    it('should update a draft article', async () => {
      const updatedArticle = { ...mockArticle, title: 'Updated Title' };
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.update.mockResolvedValue(updatedArticle);

      const result = await service.updateArticle(mockArticle.id, 'author-uuid', {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should reject update for non-DRAFT articles', async () => {
      const submittedArticle = { ...mockArticle, status: 'SUBMITTED' as const };
      mockPrismaService.article.findUnique.mockResolvedValue(submittedArticle);

      try {
        await service.updateArticle(mockArticle.id, 'author-uuid', { title: 'New Title' });
        expect.fail('Expected DomainException');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });

    it('should regenerate slug when title changes', async () => {
      const updatedArticle = { ...mockArticle, title: 'New Title', slug: 'new-title-xyz' };
      mockPrismaService.article.findUnique
        .mockResolvedValueOnce(mockArticle) // ownership check
        .mockResolvedValueOnce(null); // slug uniqueness
      mockPrismaService.article.update.mockResolvedValue(updatedArticle);

      await service.updateArticle(mockArticle.id, 'author-uuid', { title: 'New Title' });

      const updateCall = mockPrismaService.article.update.mock.calls[0][0];
      expect(updateCall.data.slug).toBeDefined();
    });
  });

  describe('getUserArticles', () => {
    it('should return paginated drafts with total', async () => {
      const articles = [
        { ...mockArticle, id: '1' },
        { ...mockArticle, id: '2' },
      ];
      mockPrismaService.article.findMany.mockResolvedValue(articles);
      mockPrismaService.article.count = vi.fn().mockResolvedValue(2);

      const result = await service.getUserArticles('author-uuid', 'DRAFT', undefined, 20);

      expect(result.items).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.cursor).toBeNull();
      expect(result.pagination.total).toBe(2);
    });

    it('should return hasMore=true when more items exist', async () => {
      // Return limit+1 items to indicate more
      const articles = Array.from({ length: 21 }, (_, i) => ({
        ...mockArticle,
        id: `id-${i}`,
      }));
      mockPrismaService.article.findMany.mockResolvedValue(articles);
      mockPrismaService.article.count = vi.fn().mockResolvedValue(25);

      const result = await service.getUserArticles('author-uuid', 'DRAFT', undefined, 20);

      expect(result.items).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBeTruthy();
      expect(result.pagination.total).toBe(25);
    });
  });

  describe('submitArticle', () => {
    it('should transition DRAFT to SUBMITTED and emit event', async () => {
      const submittedArticle = {
        ...mockArticle,
        status: 'SUBMITTED' as const,
        submittedAt: new Date(),
      };
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.update.mockResolvedValue(submittedArticle);

      const result = await service.submitArticle(mockArticle.id, 'author-uuid', 'corr-123');

      expect(result.status).toBe('SUBMITTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'publication.article.submitted',
        expect.objectContaining({
          articleId: mockArticle.id,
          authorId: 'author-uuid',
          correlationId: 'corr-123',
        }),
      );
    });

    it('should reject submission of non-DRAFT articles', async () => {
      const submittedArticle = { ...mockArticle, status: 'SUBMITTED' as const };
      mockPrismaService.article.findUnique.mockResolvedValue(submittedArticle);

      try {
        await service.submitArticle(mockArticle.id, 'author-uuid', 'corr-123');
        expect.fail('Expected DomainException');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });

    it('should reject submission when validation fails (body too short)', async () => {
      const shortArticle = { ...mockArticle, body: 'too short' };
      mockPrismaService.article.findUnique.mockResolvedValue(shortArticle);

      try {
        await service.submitArticle(mockArticle.id, 'author-uuid', 'corr-123');
        expect.fail('Expected DomainException');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });
  });

  describe('deleteArticle', () => {
    it('should delete a draft article', async () => {
      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.article.delete.mockResolvedValue(mockArticle);

      await service.deleteArticle(mockArticle.id, 'author-uuid');

      expect(mockPrismaService.article.delete).toHaveBeenCalledWith({
        where: { id: mockArticle.id },
      });
    });

    it('should reject deletion of non-DRAFT articles', async () => {
      const submittedArticle = { ...mockArticle, status: 'SUBMITTED' as const };
      mockPrismaService.article.findUnique.mockResolvedValue(submittedArticle);

      try {
        await service.deleteArticle(mockArticle.id, 'author-uuid');
        expect.fail('Expected DomainException');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).getStatus()).toBe(HttpStatus.CONFLICT);
      }
    });
  });
});
