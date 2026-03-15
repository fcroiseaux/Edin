# Story zh-5.3: Sync Conflict Resolution

Status: done

## Story

As an admin,
I want sync conflicts between Zenhub and Edin resolved automatically with manual override available,
So that data stays consistent across platforms without constant intervention.

## Epic

zh-Epic 5: Bidirectional Task Sync (Phase 2)
**FRs covered:** FR43 (sync conflict resolution), FR44 (manual conflict resolution UI)

## Acceptance Criteria

1. **Given** a Zenhub issue status and its linked Edin task status diverge **When** a sync conflict is detected (status sync finds a different status) **Then** Zenhub is treated as source of truth and the Edin task is updated **And** the conflict is logged to `zenhub_sync_conflicts` with type `SPRINT_SYNC_CONFLICT` and resolution `auto-resolved` **And** a `sprint.sync.conflict` event is emitted with conflict details

2. **Given** a sync conflict requires human judgment (e.g., unmapped pipeline name) **When** the admin views the conflict resolution UI **Then** they see conflict details (Edin status, Zenhub pipeline, timestamps, affected task ID) **And** they can manually resolve by choosing: keep Edin state, apply a status, or dismiss **And** the resolution is logged with actor and timestamp

3. **Given** automatic conflict resolution **When** the same conflict pattern recurs **Then** the system applies the same resolution consistently (Zenhub as source of truth) **And** all resolutions are auditable via the sync conflicts table

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**ZenhubSyncConflict Model** (`apps/api/prisma/schema.prisma`, lines 1169-1185):

```prisma
model ZenhubSyncConflict {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  syncId           String?  @map("sync_id") @db.Uuid
  conflictType     String   @map("conflict_type")
  affectedEntity   String   @map("affected_entity")
  affectedEntityId String   @map("affected_entity_id")
  resolution       String   @default("pending")
  outcome          String?
  occurredAt       DateTime @map("occurred_at")
  resolvedBy       String?  @map("resolved_by") @db.Uuid
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@index([resolution, occurredAt], map: "zenhub_sync_conflicts_resolution_occurred_idx")
  @@map("zenhub_sync_conflicts")
  @@schema("sprint")
}
```

The `outcome` field stores a JSON string with conflict detail: `{ edinStatus, zenhubPipeline, zenhubMappedStatus, appliedStatus, taskId, zenhubIssueId }`.

**ZenhubTaskSyncService** (`apps/api/src/modules/zenhub/zenhub-task-sync.service.ts`):

- `syncStatusFromIssue()` (lines 191-301): Currently updates status directly when pipeline maps to a different TaskStatus. Does NOT log conflicts. zh-5-3 must add conflict logging before each update.
- When an unmapped pipeline is encountered (line 233-241): Currently logs a warning and skips. zh-5-3 must also create a `pending` conflict record.
- Terminal statuses (EVALUATED, RETIRED) are already protected (lines 219-227). When these are hit, a conflict should NOT be logged — this is expected behavior.

**ZenhubAlertsService** (`apps/api/src/modules/zenhub/zenhub-alerts.service.ts`):

- `getSyncConflicts()` (lines 174-221): Already queries and returns conflict records with pagination.
- Needs a new `resolveConflict()` method for manual resolution.

**ZenhubAlertsController** (`apps/api/src/modules/zenhub/zenhub-alerts.controller.ts`):

- `GET /api/v1/admin/zenhub-alerts/conflicts` (line 72-93): Already serves conflict list.
- Needs a new `PATCH /api/v1/admin/zenhub-alerts/conflicts/:id/resolve` endpoint.

**Existing SyncConflictsTable** (`apps/web/components/features/sprint-dashboard/sync-conflicts-table.tsx`):

- Read-only table with filters for resolution, date range, and pagination.
- Needs "Resolve" action button on pending rows, opening a resolution dialog.

**use-zenhub-alerts hook** (`apps/web/hooks/use-zenhub-alerts.ts`):

