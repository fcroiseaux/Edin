# Story zh-2.2: Scope Change & Estimation Accuracy Tracking

Status: done

## Story

As a project lead,
I want to track scope changes within sprints and estimation accuracy per contributor,
So that I can identify planning issues and improve sprint predictability.

## Epic

zh-Epic 2: Sprint Metrics & Project Lead Dashboard
**FRs covered:** FR13, FR14

## Acceptance Criteria

1. **Given** an issue is added to or removed from an active sprint **When** the scope change event is processed **Then** the scope change is recorded with timestamp, issue ID, change type (added/removed), and story points affected **And** the `sprint_metrics` scope_changes count is updated

2. **Given** a sprint has closed **When** estimation accuracy is calculated for each contributor **Then** planned vs delivered story points are compared **And** estimation_accuracy is stored as a percentage in `sprint_metrics` **And** per-contributor accuracy data is available for trend analysis

3. **Given** scope changes occur mid-sprint **When** the sprint metrics are recalculated **Then** committed_points reflects the original sprint commitment **And** delivered_points reflects actual completion including scope changes

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Sprint module** (`apps/api/src/modules/sprint/`):

- `SprintMetricsService` already exists with: `upsertSprintMetric`, `recordPipelineTransition`, `calculateVelocity`, `calculateBurndown`, `calculateCycleTime`, `calculateLeadTime`, `recalculateAllMetrics`
- `SprintModule` registered in `app.module.ts`
- 21 existing tests in `sprint-metrics.service.spec.ts`

**Prisma schema** (`apps/api/prisma/schema.prisma`):

- `SprintMetric` model already has `scopeChanges Int @default(0)` and `estimationAccuracy Float?` columns
- `PipelineTransition` model exists with FK to SprintMetric
- Sprint schema uses `@@schema("sprint")` with PascalCase models and `@@map("snake_case_table")`
- UUID primary keys via `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`

**Shared types** (`packages/shared/src/types/sprint.types.ts`):

- `BurndownDataPoint` and `SprintMetricCalculatedEvent` already defined
- Event types include `'sprint.velocity.calculated' | 'sprint.burndown.calculated' | 'sprint.metrics.recalculated'`

**Zenhub webhook events** (`packages/shared/src/types/zenhub.types.ts`):

- `ZenhubWebhookReceivedEvent` has `payload.webhookEventType` field
- Current service only handles `issue_moved` events; `estimate_changed` and `issue_transferred` are ignored

**Error codes** (`packages/shared/src/constants/error-codes.ts`):

- `SPRINT_METRIC_CALCULATION_FAILED` already exists

### Implementation Approach

#### 1. Prisma Schema — New Models

Add to `apps/api/prisma/schema.prisma` after the existing `PipelineTransition` model:

**ScopeChangeType enum:**

```prisma
enum ScopeChangeType {
  ADDED
  REMOVED

  @@schema("sprint")
}
```

**ScopeChange model:**

```prisma
model ScopeChange {
  id             String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sprintMetricId String          @map("sprint_metric_id") @db.Uuid
  issueId        String          @map("issue_id")
  issueNumber    Int             @map("issue_number")
  changeType     ScopeChangeType @map("change_type")
  storyPoints    Int?            @map("story_points")
  changedAt      DateTime        @map("changed_at")
  createdAt      DateTime        @default(now()) @map("created_at")

  sprintMetric SprintMetric @relation(fields: [sprintMetricId], references: [id], onDelete: Cascade)

  @@index([sprintMetricId, changedAt], map: "scope_changes_sprint_changed_idx")
  @@map("scope_changes")
  @@schema("sprint")
}
```

**ContributorSprintEstimation model:**

```prisma
model ContributorSprintEstimation {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sprintMetricId  String   @map("sprint_metric_id") @db.Uuid
  contributorId   String   @map("contributor_id") @db.Uuid
  plannedPoints   Int      @default(0) @map("planned_points")
  deliveredPoints Int      @default(0) @map("delivered_points")
  accuracy        Float?
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  sprintMetric SprintMetric @relation(fields: [sprintMetricId], references: [id], onDelete: Cascade)

  @@unique([sprintMetricId, contributorId], map: "contributor_sprint_estimation_sprint_contributor_uq")
  @@index([contributorId], map: "contributor_sprint_estimation_contributor_idx")
  @@map("contributor_sprint_estimations")
  @@schema("sprint")
}
```

