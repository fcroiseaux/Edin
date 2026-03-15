# Story zh-5.2: Status & Story Point Sync

Status: done

## Story

As a contributor,
I want Zenhub pipeline changes and story point updates to automatically sync to my Edin tasks,
So that my task status stays current across both platforms.

## Epic

zh-Epic 5: Bidirectional Task Sync (Phase 2)
**FRs covered:** FR41 (status sync from Zenhub pipeline transitions to Edin task statuses), FR42 (story point estimate sync)

## Acceptance Criteria

1. **Given** a Zenhub issue linked to an Edin task moves through pipeline stages **When** a pipeline transition event is received (via webhook or polling) **Then** the Edin task status is updated according to the configurable mapping (default: Backlog->AVAILABLE, In Progress->IN_PROGRESS, Done->COMPLETED) **And** the status change is logged with correlationId

2. **Given** story point estimates change on a Zenhub issue **When** the estimate change event is received (via webhook or polling) **Then** the linked Edin task's `estimatedEffort` field is updated to match (e.g., `"8 story points"`) **And** the change is logged

3. **Given** a status mapping configuration **When** the admin reviews or adjusts it **Then** the mapping is stored in the database (via SettingsService, not hardcoded) **And** changes take effect on subsequent sync events

4. **Given** a Zenhub pipeline name that has no configured mapping **When** a transition to that pipeline is received **Then** the task status is NOT changed **And** a warning is logged with the unmapped pipeline name

5. **Given** a Zenhub issue with no linked Edin task **When** a status/estimate change event is received **Then** the event is silently skipped (no error, debug log only)

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Task Model** (`apps/api/prisma/schema.prisma`, lines 511-539):

```prisma
model Task {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title           String
  description     String            @db.Text
  domain          ContributorDomain
  difficulty      TaskDifficulty
  estimatedEffort String            @map("estimated_effort")
  status          TaskStatus        @default(AVAILABLE)
  sortOrder       Int               @default(0) @map("sort_order")
  claimedById     String?           @map("claimed_by_id") @db.Uuid
  claimedAt       DateTime?         @map("claimed_at")
  completedAt     DateTime?         @map("completed_at")
  createdById     String            @map("created_by_id") @db.Uuid
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")
  zenhubIssueId   String?           @unique @map("zenhub_issue_id")
  // ... relations and indexes
  @@map("tasks")
  @@schema("core")
}
```

Enums: `TaskStatus` = AVAILABLE | CLAIMED | IN_PROGRESS | COMPLETED | EVALUATED | RETIRED.

**CRITICAL: TaskService VALID_TRANSITIONS** (`apps/api/src/modules/task/task.service.ts`, lines 13-19):

```typescript
AVAILABLE    -> [CLAIMED]
CLAIMED      -> [IN_PROGRESS, AVAILABLE]
IN_PROGRESS  -> [COMPLETED]
COMPLETED    -> [EVALUATED]
EVALUATED    -> []
```

These transitions are enforced by `TaskService.updateStatus()`. **Zenhub sync MUST NOT use `TaskService.updateStatus()`** because it would reject valid sync transitions (e.g., AVAILABLE->IN_PROGRESS). Instead, use direct Prisma update on the task — Zenhub is source of truth for sprint data per architecture decision. Emit `task.status-changed` event manually after direct update.

**TaskService.updateStatus()** (`apps/api/src/modules/task/task.service.ts`, lines 248-323):

- Sets `claimedAt` when transitioning to CLAIMED
- Sets `completedAt` when transitioning to COMPLETED
- Emits `task.status-changed` event with `{ taskId, previousStatus, newStatus, actorId, correlationId }`
- The sync service must replicate these side-effects when updating status directly

**ZenhubTaskSyncService** (`apps/api/src/modules/zenhub/zenhub-task-sync.service.ts`):

- Already handles task creation from Zenhub issues (zh-5-1)
- `syncTaskFromIssue()` — creates task, maps fields, auto-claims
- `processPolledIssues()` — batch processing from polling
- `handleWebhookEvent()` — listens to `zenhub.webhook.received`, creates tasks
- Maps `estimate.value` to `estimatedEffort` string on creation only
- Does NOT handle updates to existing tasks — this is what zh-5-2 adds

