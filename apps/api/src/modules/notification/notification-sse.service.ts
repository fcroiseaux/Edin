import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { RedisService } from '../../common/redis/redis.service.js';

@Injectable()
export class NotificationSseService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationSseService.name);
  private readonly subscribers = new Map<
    string,
    { subscriber: Redis; subject: Subject<MessageEvent>; channel: string }
  >();

  constructor(private readonly redisService: RedisService) {}

  async onModuleDestroy(): Promise<void> {
    for (const [key, { subscriber, subject, channel }] of this.subscribers) {
      subject.complete();
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
      this.subscribers.delete(key);
    }
    this.logger.log('All notification SSE subscriptions cleaned up');
  }

  createStream(contributorId: string): Observable<MessageEvent> {
    const channel = `notifications-${contributorId}`;
    const subject = new Subject<MessageEvent>();
    const subscriber = this.redisService.createSubscriber();
    const subscriptionKey = `notification-${contributorId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    void subscriber.subscribe(channel).then(() => {
      this.logger.debug('SSE client subscribed to notification channel', {
        module: 'notification',
        channel,
      });
    });

    subscriber.on('message', (_ch: string, message: string) => {
      try {
        const data: unknown = JSON.parse(message);
        subject.next({ data: data as Record<string, unknown> });
      } catch (error) {
        this.logger.warn('Failed to parse notification Redis message', {
          module: 'notification',
          channel,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.subscribers.set(subscriptionKey, { subscriber, subject, channel });

    return new Observable<MessageEvent>((observer) => {
      const subscription = subject.subscribe(observer);

      return () => {
        subscription.unsubscribe();
        subject.complete();
        this.subscribers.delete(subscriptionKey);
        subscriber
          .unsubscribe(channel)
          .then(() => subscriber.quit())
          .catch((err: Error) => {
            this.logger.error('Failed to cleanup notification SSE subscriber', {
              module: 'notification',
              channel,
              error: err.message,
            });
          });
        this.logger.debug('Notification SSE client disconnected', {
          module: 'notification',
          channel,
        });
      };
    });
  }
}