**SprintMetric model updates** — add relations:

```prisma
  scopeChangeRecords         ScopeChange[]
  contributorEstimations     ContributorSprintEstimation[]
```

Key decisions:

- `ScopeChange` tracks individual add/remove events linked to a sprint metric
- `ContributorSprintEstimation` stores per-contributor planned vs delivered with a unique constraint on [sprintMetricId, contributorId] for upsert
- Both cascade delete with SprintMetric
- `scopeChanges` (Int) on SprintMetric holds the count; `scopeChangeRecords` is the relation name to avoid collision

Run migration after adding models.

#### 2. Shared Types — Extend sprint.types.ts

**Add to `packages/shared/src/types/sprint.types.ts`:**

```typescript
export type ScopeChangeType = 'ADDED' | 'REMOVED';

export interface ScopeChangeEvent {
  eventType: 'sprint.scope.changed';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    issueId: string;
    changeType: ScopeChangeType;
    storyPoints: number | null;
  };
}

export interface ContributorEstimationData {
  contributorId: string;
  plannedPoints: number;
  deliveredPoints: number;
  accuracy: number | null; // percentage
}

export interface EstimationAccuracyCalculatedEvent {
  eventType: 'sprint.estimation.calculated';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    sprintName: string;
    overallAccuracy: number | null;
    contributorCount: number;
    domain?: string;
  };
}
```

Also extend `SprintMetricCalculatedEvent.eventType` to include `'sprint.scope.changed' | 'sprint.estimation.calculated'`.

Export from `packages/shared/src/index.ts`.

#### 3. Sprint Metrics Service — New Methods

Add to `apps/api/src/modules/sprint/sprint-metrics.service.ts`:

```typescript
async recordScopeChange(data: {
  sprintId: string;
  issueId: string;
  issueNumber: number;
  changeType: 'ADDED' | 'REMOVED';
  storyPoints?: number;
  changedAt: Date;
}): Promise<ScopeChange>;
// 1. Find sprint metric by sprintId (domain=null)
// 2. Create ScopeChange record
// 3. Count total scope changes for this sprint, update sprint_metrics.scopeChanges
// 4. Emit sprint.scope.changed event

async calculateScopeChanges(sprintId: string, domain?: string): Promise<number>;
// 1. Find sprint metric
// 2. Count ScopeChange records for this sprint
// 3. Update sprint_metrics.scopeChanges
// 4. Return count

async calculateEstimationAccuracy(sprintId: string, domain?: string): Promise<number | null>;
// 1. Find sprint metric
// 2. Get all pipeline_transitions for this sprint to determine per-contributor planned vs delivered
// 3. For each contributor with transitions:
//    - plannedPoints = sum of storyPoints for issues assigned to contributor at sprint start
//    - deliveredPoints = sum of storyPoints for issues moved to Done by contributor
//    - accuracy = (deliveredPoints / plannedPoints) * 100 (capped at 100)
// 4. Upsert ContributorSprintEstimation records per contributor
// 5. Calculate overall accuracy: avg of per-contributor accuracies
// 6. Update sprint_metrics.estimationAccuracy
// 7. Emit sprint.estimation.calculated event
// 8. Return overall accuracy

async getContributorEstimations(sprintId: string, domain?: string): Promise<ContributorSprintEstimation[]>;
// Read-only accessor for per-contributor estimation data
```

**Update `handleWebhookEvent`:** Also handle `estimate_changed` and `issue_transferred` events:

- `estimate_changed` → update storyPoints on existing pipeline transitions for the issue; trigger metric recalculation
- `issue_transferred` → record as scope change (ADDED to target sprint, REMOVED from source sprint)

**Update `recalculateAllMetrics`:** Include `calculateScopeChanges` and `calculateEstimationAccuracy` in the recalculation orchestrator.

**Update `handlePollCompleted`:** When processing bulk sprint data, also compute committed_points from initial sprint snapshot.

#### 4. Tests

**Extend `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts`:**

Test cases:

