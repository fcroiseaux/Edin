import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const admin = await prisma.contributor.upsert({
    where: { githubId: 1 },
    update: {},
    create: {
      githubId: 1,
      email: 'admin@edin.local',
      name: 'Edin Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`Upserted admin contributor: ${admin.id}`);

  const contributor = await prisma.contributor.upsert({
    where: { githubId: 2 },
    update: {},
    create: {
      githubId: 2,
      email: 'contributor@edin.local',
      name: 'Test Contributor',
      domain: 'Technology',
      role: 'CONTRIBUTOR',
      isActive: true,
    },
  });
  console.log(`Upserted test contributor: ${contributor.id}`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
