# Story zh-1.4: Manual Data Backfill

Status: done

## Story

As an admin,
I want to trigger a manual API poll to backfill missing data after outages,
So that data gaps can be recovered without waiting for the next scheduled poll.

## Epic

zh-Epic 1: Integration Setup & Data Pipeline

## FRs Covered

FR7

## Acceptance Criteria

1. **Given** an admin is authenticated **When** they trigger a manual backfill from the API endpoint **Then** the system initiates an immediate Zenhub API poll **And** the backfill paginates through all data **And** all fetched data is upserted (no duplicates) **And** the backfill is logged to `zenhub_syncs` with sync_type `backfill`

2. **Given** a backfill is in progress **When** the admin checks status **Then** progress is visible (records processed, completion status)

3. **Given** a non-admin user **When** they attempt to trigger a backfill **Then** they receive a 403 Forbidden response

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`

### Implementation Approach

#### 1. Shared Backfill Schema (`packages/shared/src/schemas/zenhub-backfill.schema.ts`)

```typescript
export const triggerBackfillSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
```

Export from `packages/shared/src/index.ts`.

#### 2. Backfill Controller (`apps/api/src/modules/zenhub/zenhub-backfill.controller.ts`)

Admin-only endpoint mirroring `zenhub-config.controller.ts` pattern:

```
POST /api/v1/admin/zenhub-backfill — trigger backfill
GET /api/v1/admin/zenhub-backfill/status — check latest backfill status
```

- `@Controller({ path: 'admin/zenhub-backfill', version: '1' })`
- `@UseGuards(JwtAuthGuard, AbilityGuard)` on class
- `@CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))` on each method
- POST: validate body with `triggerBackfillSchema`, enqueue BullMQ job, return `{ jobId, syncId }`
- GET status: query latest `ZenhubSync` where syncType=BACKFILL, return status/progress

#### 3. Backfill Service (`apps/api/src/modules/zenhub/zenhub-backfill.service.ts`)

```typescript
@Injectable()
export class ZenhubBackfillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pollingService: ZenhubPollingService,
    @InjectQueue('zenhub-polling') private readonly pollingQueue: Queue,
  ) {}

  async triggerBackfill(
    startDate?: Date,
    endDate?: Date,
    adminId: string,
    correlationId: string,
  ): Promise<{ jobId: string; syncId: string }>;
  // 1. Create zenhub_syncs record with syncType BACKFILL, status RECEIVED
  // 2. Enqueue job to zenhub-polling queue with job name 'backfillHistoricalData'
  // 3. Return jobId + syncId

  async getBackfillStatus(): Promise<BackfillStatus>;
  // Query latest ZenhubSync where syncType=BACKFILL, return status + payload
}
```

The BullMQ processor already handles `executePoll` which creates its own sync record. For backfill, the service creates a BACKFILL sync record upfront, then the processor calls `executePoll` which creates a POLL sync record. This is fine — the BACKFILL record tracks the admin-initiated request, the POLL record tracks the actual data fetch.

#### 4. Extend Polling Processor

The existing `ZenhubPollingProcessor` handles all jobs from the `zenhub-polling` queue. Add handling for 'backfillHistoricalData' job name — it uses the same `executePoll()` method.

#### 5. Module Registration

Add `ZenhubBackfillController` and `ZenhubBackfillService` to `ZenhubModule`.

#### 6. Tests

**`zenhub-backfill.controller.spec.ts`:**

- POST triggers backfill and returns jobId/syncId
- POST with invalid body → validation error
- GET status returns latest backfill

**`zenhub-backfill.service.spec.ts`:**

- triggerBackfill creates sync record and enqueues job
- getBackfillStatus returns latest BACKFILL sync

### Key Patterns to Follow

- **Admin controller**: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility` — same as `zenhub-config.controller.ts`
- **Response format**: `createSuccessResponse(data, correlationId)`
- **Zod validation**: Parse body with `safeParse`, throw `DomainException` on failure
- **BullMQ enqueue**: `queue.add('backfillHistoricalData', data, options)`
- **Sync logging**: `ZenhubSync` with `syncType: 'BACKFILL'`

### Dependencies

