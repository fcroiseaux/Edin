# Story zh-3.2: Monitoring Alerts & Sync Conflict Viewer

Status: done

## Story

As an admin,
I want to configure monitoring alerts for webhook failure rates and view sync conflict events,
so that I am proactively notified of issues and can review conflict resolutions.

## Epic

zh-Epic 3: Integration Monitoring & Operations
**FRs covered:** FR35 (alert configuration), FR36 (sync conflict viewer)

## Acceptance Criteria

1. **Given** an admin is on the monitoring configuration page **When** they set a webhook failure rate threshold (e.g., >1%) **Then** the system sends an alert to the admin when the failure rate exceeds the threshold **And** the alert configuration is persisted

2. **Given** the Zenhub API has been unreachable for >1 hour **When** the system detects the outage **Then** an alert is sent to the admin **And** cached sprint data continues serving dashboards

3. **Given** sync conflict events have occurred **When** the admin navigates to the conflict viewer **Then** they see a list of conflict events with: timestamp, conflict type, affected entity, resolution outcome (auto-resolved or pending), and actor **And** conflicts are displayed with enough context for the admin to understand what happened

4. **Given** a non-admin user **When** they attempt to access monitoring or alert configuration **Then** they receive a 403 Forbidden response

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Existing AlertsService pattern** (`apps/api/src/modules/admin/alerts.service.ts`):

- Uses `AlertThreshold` with warningThreshold/criticalThreshold and messageTemplate
- Deterministic alert IDs via SHA256 hash of `{type}:{hourBucket}`
- Redis dismissal with 24h TTL: `admin:alert:dismissed:{alertId}`
- Injects `PrismaService` and `RedisService`
- Returns `SystemAlert[]` with id, type, severity, threshold, currentValue, message, occurredAt, dismissed

**Existing AlertType** (`packages/shared/src/types/admin.types.ts`):

- `'API_ERROR_RATE' | 'INGESTION_FAILURE' | 'EVALUATION_THROUGHPUT' | 'DB_LATENCY'`
- Must extend with Zenhub-specific alert types

**Settings persistence** (`apps/api/src/modules/zenhub/zenhub-config.service.ts`):

- Pattern: KEYS constant → SettingsService.getSettingValue/updateSetting
- Supports `{ redactAudit: true }` for sensitive values
- DB setting takes precedence over env var

**ZenhubSync model** (`apps/api/prisma/schema.prisma:1147`):
Already used by zh-3-1 for sync logs and health — reuse for alert checking.

**Monitoring page** (`apps/web/app/(admin)/admin/sprints/monitoring/page.tsx`):
Already has IntegrationHealthPanel + SyncLogTable from zh-3-1. Add alert config panel + alerts list + sync conflicts table.

**Existing hooks pattern** (`apps/web/hooks/use-zenhub-sync-logs.ts`):

- `useQuery<ApiResponse<T>>()`, `buildParams()`, `apiClient()`, 30s staleTime
- `refetchInterval: 60_000` for auto-refresh

### Implementation Approach

#### 1. Extend AlertType with Zenhub Alerts

**Modify `packages/shared/src/types/admin.types.ts`:**

Add to AlertType union:

```typescript
| 'ZENHUB_WEBHOOK_FAILURE_RATE'
| 'ZENHUB_POLLING_TIMEOUT'
```

#### 2. Shared Types — Alert Config & Sync Conflict

**Add to `packages/shared/src/types/zenhub.types.ts`:**

```typescript
export interface ZenhubAlertConfig {
  webhookFailureThreshold: number; // percentage 0-100, default 1
  pollingTimeoutMinutes: number; // minutes 1-1440, default 60
  enabled: boolean;
}

export type ZenhubSyncConflictResolution = 'auto-resolved' | 'pending' | 'manual-resolved';

export interface ZenhubSyncConflictEntry {
  id: string;
  syncId: string;
  conflictType: string;
  affectedEntity: string;
  affectedEntityId: string;
  resolution: ZenhubSyncConflictResolution;
  outcome: string | null;
  occurredAt: string;
  resolvedBy: string | null;
}
```

#### 3. Shared Schemas — Alert Config & Conflict Query

**Create `packages/shared/src/schemas/zenhub-alerts.schema.ts`:**

