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
