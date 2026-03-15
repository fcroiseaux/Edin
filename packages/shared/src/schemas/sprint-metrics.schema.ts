import { z } from 'zod';

export const sprintMetricsQuerySchema = z.object({
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(52).default(12),
  cursor: z.string().optional(),
});

export type SprintMetricsQueryDto = z.infer<typeof sprintMetricsQuerySchema>;

export const sprintBurndownQuerySchema = z.object({
  domain: z.string().optional(),
});

export type SprintBurndownQueryDto = z.infer<typeof sprintBurndownQuerySchema>;

export const sprintScopeChangesQuerySchema = z.object({
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type SprintScopeChangesQueryDto = z.infer<typeof sprintScopeChangesQuerySchema>;

export const contributorTrendsQuerySchema = z.object({
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(52).default(12),
});

export type ContributorTrendsQueryDto = z.infer<typeof contributorTrendsQuerySchema>;

export const sprintExportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']),
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(52).default(12),
});

export type SprintExportQueryDto = z.infer<typeof sprintExportQuerySchema>;

export const planningReliabilityQuerySchema = z.object({
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(52).default(12),
  contributorId: z.string().uuid().optional(),
});

export type PlanningReliabilityQueryDto = z.infer<typeof planningReliabilityQuerySchema>;

export const crossDomainCollaborationQuerySchema = z.object({
  sprintId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CrossDomainCollaborationQueryDto = z.infer<typeof crossDomainCollaborationQuerySchema>;
