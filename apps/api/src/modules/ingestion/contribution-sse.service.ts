import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from '../../common/redis/redis.service.js';

@Injectable()
export class ContributionSseService implements OnModuleDestroy {
  private readonly logger = new Logger(ContributionSseService.name);
  private readonly subscribers = new Map<
    string,
    { subscriber: Redis; subject: Subject<MessageEvent> }
  >();

  constructor(private readonly redisService: RedisService) {}

  async onModuleDestroy(): Promise<void> {
    for (const [key, { subscriber, subject }] of this.subscribers) {
      subject.complete();
      await subscriber.quit();
      this.subscribers.delete(key);
    }
    this.logger.log('All SSE subscriptions cleaned up');
  }

  createStream(contributorId: string): Observable<MessageEvent> {
    const channel = `contributions:contributor:${contributorId}`;
    const subject = new Subject<MessageEvent>();
    const subscriber = this.redisService.createSubscriber();
    const subscriptionKey = `${contributorId}-${Date.now()}`;

    void subscriber.subscribe(channel).then(() => {
      this.logger.debug('SSE client subscribed to Redis channel', {
        channel,
        contributorId,
      });
    });

    subscriber.on('message', (_ch: string, message: string) => {
      try {
        const data: unknown = JSON.parse(message);
        subject.next({ data: data as Record<string, unknown> });
      } catch (error) {
        this.logger.warn('Failed to parse Redis pub/sub message', {
          channel,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.subscribers.set(subscriptionKey, { subscriber, subject });

    // Clean up on unsubscribe (client disconnect)
    return new Observable<MessageEvent>((observer) => {
      const subscription = subject.subscribe(observer);

      return () => {
        subscription.unsubscribe();
        subject.complete();
        void subscriber.unsubscribe(channel).then(() => subscriber.quit());
        this.subscribers.delete(subscriptionKey);
        this.logger.debug('SSE client disconnected, cleaned up subscription', {
          channel,
          contributorId,
        });
      };
    });
  }
}