```typescript
export const updateZenhubAlertConfigSchema = z.object({
  webhookFailureThreshold: z.number().min(0).max(100).optional(),
  pollingTimeoutMinutes: z.number().int().min(1).max(1440).optional(),
  enabled: z.boolean().optional(),
});

export const zenhubSyncConflictQuerySchema = z.object({
  resolution: z.enum(['auto-resolved', 'pending', 'manual-resolved']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});
```

#### 4. Prisma Schema — ZenhubSyncConflict Model

**Add to `apps/api/prisma/schema.prisma` (sprint schema):**

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

Create migration: `apps/api/prisma/migrations/20260315300000_add_zenhub_sync_conflicts/migration.sql`

#### 5. Backend — Zenhub Alerts Service

**Create `apps/api/src/modules/zenhub/zenhub-alerts.service.ts`:**

Follow `alerts.service.ts` pattern:

- Inject `PrismaService`, `RedisService`, `SettingsService`
- KEYS constant for settings: `zenhub.alert.webhook_failure_threshold`, `zenhub.alert.polling_timeout_minutes`, `zenhub.alert.enabled`
- `getAlertConfig()` — read settings with defaults (threshold=1, timeout=60, enabled=true)
- `updateAlertConfig(updates, adminId, correlationId)` — persist via SettingsService
- `getActiveAlerts()` — check webhook failure rate and polling timeout against thresholds, return SystemAlert[] with deterministic IDs and Redis dismissal
- `dismissAlert(alertId)` — Redis dismiss with 24h TTL
- `getSyncConflicts(query)` — cursor-paginated query of ZenhubSyncConflict table

#### 6. Backend — Zenhub Alerts Controller

**Create `apps/api/src/modules/zenhub/zenhub-alerts.controller.ts`:**

Follow `zenhub-sync-log.controller.ts` pattern:

```
@Controller({ path: 'admin/zenhub-alerts', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)

GET /                          → getActiveAlerts()
GET /config                    → getAlertConfig()
PATCH /config                  → updateAlertConfig()
POST /dismiss/:alertId         → dismissAlert()
GET /conflicts                 → getSyncConflicts()
```

All endpoints: `@CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))`

**CRITICAL route order:** Static routes (config, conflicts) BEFORE any dynamic `:alertId` route.

#### 7. Backend — Register in Module

**Update `apps/api/src/modules/zenhub/zenhub.module.ts`:**

- Import `ZenhubAlertsController` and `ZenhubAlertsService`
- Add to controllers, providers
- Add `RedisModule` to imports (if not already imported — check first)

#### 8. Frontend — Alert Hooks

**Create `apps/web/hooks/use-zenhub-alerts.ts`:**

```typescript
export function useZenhubAlerts(); // GET alerts, 30s stale, 60s auto-refresh
export function useZenhubAlertConfig(); // GET config, 60s stale
export function useUpdateZenhubAlertConfig(); // PATCH config mutation
export function useDismissZenhubAlert(); // POST dismiss mutation
export function useZenhubSyncConflicts(filters); // GET conflicts, 30s stale, cursor pagination
```

#### 9. Frontend — Alert Config Panel Component

**Create `apps/web/components/features/sprint-dashboard/alert-config-panel.tsx`:**

- Form inputs: webhook failure threshold (number %), polling timeout (number min), enabled toggle
- Save button with mutation feedback
- Current values loaded from `useZenhubAlertConfig()`
- Styled with ROSE CSS vars

#### 10. Frontend — Active Alerts List Component

**Create `apps/web/components/features/sprint-dashboard/zenhub-alerts-list.tsx`:**

- List of active alerts with severity badges (CRITICAL=red, WARNING=amber)
- Each alert shows: type, message, current value, threshold, occurred timestamp
- Dismiss button per alert (uses `useDismissZenhubAlert`)
- Empty state: "No active Zenhub alerts."
- Auto-refreshes via hook's `refetchInterval`

#### 11. Frontend — Sync Conflicts Table Component

**Create `apps/web/components/features/sprint-dashboard/sync-conflicts-table.tsx`:**

- Filter by resolution (all/auto-resolved/pending/manual-resolved), date range
- Table columns: Timestamp, Conflict Type, Affected Entity, Resolution (with badge), Resolved By
- Expandable detail row: outcome/context
- Cursor-based pagination (First Page / Next Page)
- Follow sync-log-table.tsx pattern exactly

#### 12. Frontend — Update Monitoring Page

**Update `apps/web/app/(admin)/admin/sprints/monitoring/page.tsx`:**
Add three new sections below existing health panel:

1. Active Zenhub Alerts list
2. Alert Configuration panel
3. Sync Conflicts table (below sync logs)

#### 13. Tests

**Create `apps/api/src/modules/zenhub/zenhub-alerts.service.spec.ts`:**

- `getAlertConfig` returns default config
- `updateAlertConfig` persists via SettingsService
- `getActiveAlerts` returns webhook failure rate alert when threshold exceeded
- `getActiveAlerts` returns polling timeout alert when poll stale
- `getActiveAlerts` returns empty when below thresholds
- `getActiveAlerts` marks dismissed alerts
- `getActiveAlerts` returns empty when disabled
- `dismissAlert` stores dismissal in Redis
- `getSyncConflicts` returns paginated conflicts
- `getSyncConflicts` filters by resolution

**Create `apps/api/src/modules/zenhub/zenhub-alerts.controller.spec.ts`:**

- GET / returns alerts
- GET /config returns config
- PATCH /config validates and updates
- PATCH /config rejects invalid values
- POST /dismiss/:alertId dismisses alert
- GET /conflicts returns paginated conflicts

### Key Patterns to Follow

- **Admin controller path**: `admin/zenhub-alerts` (like `admin/zenhub-config`, `admin/zenhub-sync-logs`)
- **CASL permission**: `Action.Manage, 'IntegrationConfig'` — admin-only
- **Alert ID**: Deterministic SHA256 of `{type}:{hourBucket}` (from alerts.service.ts)
- **Dismissal**: Redis key `admin:alert:dismissed:{alertId}` with 24h TTL
- **Settings persistence**: `SettingsService.getSettingValue/updateSetting` with KEYS constant
- **Cursor pagination**: skip+1 pattern (from sync-log.service.ts)
- **Response envelope**: `createSuccessResponse(data, correlationId, pagination?)`
- **Validation**: Zod safeParse with DomainException on failure
- **Frontend stale time**: 30s for alerts, 60s for config
- **Accessibility**: Color-independent status indicators, keyboard navigable tables

### Dependencies

- Existing `PrismaService` — for ZenhubSync + ZenhubSyncConflict queries
- Existing `RedisService` — for alert dismissals (from `apps/api/src/common/redis/redis.service.ts`)
- Existing `SettingsService` — for alert config persistence
- Existing `JwtAuthGuard`, `AbilityGuard`, `@CheckAbility` — for auth
- Existing `createSuccessResponse`, `DomainException` — for responses/errors
- **No new npm dependencies required**

### Previous Story Intelligence (zh-3-1)

- Controller follows `admin/zenhub-*` path pattern with version: '1'
- Static routes before dynamic routes in NestJS
- Mock structure: `mockPrisma` with per-model mocks, `mockRedis` with `get`/`set` mocks
- Pre-existing test failures: redis.service.spec.ts (10), ability.factory.spec.ts (1) — ignore
- Shared package must build cleanly (`tsc`)
- 145 zenhub+sprint tests passing — do not regress
- Rebuild shared package before running API tests (`pnpm --filter @edin/shared build`)

### Files to Create

- `apps/api/prisma/migrations/20260315300000_add_zenhub_sync_conflicts/migration.sql`
- `packages/shared/src/schemas/zenhub-alerts.schema.ts`
- `apps/api/src/modules/zenhub/zenhub-alerts.service.ts`
- `apps/api/src/modules/zenhub/zenhub-alerts.controller.ts`
- `apps/api/src/modules/zenhub/zenhub-alerts.service.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-alerts.controller.spec.ts`
- `apps/web/hooks/use-zenhub-alerts.ts`
- `apps/web/components/features/sprint-dashboard/alert-config-panel.tsx`
- `apps/web/components/features/sprint-dashboard/zenhub-alerts-list.tsx`
- `apps/web/components/features/sprint-dashboard/sync-conflicts-table.tsx`

### Files to Modify

- `packages/shared/src/types/admin.types.ts` — extend AlertType union
- `packages/shared/src/types/zenhub.types.ts` — add ZenhubAlertConfig, ZenhubSyncConflictEntry types
- `packages/shared/src/index.ts` — export new types and schemas
- `apps/api/prisma/schema.prisma` — add ZenhubSyncConflict model
- `apps/api/src/modules/zenhub/zenhub.module.ts` — register new controller and service
- `apps/web/app/(admin)/admin/sprints/monitoring/page.tsx` — add alerts, config, and conflicts sections

### Out of Scope