- `useZenhubSyncConflicts()` already fetches conflicts.
- Needs a new `useResolveConflict()` mutation hook.

**ZenhubSyncConflictEntry type** (`packages/shared/src/types/zenhub.types.ts`, lines 107-117):

```typescript
export interface ZenhubSyncConflictEntry {
  id: string;
  syncId: string | null;
  conflictType: string;
  affectedEntity: string;
  affectedEntityId: string;
  resolution: ZenhubSyncConflictResolution;
  outcome: string | null;
  occurredAt: string;
  resolvedBy: string | null;
}
```

### Implementation Approach

#### 1. Extend Shared Types

Add to `packages/shared/src/types/zenhub.types.ts`:

```typescript
export interface ZenhubSyncConflictDetail {
  edinStatus: string;
  zenhubPipeline: string;
  zenhubMappedStatus: string | null;
  appliedStatus: string | null;
  taskId: string;
  zenhubIssueId: string;
}

export interface ResolveZenhubSyncConflictInput {
  action: 'keep-edin' | 'apply-status';
  applyStatus?: string; // TaskStatus value, required when action is 'apply-status'
}

export interface ZenhubSyncConflictResolvedEvent {
  eventType: 'sprint.sync.conflict.resolved';
  timestamp: string;
  correlationId: string;
  payload: {
    conflictId: string;
    resolution: 'manual-resolved';
    action: string;
    appliedStatus: string | null;
    taskId: string;
    adminId: string;
  };
}
```

#### 2. Extend Shared Schemas

Add to `packages/shared/src/schemas/zenhub-alerts.schema.ts`:

```typescript
export const resolveZenhubSyncConflictSchema = z.object({
  action: z.enum(['keep-edin', 'apply-status']),
  applyStatus: z.string().optional(),
});
```

#### 3. Extend ZenhubTaskSyncService — Conflict Logging

In `syncStatusFromIssue()`:

- **After finding a divergence** (task.status !== mappedStatus): Create a `zenhub_sync_conflicts` record with `resolution: 'auto-resolved'`, `conflictType: 'SPRINT_SYNC_CONFLICT'`, and `outcome` as a JSON string with conflict details. Emit `sprint.sync.conflict` event. Then proceed with the update.

- **When unmapped pipeline** is encountered: Create a `zenhub_sync_conflicts` record with `resolution: 'pending'`, `conflictType: 'SPRINT_SYNC_CONFLICT'`, and `outcome` as a JSON string with available details (no mappedStatus).

#### 4. Extend ZenhubAlertsService — Manual Resolution

Add `resolveConflict(conflictId, input, adminId, correlationId)`:

1. Find the conflict record, verify it exists and is `pending`
2. If action is `keep-edin`: mark as `manual-resolved` with outcome noting Edin state preserved
3. If action is `apply-status`: find the task from `affectedEntityId`, update its status via direct Prisma, mark conflict as `manual-resolved` with outcome noting status applied
4. Set `resolvedBy` to adminId
5. Emit `sprint.sync.conflict.resolved` event

#### 5. Extend ZenhubAlertsController — Resolution Endpoint

Add `PATCH /api/v1/admin/zenhub-alerts/conflicts/:id/resolve` with CASL guard for `Manage IntegrationConfig`.

#### 6. Frontend — Conflict Resolution UI

Extend `SyncConflictsTable`:

- Add "Resolve" button on rows with `resolution === 'pending'`
- Clicking opens inline expand or modal showing: Edin status, Zenhub pipeline, Zenhub mapped status (if any), timestamps
- Resolution options: "Keep Edin State" button, "Apply Status" dropdown + button
- On success, invalidate conflicts query

Add `useResolveConflict` mutation hook to `use-zenhub-alerts.ts`.

### Key Patterns to Follow

