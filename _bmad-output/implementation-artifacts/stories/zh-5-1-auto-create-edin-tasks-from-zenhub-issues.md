# Story zh-5.1: Auto-Create Edin Tasks from Zenhub Issues

Status: done

## Story

As a contributor,
I want Zenhub issues tagged for contributor work to automatically appear as Edin tasks,
So that I can see my sprint assignments in the Edin platform without manual duplication.

## Epic

zh-Epic 5: Bidirectional Task Sync (Phase 2)
**FRs covered:** FR40 (partial — task creation only; status sync and conflict resolution are stories 5.2 and 5.3)

## Acceptance Criteria

1. **Given** a Zenhub issue is labeled with the configurable contributor tag (e.g., `contributor-task`) **When** the label is detected via polling **Then** a corresponding Edin task is automatically created with title, description, and assignment mapped from the Zenhub issue **And** the task is linked to the source Zenhub issue ID for ongoing sync

2. **Given** the configurable tag **When** an admin changes the tag value in configuration **Then** only newly tagged issues trigger task creation (no retroactive processing unless backfill is requested)

3. **Given** a Zenhub issue that already has a linked Edin task **When** the same issue event is processed again **Then** no duplicate task is created (idempotent via unique `zenhubIssueId` constraint)

4. **Given** a webhook event is received that includes issue data **When** the issue has the configured contributor tag label **Then** the task sync service checks and creates a task if one doesn't exist

5. **Given** task sync is disabled in configuration **When** labeled issues are detected **Then** no tasks are created (feature-flagged)

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Task Model** (`apps/api/prisma/schema.prisma`, core schema):

```prisma
model Task {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title           String
  description     String            @db.Text
  domain          ContributorDomain
  difficulty      TaskDifficulty    @default(INTERMEDIATE) -- NOTE: default not present, we set it
  estimatedEffort String            @map("estimated_effort")
  status          TaskStatus        @default(AVAILABLE)
  sortOrder       Int               @default(0) @map("sort_order")
  claimedById     String?           @map("claimed_by_id") @db.Uuid
  claimedAt       DateTime?         @map("claimed_at")
  completedAt     DateTime?         @map("completed_at")
  createdById     String            @map("created_by_id") @db.Uuid
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")
  // NO zenhubIssueId field yet — must be added
  @@map("tasks")
  @@schema("core")
}
```

Enums: `TaskStatus` = AVAILABLE | CLAIMED | IN_PROGRESS | COMPLETED | EVALUATED | RETIRED. `TaskDifficulty` = BEGINNER | INTERMEDIATE | ADVANCED. `ContributorDomain` = Technology | Finance | Impact | Governance.

**TaskService** (`apps/api/src/modules/task/task.service.ts`):

- `create(dto: CreateTaskDto, creatorId: string, correlationId?)` — requires `{title, description, domain, difficulty, estimatedEffort}` + creatorId. Emits `task.created` event.
- CreateTaskDto = `{title: string, description: string, domain: ContributorDomain, difficulty: TaskDifficulty, estimatedEffort: string}`
- TaskModule exports TaskService — can be imported by ZenhubModule.

**Contributor model** has `githubUsername` (String?, unique) for mapping Zenhub assignees to Edin contributors.

**ZenhubConfigService** (`apps/api/src/modules/zenhub/zenhub-config.service.ts`):

- Uses `SettingsService` to store config in database with env var fallback
- KEYS: `API_TOKEN`, `WEBHOOK_URL`, `WEBHOOK_SECRET`, `POLLING_INTERVAL_MS`, `WORKSPACE_MAPPING`
- `resolveWorkspaceMapping()` returns `Record<string, string>` mapping domain → workspaceId (or `{ default: workspaceId }`)
- `updateConfig()` emits `zenhub.config.updated` event

**ZenhubPollingService** (`apps/api/src/modules/zenhub/zenhub-polling.service.ts`):

- Fetches sprints and issues per workspace via GraphQL
- Current ISSUES_QUERY does NOT fetch `labels` or `assignees` — must be extended
- After fetching, emits `zenhub.poll.completed` with aggregate counts only
- Issues are not persisted individually — only counted

**ZenhubWebhookService** (`apps/api/src/modules/zenhub/zenhub-webhook.service.ts`):