- Existing `ZenhubPollingService` for `executePoll()`
- Existing `zenhub-polling` BullMQ queue
- Existing `ZenhubSync` Prisma model with `BACKFILL` enum value
- Existing CASL `IntegrationConfig` subject
- No new npm packages

### Previous Story Intelligence (zh-1-3)

- `ZenhubPollingService.executePoll(correlationId)` does the full poll cycle
- `ZenhubPollingProcessor` handles jobs from `zenhub-polling` queue
- `ZenhubPollingJobData` has `triggeredBy: 'schedule' | 'manual'`
- BullMQ queue already registered with retry config

### Files to Create

- `packages/shared/src/schemas/zenhub-backfill.schema.ts`
- `apps/api/src/modules/zenhub/zenhub-backfill.controller.ts`
- `apps/api/src/modules/zenhub/zenhub-backfill.service.ts`
- `apps/api/src/modules/zenhub/zenhub-backfill.controller.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-backfill.service.spec.ts`

### Files to Modify

- `apps/api/src/modules/zenhub/zenhub.module.ts` — add backfill controller + service
- `packages/shared/src/index.ts` — export backfill schema

## Tasks / Subtasks

- [x] Task 1: Shared backfill schema (AC: 1)
  - [x] Create `packages/shared/src/schemas/zenhub-backfill.schema.ts`
  - [x] Export from `packages/shared/src/index.ts`

- [x] Task 2: Backfill service (AC: 1, 2)
  - [x] Create `zenhub-backfill.service.ts` with `triggerBackfill()` and `getBackfillStatus()`
  - [x] Create BACKFILL sync record and enqueue BullMQ job
  - [x] Query latest backfill status from zenhub_syncs

- [x] Task 3: Backfill controller (AC: 1, 2, 3)
  - [x] Create `zenhub-backfill.controller.ts` with POST and GET endpoints
  - [x] Enforce admin-only via JwtAuthGuard + AbilityGuard + CheckAbility
  - [x] Validate body with triggerBackfillSchema
  - [x] Return createSuccessResponse

- [x] Task 4: Module registration (AC: all)
  - [x] Add ZenhubBackfillController and ZenhubBackfillService to ZenhubModule

- [x] Task 5: Unit tests (AC: all)
  - [x] Write `zenhub-backfill.controller.spec.ts` (3 test cases)
  - [x] Write `zenhub-backfill.service.spec.ts` (3 test cases)
  - [x] Verify all tests pass

## Dev Notes

- The `BACKFILL` value already exists in `ZenhubSyncType` enum — no migration needed
- Backfill reuses `executePoll()` from the polling service — no duplicate logic
- AC3 (403 for non-admin) is enforced by the AbilityGuard + CASL — admin has `manage all`, other roles don't have IntegrationConfig access

### References

- [Source: apps/api/src/modules/zenhub/zenhub-config.controller.ts] — Admin controller pattern
- [Source: apps/api/src/modules/zenhub/zenhub-polling.service.ts] — executePoll + queue injection
- [Source: apps/api/src/modules/zenhub/zenhub-polling.processor.ts] — BullMQ processor
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts] — Admin manage all permission

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 5 tasks completed with all subtasks checked
- 48 tests passing across 9 test files (6 new: 3 service + 3 controller)
- No regressions, TypeScript clean, shared build clean
- No new npm dependencies, no Prisma migration needed (BACKFILL enum already exists)
- Reuses existing BullMQ queue and polling infrastructure

### File List

**Created:**

- `packages/shared/src/schemas/zenhub-backfill.schema.ts`
- `apps/api/src/modules/zenhub/zenhub-backfill.controller.ts`
- `apps/api/src/modules/zenhub/zenhub-backfill.service.ts`
- `apps/api/src/modules/zenhub/zenhub-backfill.controller.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-backfill.service.spec.ts`

**Modified:**

- `apps/api/src/modules/zenhub/zenhub.module.ts` — added ZenhubBackfillController + ZenhubBackfillService
- `packages/shared/src/index.ts` — exported triggerBackfillSchema + TriggerBackfillDto

### Change Log

- 2026-03-15: Implemented manual data backfill with admin-only POST/GET endpoints, BullMQ job enqueueing, BACKFILL sync record tracking, and Zod-validated date range parameters
