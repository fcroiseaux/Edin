# Story zh-3.1: Webhook & Polling Log Viewer

Status: done

## Story

As an admin,
I want to view webhook delivery logs and API polling logs in the admin panel,
so that I can monitor integration health and troubleshoot sync issues.

## Epic

zh-Epic 3: Integration Monitoring & Operations
**FRs covered:** FR33, FR34, plus integration health panel (NFR-O3)

## Acceptance Criteria

1. **Given** an admin is authenticated **When** they navigate to the integration monitoring section **Then** they see a table of webhook delivery logs showing: timestamp, event type, status (success/failure/retry), correlation ID, and payload summary **And** they see a table of API polling logs showing: timestamp, status, data volume (records synced), duration, and error messages if any

2. **Given** webhook or polling logs exist **When** the admin filters or paginates through logs **Then** results are returned using cursor-based pagination consistent with existing API patterns **And** logs can be filtered by status (RECEIVED, PROCESSING, COMPLETED, FAILED), sync type (WEBHOOK, POLL, BACKFILL), event type, and date range

3. **Given** operational metrics are tracked **When** the admin views the integration health panel **Then** they see real-time sync status, last successful poll timestamp, webhook success rate, and polling duration trends

4. **Given** the log viewer **When** rendering log entries **Then** correlation IDs are displayed for end-to-end tracing **And** sensitive data (API tokens, webhook secrets) is never displayed in log entries

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**ZenhubSync Prisma model** (`apps/api/prisma/schema.prisma:1147`):
Already exists with all required fields — NO migration needed:

```
model ZenhubSync {
  id            String           @id @db.Uuid
  deliveryId    String           @unique @map("delivery_id")
  syncType      ZenhubSyncType   @map("sync_type")    // WEBHOOK | POLL | BACKFILL
  status        ZenhubSyncStatus @default(RECEIVED)    // RECEIVED | PROCESSING | COMPLETED | FAILED
  eventType     String           @map("event_type")
  payload       Json?
  correlationId String?          @map("correlation_id")
  errorMessage  String?          @map("error_message")
  retryCount    Int              @default(0) @map("retry_count")
  receivedAt    DateTime         @default(now()) @map("received_at")
  processedAt   DateTime?        @map("processed_at")
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")
  @@index([syncType, status])
  @@index([receivedAt])
  @@map("zenhub_syncs")
  @@schema("sprint")
}
```

**Zenhub module** (`apps/api/src/modules/zenhub/`):

- `zenhub.module.ts` — module definition; new controller/service must be registered here
- `zenhub-config.controller.ts` — reference pattern: `@Controller({ path: 'admin/zenhub-config', version: '1' })`, `@UseGuards(JwtAuthGuard, AbilityGuard)`, `@CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))`
- `zenhub-webhook.service.ts` — writes to ZenhubSync with `syncType: 'WEBHOOK'`
- `zenhub-polling.service.ts` — writes to ZenhubSync with `syncType: 'POLL'`, stores `{ sprintCount, issueCount, durationMs }` in payload

**Existing admin page patterns:**

- Audit logs page: `apps/web/app/(admin)/admin/audit-logs/page.tsx` — simple wrapper delegating to `AuditLogTable` component
- Audit log table: `apps/web/components/features/admin/audit-logs/audit-log-table.tsx` — filters + paginated table + cursor pagination; use as primary UI pattern reference
- Sprint dashboard: `apps/web/app/(admin)/admin/sprints/page.tsx` — domain filter, ROSE CSS vars

**Existing hooks pattern** (`apps/web/hooks/use-sprint-metrics.ts`):

- `useQuery<ApiResponse<T>>()`, `buildParams()`, `apiClient()`, 5-min staleTime for dashboard data
- Query keys: `['admin', 'resource-name', ...filterParams]`

**Shared package exports** (`packages/shared/src/index.ts`):

- Zenhub types already exported: `ZenhubConfigResponse`, `ZenhubWebhookReceivedEvent`, `ZenhubPollCompletedEvent`, `ZenhubPollFailedEvent`
- Zenhub schemas exported: `zenhubConfigResponseSchema`, `updateZenhubConfigSchema`, `zenhubWebhookPayloadSchema`, `triggerBackfillSchema`

