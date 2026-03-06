import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContributionSseService } from './contribution-sse.service.js';

describe('ContributionSseService', () => {
  let service: ContributionSseService;
  let subscriber: {
    subscribe: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
  };
  let redisService: {
    createSubscriber: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    subscriber = {
      subscribe: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
    };

    redisService = {
      createSubscriber: vi.fn(() => subscriber),
    };

    service = new ContributionSseService(redisService as never);
  });

  it('subscribes to the contributor Redis channel and forwards parsed events', () => {
    let messageHandler: ((channel: string, message: string) => void) | undefined;
    subscriber.on.mockImplementation(
      (event: string, handler: (channel: string, message: string) => void) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      },
    );

    const next = vi.fn();
    const subscription = service.createStream('contributor-1').subscribe(next);

    expect(subscriber.subscribe).toHaveBeenCalledWith('contributions:contributor:contributor-1');

    messageHandler?.(
      'contributions:contributor:contributor-1',
      JSON.stringify({
        type: 'contribution.new',
        contributionId: 'c-1',
        contributionType: 'COMMIT',
      }),
    );

    expect(next).toHaveBeenCalledWith({
      data: { type: 'contribution.new', contributionId: 'c-1', contributionType: 'COMMIT' },
    });

    subscription.unsubscribe();
  });

  it('cleans up the Redis subscriber when the client disconnects', async () => {
    const subscription = service.createStream('contributor-2').subscribe(() => undefined);

    subscription.unsubscribe();
    await Promise.resolve();

    expect(subscriber.unsubscribe).toHaveBeenCalledWith('contributions:contributor:contributor-2');
    expect(subscriber.quit).toHaveBeenCalled();
  });
});
