import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'DATABASE_URL') {
                return 'postgresql://test:test@localhost:5432/test?schema=core';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be an instance of PrismaClient', () => {
    expect(typeof service.$connect).toBe('function');
    expect(typeof service.$disconnect).toBe('function');
  });

  it('should expose contributor model', () => {
    expect(service.contributor).toBeDefined();
  });

  it('should expose auditLog model', () => {
    expect(service.auditLog).toBeDefined();
  });

  it('should connect and log on module init', async () => {
    const connectSpy = vi.spyOn(service, '$connect').mockResolvedValue(undefined);
    const logSpy = vi.spyOn(
      (service as { logger: { log: (message: string) => void } }).logger,
      'log',
    );

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Connecting to database...');
    expect(logSpy).toHaveBeenCalledWith('Database connection established');
  });

  it('should disconnect and log on module destroy', async () => {
    const disconnectSpy = vi.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    const logSpy = vi.spyOn(
      (service as { logger: { log: (message: string) => void } }).logger,
      'log',
    );

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Disconnecting from database...');
    expect(logSpy).toHaveBeenCalledWith('Database connection closed');
  });

  it('should throw when DATABASE_URL is missing', () => {
    const configService = {
      get: vi.fn(() => undefined),
    } as unknown as ConfigService;

    expect(() => new PrismaService(configService)).toThrow(
      'DATABASE_URL is required for PrismaService',
    );
  });
});
