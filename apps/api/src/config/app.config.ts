import { z } from 'zod';

export const appConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('30d'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  GITHUB_APP_TOKEN: z.string().min(1).optional(),
  GITHUB_BOT_USERNAME: z.string().min(1).optional(),
  INGESTION_WEBHOOK_BASE_URL: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default('edin-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  PSEUDONYM_SALT: z.string().min(32).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  EVALUATION_MODEL_ID: z.string().optional(),
  EVALUATION_ENABLED: z.string().optional(),

  // Zenhub Integration — all optional; configurable via admin panel
  ZENHUB_API_TOKEN: z.string().min(1).optional(),
  ZENHUB_WEBHOOK_SECRET: z.string().min(1).optional(),
  ZENHUB_POLLING_INTERVAL_MS: z.coerce.number().int().min(60_000).default(900_000),
  ZENHUB_WORKSPACE_ID: z.string().optional(),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export function validateConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const result = appConfigSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}