- `processWebhook(eventType, deliveryId, payload, correlationId)` — creates ZenhubSync record, emits `zenhub.webhook.received` event
- Webhook payload body is a generic `Record<string, unknown>` — needs to be inspected for issue data and labels

**ZenhubGraphqlClient** (`apps/api/src/modules/zenhub/zenhub-graphql.client.ts`):

- `query<T>(graphqlQuery, variables?, correlationId?)` — generic GraphQL executor with retry and rate limit handling

**Zenhub Module** (`apps/api/src/modules/zenhub/zenhub.module.ts`):

- Imports: PrismaModule, SettingsModule, BullModule (zenhub-polling, zenhub-polling-dlq)
- Controllers: ZenhubConfigController, ZenhubWebhookController, ZenhubBackfillController, ZenhubSyncLogController, ZenhubAlertsController
- Providers: ZenhubConfigService, ZenhubWebhookService, ZenhubGraphqlClient, ZenhubPollingService, ZenhubPollingProcessor, ZenhubBackfillService, ZenhubSyncLogService, ZenhubAlertsService
- Exports: ZenhubConfigService, ZenhubWebhookService, ZenhubPollingService, ZenhubBackfillService

**Shared types** (`packages/shared/src/types/zenhub.types.ts`):

- `ZenhubConfigResponse`, `UpdateZenhubConfigInput`, `ZenhubWebhookReceivedEvent`, `ZenhubPollCompletedEvent`, etc.

**Event patterns**: `zenhub.*` for integration plumbing, `sprint.*` for domain logic. EventEmitter2 with `@OnEvent` decorators.

### Implementation Approach

#### 1. Prisma Schema — Add `zenhubIssueId` to Task Model

Add to `apps/api/prisma/schema.prisma` Task model:

```prisma
zenhubIssueId   String?           @unique @map("zenhub_issue_id")
```

Add index: `@@index([zenhubIssueId], map: "idx_tasks_zenhub_issue_id")` — but `@unique` already creates an index.

Create migration `20260315600000_add_task_zenhub_issue_link`:

```sql
ALTER TABLE "core"."tasks" ADD COLUMN "zenhub_issue_id" TEXT;
CREATE UNIQUE INDEX "tasks_zenhub_issue_id_key" ON "core"."tasks"("zenhub_issue_id");
```

#### 2. Extend ZenhubConfigService — Task Sync Settings

Add new KEYS:

```typescript
CONTRIBUTOR_TASK_LABEL: 'zenhub.contributor_task_label',
TASK_SYNC_ENABLED: 'zenhub.task_sync_enabled',
TASK_SYNC_CREATOR_ID: 'zenhub.task_sync_creator_id',
```

Add resolution methods:

- `resolveContributorTaskLabel(): Promise<string | null>` — returns the configured label (e.g., `contributor-task`)
- `resolveTaskSyncEnabled(): Promise<boolean>` — returns true/false (default false)
- `resolveTaskSyncCreatorId(): Promise<string | null>` — returns admin contributor ID for auto-created tasks

Extend `getConfig()` response and `updateConfig()` to include these new settings.

#### 3. Extend Shared Types

Add to `packages/shared/src/types/zenhub.types.ts`:

```typescript
export interface ZenhubTaskSyncConfig {
  taskSyncEnabled: boolean;
  contributorTaskLabel: string | null;
  taskSyncCreatorId: string | null;
}

export interface ZenhubTaskCreatedEvent {
  eventType: 'zenhub.task.created';
  timestamp: string;
  correlationId: string;
  payload: {
    taskId: string;
    zenhubIssueId: string;
    issueNumber: number;
    title: string;
    domain: string;
  };
}
```

Update `ZenhubConfigResponse` to include task sync fields. Update `UpdateZenhubConfigInput` to include `contributorTaskLabel`, `taskSyncEnabled`, `taskSyncCreatorId`.

#### 4. Extend ISSUES_QUERY in Polling Service

Update the GraphQL query in `zenhub-polling.service.ts` to include `labels` and `assignees`:

```graphql
query GetIssues($workspaceId: ID!, $after: String) {
  workspace(id: $workspaceId) {
    issues(first: 100, after: $after) {
      nodes {
        id
        number
        title
        body
        estimate {
          value
        }
        pipelineIssue {
          pipeline {
            id
            name
          }
        }
        sprints {
          nodes {
            id
            name
          }
        }
        labels {
          nodes {
            name
          }
        }
        assignees {
          nodes {
            login
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
```

