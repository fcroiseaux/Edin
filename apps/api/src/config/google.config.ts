import { z } from 'zod';

export const googleConfigSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
});

export type GoogleConfig = z.infer<typeof googleConfigSchema>;