- `recordScopeChange` creates a scope change record and updates count
- `recordScopeChange` emits sprint.scope.changed event
- `recordScopeChange` throws when no sprint metric found
- `calculateScopeChanges` counts scope changes correctly
- `calculateEstimationAccuracy` computes correct percentages per contributor
- `calculateEstimationAccuracy` handles zero planned points (returns null)
- `calculateEstimationAccuracy` upserts ContributorSprintEstimation records
- `calculateEstimationAccuracy` emits sprint.estimation.calculated event
- `getContributorEstimations` returns per-contributor data
- `handleWebhookEvent` routes estimate_changed events
- `handleWebhookEvent` routes issue_transferred events to recordScopeChange
- `recalculateAllMetrics` includes scope changes and estimation accuracy
- Existing tests still pass (no regressions)

### Key Patterns to Follow

- **Upsert semantics**: All writes use upsert — supports recalculation and backfill
- **Idempotent calculations**: Running twice produces identical results
- **Calculate from raw data**: Estimation accuracy calculated from raw pipeline_transitions, not pre-computed metrics
- **Event emission**: Always emit event after calculation for downstream consumers
- **Logging**: Structured Pino format with correlation IDs
- **Error handling**: Wrap in try/catch, throw `DomainException(ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED, ...)` on failure
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2

### Dependencies

- Existing `PrismaService` for database access
- Existing `EventEmitter2` for event emission/listening
- Existing `ZenhubWebhookReceivedEvent` and `ZenhubPollCompletedEvent` types
- Existing `ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED` error code
- No new npm packages required
- Prisma migration required for new models

### Previous Story Intelligence (zh-2-1)

From zh-2-1 implementation:

- `SprintMetricsService` methods follow a consistent pattern: find metric → query raw data → calculate → upsert → emit event → log
- `findSprintMetric(sprintId, domain?)` is a private helper that returns `SprintMetric | null`
- Event emission uses the `SprintMetricCalculatedEvent` interface
- Mock structure in tests: `mockPrisma`, `mockEventEmitter`, NestJS `Test.createTestingModule`
- 21 tests passing — no regressions allowed
- Pre-existing test failures in redis.service.spec.ts (10) and ability.factory.spec.ts (1) are unchanged from before

### Files to Create

None — all changes are to existing files plus Prisma migration.

### Files to Modify

