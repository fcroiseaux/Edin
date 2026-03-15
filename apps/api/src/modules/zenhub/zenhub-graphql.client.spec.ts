import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import {
  ZenhubGraphqlClient,
  ZenhubApiError,
  ZenhubRateLimitError,
} from './zenhub-graphql.client.js';
import { ZenhubConfigService } from './zenhub-config.service.js';

const mockZenhubConfigService = {
  resolveApiToken: vi.fn(),
};

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createFetchResponse(status: number, data: unknown, headers?: Record<string, string>) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      get: (name: string) => headers?.[name.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(data),
  };
}

describe('ZenhubGraphqlClient', () => {
  let client: ZenhubGraphqlClient;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ZenhubGraphqlClient,
        { provide: ZenhubConfigService, useValue: mockZenhubConfigService },
      ],
    }).compile();

    client = module.get(ZenhubGraphqlClient);
  });

  it('returns data on successful query', async () => {
    mockZenhubConfigService.resolveApiToken.mockResolvedValue('test-token');
    mockFetch.mockResolvedValue(createFetchResponse(200, { data: { workspace: { sprints: [] } } }));

    const result = await client.query('{ workspace { sprints } }');

    expect(result).toEqual({ workspace: { sprints: [] } });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.zenhub.com/public/graphql',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('throws ZenhubApiError when API token is not configured', async () => {
    mockZenhubConfigService.resolveApiToken.mockResolvedValue(null);

    await expect(client.query('{ test }')).rejects.toThrow(ZenhubApiError);
    await expect(client.query('{ test }')).rejects.toThrow('Zenhub API token is not configured');
  });

  it('retries on 429 rate limit and succeeds', async () => {
    mockZenhubConfigService.resolveApiToken.mockResolvedValue('test-token');
    mockFetch
      .mockResolvedValueOnce(createFetchResponse(429, {}, { 'retry-after': '0' }))
      .mockResolvedValueOnce(createFetchResponse(200, { data: { sprints: [1, 2] } }));

    const result = await client.query('{ sprints }');

    expect(result).toEqual({ sprints: [1, 2] });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws ZenhubRateLimitError after max retries on 429', async () => {
    mockZenhubConfigService.resolveApiToken.mockResolvedValue('test-token');
    mockFetch.mockResolvedValue(createFetchResponse(429, {}, { 'retry-after': '0' }));

    await expect(client.query('{ test }')).rejects.toThrow(ZenhubRateLimitError);
    expect(mockFetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('throws ZenhubApiError on non-200 non-429 response', async () => {
    mockZenhubConfigService.resolveApiToken.mockResolvedValue('test-token');
    mockFetch.mockResolvedValue(createFetchResponse(500, {}));

    await expect(client.query('{ test }')).rejects.toThrow(ZenhubApiError);
    await expect(client.query('{ test }')).rejects.toThrow('Zenhub API responded with status 500');
  });
});
