import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../../generated/prisma/client/client.js';
import { WebhookProcessor } from './webhook.processor.js';
import type { Job } from 'bullmq';
import type { WebhookJobData } from './webhook.processor.js';

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);

describe.runIf(hasDatabase)('WebhookProcessor integration', () => {
  const eventEmitter = { emit: vi.fn() };
  const dlqQueue = { add: vi.fn() };
  let prisma: PrismaClient;

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists contributions and emits events from webhook payload', async () => {
    const processor = new WebhookProcessor(
      prisma as never,
      eventEmitter as never,
      dlqQueue as never,
    );
    const suffix = Date.now().toString();

    const admin = await prisma.contributor.create({
      data: {
        githubId: 800000 + Number(suffix.slice(-4)),
        name: `Ingestion Admin ${suffix}`,
        email: `ingestion-admin-${suffix}@example.com`,
        role: 'ADMIN',
      },
      select: { id: true },
    });

    const contributor = await prisma.contributor.create({
      data: {
        githubId: 810000 + Number(suffix.slice(-4)),
        name: `Ingestion Contributor ${suffix}`,
        email: `ingestion-contrib-${suffix}@example.com`,
        role: 'CONTRIBUTOR',
      },
      select: { id: true, githubId: true },
    });

    const owner = `it-owner-${suffix}`;
    const repo = `it-repo-${suffix}`;
    const fullName = `${owner}/${repo}`;

    const repository = await prisma.monitoredRepository.create({
      data: {
        owner,
        repo,
        fullName,
        webhookSecret: `secret-${suffix}`,
        addedById: admin.id,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    const deliveryId = `it-delivery-${suffix}`;
    const commitSha = `itsha-${suffix}`;

    const job = {
      id: `job-${suffix}`,
      data: {
        eventType: 'push',
        repositoryFullName: fullName,
        deliveryId,
        payload: {
          sender: { id: contributor.githubId },
          commits: [
            {
              id: commitSha,
              author: {
                email: `ingestion-contrib-${suffix}@example.com`,
                name: 'Integration User',
              },
              message: 'feat: integration ingestion test\n\nEnsures DB persistence and events.',
              timestamp: new Date().toISOString(),
              added: ['apps/api/src/integration-test.ts'],
              removed: [],
              modified: ['apps/api/src/modules/ingestion/processors/webhook.processor.ts'],
            },
          ],
          repository: { full_name: fullName },
        },
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
      moveToDelayed: vi.fn(),
    } as unknown as Job<WebhookJobData>;

    try {
      await processor.process(job);

      const contribution = await prisma.contribution.findUnique({
        where: {
          source_repositoryId_sourceRef: {
            source: 'GITHUB',
            repositoryId: repository.id,
            sourceRef: commitSha,
          },
        },
      });

      expect(contribution).toBeTruthy();
      expect(contribution?.contributorId).toBe(contributor.id);
      expect(contribution?.contributionType).toBe('COMMIT');
      expect(contribution?.status).toBe('INGESTED');

      const delivery = await prisma.webhookDelivery.findUnique({ where: { deliveryId } });
      expect(delivery?.status).toBe('COMPLETED');
      expect(delivery?.processedAt).toBeTruthy();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contribution.commit.ingested',
        expect.objectContaining({
          contributionId: contribution?.id,
          contributionType: 'COMMIT',
          contributorId: contributor.id,
          repositoryId: repository.id,
          correlationId: deliveryId,
        }),
      );
    } finally {
      await prisma.webhookDelivery.deleteMany({ where: { deliveryId } });
      await prisma.contribution.deleteMany({ where: { repositoryId: repository.id } });
      await prisma.monitoredRepository.deleteMany({ where: { id: repository.id } });
      await prisma.contributor.deleteMany({ where: { id: { in: [contributor.id, admin.id] } } });
    }
  });
});
