import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Observable } from 'rxjs';
import { ContributionSseController } from './contribution-sse.controller.js';

describe('ContributionSseController', () => {
  let controller: ContributionSseController;
  let contributionSseService: { createStream: ReturnType<typeof vi.fn> };
  let prisma: { contributor: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    contributionSseService = {
      createStream: vi.fn(() => new Observable()),
    };
    prisma = {
      contributor: {
        findUnique: vi.fn(),
      },
    };

    controller = new ContributionSseController(contributionSseService as never, prisma as never);
  });

  it('creates a stream for the authenticated contributor', async () => {
    const stream = new Observable();
    prisma.contributor.findUnique.mockResolvedValue({ id: 'contributor-1' });
    contributionSseService.createStream.mockReturnValue(stream);

    const result = await controller.stream(12345);

    expect(prisma.contributor.findUnique).toHaveBeenCalledWith({
      where: { githubId: 12345 },
      select: { id: true },
    });
    expect(contributionSseService.createStream).toHaveBeenCalledWith('contributor-1');
    expect(result).toBe(stream);
  });

  it('returns a completed stream when the user has no contributor profile', async () => {
    prisma.contributor.findUnique.mockResolvedValue(null);

    const result = await controller.stream(12345);
    const complete = vi.fn();

    result.subscribe({ complete });

    expect(contributionSseService.createStream).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalled();
  });
});
