import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GitHubApiService, GitHubApiError, GitHubRateLimitError } from './github-api.service.js';

// Mock Octokit as a class
const mockCreateWebhook = vi.fn();
const mockDeleteWebhook = vi.fn();
const mockGetRepo = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: class MockOctokit {
    repos = {
      createWebhook: mockCreateWebhook,
      deleteWebhook: mockDeleteWebhook,
      get: mockGetRepo,
    };
    constructor() {}
  },
}));

describe('GitHubApiService', () => {
  let service: GitHubApiService;

  const mockConfigService = {
    get: vi.fn((key: string) => {
      if (key === 'GITHUB_APP_TOKEN') return 'test-token';
      if (key === 'INGESTION_WEBHOOK_BASE_URL') return 'https://api.edin.dev';
      return undefined;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [GitHubApiService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get(GitHubApiService);
  });

  // ─── createWebhook ────────────────────────────────────────────────────

  describe('createWebhook', () => {
    it('should create webhook successfully', async () => {
      mockCreateWebhook.mockResolvedValue({ data: { id: 12345 } });

      const result = await service.createWebhook('org', 'repo', 'secret-123', 'corr-1');

      expect(result.webhookId).toBe(12345);
      expect(mockCreateWebhook).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'org',
          repo: 'repo',
          events: ['push', 'pull_request', 'pull_request_review'],
          active: true,
        }),
      );
    });

    it('should retry on 429 and succeed on second attempt', async () => {
      mockCreateWebhook
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockResolvedValueOnce({ data: { id: 67890 } });

      const result = await service.createWebhook('org', 'repo', 'secret', 'corr-1');

      expect(result.webhookId).toBe(67890);
      expect(mockCreateWebhook).toHaveBeenCalledTimes(2);
    });

    it('should throw GitHubRateLimitError after exhausting retries on 429', async () => {
      mockCreateWebhook.mockRejectedValue({ status: 429, message: 'Rate limited' });

      await expect(service.createWebhook('org', 'repo', 'secret', 'corr-1')).rejects.toBeInstanceOf(
        GitHubRateLimitError,
      );
      // 1 initial + 2 retries = 3 calls
      expect(mockCreateWebhook).toHaveBeenCalledTimes(3);
    });

    it('should throw GitHubApiError when INGESTION_WEBHOOK_BASE_URL is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GITHUB_APP_TOKEN') return 'test-token';
        if (key === 'INGESTION_WEBHOOK_BASE_URL') return undefined;
        return undefined;
      });

      await expect(service.createWebhook('org', 'repo', 'secret', 'corr-1')).rejects.toThrow(
        'INGESTION_WEBHOOK_BASE_URL is not configured',
      );
    });

    it('should throw GitHubApiError on other failures', async () => {
      mockCreateWebhook.mockRejectedValue(new Error('Permission denied'));

      await expect(service.createWebhook('org', 'repo', 'secret', 'corr-1')).rejects.toBeInstanceOf(
        GitHubApiError,
      );
    });
  });

  // ─── deleteWebhook ────────────────────────────────────────────────────

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      mockDeleteWebhook.mockResolvedValue({});

      await service.deleteWebhook('org', 'repo', 12345, 'corr-1');

      expect(mockDeleteWebhook).toHaveBeenCalledWith({
        owner: 'org',
        repo: 'repo',
        hook_id: 12345,
      });
    });

    it('should throw GitHubApiError on failure', async () => {
      mockDeleteWebhook.mockRejectedValue(new Error('Not found'));

      await expect(service.deleteWebhook('org', 'repo', 12345, 'corr-1')).rejects.toBeInstanceOf(
        GitHubApiError,
      );
    });
  });

  // ─── verifyRepository ──────────────────────────────────────────────────

  describe('verifyRepository', () => {
    it('should return true for existing repository', async () => {
      mockGetRepo.mockResolvedValue({ data: { full_name: 'org/repo' } });

      const result = await service.verifyRepository('org', 'repo');

      expect(result).toBe(true);
    });

    it('should return false for non-existing repository', async () => {
      mockGetRepo.mockRejectedValue(new Error('Not found'));

      const result = await service.verifyRepository('org', 'nonexistent');

      expect(result).toBe(false);
    });
  });
});