After fetching issues, call `taskSyncService.processPolledIssues()` with the enriched issue data.

#### 5. New ZenhubTaskSyncService

Create `apps/api/src/modules/zenhub/zenhub-task-sync.service.ts`:

```typescript
@Injectable()
export class ZenhubTaskSyncService {
  // Injections: PrismaService, ZenhubConfigService, EventEmitter2, Logger

  async syncTaskFromIssue(
    issue: ZenhubIssueData,
    workspaceDomain: string,
    correlationId: string,
  ): Promise<void> {
    // 1. Check if task sync is enabled
    // 2. Check if issue has the configured contributor task label
    // 3. Check idempotency: does a Task with this zenhubIssueId already exist?
    // 4. Resolve domain from workspace mapping (reverse lookup)
    // 5. Resolve creatorId from task_sync_creator_id config
    // 6. Map issue fields to task fields
    // 7. Create task with zenhubIssueId
    // 8. If assignee exists, match to Contributor by githubUsername and claim task
    // 9. Emit zenhub.task.created event
    // 10. Log creation
  }

  async processPolledIssues(
    issues: ZenhubIssueData[],
    workspaceDomain: string,
    correlationId: string,
  ): Promise<{ created: number; skipped: number }> {
    // Filter issues with contributor task label
    // For each matching issue, call syncTaskFromIssue
    // Return counts
  }

  @OnEvent('zenhub.webhook.received')
  async handleWebhookEvent(event: ZenhubWebhookReceivedEvent): Promise<void> {
    // 1. Look up the ZenhubSync record to get the payload
    // 2. Check if payload contains issue data with labels
    // 3. If issue has the configured label, call syncTaskFromIssue
  }
}
```

**Issue → Task field mapping:**

| Zenhub Issue Field   | Edin Task Field   | Mapping Logic                                       |
| -------------------- | ----------------- | --------------------------------------------------- |
| `title`              | `title`           | Direct copy (max 200 chars)                         |
| `body`               | `description`     | Direct copy, fallback to title if empty             |
| `id`                 | `zenhubIssueId`   | Direct copy (unique linkage)                        |
| workspace domain     | `domain`          | Reverse lookup from workspace mapping               |
| —                    | `difficulty`      | Default `INTERMEDIATE`                              |
| `estimate.value`     | `estimatedEffort` | `"{value} story points"` or `"Unestimated"`         |
| config               | `createdById`     | From `task_sync_creator_id` config                  |
| —                    | `status`          | `AVAILABLE` (default)                               |
| `assignees[0].login` | `claimedById`     | Match `githubUsername` → Contributor.id, then claim |

**Idempotency**: Use `prisma.task.upsert()` with `where: { zenhubIssueId }`. On conflict, skip (do not update — title/description sync is story 5.2).

#### 6. Extend ZenhubModule Registration

Update `zenhub.module.ts`:

- Import `TaskModule` (for TaskService or direct Prisma access)
- Add `ZenhubTaskSyncService` to providers
- Export `ZenhubTaskSyncService`

#### 7. Update Shared Schemas

Add to `packages/shared/src/schemas/zenhub-config.schema.ts` (or create if needed):

- Validation for `contributorTaskLabel` (string, min 1, max 100)
- Validation for `taskSyncCreatorId` (uuid)
- Validation for `taskSyncEnabled` (boolean)

#### 8. Admin Configuration UI Extension

Extend the Zenhub configuration page (`apps/web/app/(admin)/admin/sprints/configuration/page.tsx` or the config controller) to include:

- Toggle: "Enable automatic task creation from Zenhub issues"
- Text field: "Contributor task label" (default: `contributor-task`)
- Dropdown/text: "Task creator" — select an admin contributor

This may be light-touch if the existing config page already has a pattern for adding settings. Focus on config controller/service extension; UI can follow existing patterns.

### Key Patterns to Follow

