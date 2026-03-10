import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

const REFRESH_TOKEN_PREFIX = 'refresh_token';

interface RefreshTokenData {
  contributorId: string;
  createdAt: string;
  lastUsedAt: string;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(this.configService.getOrThrow<string>('REDIS_URL'));
  }

  onModuleInit(): void {
    this.logger.log('Redis connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  async setRefreshToken(contributorId: string, tokenId: string, ttlSeconds: number): Promise<void> {
    const key = `${REFRESH_TOKEN_PREFIX}:${contributorId}:${tokenId}`;
    const data: RefreshTokenData = {
      contributorId,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };
    await this.client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  }

  async getRefreshToken(contributorId: string, tokenId: string): Promise<RefreshTokenData | null> {
    const key = `${REFRESH_TOKEN_PREFIX}:${contributorId}:${tokenId}`;
    const data = await this.client.get(key);
    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data) as RefreshTokenData;

    // Update lastUsedAt
    const ttl = await this.client.ttl(key);
    if (ttl > 0) {
      parsed.lastUsedAt = new Date().toISOString();
      await this.client.set(key, JSON.stringify(parsed), 'EX', ttl);
    }

    return parsed;
  }

  async deleteRefreshToken(contributorId: string, tokenId: string): Promise<void> {
    const key = `${REFRESH_TOKEN_PREFIX}:${contributorId}:${tokenId}`;
    await this.client.del(key);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async deleteAllRefreshTokens(contributorId: string): Promise<void> {
    const pattern = `${REFRESH_TOKEN_PREFIX}:${contributorId}:*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  createSubscriber(): Redis {
    return this.client.duplicate();
  }
}