- `apps/api/prisma/schema.prisma` — add ScopeChange, ContributorSprintEstimation models, ScopeChangeType enum, SprintMetric relations
- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — add recordScopeChange, calculateScopeChanges, calculateEstimationAccuracy, getContributorEstimations; extend handleWebhookEvent and recalculateAllMetrics
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts` — add tests for new methods
- `packages/shared/src/types/sprint.types.ts` — add ScopeChangeType, ScopeChangeEvent, ContributorEstimationData, EstimationAccuracyCalculatedEvent
- `packages/shared/src/index.ts` — export new types

### Out of Scope

- Sprint dashboard API endpoints (Story zh-2-3)
- Sprint dashboard frontend/charts (Story zh-2-3, zh-2-4)
- Contribution enrichment / `contribution_sprint_context` table (Story zh-4-1)
- CASL permission enforcement on API endpoints (Story zh-2-3)
- Per-contributor sprint view (Story zh-2-5)

## Tasks / Subtasks

- [x] Task 1: Prisma schema — add ScopeChange, ContributorSprintEstimation models (AC: 1, 2)
  - [x] Add ScopeChangeType enum
  - [x] Add ScopeChange model with FK, indexes, and cascade delete
  - [x] Add ContributorSprintEstimation model with unique constraint and indexes
  - [x] Add relations to SprintMetric model
  - [x] Run Prisma migration
  - [x] Verify generated Prisma client includes new models

- [x] Task 2: Shared types — extend sprint types (AC: all)
  - [x] Add ScopeChangeType, ScopeChangeEvent, ContributorEstimationData, EstimationAccuracyCalculatedEvent to sprint.types.ts
  - [x] Keep SprintMetricCalculatedEvent for metric events, separate interfaces for scope/estimation events
  - [x] Export new types from index.ts
  - [x] Verify shared package builds cleanly

- [x] Task 3: Scope change tracking — service methods (AC: 1, 3)
  - [x] Implement recordScopeChange() — create record, emit event (count updated by calculateScopeChanges)
  - [x] Implement calculateScopeChanges() — count and update sprint_metrics

- [x] Task 4: Estimation accuracy — service methods (AC: 2)
  - [x] Implement calculateEstimationAccuracy() — per-contributor planned vs delivered, upsert ContributorSprintEstimation, calculate overall accuracy
  - [x] Implement getContributorEstimations() — read accessor

- [x] Task 5: Webhook handler extensions (AC: 1, 3)
  - [x] Extend handleWebhookEvent to handle estimate_changed events
  - [x] Extend handleWebhookEvent to handle issue_transferred as scope changes
  - [x] Update recalculateAllMetrics to include calculateScopeChanges and calculateEstimationAccuracy

- [x] Task 6: Unit tests (AC: all)
  - [x] Write tests for recordScopeChange (create + event)
  - [x] Write tests for calculateScopeChanges
  - [x] Write tests for calculateEstimationAccuracy (correct percentages, zero handling, event emission, changed estimates)
  - [x] Write tests for getContributorEstimations
  - [x] Write tests for webhook handler extensions (estimate_changed, issue_transferred in/out)
  - [x] Write tests for recalculateAllMetrics with new calculations
  - [x] Verify all existing tests still pass (no regressions)

## Dev Notes

- The `scopeChanges` field on `SprintMetric` is an Int counter — increment it when scope changes are recorded
- `ScopeChange.changeType` uses an enum (ADDED/REMOVED) — not a string
- Estimation accuracy = (deliveredPoints / plannedPoints) \* 100, capped at 100%, null when plannedPoints = 0
- Per-contributor estimation data is stored in `ContributorSprintEstimation` with unique constraint on [sprintMetricId, contributorId] for upsert support
- The `contributorId` on `PipelineTransition` is nullable — contributors without assigned transitions should be excluded from estimation accuracy
- `committed_points` should remain unchanged once set at sprint start — scope changes should NOT modify it
- `delivered_points` is already updated by `calculateVelocity()` — it reflects actual completion including scope changes

### References

- [Source: apps/api/prisma/schema.prisma] — SprintMetric and PipelineTransition models (lines 1168-1212)
- [Source: apps/api/src/modules/sprint/sprint-metrics.service.ts] — Current service implementation
- [Source: apps/api/src/modules/sprint/sprint-metrics.service.spec.ts] — Current test structure
- [Source: packages/shared/src/types/sprint.types.ts] — Existing sprint types
- [Source: packages/shared/src/constants/error-codes.ts] — Sprint error codes
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md] — Sprint Metric Calculation Pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- All 6 tasks completed with all subtasks checked
- 37 tests passing in sprint-metrics.service.spec.ts (16 new: 3 scopeChange, 2 calculateScopeChanges, 5 estimationAccuracy, 2 getContributorEstimations, 4 webhook handler extensions)
- No regressions — pre-existing test failures in redis.service.spec.ts (10, ioredis mock issue) and ability.factory.spec.ts (1) unchanged
- Code review fixes applied: removed incompatible event types from SprintMetricCalculatedEvent union, fixed planned/delivered consistency (latest estimate wins), removed race condition in recordScopeChange, added @map convention, added estimate-change test case
- No new npm dependencies
- Prisma migration created manually and Prisma client regenerated
- Shared package builds cleanly
- All calculations are idempotent, use upsert semantics, calculate from raw data only

### File List

**Created:**

- `apps/api/prisma/migrations/20260315200000_add_scope_changes_and_contributor_estimations/migration.sql`

**Modified:**

- `apps/api/prisma/schema.prisma` — added ScopeChangeType enum, ScopeChange model, ContributorSprintEstimation model, SprintMetric relations
- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — added recordScopeChange, calculateScopeChanges, calculateEstimationAccuracy, getContributorEstimations, handleEstimateChanged, handleIssueTransferred; extended handleWebhookEvent and recalculateAllMetrics
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts` — 37 tests (16 new)
- `packages/shared/src/types/sprint.types.ts` — added ScopeChangeType, ScopeChangeEvent, ContributorEstimationData, EstimationAccuracyCalculatedEvent
- `packages/shared/src/index.ts` — exported new types

### Change Log

- 2026-03-15: Implemented scope change tracking (ScopeChange model, recordScopeChange, calculateScopeChanges), estimation accuracy per contributor (ContributorSprintEstimation model, calculateEstimationAccuracy, getContributorEstimations), webhook handlers for estimate_changed and issue_transferred events, and 16 new unit tests