- Bidirectional task sync (zh-5-x, Phase 2) — sync conflicts table is ready but conflicts are a Phase 2 feature
- Email/Slack notification delivery — alerts are shown in-panel, not pushed externally
- Evaluation engine extension (zh-6-x, Phase 2)

## Tasks / Subtasks

- [x] Task 1: Extend AlertType and add shared types (AC: 1, 3)
  - [x] Add ZENHUB_WEBHOOK_FAILURE_RATE and ZENHUB_POLLING_TIMEOUT to AlertType in admin.types.ts
  - [x] Add ZenhubAlertConfig, ZenhubSyncConflictResolution, ZenhubSyncConflictEntry to zenhub.types.ts
  - [x] Export from packages/shared/src/index.ts
  - [x] Verify shared package builds cleanly

- [x] Task 2: Shared schemas — alert config and conflict query (AC: 1, 3)
  - [x] Create zenhub-alerts.schema.ts with updateZenhubAlertConfigSchema and zenhubSyncConflictQuerySchema
  - [x] Export schemas and inferred types from index.ts

- [x] Task 3: Prisma schema — ZenhubSyncConflict model (AC: 3)
  - [x] Add ZenhubSyncConflict model to schema.prisma in sprint schema
  - [x] Create migration SQL file

- [x] Task 4: Backend service — alerts and conflicts (AC: 1, 2, 3)
  - [x] Create zenhub-alerts.service.ts
  - [x] Implement getAlertConfig() with SettingsService defaults
  - [x] Implement updateAlertConfig() with SettingsService persistence
  - [x] Implement getActiveAlerts() checking webhook failure rate and polling timeout
  - [x] Implement dismissAlert() with Redis 24h TTL
  - [x] Implement getSyncConflicts() with cursor-based pagination

- [x] Task 5: Backend controller — alert API endpoints (AC: 1, 2, 3, 4)
  - [x] Create zenhub-alerts.controller.ts with all endpoints
  - [x] Apply JwtAuthGuard, AbilityGuard, CheckAbility(Action.Manage, 'IntegrationConfig')
  - [x] Validate with Zod schemas

- [x] Task 6: Backend module registration (AC: 1)
  - [x] Add ZenhubAlertsController to controllers in zenhub.module.ts
  - [x] Add ZenhubAlertsService to providers in zenhub.module.ts

- [x] Task 7: Backend tests (AC: 1, 2, 3, 4)
  - [x] Create service tests (10 cases: config, alerts, dismissal, conflicts)
  - [x] Create controller tests (6 cases: endpoints, auth, validation)
  - [x] Verify all existing tests still pass

- [x] Task 8: Frontend hooks (AC: 1, 2, 3)
  - [x] Create use-zenhub-alerts.ts with all hooks

- [x] Task 9: Frontend components (AC: 1, 2, 3)
  - [x] Create alert-config-panel.tsx — threshold inputs, enable toggle, save button
  - [x] Create zenhub-alerts-list.tsx — active alerts with dismiss buttons
  - [x] Create sync-conflicts-table.tsx — filterable, paginated conflict table

- [x] Task 10: Frontend monitoring page update (AC: 1, 2, 3)
  - [x] Update monitoring/page.tsx — add alerts list, alert config panel, sync conflicts sections

## Dev Notes

- Alert checking reuses existing `ZenhubSync` data — no additional data collection needed. Just query failure counts and last poll time (same as health summary but compared against admin-configured thresholds).
- The `getActiveAlerts()` method should first check if alerts are enabled via config — if disabled, return empty array.
- Deterministic alert IDs use SHA256 of `{type}:{hourBucket}` — same alert won't duplicate within the same hour.
- Redis dismissal uses `admin:alert:dismissed:{alertId}` with 24h TTL — dismissed alerts reappear after 24h if the condition persists.
- ZenhubSyncConflict model is created for Phase 2 readiness — the table will be populated by the bidirectional sync engine (zh-5-x). For now, the conflict viewer works but will show empty state until Phase 2.
- For AC2 (API unreachable alert), check last successful poll timestamp against pollingTimeoutMinutes threshold. The cached sprint data already continues serving via pre-computed sprint_metrics — no additional work needed for that part of AC2.
- RedisModule may need to be imported into ZenhubModule if not already available. Check if RedisService is globally provided.

### Project Structure Notes