**Common imports used by controllers:**

```typescript
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { Action, ERROR_CODES } from '@edin/shared';
```

### Implementation Approach

#### 1. Shared Types — Sync Log Entry & Health Summary

**Add to `packages/shared/src/types/zenhub.types.ts`:**

```typescript
export type ZenhubSyncType = 'WEBHOOK' | 'POLL' | 'BACKFILL';
export type ZenhubSyncStatus = 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ZenhubSyncLogEntry {
  id: string;
  deliveryId: string;
  syncType: ZenhubSyncType;
  status: ZenhubSyncStatus;
  eventType: string;
  correlationId: string | null;
  errorMessage: string | null;
  retryCount: number;
  receivedAt: string; // ISO
  processedAt: string | null; // ISO
  // Derived from payload (safe summary, no secrets)
  payloadSummary: string | null;
  durationMs: number | null;
  recordsSynced: number | null;
}

export interface IntegrationHealthSummary {
  lastSuccessfulPoll: string | null; // ISO timestamp
  lastSuccessfulWebhook: string | null; // ISO timestamp
  webhookSuccessRate: number; // 0-100 percentage (last 24h)
  webhookTotalLast24h: number;
  webhookFailedLast24h: number;
  pollingAvgDurationMs: number | null; // avg over last 10 polls
  overallStatus: 'healthy' | 'degraded' | 'down';
}
```

Export both from `packages/shared/src/index.ts`.

#### 2. Shared Schemas — Sync Log Query

**Create `packages/shared/src/schemas/zenhub-sync-log.schema.ts`:**

```typescript
import { z } from 'zod';

export const zenhubSyncLogQuerySchema = z.object({
  syncType: z.enum(['WEBHOOK', 'POLL', 'BACKFILL']).optional(),
  status: z.enum(['RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  eventType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  correlationId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export type ZenhubSyncLogQueryDto = z.infer<typeof zenhubSyncLogQuerySchema>;
```

Export schema and type from `packages/shared/src/index.ts`.

#### 3. Backend — Sync Log Service

**Create `apps/api/src/modules/zenhub/zenhub-sync-log.service.ts`:**

```typescript
@Injectable()
export class ZenhubSyncLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getSyncLogs(query: ZenhubSyncLogQueryDto): Promise<{
    data: ZenhubSyncLogEntry[];
    pagination: { cursor: string | null; hasMore: boolean };
  }> {
    // Build where clause from filters (syncType, status, eventType, date range, correlationId)
    // Cursor-based pagination: skip cursor item, take limit+1, orderBy receivedAt desc
    // Map Prisma records to ZenhubSyncLogEntry (extract payloadSummary, durationMs, recordsSynced from payload JSON)
    // CRITICAL: Never expose raw payload — extract only safe summary fields
    // payloadSummary: for WEBHOOK → eventType, for POLL → "{sprintCount} sprints, {issueCount} issues"
    // durationMs: from payload.durationMs if POLL
    // recordsSynced: (payload.sprintCount + payload.issueCount) if POLL
  }

  async getHealthSummary(): Promise<IntegrationHealthSummary> {
    // 1. Last successful poll: findFirst where syncType=POLL, status=COMPLETED, orderBy receivedAt desc
    // 2. Last successful webhook: findFirst where syncType=WEBHOOK, status=COMPLETED, orderBy receivedAt desc
    // 3. Webhook success rate (24h): count COMPLETED vs total where syncType=WEBHOOK, receivedAt > 24h ago
    // 4. Polling avg duration: avg of payload.durationMs from last 10 completed polls
    // 5. Overall status: 'healthy' if webhookSuccessRate >= 99 && lastPoll < 30min ago,
    //    'degraded' if rate >= 90 || lastPoll < 1h, 'down' otherwise
  }
}
```

#### 4. Backend — Sync Log Controller

**Create `apps/api/src/modules/zenhub/zenhub-sync-log.controller.ts`:**

