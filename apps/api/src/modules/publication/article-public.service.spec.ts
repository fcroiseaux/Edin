import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticleService } from './article.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockPrisma = {
  article: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  evaluation: {
    findFirst: vi.fn(),
  },
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('ArticleService — Public Methods', () => {
  let service: ArticleService;

  const publishedArticle = {
    id: 'article-1',
    title: 'Test Article',
    slug: 'test-article-abc123',
    abstract: 'A test abstract for the article.',
    body: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a test article body with enough words to calculate reading time properly.',
            },
          ],
        },
      ],
    }),
    domain: 'Technology',
    status: 'PUBLISHED',
    version: 1,
    authorId: 'author-1',
    editorId: 'editor-1',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-05'),
    submittedAt: new Date('2026-03-02'),
    publishedAt: new Date('2026-03-05'),
    author: {
      id: 'author-1',
      name: 'Jane Author',
      avatarUrl: 'https://example.com/avatar.jpg',
      domain: 'Technology',
      bio: 'A technology contributor.',
    },
    editor: {
      id: 'editor-1',
      name: 'John Editor',
      avatarUrl: 'https://example.com/editor-avatar.jpg',
      domain: 'Technology',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ArticleService(mockPrisma as any, mockEventEmitter as any);
  });

  describe('listPublished', () => {
    it('should return only published articles with author info', async () => {
      mockPrisma.article.findMany.mockResolvedValue([publishedArticle]);
      mockPrisma.article.count.mockResolvedValue(1);

      const result = await service.listPublished({}, undefined, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Test Article');
      expect(result.items[0].author.name).toBe('Jane Author');
      expect(result.items[0].readingTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.hasMore).toBe(false);

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });

    it('should filter by domain', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);

      await service.listPublished({ domain: 'Fintech' }, undefined, 20);

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED', domain: 'Fintech' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);

      await service.listPublished(
        { dateFrom: '2026-03-01T00:00:00Z', dateTo: '2026-03-31T23:59:59Z' },
        undefined,
        20,
      );

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            publishedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should handle cursor pagination correctly', async () => {
      const articles = Array.from({ length: 21 }, (_, i) => ({
        ...publishedArticle,
        id: `article-${i}`,
        publishedAt: new Date(`2026-03-${String(i + 1).padStart(2, '0')}`),
      }));
      mockPrisma.article.findMany.mockResolvedValue(articles);
      mockPrisma.article.count.mockResolvedValue(25);

      const result = await service.listPublished({}, undefined, 20);

      expect(result.items).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBeTruthy();
    });

    it('should return empty results when no published articles exist', async () => {
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);

      const result = await service.listPublished({}, undefined, 20);

      expect(result.items).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.cursor).toBeNull();
    });
  });

  describe('getPublishedBySlug', () => {
    it('should return article with author and editor profiles', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(publishedArticle);

      const result = await service.getPublishedBySlug('test-article-abc123');

      expect(result.title).toBe('Test Article');
      expect(result.author.name).toBe('Jane Author');
      expect(result.editor?.name).toBe('John Editor');
      expect(result.readingTimeMinutes).toBeGreaterThanOrEqual(1);
      expect(result.evaluationScore).toBeNull();
      expect(result.evaluationNarrative).toBeNull();
    });

    it('should throw ARTICLE_NOT_FOUND for non-existent slug', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(service.getPublishedBySlug('non-existent')).rejects.toThrow(DomainException);
    });

    it('should throw ARTICLE_NOT_FOUND for non-published article', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        ...publishedArticle,
        status: 'DRAFT',
      });

      await expect(service.getPublishedBySlug('test-article-abc123')).rejects.toThrow(
        DomainException,
      );
    });

    it('should handle article without editor', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        ...publishedArticle,
        editorId: null,
        editor: null,
      });

      const result = await service.getPublishedBySlug('test-article-abc123');
      expect(result.editor).toBeNull();
    });
  });

  describe('calculateReadingTime', () => {
    it('should calculate reading time from Tiptap JSON', () => {
      const body = JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: Array(400).fill('word').join(' ') }],
          },
        ],
      });

      const result = service.calculateReadingTime(body);
      expect(result).toBe(2); // 400 words / 200 wpm = 2 min
    });

    it('should return minimum 1 minute for short content', () => {
      const body = JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Short' }] }],
      });

      expect(service.calculateReadingTime(body)).toBe(1);
    });

    it('should handle plain text body', () => {
      const body = Array(600).fill('word').join(' ');
      expect(service.calculateReadingTime(body)).toBe(3);
    });

    it('should handle empty content', () => {
      expect(service.calculateReadingTime('')).toBe(1);
    });
  });

  describe('getSitemapArticles', () => {
    it('should return all published article slugs', async () => {
      mockPrisma.article.findMany.mockResolvedValue([
        {
          slug: 'article-1',
          publishedAt: new Date('2026-03-05'),
          updatedAt: new Date('2026-03-06'),
        },
        {
          slug: 'article-2',
          publishedAt: new Date('2026-03-03'),
          updatedAt: new Date('2026-03-04'),
        },
      ]);

      const result = await service.getSitemapArticles();

      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe('article-1');
      expect(result[1].slug).toBe('article-2');

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PUBLISHED' },
        }),
      );
    });
  });
});