- **Direct Prisma updates for status**: Same as zh-5-2 — bypass `TaskService.updateStatus()`, replicate side-effects.
- **Logging**: Structured Pino format with correlationId.
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2.
- **Response envelope**: `createSuccessResponse(data, correlationId)`.
- **CASL enforcement**: `@CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))`.

### Dependencies

- Existing `PrismaService` for database access
- Existing `ZenhubConfigService` for pipeline mapping
- Existing `EventEmitter2` for event emission
- No new npm packages required
- No new Prisma migration required (ZenhubSyncConflict model already exists)

### Previous Story Intelligence

From zh-5-2:

- 35 tests passing in zenhub-task-sync.service.spec.ts (19 from zh-5-2)
- 1345 tests passing across full API suite
- Pre-existing test failures: redis.service.spec.ts (10), ability.factory.spec.ts (1)
- `makeIssue()` helper available in test file
- Direct `prisma.task.update()` pattern established
- Events emitted manually: `task.status-changed`, `zenhub.task.status.synced`
- Terminal statuses (EVALUATED, RETIRED) protected from sync overwrites

### Files to Create

None.

### Files to Modify

- `packages/shared/src/types/zenhub.types.ts` — add ZenhubSyncConflictDetail, ResolveZenhubSyncConflictInput, ZenhubSyncConflictResolvedEvent
- `packages/shared/src/index.ts` — export new types
- `packages/shared/src/schemas/zenhub-alerts.schema.ts` — add resolveZenhubSyncConflictSchema
- `packages/shared/src/constants/error-codes.ts` — add ZENHUB_SYNC_CONFLICT_NOT_FOUND, ZENHUB_SYNC_CONFLICT_ALREADY_RESOLVED
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.ts` — add conflict logging in syncStatusFromIssue()
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.spec.ts` — add tests for conflict logging and events
- `apps/api/src/modules/zenhub/zenhub-alerts.service.ts` — add resolveConflict() method
- `apps/api/src/modules/zenhub/zenhub-alerts.service.spec.ts` — add tests for manual resolution
- `apps/api/src/modules/zenhub/zenhub-alerts.controller.ts` — add resolve endpoint
- `apps/api/src/modules/zenhub/zenhub-alerts.controller.spec.ts` — add test for resolve endpoint
- `apps/web/hooks/use-zenhub-alerts.ts` — add useResolveConflict mutation
- `apps/web/components/features/sprint-dashboard/sync-conflicts-table.tsx` — add resolve action UI

### Out of Scope

- Bidirectional sync (Edin -> Zenhub) — only Zenhub -> Edin
- Custom conflict resolution rules/policies beyond source-of-truth
- Estimate conflict resolution (only status conflicts for now)
- Email/Slack notifications for pending conflicts
- Conflict auto-resolution history/patterns learning

## Tasks / Subtasks

- [x] Task 1: Shared types — conflict detail, resolution input, event (AC: 1, 2)
  - [x] Add `ZenhubSyncConflictDetail` interface
  - [x] Add `ResolveZenhubSyncConflictInput` interface
  - [x] Add `ZenhubSyncConflictResolvedEvent` interface
  - [x] Export new types from `packages/shared/src/index.ts`
  - [x] Verify shared package builds cleanly

- [x] Task 2: Shared schemas and error codes (AC: 2)
  - [x] Add `resolveZenhubSyncConflictSchema` validation
  - [x] Export from `packages/shared/src/index.ts`
  - [x] Add `ZENHUB_SYNC_CONFLICT_NOT_FOUND` and `ZENHUB_SYNC_CONFLICT_ALREADY_RESOLVED` error codes

- [x] Task 3: ZenhubTaskSyncService — automatic conflict detection and logging (AC: 1, 3)
  - [x] In `syncStatusFromIssue()`, when status diverges: create `zenhub_sync_conflicts` record with `auto-resolved` before updating
  - [x] Store conflict details as JSON in `outcome` field
  - [x] Emit `sprint.sync.conflict` event with conflict details
  - [x] In `syncStatusFromIssue()`, when unmapped pipeline: create `zenhub_sync_conflicts` record with `pending` resolution
  - [x] Emit `sprint.sync.conflict` event for unmapped pipeline conflicts