Follow `zenhub-config.controller.ts` pattern exactly:

```typescript
@Controller({ path: 'admin/zenhub-sync-logs', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class ZenhubSyncLogController {
  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async getSyncLogs(@Query() query: unknown, @Req() req) {
    // Validate with zenhubSyncLogQuerySchema.safeParse()
    // Call service.getSyncLogs(parsed.data)
    // Return createSuccessResponse(result.data, correlationId, { pagination: result.pagination })
  }

  @Get('health')
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async getHealthSummary(@Req() req) {
    // Call service.getHealthSummary()
    // Return createSuccessResponse(health, correlationId)
  }
}
```

**CRITICAL route note:** `health` is a static route and must be declared BEFORE any dynamic `:id` routes. Since this controller only has `GET /` and `GET /health`, ordering is straightforward.

#### 5. Backend — Register in Module

**Update `apps/api/src/modules/zenhub/zenhub.module.ts`:**

- Import `ZenhubSyncLogController` and `ZenhubSyncLogService`
- Add to `controllers` and `providers` arrays

#### 6. Frontend — Sync Log Hook

**Create `apps/web/hooks/use-zenhub-sync-logs.ts`:**

```typescript
export function useZenhubSyncLogs(filters?: {
  syncType?: string;
  status?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  cursor?: string;
  limit?: number;
}) {
  // queryKey: ['admin', 'zenhub-sync-logs', syncType, status, eventType, startDate, endDate, correlationId, cursor]
  // queryFn: apiClient(`/api/v1/admin/zenhub-sync-logs${params}`)
  // staleTime: 30_000 (30 seconds — logs are more real-time than dashboard)
  // Returns { logs: ZenhubSyncLogEntry[], pagination, isLoading, isFetching, error }
}

export function useIntegrationHealth() {
  // queryKey: ['admin', 'zenhub-integration-health']
  // queryFn: apiClient(`/api/v1/admin/zenhub-sync-logs/health`)
  // staleTime: 30_000
  // refetchInterval: 60_000 (auto-refresh every 60s for real-time status)
  // Returns { health: IntegrationHealthSummary | null, isLoading, error }
}
```

#### 7. Frontend — Sync Log Table Component

**Create `apps/web/components/features/sprint-dashboard/sync-log-table.tsx`:**

Follow `audit-log-table.tsx` pattern closely:

- Filter bar: syncType dropdown (All/WEBHOOK/POLL/BACKFILL), status dropdown (All/RECEIVED/PROCESSING/COMPLETED/FAILED), eventType text input, date range (start/end), correlationId text input
- Table columns: Timestamp (receivedAt), Sync Type, Event Type, Status (with color badge), Duration, Records Synced, Correlation ID
- Status badges: COMPLETED=green, FAILED=red, PROCESSING=amber, RECEIVED=blue
- Expandable detail row (like audit-log DetailRow): shows errorMessage, retryCount, payloadSummary
- Cursor-based pagination: First Page / Next Page buttons
- Reset cursor when any filter changes
- Empty state: "No sync logs found."
- Loading state: "Loading sync logs..."
- Accessible: `role="table"`, keyboard navigable

#### 8. Frontend — Integration Health Panel Component

**Create `apps/web/components/features/sprint-dashboard/integration-health-panel.tsx`:**

Metric cards showing:

- Overall Status (healthy/degraded/down) with color indicator (green/amber/red)
- Last Successful Poll (relative time, e.g. "3 minutes ago")
- Last Successful Webhook (relative time)
- Webhook Success Rate (percentage with visual indicator)
- Avg Polling Duration (ms)
- Webhook count (total/failed) in last 24h

Use ROSE CSS variables, match existing metric card pattern from sprint detail page.

#### 9. Frontend — Monitoring Admin Page

**Create `apps/web/app/(admin)/admin/sprints/monitoring/page.tsx`:**

Layout:

1. Page header: "Integration Monitoring"
2. Integration health panel (auto-refreshing)
3. Sync log table (filterable, paginated)
4. Navigation: back link to sprint dashboard

Follow audit-logs page pattern: simple page wrapper delegating to components.

