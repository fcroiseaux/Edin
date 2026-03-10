import path from 'node:path';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// Load .env manually since Prisma config doesn't auto-load dotenv
const envPath = path.join(__dirname, '.env');
try {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
} catch {
  // .env file not found, rely on process.env
}

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