- **Idempotency**: Use unique `zenhubIssueId` constraint. Use upsert or findFirst-then-create pattern with P2002 error handling (same pattern as `zenhub-webhook.service.ts`)
- **Event-driven**: Emit `zenhub.task.created` event after task creation for downstream consumers
- **Config resolution**: DB setting → env var fallback pattern in ZenhubConfigService
- **Logging**: Structured Pino format: `this.logger.log({ msg: '...', zenhubIssueId, taskId, correlationId })`
- **Error codes**: Add `ZENHUB_TASK_SYNC_DISABLED`, `ZENHUB_TASK_SYNC_NO_CREATOR` to ERROR_CODES
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2
- **Module boundaries**: Task sync service lives in `zenhub` module (integration plumbing), not `sprint` module (domain logic)
- **Response envelope**: `createSuccessResponse(data, correlationId)` for any new endpoints

### Dependencies

- Existing `PrismaService` for database access
- Existing `ZenhubConfigService` for configuration
- Existing `ZenhubGraphqlClient` for API queries (if needed for issue body fetch)
- Existing `TaskModule` / `TaskService` (or direct Prisma) for task creation
- Existing `EventEmitter2` for event emission
- No new npm packages required
- **New Prisma migration** required for `zenhubIssueId` field on Task

### Previous Story Intelligence

From zh-4-3:

- Pre-existing test failures unchanged: redis.service.spec.ts (10), ability.factory.spec.ts (1) — known and accepted
- 1310 tests passing across full API suite as of zh-4-3
- Separate controllers help avoid route ordering conflicts
- CASL field-level checks work for contributor-scoped data
- TanStack Query hooks with 5-minute stale time for dashboard data

From zh-1-2 (webhook service):

- Idempotency via P2002 Prisma unique constraint violation catch is the established pattern
- Webhook payloads are stored in ZenhubSync.payload as JSONB — can be read back for task sync processing
- `@OnEvent('zenhub.webhook.received')` is the listener pattern

From zh-1-3 (polling service):

- Polling iterates over workspace mapping keys
- Each workspace maps to a domain (reverse lookup: workspaceId → domain)
- fetchAllIssues returns the full issue set — task sync service filters by label

### Files to Create

- `apps/api/prisma/migrations/20260315600000_add_task_zenhub_issue_link/migration.sql`
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.ts`
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.spec.ts`

### Files to Modify

- `apps/api/prisma/schema.prisma` — add `zenhubIssueId` to Task model
- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — add task sync config keys and resolution methods
- `apps/api/src/modules/zenhub/zenhub-polling.service.ts` — extend ISSUES_QUERY with labels/assignees, call task sync after fetch
- `apps/api/src/modules/zenhub/zenhub.module.ts` — import TaskModule, register ZenhubTaskSyncService
- `packages/shared/src/types/zenhub.types.ts` — add ZenhubTaskSyncConfig, ZenhubTaskCreatedEvent, extend config types
- `packages/shared/src/index.ts` — export new types
- `packages/shared/src/schemas/task.schema.ts` — add `zenhubIssueId` to taskSchema

### Out of Scope

- Status and story point sync from Zenhub to Edin tasks (Story zh-5-2)
- Sync conflict resolution and manual override UI (Story zh-5-3)
- Updating existing task title/description when Zenhub issue changes (Story zh-5-2)
- Admin UI for task sync configuration beyond config service extension (keep config API-first; full UI can be added in zh-5-2 or zh-5-3)
- Retroactive processing of already-labeled issues on first enable (admin can use manual backfill if needed)

## Tasks / Subtasks

- [x] Task 1: Prisma schema — add zenhubIssueId to Task model (AC: 1, 3)
  - [x]Add `zenhubIssueId String? @unique @map("zenhub_issue_id")` to Task model
  - [x]Create migration `20260315600000_add_task_zenhub_issue_link`
  - [x]Run `npx prisma generate` and verify schema compiles
  - [x]Update `taskSchema` in `packages/shared/src/schemas/task.schema.ts` with optional `zenhubIssueId`

- [x] Task 2: Shared types — extend Zenhub config and event types (AC: 2, 5)
  - [x]Add `ZenhubTaskSyncConfig` interface to `zenhub.types.ts`
  - [x]Add `ZenhubTaskCreatedEvent` interface to `zenhub.types.ts`
  - [x]Extend `ZenhubConfigResponse` with `taskSyncEnabled`, `contributorTaskLabel`, `taskSyncCreatorId`
  - [x]Extend `UpdateZenhubConfigInput` with `contributorTaskLabel`, `taskSyncEnabled`, `taskSyncCreatorId`
  - [x]Export new types from `packages/shared/src/index.ts`
  - [x]Verify shared package builds cleanly