- Backend alert files go in `apps/api/src/modules/zenhub/` (same module)
- Frontend components go in `apps/web/components/features/sprint-dashboard/`
- New hook file `use-zenhub-alerts.ts` in `apps/web/hooks/`
- Migration file in `apps/api/prisma/migrations/20260315300000_add_zenhub_sync_conflicts/`

### References

- [Source: apps/api/src/modules/admin/alerts.service.ts] — Alert pattern with deterministic IDs and Redis dismissal
- [Source: apps/api/src/modules/zenhub/zenhub-config.service.ts] — SettingsService pattern for config persistence
- [Source: apps/api/src/modules/zenhub/zenhub-sync-log.service.ts] — Service pattern from zh-3-1
- [Source: apps/api/src/modules/zenhub/zenhub-sync-log.controller.ts] — Controller pattern from zh-3-1
- [Source: apps/web/components/features/sprint-dashboard/sync-log-table.tsx] — Table UI pattern from zh-3-1
- [Source: packages/shared/src/types/admin.types.ts:63-79] — AlertType, AlertSeverity, SystemAlert types
- [Source: apps/api/src/common/redis/redis.service.ts] — Redis get/set/del methods

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 10 tasks completed with all subtasks checked
- 161 tests passing in zenhub+sprint modules (145 existing + 16 new) — no regressions
- Shared package builds cleanly
- No new npm dependencies required
- New Prisma migration: ZenhubSyncConflict model in sprint schema
- Backend: 5 new REST endpoints (GET alerts, GET/PATCH config, POST dismiss, GET conflicts) with CASL + Zod validation
- Backend: ZenhubAlertsService with getAlertConfig(), updateAlertConfig(), getActiveAlerts() (webhook failure rate + polling timeout), dismissAlert() (Redis 24h TTL), getSyncConflicts() (cursor pagination)
- Frontend: AlertConfigPanel with threshold inputs, enable toggle, save mutation
- Frontend: ZenhubAlertsList with severity badges, dismiss buttons, auto-refresh
- Frontend: SyncConflictsTable with resolution filter, date range, cursor pagination
- Frontend: Monitoring page updated with alerts, config, and conflicts sections
- Frontend: 5 hooks (useZenhubAlerts, useZenhubAlertConfig, useUpdateZenhubAlertConfig, useDismissZenhubAlert, useZenhubSyncConflicts)
- AlertType extended with ZENHUB_WEBHOOK_FAILURE_RATE, ZENHUB_POLLING_TIMEOUT
- Alert IDs are deterministic (SHA256 of type:hourBucket) — follows existing alerts.service.ts pattern
- Alert dismissal via Redis with 24h TTL — follows existing pattern

### File List

**Created:**

- `apps/api/prisma/migrations/20260315300000_add_zenhub_sync_conflicts/migration.sql`
- `packages/shared/src/schemas/zenhub-alerts.schema.ts`
- `apps/api/src/modules/zenhub/zenhub-alerts.service.ts`
- `apps/api/src/modules/zenhub/zenhub-alerts.controller.ts`
- `apps/api/src/modules/zenhub/zenhub-alerts.service.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-alerts.controller.spec.ts`
- `apps/web/hooks/use-zenhub-alerts.ts`
- `apps/web/components/features/sprint-dashboard/alert-config-panel.tsx`
- `apps/web/components/features/sprint-dashboard/zenhub-alerts-list.tsx`
- `apps/web/components/features/sprint-dashboard/sync-conflicts-table.tsx`

**Modified:**

- `packages/shared/src/types/admin.types.ts` — extended AlertType with ZENHUB_WEBHOOK_FAILURE_RATE, ZENHUB_POLLING_TIMEOUT
- `packages/shared/src/types/zenhub.types.ts` — added ZenhubAlertConfig, ZenhubSyncConflictResolution, ZenhubSyncConflictEntry
- `packages/shared/src/index.ts` — exported new types, schemas, and schema types
- `apps/api/prisma/schema.prisma` — added ZenhubSyncConflict model in sprint schema
- `apps/api/src/modules/zenhub/zenhub.module.ts` — registered ZenhubAlertsController and ZenhubAlertsService
- `apps/web/app/(admin)/admin/sprints/monitoring/page.tsx` — added alerts list, config panel, sync conflicts sections

### Change Log

- 2026-03-15: Implemented monitoring alerts & sync conflict viewer — 5 new API endpoints (alerts, config, dismiss, conflicts), alert config panel, alerts list with dismissal, sync conflicts table, ZenhubSyncConflict Prisma model, and 16 new unit tests