**ZenhubConfigService** (`apps/api/src/modules/zenhub/zenhub-config.service.ts`):

- Uses SettingsService with DB-first, env-var-fallback pattern
- KEYS: `API_TOKEN`, `WEBHOOK_URL`, `WEBHOOK_SECRET`, `POLLING_INTERVAL_MS`, `WORKSPACE_MAPPING`, `CONTRIBUTOR_TASK_LABEL`, `TASK_SYNC_ENABLED`, `TASK_SYNC_CREATOR_ID`
- `resolveWorkspaceMapping()` returns `Record<string, string>` (domain -> workspaceId)
- New keys needed: `PIPELINE_STATUS_MAPPING`, `STATUS_SYNC_ENABLED`

**ZenhubPollingService** (`apps/api/src/modules/zenhub/zenhub-polling.service.ts`):

- ISSUES_QUERY already fetches `pipelineIssue { pipeline { id name } }`, `estimate { value }`, `labels`, `assignees`
- After fetching issues per workspace, calls `taskSyncService.processPolledIssues()` — currently only creates new tasks
- Need to add a call to sync status/estimates for existing linked tasks

**ZenhubIssueData** (from `packages/shared/src/types/zenhub.types.ts`):

```typescript
export interface ZenhubIssueData {
  id: string;
  number: number;
  title: string;
  body?: string;
  estimate?: { value: number } | null;
  pipelineIssue?: { pipeline: { id: string; name: string } } | null;
  sprints?: { nodes: Array<{ id: string; name: string }> };
  labels?: { nodes: Array<{ name: string }> };
  assignees?: { nodes: Array<{ login: string }> };
}
```

Pipeline name (e.g., "Backlog", "In Progress", "Done") is available from `pipelineIssue.pipeline.name`. This is the key field for status mapping.

**ZenhubWebhookService** (`apps/api/src/modules/zenhub/zenhub-webhook.service.ts`):

- `processWebhook()` stores full payload in `ZenhubSync.payload` (JSONB), emits `zenhub.webhook.received`
- Webhook event types from Zenhub include: `issue_transfer` (pipeline move), `estimate_set`, `estimate_cleared`
- Payload structure varies by event type — the stored payload can be queried back for issue data

**PipelineTransition Model** (`apps/api/prisma/schema.prisma`, lines 1215-1233):

```prisma
model PipelineTransition {
  id             String   @id
  sprintMetricId String   @db.Uuid
  issueId        String
  issueNumber    Int
  fromPipeline   String
  toPipeline     String
  storyPoints    Int?
  contributorId  String?  @db.Uuid
  transitionedAt DateTime
  createdAt      DateTime @default(now())
  @@map("pipeline_transitions")
  @@schema("sprint")
}
```

This model already tracks pipeline transitions for sprint metrics. The sync service should reference these for context but task status updates are independent.

**ZenhubSyncConflict Model** (sprint schema, `zenhub_sync_conflicts` table):

- Fields: `conflictType`, `affectedEntity`, `affectedEntityId`, `resolution` (default 'pending'), `outcome`, `resolvedBy`
- Available for logging conflicts but conflict UI/resolution is zh-5-3 scope

**Event patterns**: `zenhub.*` for integration plumbing, `sprint.*` for domain logic, `task.*` for task changes.

### Implementation Approach

#### 1. Extend ZenhubConfigService — Pipeline Status Mapping

Add new KEYS:

```typescript
PIPELINE_STATUS_MAPPING: 'zenhub.pipeline_status_mapping',
STATUS_SYNC_ENABLED: 'zenhub.status_sync_enabled',
```

Add resolution methods:

- `resolvePipelineStatusMapping(): Promise<Record<string, string> | null>` — returns mapping like `{ "Backlog": "AVAILABLE", "In Progress": "IN_PROGRESS", "Done": "COMPLETED" }`. Default mapping provided when null.
- `resolveStatusSyncEnabled(): Promise<boolean>` — returns true/false (default false, independent of task_sync_enabled)

