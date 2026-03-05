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

  // Seed micro-tasks for each domain (conditional: create only if no active task exists)
  const microTasks = [
    {
      domain: 'Technology' as const,
      title: 'Build a REST API endpoint',
      description:
        'Design and implement a single REST API endpoint that accepts a JSON payload, validates input, and returns a structured response. Use any language or framework you prefer. Focus on clean code, proper error handling, and clear documentation.',
      expectedDeliverable:
        'A working API endpoint with source code, brief README explaining your design decisions, and example request/response.',
      estimatedEffort: '2-4 hours',
      submissionFormat: 'GitHub repository link or gist',
    },
    {
      domain: 'Fintech' as const,
      title: 'Analyze a DeFi protocol risk model',
      description:
        'Select a DeFi protocol of your choice and write a brief analysis of its risk model. Identify at least three risk factors, evaluate current mitigation strategies, and propose one improvement. Ground your analysis in publicly available data.',
      expectedDeliverable:
        'A written analysis (1-2 pages) with data references and a one-paragraph executive summary.',
      estimatedEffort: '2-4 hours',
      submissionFormat: 'PDF or Markdown document',
    },
    {
      domain: 'Impact' as const,
      title: 'Draft an impact measurement framework',
      description:
        'Design a simple framework for measuring the social or environmental impact of a digital platform. Define 3-5 key metrics, explain how each would be collected, and describe how they connect to meaningful outcomes. Focus on practicality over comprehensiveness.',
      expectedDeliverable:
        'A framework document with metric definitions, collection methods, and a brief rationale for each metric.',
      estimatedEffort: '2-4 hours',
      submissionFormat: 'PDF or Markdown document',
    },
    {
      domain: 'Governance' as const,
      title: 'Propose a community decision-making process',
      description:
        'Design a lightweight governance process for a small contributor community (20-50 people). Address how decisions are proposed, discussed, and ratified. Consider inclusivity, transparency, and efficiency. Reference at least one existing governance model as inspiration.',
      expectedDeliverable:
        'A governance proposal document outlining the process flow, roles involved, and escalation procedures.',
      estimatedEffort: '2-4 hours',
      submissionFormat: 'PDF or Markdown document',
    },
  ];

  for (const task of microTasks) {
    const existing = await prisma.microTask.findFirst({
      where: { domain: task.domain, isActive: true },
    });

    if (!existing) {
      const microTask = await prisma.microTask.create({
        data: {
          ...task,
          isActive: true,
        },
      });
      console.log(`Created micro-task for ${task.domain}: ${microTask.id}`);
    } else {
      console.log(`Micro-task for ${task.domain} already exists: ${existing.id}`);
    }
  }

  // Seed buddy opt-in contributors
  const buddyContributor1 = await prisma.contributor.upsert({
    where: { githubId: 3 },
    update: { buddyOptIn: true },
    create: {
      githubId: 3,
      email: 'buddy1@edin.local',
      name: 'Alice Mentor',
      bio: 'Experienced full-stack developer passionate about helping newcomers.',
      domain: 'Technology',
      role: 'CONTRIBUTOR',
      isActive: true,
      buddyOptIn: true,
    },
  });
  console.log(`Upserted buddy contributor 1: ${buddyContributor1.id}`);

  const buddyContributor2 = await prisma.contributor.upsert({
    where: { githubId: 4 },
    update: { buddyOptIn: true },
    create: {
      githubId: 4,
      email: 'buddy2@edin.local',
      name: 'Bob Guide',
      bio: 'DeFi researcher and fintech enthusiast. Happy to guide new contributors.',
      domain: 'Fintech',
      role: 'CONTRIBUTOR',
      isActive: true,
      buddyOptIn: true,
    },
  });
  console.log(`Upserted buddy contributor 2: ${buddyContributor2.id}`);

  // Mark existing test contributor as buddy opt-in
  await prisma.contributor.update({
    where: { id: contributor.id },
    data: { buddyOptIn: true },
  });
  console.log(`Updated test contributor with buddyOptIn: ${contributor.id}`);

  // Seed sample onboarding milestones for buddy contributor 2
  // (simulates a contributor partway through onboarding)
  const existingMilestone = await prisma.onboardingMilestone.findFirst({
    where: { contributorId: buddyContributor2.id },
  });
  if (!existingMilestone) {
    await prisma.onboardingMilestone.create({
      data: {
        contributorId: buddyContributor2.id,
        milestoneType: 'ACCOUNT_ACTIVATED',
        completedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
      },
    });
    await prisma.onboardingMilestone.create({
      data: {
        contributorId: buddyContributor2.id,
        milestoneType: 'BUDDY_ASSIGNED',
        completedAt: new Date(Date.now() - 47 * 60 * 60 * 1000), // 47 hours ago
      },
    });
    console.log(`Created sample onboarding milestones for ${buddyContributor2.name}`);
  } else {
    console.log(`Onboarding milestones already exist for ${buddyContributor2.name}`);
  }

  // Create a sample buddy assignment (contributor2 is mentored by contributor)
  const existingAssignment = await prisma.buddyAssignment.findFirst({
    where: { contributorId: buddyContributor2.id, buddyId: contributor.id },
  });
  if (!existingAssignment) {
    const assignment = await prisma.buddyAssignment.create({
      data: {
        contributorId: buddyContributor2.id,
        buddyId: contributor.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
        notes: 'Sample buddy assignment for development testing',
      },
    });
    console.log(`Created sample buddy assignment: ${assignment.id}`);
  } else {
    console.log(`Sample buddy assignment already exists: ${existingAssignment.id}`);
  }

  // Seed sample monitored repositories
  const existingRepo = await prisma.monitoredRepository.findFirst({
    where: { fullName: 'edin-foundation/edin-core' },
  });
  if (!existingRepo) {
    const repo = await prisma.monitoredRepository.create({
      data: {
        owner: 'edin-foundation',
        repo: 'edin-core',
        fullName: 'edin-foundation/edin-core',
        webhookId: 12345,
        webhookSecret: 'dev-seed-secret-do-not-use-in-production',
        status: 'ACTIVE',
        addedById: admin.id,
      },
    });
    console.log(`Created sample monitored repository: ${repo.fullName}`);
  } else {
    console.log(`Sample monitored repository already exists: ${existingRepo.fullName}`);
  }

  const existingRepo2 = await prisma.monitoredRepository.findFirst({
    where: { fullName: 'edin-foundation/edin-docs' },
  });
  if (!existingRepo2) {
    const repo2 = await prisma.monitoredRepository.create({
      data: {
        owner: 'edin-foundation',
        repo: 'edin-docs',
        fullName: 'edin-foundation/edin-docs',
        webhookSecret: 'dev-seed-secret-2-do-not-use-in-production',
        status: 'PENDING',
        statusMessage: 'Webhook registration pending',
        addedById: admin.id,
      },
    });
    console.log(`Created sample monitored repository: ${repo2.fullName}`);
  } else {
    console.log(`Sample monitored repository already exists: ${existingRepo2.fullName}`);
  }

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