- [x] Task 3: ZenhubConfigService — add task sync configuration (AC: 2, 5)
  - [x]Add KEYS: `CONTRIBUTOR_TASK_LABEL`, `TASK_SYNC_ENABLED`, `TASK_SYNC_CREATOR_ID`
  - [x]Add `resolveContributorTaskLabel()` method
  - [x]Add `resolveTaskSyncEnabled()` method (default false)
  - [x]Add `resolveTaskSyncCreatorId()` method
  - [x]Extend `getConfig()` to include task sync fields
  - [x]Extend `updateConfig()` to handle task sync settings

- [x] Task 4: Extend polling service — add labels/assignees to ISSUES_QUERY (AC: 1)
  - [x]Add `body`, `labels { nodes { name } }`, `assignees { nodes { login } }` to ISSUES_QUERY
  - [x]Define `ZenhubIssueData` interface for typed issue data
  - [x]After fetching issues per workspace, call `taskSyncService.processPolledIssues()` with domain and issues
  - [x]Ensure poll completion event still fires correctly

- [x] Task 5: ZenhubTaskSyncService — core task sync logic (AC: 1, 3, 4, 5)
  - [x]Create `zenhub-task-sync.service.ts` in zenhub module
  - [x]Implement `syncTaskFromIssue()` — idempotent task creation from Zenhub issue
  - [x]Implement `processPolledIssues()` — filter by label, bulk create
  - [x]Implement `@OnEvent('zenhub.webhook.received')` handler — check webhook payload for labeled issues
  - [x]Map issue fields to task fields (title, description, domain, difficulty, estimatedEffort, zenhubIssueId)
  - [x]Resolve domain from reverse workspace mapping
  - [x]Match assignee by `githubUsername` to Contributor, auto-claim if found
  - [x]Emit `zenhub.task.created` event per task created
  - [x]Handle idempotency via unique constraint (P2002 catch or upsert)
  - [x]Guard: skip if task sync disabled or no creator configured

- [x] Task 6: ZenhubModule — register new service (AC: 1)
  - [x]Import `TaskModule` in ZenhubModule
  - [x]Register `ZenhubTaskSyncService` as provider
  - [x]Export `ZenhubTaskSyncService`

- [x] Task 7: Unit tests — ZenhubTaskSyncService (AC: 1-5)
  - [x]Test: creates task from labeled issue with correct field mapping
  - [x]Test: skips task creation when issue already has linked task (idempotent)
  - [x]Test: skips task creation when task sync is disabled
  - [x]Test: skips task creation when no creator ID configured
  - [x]Test: auto-claims task when assignee matches a Contributor githubUsername
  - [x]Test: handles missing description gracefully (uses title as fallback)
  - [x]Test: processes multiple issues from poll, creates only for labeled ones
  - [x]Test: webhook handler processes labeled issue from payload
  - [x]Verify all existing tests still pass

- [x] Task 8: Error codes and logging (AC: all)
  - [x]Add `ZENHUB_TASK_SYNC_DISABLED` and `ZENHUB_TASK_SYNC_NO_CREATOR` to ERROR_CODES in shared package
  - [x]Ensure structured logging with correlationId on all sync operations
  - [x]Log: task created, task skipped (duplicate), sync disabled, no creator

## Dev Notes

- The `zenhubIssueId` field on Task is the foundation for stories 5.2 (status sync) and 5.3 (conflict resolution). Keep it simple — unique constraint is sufficient for now.
- The workspace mapping in config is `{ domainOrDefault: workspaceId }`. To reverse-lookup domain from workspaceId, iterate over entries. If workspace mapping uses `{ default: workspaceId }` (single workspace), default to `Technology` domain or make it configurable.
- The polling service's `fetchAllIssues()` returns `unknown[]`. The task sync service should define a typed `ZenhubIssueData` interface and cast appropriately. Validate data defensively.
- Zenhub's GraphQL API uses `labels` as a connection type: `labels { nodes { name } }`. Confirm the exact schema via the API at runtime — if labels aren't available, fall back to checking issue metadata in the webhook payload.
- For webhook-based detection: The webhook payload stored in `ZenhubSync.payload` (JSONB) may contain issue data with labels depending on the event type. Not all webhook events include full issue data — polling is the reliable path. Webhook detection is best-effort.
- Task creation uses direct `prisma.task.create()` with `zenhubIssueId` rather than `TaskService.create()` to avoid circular module dependencies and to set `zenhubIssueId` directly. Still emit `task.created` event manually.
- Auto-claim logic: If Zenhub issue has assignees, look up the first assignee's `login` against `Contributor.githubUsername`. If found, set `claimedById`, `claimedAt`, `status: 'CLAIMED'`. If not found, leave task as AVAILABLE.
- Migration naming follows existing pattern: `20260315600000_add_task_zenhub_issue_link` (date prefix + descriptive name).