Default mapping (used when no DB config exists):

```typescript
const DEFAULT_PIPELINE_STATUS_MAPPING: Record<string, string> = {
  Backlog: 'AVAILABLE',
  'Sprint Backlog': 'AVAILABLE',
  'In Progress': 'IN_PROGRESS',
  'In Review': 'IN_PROGRESS',
  Done: 'COMPLETED',
};
```

Extend `getConfig()` and `updateConfig()` to include these settings.

#### 2. Extend Shared Types

Add to `packages/shared/src/types/zenhub.types.ts`:

```typescript
export interface ZenhubTaskStatusSyncedEvent {
  eventType: 'zenhub.task.status.synced';
  timestamp: string;
  correlationId: string;
  payload: {
    taskId: string;
    zenhubIssueId: string;
    previousStatus: string;
    newStatus: string;
    pipelineName: string;
  };
}

export interface ZenhubTaskPointsSyncedEvent {
  eventType: 'zenhub.task.points.synced';
  timestamp: string;
  correlationId: string;
  payload: {
    taskId: string;
    zenhubIssueId: string;
    previousEstimate: string;
    newEstimate: string;
    storyPoints: number;
  };
}
```

Extend `ZenhubConfigResponse` with `statusSyncEnabled`, `pipelineStatusMapping`.
Extend `UpdateZenhubConfigInput` with `statusSyncEnabled`, `pipelineStatusMapping`.

#### 3. Extend ZenhubTaskSyncService — Status & Estimate Sync

Add methods to `apps/api/src/modules/zenhub/zenhub-task-sync.service.ts`:

```typescript
async syncStatusFromIssue(
  issue: ZenhubIssueData,
  correlationId: string,
): Promise<{ updated: boolean; field: 'status' | 'estimate' | null }> {
  // 1. Check if status sync is enabled
  // 2. Find linked task by zenhubIssueId
  // 3. If no linked task, return { updated: false, field: null } (AC: 5)
  // 4. Extract pipeline name from issue.pipelineIssue.pipeline.name
  // 5. Look up pipeline-to-status mapping (DB config with default fallback)
  // 6. If pipeline has no mapping, log warning, return (AC: 4)
  // 7. If task.status already matches mapped status, skip (idempotent)
  // 8. Direct prisma.task.update() — NOT TaskService.updateStatus()
  //    - Set status to mapped value
  //    - If mapped to COMPLETED: set completedAt = now()
  //    - If mapped from COMPLETED to something else: clear completedAt
  // 9. Emit 'task.status-changed' event (same structure as TaskService)
  // 10. Emit 'zenhub.task.status.synced' event
  // 11. Log with correlationId
}

async syncEstimateFromIssue(
  issue: ZenhubIssueData,
  correlationId: string,
): Promise<{ updated: boolean }> {
  // 1. Check if task sync is enabled (uses existing TASK_SYNC_ENABLED flag)
  // 2. Find linked task by zenhubIssueId
  // 3. If no linked task, return (debug log)
  // 4. Format estimate: issue.estimate?.value ? `${value} story points` : 'Unestimated'
  // 5. If task.estimatedEffort already matches, skip (idempotent)
  // 6. Direct prisma.task.update() — set estimatedEffort
  // 7. Emit 'zenhub.task.points.synced' event
  // 8. Log with correlationId
}

async syncExistingTasksFromPolledIssues(
  issues: ZenhubIssueData[],
  correlationId: string,
): Promise<{ statusUpdated: number; estimateUpdated: number; skipped: number }> {
  // 1. For each issue, check if linked task exists (batch query for efficiency)
  // 2. For each linked task: call syncStatusFromIssue() and syncEstimateFromIssue()
  // 3. Return aggregate counts
}
```

Extend `handleWebhookEvent()` to handle status/estimate updates:

```typescript
// After existing task creation logic, add:
// If event type is 'issue_transfer' (pipeline move):
//   Extract issue data from payload, call syncStatusFromIssue()
// If event type is 'estimate_set' or 'estimate_cleared':
//   Extract issue data from payload, call syncEstimateFromIssue()
```