#### 10. Frontend — Add Navigation Link

**Update `apps/web/app/(admin)/admin/sprints/page.tsx`:**

- Add "Monitoring" link next to existing "Contributors" and "Configuration" links

#### 11. Tests

**Create `apps/api/src/modules/zenhub/zenhub-sync-log.service.spec.ts`:**

Test cases:

- `getSyncLogs` returns paginated webhook logs
- `getSyncLogs` returns paginated poll logs
- `getSyncLogs` filters by status
- `getSyncLogs` filters by syncType
- `getSyncLogs` filters by date range
- `getSyncLogs` returns safe payload summary (no secrets)
- `getSyncLogs` cursor pagination works correctly
- `getHealthSummary` returns correct webhook success rate
- `getHealthSummary` returns last successful poll timestamp
- `getHealthSummary` returns 'healthy' status when conditions met
- `getHealthSummary` returns 'degraded' status when rate drops
- `getHealthSummary` returns 'down' when no recent activity

**Create `apps/api/src/modules/zenhub/zenhub-sync-log.controller.spec.ts`:**

Test cases:

- `GET /api/v1/admin/zenhub-sync-logs` returns logs
- `GET /api/v1/admin/zenhub-sync-logs` filters by query params
- `GET /api/v1/admin/zenhub-sync-logs` validates query schema
- `GET /api/v1/admin/zenhub-sync-logs/health` returns health summary
- Endpoints enforce IntegrationConfig CASL permission

### Key Patterns to Follow

- **Admin-only controller path**: `admin/zenhub-sync-logs` (like `admin/zenhub-config`)
- **CASL permission**: `Action.Manage, 'IntegrationConfig'` — same as zenhub-config
- **Validation**: Zod `safeParse()` with `DomainException` on failure (HTTP 400)
- **Response envelope**: `createSuccessResponse(data, correlationId, { pagination })`
- **Cursor pagination**: skip cursor item, take limit+1, determine hasMore, return next cursor
- **Dates**: Return as ISO strings in DTOs
- **Frontend stale time**: 30 seconds for monitoring data (more real-time than dashboard)
- **Accessibility**: Tables with `role="table"`, keyboard navigation, color-independent status indicators
- **Security**: Never expose raw payload JSONB — extract only safe summary fields. Specifically filter out any keys containing 'token', 'secret', 'key', 'password'
- **Testing**: Vitest with `describe/it`, mock PrismaService

### Dependencies

- Existing `PrismaService` — for ZenhubSync queries
- Existing `JwtAuthGuard`, `AbilityGuard`, `@CheckAbility` — for auth
- Existing `createSuccessResponse` — for API responses
- Existing `DomainException` — for validation errors
- Existing `Action`, `ERROR_CODES` from `@edin/shared` — for CASL and errors
- **No new npm dependencies required**

### Previous Story Intelligence (zh-2-5)

From zh-2-5 implementation:

- Controller path is kebab-case with version — CASL handles auth
- Route ordering: static routes before dynamic `:id` routes
- Mock structure: `mockPrisma` with per-model mock objects
- Pre-existing test failures: redis.service.spec.ts (10), ability.factory.spec.ts (1) — ignore them
- Shared package must build cleanly (`tsc`)
- 79 sprint tests passing — do not regress

### Files to Create

- `packages/shared/src/schemas/zenhub-sync-log.schema.ts`
- `apps/api/src/modules/zenhub/zenhub-sync-log.service.ts`
- `apps/api/src/modules/zenhub/zenhub-sync-log.controller.ts`
- `apps/api/src/modules/zenhub/zenhub-sync-log.service.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-sync-log.controller.spec.ts`
- `apps/web/hooks/use-zenhub-sync-logs.ts`
- `apps/web/components/features/sprint-dashboard/sync-log-table.tsx`
- `apps/web/components/features/sprint-dashboard/integration-health-panel.tsx`
- `apps/web/app/(admin)/admin/sprints/monitoring/page.tsx`

### Files to Modify