- [x] Task 4: ZenhubAlertsService — manual conflict resolution (AC: 2)
  - [x] Add `resolveConflict(conflictId, input, adminId, correlationId)` method
  - [x] Handle `keep-edin` action: mark as `manual-resolved`, no task change
  - [x] Handle `apply-status` action: update task status via direct Prisma, mark as `manual-resolved`
  - [x] Replicate side-effects: set/clear `completedAt` for COMPLETED transitions
  - [x] Emit `task.status-changed` event when task status is changed
  - [x] Emit `sprint.sync.conflict.resolved` event
  - [x] Return conflict not found / already resolved errors

- [x] Task 5: ZenhubAlertsController — resolution endpoint (AC: 2)
  - [x] Add `PATCH /api/v1/admin/zenhub-alerts/conflicts/:id/resolve` endpoint
  - [x] Validate input with `resolveZenhubSyncConflictSchema`
  - [x] Guard with `Action.Manage, 'IntegrationConfig'`

- [x] Task 6: Frontend — conflict resolution UI (AC: 2)
  - [x] Add `useResolveConflict` mutation hook to `use-zenhub-alerts.ts`
  - [x] Add "Resolve" button on pending conflict rows in `SyncConflictsTable`
  - [x] Add inline resolution panel with "Keep Edin State" and "Apply Status" options
  - [x] Invalidate conflicts query on success
  - [x] Show success/error feedback

- [x] Task 7: Unit tests — conflict detection (AC: 1, 3)
  - [x] Test: status divergence creates auto-resolved conflict record
  - [x] Test: conflict outcome contains correct Edin/Zenhub states
  - [x] Test: sprint.sync.conflict event emitted on divergence
  - [x] Test: unmapped pipeline creates pending conflict record
  - [x] Test: terminal status (EVALUATED/RETIRED) does NOT create conflict
  - [x] Test: idempotent sync (same status) does NOT create conflict
  - [x] Test: auto-resolved conflicts are consistently logged

- [x] Task 8: Unit tests — manual resolution (AC: 2)
  - [x] Test: resolveConflict with keep-edin marks as manual-resolved without task change
  - [x] Test: resolveConflict with apply-status updates task and marks as manual-resolved
  - [x] Test: resolveConflict sets resolvedBy to adminId
  - [x] Test: resolveConflict emits sprint.sync.conflict.resolved event
  - [x] Test: resolveConflict returns error for non-existent conflict
  - [x] Test: resolveConflict returns error for already-resolved conflict
  - [x] Test: controller validates input and calls service
  - [x] Verify all existing tests still pass

## Dev Notes

- **Conflict logging is additive**: The existing sync flow is not disrupted. Conflict records are created in parallel with the status update. If conflict creation fails, the status update should still proceed (conflict logging is non-blocking).
- **JSON outcome field**: The `outcome` column stores a JSON string with conflict details. The frontend parses this for display. This avoids a new migration while providing rich conflict context.
- **Terminal statuses**: When a task is in EVALUATED or RETIRED and Zenhub tries to change it, this is NOT a conflict — it's expected behavior (terminal states are protected). No conflict record should be created.
- **Idempotent sync**: When task.status already matches the mapped status, there's no divergence and no conflict to log.
- **Manual resolution side-effects**: When admin applies a status via manual resolution, the same side-effects as `syncStatusFromIssue()` must be replicated: set `completedAt` for COMPLETED, clear for non-COMPLETED.
- **CASL guard**: Manual resolution requires `Manage IntegrationConfig` ability, same as other admin zenhub endpoints.

### References

