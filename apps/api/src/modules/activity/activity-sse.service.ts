import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from '../../common/redis/redis.service.js';

const ACTIVITY_FEED_CHANNEL = 'activity-feed';

@Injectable()
export class ActivitySseService implements OnModuleDestroy {
  private readonly logger = new Logger(ActivitySseService.name);
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
    this.logger.log('All activity SSE subscriptions cleaned up');
  }

  createStream(excludeEventTypes?: string[]): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    const subscriber = this.redisService.createSubscriber();
    const subscriptionKey = `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const excludeSet = excludeEventTypes?.length ? new Set(excludeEventTypes) : null;

    void subscriber.subscribe(ACTIVITY_FEED_CHANNEL).then(() => {
      this.logger.debug('SSE client subscribed to activity feed channel', {
        channel: ACTIVITY_FEED_CHANNEL,
      });
    });

    subscriber.on('message', (_ch: string, message: string) => {
      try {
        const data = JSON.parse(message) as { activity?: { eventType?: string } };
        if (excludeSet && data.activity?.eventType && excludeSet.has(data.activity.eventType)) {
          return;
        }
        subject.next({ data: data as Record<string, unknown> });
      } catch (error) {
        this.logger.warn('Failed to parse activity feed Redis message', {
          channel: ACTIVITY_FEED_CHANNEL,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.subscribers.set(subscriptionKey, { subscriber, subject });

    return new Observable<MessageEvent>((observer) => {
      const subscription = subject.subscribe(observer);

      return () => {
        subscription.unsubscribe();
        subject.complete();
        void subscriber.unsubscribe(ACTIVITY_FEED_CHANNEL).then(() => subscriber.quit());
        this.subscribers.delete(subscriptionKey);
        this.logger.debug('Activity SSE client disconnected', {
          channel: ACTIVITY_FEED_CHANNEL,
        });
      };
    });
  }
}