- `packages/shared/src/types/zenhub.types.ts` — add ZenhubSyncLogEntry, IntegrationHealthSummary, ZenhubSyncType, ZenhubSyncStatus types
- `packages/shared/src/index.ts` — export new types and schema
- `apps/api/src/modules/zenhub/zenhub.module.ts` — register new controller and service
- `apps/web/app/(admin)/admin/sprints/page.tsx` — add Monitoring navigation link

### Out of Scope

- Monitoring alerts configuration (zh-3-2)
- Sync conflict viewer (zh-3-2)
- Bidirectional task sync (zh-5-x, Phase 2)
- Any Prisma schema changes (ZenhubSync model already exists)

## Tasks / Subtasks

- [x] Task 1: Shared types — sync log entry and health summary (AC: 1, 3)
  - [x] Add ZenhubSyncType, ZenhubSyncStatus, ZenhubSyncLogEntry, IntegrationHealthSummary to zenhub.types.ts
  - [x] Export from packages/shared/src/index.ts
  - [x] Verify shared package builds cleanly

- [x] Task 2: Shared schemas — sync log query (AC: 2)
  - [x] Create zenhub-sync-log.schema.ts with zenhubSyncLogQuerySchema
  - [x] Export schema and inferred type from index.ts

- [x] Task 3: Backend service — sync log queries and health (AC: 1, 2, 3, 4)
  - [x] Create zenhub-sync-log.service.ts with getSyncLogs() and getHealthSummary()
  - [x] Implement cursor-based pagination in getSyncLogs
  - [x] Implement safe payload summary extraction (no secrets)
  - [x] Implement health summary calculation (success rate, last poll, avg duration)

- [x] Task 4: Backend controller — sync log API endpoints (AC: 1, 2, 3)
  - [x] Create zenhub-sync-log.controller.ts with GET / and GET /health
  - [x] Apply JwtAuthGuard, AbilityGuard, CheckAbility(Action.Manage, 'IntegrationConfig')
  - [x] Validate query with zenhubSyncLogQuerySchema

- [x] Task 5: Backend module registration (AC: 1)
  - [x] Add ZenhubSyncLogController to controllers in zenhub.module.ts
  - [x] Add ZenhubSyncLogService to providers in zenhub.module.ts

- [x] Task 6: Backend tests (AC: 1, 2, 3, 4)
  - [x] Create service tests (12 cases: pagination, filters, health, security)
  - [x] Create controller tests (4 cases: endpoints, auth, validation)
  - [x] Verify all existing tests still pass

- [x] Task 7: Frontend hooks (AC: 1, 2, 3)
  - [x] Create use-zenhub-sync-logs.ts with useZenhubSyncLogs and useIntegrationHealth hooks

- [x] Task 8: Frontend components (AC: 1, 2, 3, 4)
  - [x] Create sync-log-table.tsx — filters + paginated log table
  - [x] Create integration-health-panel.tsx — metric cards with health status

- [x] Task 9: Frontend monitoring page and navigation (AC: 1, 2, 3)
  - [x] Create /admin/sprints/monitoring/page.tsx
  - [x] Add Monitoring link to sprint dashboard page

## Dev Notes

