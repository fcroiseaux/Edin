import { z } from 'zod';

export const workingGroupIdParamSchema = z.object({
  id: z.string().uuid('Working group ID must be a valid UUID'),
});

export const workingGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  domain: z.enum(['Technology', 'Fintech', 'Impact', 'Governance']),
  accentColor: z.string(),
  memberCount: z.number().int().min(0),
  isMember: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const workingGroupMemberSchema = z.object({
  id: z.string().uuid(),
  workingGroupId: z.string().uuid(),
  contributorId: z.string().uuid(),
  joinedAt: z.string().datetime(),
});

export const joinWorkingGroupSchema = z.object({
  workingGroupId: z.string().uuid(),
});

export type WorkingGroupIdParamDto = z.infer<typeof workingGroupIdParamSchema>;
export type WorkingGroupDto = z.infer<typeof workingGroupSchema>;
export type WorkingGroupMemberDto = z.infer<typeof workingGroupMemberSchema>;
export type JoinWorkingGroupDto = z.infer<typeof joinWorkingGroupSchema>;
