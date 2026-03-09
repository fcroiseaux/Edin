import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ArticleController } from './article.controller.js';
import { ArticleService } from './article.service.js';

const mockArticleDto = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Test Article',
  slug: 'test-article-abc123',
  abstract: 'A test abstract with enough characters for validation purposes here.',
  body: 'A'.repeat(500),
  domain: 'Technology',
  status: 'DRAFT' as const,
  version: 1,
  authorId: 'author-uuid',
  editorId: null,
  createdAt: '2026-03-09T10:00:00.000Z',
  updatedAt: '2026-03-09T10:00:00.000Z',
  submittedAt: null,
  publishedAt: null,
};

const mockArticleService = {
  createArticle: vi.fn(),
  getArticle: vi.fn(),
  updateArticle: vi.fn(),
  getUserArticles: vi.fn(),
  submitArticle: vi.fn(),
  deleteArticle: vi.fn(),
};

const mockReq = { correlationId: 'test-corr-id' } as unknown as Request & {
  correlationId: string;
};

describe('ArticleController', () => {
  let controller: ArticleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticleController],
      providers: [{ provide: ArticleService, useValue: mockArticleService }],
    }).compile();

    controller = module.get(ArticleController);
    vi.clearAllMocks();
  });

  describe('POST /articles', () => {
    it('should create an article and return 201', async () => {
      mockArticleService.createArticle.mockResolvedValue(mockArticleDto);

      const result = await controller.createArticle(
        { title: 'Test Article', abstract: '', body: '', domain: 'Technology' },
        'author-uuid',
        mockReq as any,
      );

      expect(result.data).toEqual(mockArticleDto);
      expect(result.meta.correlationId).toBe('test-corr-id');
    });

    it('should reject invalid input with 400', async () => {
      await expect(
        controller.createArticle({ title: '' } as any, 'author-uuid', mockReq as any),
      ).rejects.toThrow();
    });
  });

  describe('GET /articles/:id', () => {
    it('should return the article for the owner', async () => {
      mockArticleService.getArticle.mockResolvedValue(mockArticleDto);

      const result = await controller.getArticle(mockArticleDto.id, 'author-uuid', mockReq as any);

      expect(result.data.id).toBe(mockArticleDto.id);
    });
  });

  describe('PATCH /articles/:id', () => {
    it('should update the article', async () => {
      const updatedDto = { ...mockArticleDto, title: 'Updated Title' };
      mockArticleService.updateArticle.mockResolvedValue(updatedDto);

      const result = await controller.updateArticle(
        mockArticleDto.id,
        { title: 'Updated Title' },
        'author-uuid',
        mockReq as any,
      );

      expect(result.data.title).toBe('Updated Title');
    });
  });

  describe('GET /articles', () => {
    it('should return paginated draft list', async () => {
      mockArticleService.getUserArticles.mockResolvedValue({
        items: [mockArticleDto],
        pagination: { cursor: null, hasMore: false, total: 1 },
      });

      const result = await controller.listArticles(
        'DRAFT',
        undefined,
        '20',
        'author-uuid',
        mockReq as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.pagination).toBeDefined();
    });
  });

  describe('POST /articles/:id/submit', () => {
    it('should submit the article', async () => {
      const submittedDto = { ...mockArticleDto, status: 'SUBMITTED' };
      mockArticleService.submitArticle.mockResolvedValue(submittedDto);

      const result = await controller.submitArticle(
        mockArticleDto.id,
        'author-uuid',
        mockReq as any,
      );

      expect(result.data.status).toBe('SUBMITTED');
    });
  });

  describe('DELETE /articles/:id', () => {
    it('should delete and return 204', async () => {
      mockArticleService.deleteArticle.mockResolvedValue(undefined);

      await controller.deleteArticle(mockArticleDto.id, 'author-uuid');

      expect(mockArticleService.deleteArticle).toHaveBeenCalledWith(
        mockArticleDto.id,
        'author-uuid',
      );
    });
  });
});