- The `ZenhubSync` table already has all necessary data. Webhook service writes with `syncType: 'WEBHOOK'`, polling service writes with `syncType: 'POLL'`, backfill service writes with `syncType: 'BACKFILL'`.
- Poll payloads contain `{ sprintCount, issueCount, durationMs }` — extract these for the log table display.
- Webhook payloads should NOT be displayed directly — they may contain issue data. Show only the `eventType` as summary.
- For health summary, use Prisma `count()` and `findFirst()` — no raw SQL needed.
- The avg polling duration requires reading `payload` JSONB from the last 10 completed polls and averaging `durationMs`. Use `findMany` + JS calculation (not Prisma aggregate, since it's a JSON field).
- Frontend auto-refresh: `useIntegrationHealth` should use `refetchInterval: 60_000` for live monitoring.
- CASL subject is `IntegrationConfig` (already exists) — same permission used by zenhub-config.
- No new CASL subjects needed.
- The `createSuccessResponse` helper signature: `createSuccessResponse(data, correlationId, meta?)` where meta can contain `{ pagination: { cursor, hasMore } }`.

### Project Structure Notes

- Backend sync-log files go in `apps/api/src/modules/zenhub/` (same module as config/webhook/polling)
- Frontend monitoring page goes under `apps/web/app/(admin)/admin/sprints/monitoring/` following admin route pattern
- Frontend components go in `apps/web/components/features/sprint-dashboard/` alongside existing sprint components
- New hook file `use-zenhub-sync-logs.ts` in `apps/web/hooks/` (separate from sprint-metrics hooks since this is zenhub-specific)

### References

- [Source: apps/api/src/modules/zenhub/zenhub-config.controller.ts] — Controller pattern to follow exactly
- [Source: apps/api/src/modules/zenhub/zenhub-webhook.service.ts] — How webhook sync records are created
- [Source: apps/api/src/modules/zenhub/zenhub-polling.service.ts] — How poll sync records are created with payload
- [Source: apps/api/src/modules/zenhub/zenhub.module.ts] — Module to extend
- [Source: apps/api/prisma/schema.prisma:1130-1166] — ZenhubSync model, ZenhubSyncType, ZenhubSyncStatus enums
- [Source: apps/web/components/features/admin/audit-logs/audit-log-table.tsx] — Log table UI pattern
- [Source: apps/web/app/(admin)/admin/audit-logs/page.tsx] — Admin log page pattern
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md:457-461] — Architecture file spec for sync-log controller

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 9 tasks completed with all subtasks checked
- 145 tests passing in zenhub+sprint modules (129 existing + 16 new) — no regressions
- Shared package builds cleanly
- No new npm dependencies required
- No database migration required — existing ZenhubSync model covers all needs
- Backend: 2 new REST endpoints (GET /admin/zenhub-sync-logs, GET /admin/zenhub-sync-logs/health) with CASL + Zod validation
- Backend: ZenhubSyncLogService with getSyncLogs() (cursor pagination, filters, safe payload extraction) and getHealthSummary() (success rate, last poll, avg duration, overall status)
- Frontend: SyncLogTable component with 6-filter bar, paginated table with status/type badges, expandable detail rows
- Frontend: IntegrationHealthPanel with 6 metric cards (overall status, last poll, last webhook, success rate, webhook count, avg duration)
- Frontend: Monitoring admin page at /admin/sprints/monitoring with health panel + sync log table
- Frontend: Navigation link added to sprint dashboard
- Frontend: useZenhubSyncLogs + useIntegrationHealth hooks with 30s stale time and 60s auto-refresh
- Security: Payload sanitization filters out keys containing token/secret/key/password

### File List

**Created:**

- `packages/shared/src/schemas/zenhub-sync-log.schema.ts`
- `apps/api/src/modules/zenhub/zenhub-sync-log.service.ts`
- `apps/api/src/modules/zenhub/zenhub-sync-log.controller.ts`
- `apps/api/src/modules/zenhub/zenhub-sync-log.service.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-sync-log.controller.spec.ts`
- `apps/web/hooks/use-zenhub-sync-logs.ts`
- `apps/web/components/features/sprint-dashboard/sync-log-table.tsx`
- `apps/web/components/features/sprint-dashboard/integration-health-panel.tsx`
- `apps/web/app/(admin)/admin/sprints/monitoring/page.tsx`

**Modified:**

- `packages/shared/src/types/zenhub.types.ts` — added ZenhubSyncType, ZenhubSyncStatus, ZenhubSyncLogEntry, IntegrationOverallStatus, IntegrationHealthSummary
- `packages/shared/src/index.ts` — exported new types and schema
- `apps/api/src/modules/zenhub/zenhub.module.ts` — registered ZenhubSyncLogController and ZenhubSyncLogService
- `apps/web/app/(admin)/admin/sprints/page.tsx` — added Monitoring navigation link

### Change Log

- 2026-03-15: Implemented webhook & polling log viewer — 2 new API endpoints (sync logs, health summary), sync log table with filters and pagination, integration health panel with real-time status, monitoring admin page, and 16 new unit tests