#### 4. Extend Polling Service Integration

In `zenhub-polling.service.ts`, after `taskSyncService.processPolledIssues()`:

```typescript
// Sync status and estimates for existing linked tasks
const syncResult = await this.taskSyncService.syncExistingTasksFromPolledIssues(
  issues as ZenhubIssueData[],
  correlationId,
);
```

This ensures polling reconciles status/estimate drift even if webhooks are missed.

#### 5. Extend Shared Schemas

Add to `packages/shared/src/schemas/zenhub-config.schema.ts`:

- Validation for `pipelineStatusMapping` (Record<string, TaskStatus enum value>)
- Validation for `statusSyncEnabled` (boolean)

#### 6. Error Codes

Add to `packages/shared/src/constants/error-codes.ts`:

```typescript
ZENHUB_STATUS_SYNC_DISABLED: 'ZENHUB_STATUS_SYNC_DISABLED',
ZENHUB_UNMAPPED_PIPELINE: 'ZENHUB_UNMAPPED_PIPELINE',
```

### Key Patterns to Follow

- **Direct Prisma updates for status**: Bypass `TaskService.updateStatus()` to avoid transition validation. Zenhub is source of truth — it can move a task from AVAILABLE to IN_PROGRESS directly. Replicate side-effects (completedAt) manually.
- **Idempotency**: Check current task status/estimate before updating. Skip if unchanged. No unique constraint needed — just compare values.
- **Event-driven**: Emit both `task.status-changed` (for activity feed, notifications) and `zenhub.task.status.synced` (for sync monitoring) events.
- **Config resolution**: DB setting -> env var fallback -> hardcoded default mapping.
- **Logging**: Structured Pino format: `this.logger.log({ msg: '...', zenhubIssueId, taskId, pipelineName, previousStatus, newStatus, correlationId })`
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2. Use `makeIssue()` helper from existing tests.
- **Module boundaries**: Status sync lives in `zenhub` module (integration plumbing). Direct Prisma access to tasks table — no need to import TaskModule.
- **Response envelope**: `createSuccessResponse(data, correlationId)` for any new endpoints.

### Dependencies

- Existing `PrismaService` for database access (task lookups and updates)
- Existing `ZenhubConfigService` for configuration (extended with new keys)
- Existing `EventEmitter2` for event emission
- Existing `ZenhubTaskSyncService` (extended, not replaced)
- No new npm packages required
- No new Prisma migration required (all fields already exist)

### Previous Story Intelligence

From zh-5-1:

- 16 tests passing in zenhub-task-sync.service.spec.ts
- 1326 tests passing across full API suite (no regressions from zh-4-3's 1310)
- Pre-existing test failures unchanged: redis.service.spec.ts (10), ability.factory.spec.ts (1) — known and accepted
- `makeIssue()` helper in test file creates `ZenhubIssueData` with defaults including `pipelineIssue: { pipeline: { id: 'pipe-1', name: 'Sprint Backlog' } }`
- Idempotency via P2002 Prisma unique constraint catch is the established pattern
- Direct `prisma.task.create()` used (not TaskService.create()) to avoid circular dependencies
- Events emitted manually: `task.created`, `task.claimed`, `zenhub.task.created`
- Domain resolution: case-insensitive workspace key matching, 'default' -> 'Technology'
- Config flags: `taskSyncEnabled` and `contributorTaskLabel` gate task creation

### Files to Create

None — all changes extend existing files.

### Files to Modify

- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — add PIPELINE_STATUS_MAPPING, STATUS_SYNC_ENABLED keys and resolution methods
- `apps/api/src/modules/zenhub/zenhub-config.service.spec.ts` — add new fields to mock config, test new methods
- `apps/api/src/modules/zenhub/zenhub-config.controller.spec.ts` — add new config fields to mock
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.ts` — add syncStatusFromIssue(), syncEstimateFromIssue(), syncExistingTasksFromPolledIssues(), extend handleWebhookEvent()
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.spec.ts` — add tests for status sync, estimate sync, webhook event routing, unmapped pipelines, idempotency
- `apps/api/src/modules/zenhub/zenhub-polling.service.ts` — call syncExistingTasksFromPolledIssues() after processPolledIssues()
- `apps/api/src/modules/zenhub/zenhub-polling.service.spec.ts` — add mock for new sync method
- `packages/shared/src/types/zenhub.types.ts` — add ZenhubTaskStatusSyncedEvent, ZenhubTaskPointsSyncedEvent, extend config types
- `packages/shared/src/index.ts` — export new types
- `packages/shared/src/schemas/zenhub-config.schema.ts` — add pipelineStatusMapping and statusSyncEnabled validation
- `packages/shared/src/constants/error-codes.ts` — add ZENHUB_STATUS_SYNC_DISABLED, ZENHUB_UNMAPPED_PIPELINE

### Out of Scope

- Sync conflict resolution UI and manual override (Story zh-5-3)
- Writing sync conflicts to `zenhub_sync_conflicts` table (Story zh-5-3 — this story just logs conflicts)
- Bidirectional sync (Edin -> Zenhub) — only Zenhub -> Edin is in scope
- Updating task title/description from Zenhub issue changes
- Admin UI for pipeline status mapping (config API-first; UI can be added later)
- CASL permission changes (status sync is system-level, not user-initiated)

## Tasks / Subtasks

- [x] Task 1: Shared types — extend config and add sync event types (AC: 1, 2, 3)
  - [x] Add `ZenhubTaskStatusSyncedEvent` interface to `zenhub.types.ts`
  - [x] Add `ZenhubTaskPointsSyncedEvent` interface to `zenhub.types.ts`
  - [x] Extend `ZenhubConfigResponse` with `statusSyncEnabled`, `pipelineStatusMapping`
  - [x] Extend `UpdateZenhubConfigInput` with `statusSyncEnabled`, `pipelineStatusMapping`
  - [x] Export new types from `packages/shared/src/index.ts`
  - [x] Verify shared package builds cleanly

- [x] Task 2: Shared schemas and error codes (AC: 3, 4)
  - [x] Add `pipelineStatusMapping` validation (Record<string, TaskStatus>) to `zenhub-config.schema.ts`
  - [x] Add `statusSyncEnabled` (boolean) to config schema
  - [x] Add `ZENHUB_STATUS_SYNC_DISABLED` and `ZENHUB_UNMAPPED_PIPELINE` to ERROR_CODES

- [x] Task 3: ZenhubConfigService — pipeline status mapping config (AC: 3)
  - [x] Add KEYS: `PIPELINE_STATUS_MAPPING`, `STATUS_SYNC_ENABLED`
  - [x] Add `resolvePipelineStatusMapping()` — returns DB mapping or default `{ Backlog: AVAILABLE, Sprint Backlog: AVAILABLE, In Progress: IN_PROGRESS, In Review: IN_PROGRESS, Done: COMPLETED }`
  - [x] Add `resolveStatusSyncEnabled()` — returns boolean (default false)
  - [x] Extend `getConfig()` to include status sync fields
  - [x] Extend `updateConfig()` to handle status sync settings
  - [x] Update config service tests with new keys and methods

- [x] Task 4: ZenhubTaskSyncService — status sync logic (AC: 1, 4, 5)
  - [x] Add `syncStatusFromIssue(issue, correlationId)` — look up linked task, map pipeline to status, direct Prisma update, emit events
  - [x] Handle unmapped pipeline names: log warning, skip update (AC: 4)
  - [x] Handle missing linked task: debug log, skip (AC: 5)
  - [x] Handle idempotency: skip if task.status already matches mapped status
  - [x] Set `completedAt = now()` when mapping to COMPLETED; clear `completedAt` when mapping away from COMPLETED
  - [x] Emit `task.status-changed` event (same shape as TaskService) and `zenhub.task.status.synced` event

- [x] Task 5: ZenhubTaskSyncService — estimate sync logic (AC: 2, 5)
  - [x] Add `syncEstimateFromIssue(issue, correlationId)` — look up linked task, format estimate string, Prisma update
  - [x] Handle null/cleared estimates: set `estimatedEffort = 'Unestimated'`
  - [x] Handle idempotency: skip if estimatedEffort already matches
  - [x] Handle missing linked task: debug log, skip (AC: 5)
  - [x] Emit `zenhub.task.points.synced` event

- [x] Task 6: ZenhubTaskSyncService — polling integration (AC: 1, 2)
  - [x] Add `syncExistingTasksFromPolledIssues(issues, correlationId)` — batch sync for existing linked tasks
  - [x] Call from polling service after `processPolledIssues()` in `executePoll()`
  - [x] Return `{ statusUpdated, estimateUpdated, skipped }` counts
  - [x] Update polling service spec with mock for new method

- [x] Task 7: ZenhubTaskSyncService — webhook event routing (AC: 1, 2)
  - [x] Extend `handleWebhookEvent()` to detect `issue_transfer` events -> call `syncStatusFromIssue()`
  - [x] Extend `handleWebhookEvent()` to detect `estimate_set`/`estimate_cleared` events -> call `syncEstimateFromIssue()`
  - [x] Extract issue data from webhook payload for each event type

- [x] Task 8: Unit tests — status and estimate sync (AC: 1-5)
  - [x] Test: syncs status when pipeline maps to different TaskStatus
  - [x] Test: skips status update when task already has mapped status (idempotent)
  - [x] Test: skips status update when status sync is disabled
  - [x] Test: logs warning and skips when pipeline name has no mapping (AC: 4)
  - [x] Test: skips when no linked task exists (AC: 5)
  - [x] Test: sets completedAt when mapping to COMPLETED
  - [x] Test: clears completedAt when mapping away from COMPLETED
  - [x] Test: syncs story points to estimatedEffort string
  - [x] Test: handles cleared estimates (null) -> 'Unestimated'
  - [x] Test: skips estimate update when already matching (idempotent)
  - [x] Test: batch sync from polled issues updates multiple tasks
  - [x] Test: webhook issue_transfer triggers status sync
  - [x] Test: webhook estimate_set triggers estimate sync
  - [x] Test: emits both task.status-changed and zenhub.task.status.synced events
  - [x] Verify all existing tests still pass

## Dev Notes

- **Direct Prisma updates, not TaskService**: The task service enforces sequential transition rules (AVAILABLE->CLAIMED->IN_PROGRESS->COMPLETED). Zenhub sync needs to set status directly (e.g., AVAILABLE->IN_PROGRESS) because Zenhub is source of truth. Use `prisma.task.update()` and manually replicate side-effects (`completedAt` timestamp) and event emission.
- **Default pipeline mapping**: Include common Zenhub pipeline names in the default mapping. Admins can customize via config API. The mapping is case-sensitive — Zenhub pipeline names come as-is from the API.
- **Polling as reconciliation**: The polling path (`syncExistingTasksFromPolledIssues`) reconciles any missed webhooks. It runs every 15 minutes and ensures eventual consistency.
- **Webhook event types**: Zenhub webhook events include `issue_transfer` (pipeline move with `from_pipeline` and `to_pipeline` data), `estimate_set` (with `estimate` field), and `estimate_cleared`. The webhook payload is stored in `ZenhubSync.payload` as JSONB. Extract issue data from the payload for sync processing.
- **No new migration**: All required schema fields already exist — `Task.status`, `Task.estimatedEffort`, `Task.zenhubIssueId` were added in zh-5-1 or exist from the original schema.
- **Feature flag independence**: `STATUS_SYNC_ENABLED` is separate from `TASK_SYNC_ENABLED`. Status sync can be enabled/disabled independently of task creation sync. Both default to `false`.
- **Batch efficiency**: For polling, query all tasks with non-null `zenhubIssueId` in a single query, then cross-reference with polled issues. Avoid N+1 queries.
- **EVALUATED and RETIRED tasks**: If a task is in EVALUATED or RETIRED status, do NOT sync status from Zenhub. These are Edin-terminal states that should not be overwritten by Zenhub pipeline changes.

### References

- [Source: apps/api/src/modules/task/task.service.ts:13-19] — VALID_TRANSITIONS (bypass needed)
- [Source: apps/api/src/modules/task/task.service.ts:248-323] — updateStatus() method with side-effects
- [Source: apps/api/src/modules/zenhub/zenhub-task-sync.service.ts] — existing task sync service (extend)
- [Source: apps/api/src/modules/zenhub/zenhub-config.service.ts] — config key pattern
- [Source: apps/api/src/modules/zenhub/zenhub-polling.service.ts:38-60] — ISSUES_QUERY with pipeline data
- [Source: apps/api/src/modules/zenhub/zenhub-webhook.service.ts] — webhook processing pattern
- [Source: packages/shared/src/types/zenhub.types.ts:140-150] — ZenhubIssueData interface
- [Source: apps/api/prisma/schema.prisma:511-539] — Task model with zenhubIssueId
- [Source: apps/api/prisma/schema.prisma:1215-1233] — PipelineTransition model

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 8 tasks completed with all subtasks checked
- 35 tests passing in zenhub-task-sync.service.spec.ts (19 new tests added)
- 1345 tests passing across full API suite (no new regressions from zh-5-1's 1326)
- Pre-existing test failures unchanged: redis.service.spec.ts (10), ability.factory.spec.ts (1)
- No new npm dependencies
- No new Prisma migration needed (all fields already exist)
- Shared package builds cleanly with new types
- Status sync: pipeline-to-status mapping with configurable DB-stored mapping and sensible defaults
- Estimate sync: story point changes update task estimatedEffort string
- Both webhook (issue_transfer, estimate_set, estimate_cleared) and polling paths implemented
- Idempotent: skips updates when task already has mapped status/estimate
- Terminal states (EVALUATED, RETIRED) protected from sync overwrites
- Direct Prisma updates bypass TaskService.updateStatus() transition validation (Zenhub is source of truth)
- Side-effects replicated: completedAt set/cleared on COMPLETED transitions
- Events emitted: task.status-changed + zenhub.task.status.synced for status, zenhub.task.points.synced for estimates
- Feature-flagged: statusSyncEnabled independent of taskSyncEnabled, both default to false
- Default pipeline mapping: Backlog/Sprint Backlog->AVAILABLE, In Progress/In Review->IN_PROGRESS, Done->COMPLETED

### File List

**Modified:**

- `packages/shared/src/types/zenhub.types.ts` — added ZenhubTaskStatusSyncedEvent, ZenhubTaskPointsSyncedEvent, extended config types
- `packages/shared/src/index.ts` — exported new event types
- `packages/shared/src/schemas/zenhub-config.schema.ts` — added statusSyncEnabled, pipelineStatusMapping validation
- `packages/shared/src/constants/error-codes.ts` — added ZENHUB_STATUS_SYNC_DISABLED, ZENHUB_UNMAPPED_PIPELINE
- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — added STATUS_SYNC_ENABLED, PIPELINE_STATUS_MAPPING keys, resolution methods, default mapping
- `apps/api/src/modules/zenhub/zenhub-config.service.spec.ts` — updated expected config with new fields
- `apps/api/src/modules/zenhub/zenhub-config.controller.spec.ts` — updated mockConfig with new fields
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.ts` — added syncStatusFromIssue, syncEstimateFromIssue, syncExistingTasksFromPolledIssues, extended handleWebhookEvent with event routing
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.spec.ts` — added 19 new tests for status sync, estimate sync, webhook routing, batch sync
- `apps/api/src/modules/zenhub/zenhub-polling.service.ts` — added syncExistingTasksFromPolledIssues call after processPolledIssues
- `apps/api/src/modules/zenhub/zenhub-polling.service.spec.ts` — added syncExistingTasksFromPolledIssues to mock

### Change Log

- 2026-03-15: Implemented status and story point sync from Zenhub to Edin tasks (syncStatusFromIssue, syncEstimateFromIssue, webhook event routing, polling integration, 19 unit tests)