- [Source: apps/api/src/modules/zenhub/zenhub-task-sync.service.ts:191-301] — syncStatusFromIssue (extend)
- [Source: apps/api/src/modules/zenhub/zenhub-alerts.service.ts:174-221] — getSyncConflicts (pattern)
- [Source: apps/api/src/modules/zenhub/zenhub-alerts.controller.ts:72-93] — conflicts endpoint (pattern)
- [Source: apps/api/prisma/schema.prisma:1169-1185] — ZenhubSyncConflict model
- [Source: packages/shared/src/types/zenhub.types.ts:105-117] — ZenhubSyncConflictEntry type
- [Source: apps/web/components/features/sprint-dashboard/sync-conflicts-table.tsx] — existing UI

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 8 tasks completed with all subtasks checked
- 43 tests passing in zenhub-task-sync.service.spec.ts (8 new conflict detection tests)
- 18 tests passing in zenhub-alerts.service.spec.ts (8 new manual resolution tests)
- 8 tests passing in zenhub-alerts.controller.spec.ts (2 new resolve endpoint tests)
- 1363 tests passing across full API suite (no new regressions from zh-5-2's 1345)
- Pre-existing test failures unchanged: redis.service.spec.ts (10), ability.factory.spec.ts (1)
- No new npm dependencies
- No new Prisma migration needed (ZenhubSyncConflict model already exists)
- Shared package builds cleanly with new types
- Auto-conflict detection: status divergences logged as auto-resolved conflicts with full detail in outcome JSON
- Unmapped pipeline conflicts: logged as pending for admin review
- Manual resolution: keep-edin (no task change) and apply-status (with side-effects) actions
- Events emitted: sprint.sync.conflict (on detection), sprint.sync.conflict.resolved (on manual resolution), task.status-changed (on status apply)
- Non-blocking conflict logging: failures in conflict creation do not prevent status sync
- Terminal statuses (EVALUATED, RETIRED) do not generate conflicts — expected behavior
- Idempotent sync (same status) does not generate conflicts
- Frontend: SyncConflictsTable extended with inline Resolve panel for pending conflicts

### File List

**Modified:**

- `packages/shared/src/types/zenhub.types.ts` — added ZenhubSyncConflictDetail, ResolveZenhubSyncConflictInput, ZenhubSyncConflictResolvedEvent
- `packages/shared/src/index.ts` — exported new types and schema
- `packages/shared/src/schemas/zenhub-alerts.schema.ts` — added resolveZenhubSyncConflictSchema, ResolveZenhubSyncConflictDto
- `packages/shared/src/constants/error-codes.ts` — added ZENHUB_SYNC_CONFLICT_NOT_FOUND, ZENHUB_SYNC_CONFLICT_ALREADY_RESOLVED
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.ts` — added logSyncConflict() private method, conflict logging in syncStatusFromIssue() for divergences and unmapped pipelines
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.spec.ts` — added 8 conflict detection tests, zenhubSyncConflict mock
- `apps/api/src/modules/zenhub/zenhub-alerts.service.ts` — added resolveConflict() method, ConflictResolutionError class, EventEmitter2 dependency
- `apps/api/src/modules/zenhub/zenhub-alerts.service.spec.ts` — added 8 manual resolution tests, EventEmitter2 mock, task/conflict Prisma mocks
- `apps/api/src/modules/zenhub/zenhub-alerts.controller.ts` — added PATCH conflicts/:id/resolve endpoint
- `apps/api/src/modules/zenhub/zenhub-alerts.controller.spec.ts` — added 2 resolve endpoint tests
- `apps/web/hooks/use-zenhub-alerts.ts` — added useResolveConflict mutation hook
- `apps/web/components/features/sprint-dashboard/sync-conflicts-table.tsx` — added ResolvePanel, ConflictDetail components, inline resolution UI for pending conflicts

### Change Log

- 2026-03-15: Implemented sync conflict resolution (auto-detection with logging, manual resolution with keep-edin/apply-status, conflict resolution UI, 18 new unit tests)