### References

- [Source: apps/api/prisma/schema.prisma] — Task model (lines 511-538), ContributorDomain enum, TaskStatus enum
- [Source: apps/api/src/modules/task/task.service.ts] — TaskService.create(), event patterns
- [Source: apps/api/src/modules/zenhub/zenhub-config.service.ts] — KEYS, resolveWorkspaceMapping()
- [Source: apps/api/src/modules/zenhub/zenhub-polling.service.ts] — ISSUES_QUERY, executePoll(), fetchAllIssues()
- [Source: apps/api/src/modules/zenhub/zenhub-webhook.service.ts] — processWebhook(), P2002 idempotency pattern
- [Source: apps/api/src/modules/zenhub/zenhub.module.ts] — module registration pattern
- [Source: packages/shared/src/types/zenhub.types.ts] — ZenhubWebhookReceivedEvent, ZenhubPollCompletedEvent
- [Source: packages/shared/src/schemas/task.schema.ts] — createTaskSchema fields
- [Source: apps/api/prisma/schema.prisma:212] — Contributor.githubUsername for assignee matching

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 8 tasks completed with all subtasks checked
- 16 tests passing in new test file (zenhub-task-sync.service.spec.ts)
- 1326 tests passing across full API suite (no new regressions from zh-4-3's 1310)
- Pre-existing test failures unchanged: redis.service.spec.ts (10, ioredis mock issue), ability.factory.spec.ts (1)
- No new npm dependencies
- One new Prisma migration for `zenhub_issue_id` field on tasks table
- Shared package builds cleanly with new types
- ZenhubTaskSyncService processes both polled issues and webhook events
- Auto-claims tasks when Zenhub assignee matches a contributor by githubUsername
- Idempotent via unique constraint on zenhubIssueId with P2002 error handling
- Feature-flagged: task sync disabled by default, requires admin configuration
- Extended ISSUES_QUERY with labels, assignees, body fields

### File List

**Created:**

- `apps/api/prisma/migrations/20260315600000_add_task_zenhub_issue_link/migration.sql`
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.ts`
- `apps/api/src/modules/zenhub/zenhub-task-sync.service.spec.ts`

**Modified:**

- `apps/api/prisma/schema.prisma` — added `zenhubIssueId` field to Task model
- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — added task sync config keys and resolution methods
- `apps/api/src/modules/zenhub/zenhub-config.service.spec.ts` — added new fields to mock config
- `apps/api/src/modules/zenhub/zenhub-config.controller.spec.ts` — added new fields to mock config
- `apps/api/src/modules/zenhub/zenhub-polling.service.ts` — extended ISSUES_QUERY, integrated task sync into poll flow
- `apps/api/src/modules/zenhub/zenhub-polling.service.spec.ts` — added ZenhubTaskSyncService mock
- `apps/api/src/modules/zenhub/zenhub.module.ts` — registered ZenhubTaskSyncService
- `packages/shared/src/types/zenhub.types.ts` — added ZenhubTaskCreatedEvent, ZenhubIssueData, extended config types
- `packages/shared/src/index.ts` — exported new types
- `packages/shared/src/schemas/task.schema.ts` — added optional zenhubIssueId to taskSchema
- `packages/shared/src/schemas/zenhub-config.schema.ts` — added task sync fields to config schemas
- `packages/shared/src/constants/error-codes.ts` — added ZENHUB_TASK_SYNC_DISABLED, ZENHUB_TASK_SYNC_NO_CREATOR

### Change Log

- 2026-03-15: Implemented auto-create Edin tasks from Zenhub issues (ZenhubTaskSyncService, Prisma migration for zenhubIssueId, extended config/polling services, 16 unit tests)
