# Story zh-2.1: Sprint Metrics Schema & Core Calculations

Status: done

## Story

As a project lead,
I want sprint metrics (velocity, burndown, cycle time, lead time) calculated automatically from ingested Zenhub data,
So that I have accurate, up-to-date sprint analytics to inform planning decisions.

## Epic

zh-Epic 2: Sprint Metrics & Project Lead Dashboard
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR15

## Acceptance Criteria

1. **Given** pipeline transition events have been received via webhooks or polling **When** the sprint metrics service processes them **Then** the `sprint_metrics` table is created/populated with velocity, burndown_data (JSONB), cycle_time_avg, lead_time_avg, committed_points, delivered_points, sprint_start, and sprint_end **And** the `pipeline_transitions` table stores raw transition records (issue_id, from_pipeline, to_pipeline, transitioned_at, contributor_id)

2. **Given** a sprint has closed **When** velocity is calculated **Then** it equals the total story points of issues moved to "Done" during that sprint **And** the calculation executes in <5 seconds **And** a `sprint.velocity.calculated` event is emitted

3. **Given** an active sprint **When** burndown data is calculated **Then** it produces a time-series of remaining story points at daily intervals **And** the data is stored as JSONB in `sprint_metrics`

4. **Given** pipeline transition records exist for a sprint **When** cycle time is calculated **Then** it measures the average time from "In Progress" to "Done" per issue **And** lead time measures the average time from issue creation to completion

5. **Given** a metric calculation is run twice on the same data **When** the second calculation completes **Then** it produces identical results (idempotent) **And** uses upsert semantics without creating duplicate records

6. **Given** composite indexes on `sprint_metrics(sprint_end, domain)` and `pipeline_transitions(sprint_id, transitioned_at)` **When** queries run against 5 years of historical data **Then** query performance remains within acceptable limits

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Prisma schema** (`apps/api/prisma/schema.prisma`):

- Sprint schema already exists with `ZenhubSync` model, `ZenhubSyncType` enum (WEBHOOK|POLL|BACKFILL), `ZenhubSyncStatus` enum (RECEIVED|PROCESSING|COMPLETED|FAILED)
- Database uses multi-schema PostgreSQL: `core`, `evaluation`, `publication`, `audit`, `sprint`
- Pattern: PascalCase Prisma models with `@@map("snake_case_table")` and `@@schema("sprint")`
- UUID primary keys via `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- All timestamps: `@default(now())` for createdAt, `@updatedAt` for updatedAt
- Column mapping: `@map("snake_case_column")`

**Zenhub module** (`apps/api/src/modules/zenhub/`):

- Already exists and is fully functional (webhook receiver, polling service, config, backfill)
- Events emitted: `zenhub.webhook.received`, `zenhub.poll.completed`, `zenhub.poll.failed`
- The polling service (`zenhub-polling.service.ts`) fetches sprint and issue data from Zenhub GraphQL API
- Polling data includes sprint info (id, name, startAt, endAt, state) and issue info (id, number, estimate, pipeline, sprints)
- BullMQ queue `zenhub-polling` already registered in `zenhub.module.ts`

**Auth/CASL** (`apps/api/src/modules/auth/casl/`):

- `subjects.ts` already includes `'SprintMetric'` and `'SprintDashboard'`
- `ability.factory.ts` defines permissions per role
- Pattern: `@CheckAbility((ability) => ability.can(Action.Read, 'SprintMetric'))`

**API response pattern** (`apps/api/src/common/types/api-response.type.ts`):

- `createSuccessResponse(data, correlationId, pagination?)` returns `{ data, meta: { timestamp, correlationId, pagination? } }`
- Errors via `DomainException(errorCode, message, httpStatus, details?)`

**Error codes** (`packages/shared/src/constants/error-codes.ts`):

- Already includes: `SPRINT_METRIC_CALCULATION_FAILED`, `SPRINT_CONTRIBUTION_NOT_FOUND`

**Event emission pattern**:

- Constructor injection: `private readonly eventEmitter: EventEmitter2`
- Emission: `this.eventEmitter.emit('sprint.velocity.calculated', eventObject)`
- Listening: `@OnEvent('zenhub.webhook.received')` decorator

### Implementation Approach

#### 1. Prisma Schema — New Models

Add to `apps/api/prisma/schema.prisma` after the existing `ZenhubSync` model:

**SprintMetric model:**

```prisma
model SprintMetric {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sprintId           String   @map("sprint_id")
  sprintName         String   @map("sprint_name")
  sprintStart        DateTime @map("sprint_start")
  sprintEnd          DateTime @map("sprint_end")
  domain             String?
  velocity           Int      @default(0)
  committedPoints    Int      @default(0) @map("committed_points")
  deliveredPoints    Int      @default(0) @map("delivered_points")
  burndownData       Json?    @map("burndown_data")
  cycleTimeAvg       Float?   @map("cycle_time_avg")
  leadTimeAvg        Float?   @map("lead_time_avg")
  scopeChanges       Int      @default(0) @map("scope_changes")
  estimationAccuracy Float?   @map("estimation_accuracy")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  pipelineTransitions PipelineTransition[]

  @@unique([sprintId, domain], map: "sprint_metrics_sprint_domain_uq")
  @@index([sprintEnd, domain], map: "sprint_metrics_sprint_end_domain_idx")
  @@map("sprint_metrics")
  @@schema("sprint")
}
```

**PipelineTransition model:**

```prisma
model PipelineTransition {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sprintMetricId String    @map("sprint_metric_id") @db.Uuid
  issueId        String    @map("issue_id")
  issueNumber    Int       @map("issue_number")
  fromPipeline   String    @map("from_pipeline")
  toPipeline     String    @map("to_pipeline")
  storyPoints    Int?      @map("story_points")
  contributorId  String?   @map("contributor_id") @db.Uuid
  transitionedAt DateTime  @map("transitioned_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  sprintMetric SprintMetric @relation(fields: [sprintMetricId], references: [id], onDelete: Cascade)

  @@index([sprintMetricId, transitionedAt], map: "pipeline_transitions_sprint_transitioned_idx")
  @@index([issueId], map: "pipeline_transitions_issue_idx")
  @@map("pipeline_transitions")
  @@schema("sprint")
}
```

Key decisions:

- `SprintMetric` has a unique constraint on `[sprintId, domain]` — this enables upsert by sprint+domain (null domain = overall metrics)
- `PipelineTransition` references `SprintMetric` via FK — enables cascade delete on metric recalculation
- Composite indexes as specified in architecture for dashboard query performance (NFR-P2)
- `sprintId` is the Zenhub sprint ID (string, not UUID) — not a FK to any local table

Run `npx prisma migrate dev --name add_sprint_metrics_schema` after adding models.

#### 2. Shared Types & Schemas

**Create `packages/shared/src/types/sprint.types.ts`:**

```typescript
export interface BurndownDataPoint {
  date: string; // ISO date
  remainingPoints: number;
  idealPoints: number;
}

export interface SprintMetricCalculatedEvent {
  sprintId: string;
  sprintName: string;
  metricType: 'velocity' | 'burndown' | 'cycle_time' | 'lead_time';
  value: number | BurndownDataPoint[];
  correlationId: string;
}
```

**Create `packages/shared/src/schemas/sprint-metrics.schema.ts`:**

Zod schemas for API query validation (will be used by later stories for dashboard endpoints, but define now for service layer validation).

Export both from `packages/shared/src/index.ts`.

#### 3. Sprint Module — New Backend Module

**Create `apps/api/src/modules/sprint/sprint.module.ts`:**

```typescript
@Module({
  imports: [PrismaModule, EventEmitterModule],
  providers: [SprintMetricsService],
  exports: [SprintMetricsService],
})
export class SprintModule {}
```

Register `SprintModule` in `apps/api/src/app.module.ts`.

#### 4. Sprint Metrics Service (`apps/api/src/modules/sprint/sprint-metrics.service.ts`)

Core service with these methods:

```typescript
@Injectable()
export class SprintMetricsService {
  private readonly logger = new Logger(SprintMetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Listen for zenhub events to trigger metric calculations
  @OnEvent('zenhub.webhook.received')
  async handleWebhookEvent(event: ZenhubWebhookReceivedEvent): Promise<void>;
  // Route by event.eventType: 'issue_moved' → recordPipelineTransition + recalculate

  @OnEvent('zenhub.poll.completed')
  async handlePollCompleted(event: ZenhubPollCompletedEvent): Promise<void>;
  // Process bulk sprint data from polling, upsert metrics

  async upsertSprintMetric(data: {
    sprintId: string;
    sprintName: string;
    sprintStart: Date;
    sprintEnd: Date;
    domain?: string;
  }): Promise<SprintMetric>;
  // Upsert into sprint_metrics by [sprintId, domain] unique constraint

  async recordPipelineTransition(data: {
    sprintId: string;
    issueId: string;
    issueNumber: number;
    fromPipeline: string;
    toPipeline: string;
    storyPoints?: number;
    contributorId?: string;
    transitionedAt: Date;
  }): Promise<PipelineTransition>;
  // Insert raw transition record linked to SprintMetric

  async calculateVelocity(sprintId: string, domain?: string): Promise<number>;
  // Sum story points of transitions where toPipeline = 'Done'
  // Upsert into sprint_metrics.velocity
  // Emit sprint.velocity.calculated event
  // MUST calculate from raw pipeline_transitions only

  async calculateBurndown(sprintId: string, domain?: string): Promise<BurndownDataPoint[]>;
  // Generate daily time-series of remaining SP from sprint_start to sprint_end
  // Store as JSONB in sprint_metrics.burndown_data
  // Calculate from pipeline_transitions: start with committed_points, subtract completed per day

  async calculateCycleTime(sprintId: string, domain?: string): Promise<number | null>;
  // Average time (days) from 'In Progress' transition to 'Done' transition per issue
  // Upsert into sprint_metrics.cycle_time_avg

  async calculateLeadTime(sprintId: string, domain?: string): Promise<number | null>;
  // Average time (days) from first transition (issue creation/backlog entry) to 'Done' per issue
  // Upsert into sprint_metrics.lead_time_avg

  async recalculateAllMetrics(sprintId: string, domain?: string): Promise<SprintMetric>;
  // Orchestrator: calls calculateVelocity, calculateBurndown, calculateCycleTime, calculateLeadTime
  // All from raw pipeline_transitions (NFR-R4 idempotent)
  // Returns updated SprintMetric
}
```

**Critical implementation rules from architecture:**

- All calculations MUST be idempotent — running twice produces identical results
- Always calculate from raw `pipeline_transitions`, never from other pre-computed metrics
- Always upsert, never insert — supports recalculation and backfill
- Always emit event after calculation for downstream consumers
- Calculation must execute in <5 seconds (NFR-P7)
- Use structured logging with correlation IDs via Pino

#### 5. Event Listener Integration

The `SprintMetricsService` listens for:

- `zenhub.webhook.received` — When eventType is `issue_moved`, extract pipeline transition data, record it, and trigger metric recalculation for the affected sprint
- `zenhub.poll.completed` — Process bulk sprint data: upsert sprint metrics for each sprint returned, record any new pipeline transitions

The polling service (`zenhub-polling.service.ts`) already emits `ZenhubPollCompletedEvent` with the full payload of fetched sprints and issues. The sprint metrics service should parse this payload to extract:

- Sprint info → upsert SprintMetric records
- Issue pipeline info → record PipelineTransition records
- Issue estimates → use for velocity/burndown calculations

#### 6. Tests

**Create `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts`:**

Test cases:

- `upsertSprintMetric` creates new metric and returns it
- `upsertSprintMetric` with same sprintId+domain updates existing (upsert)
- `recordPipelineTransition` creates transition linked to sprint metric
- `calculateVelocity` sums story points of Done transitions correctly
- `calculateVelocity` emits `sprint.velocity.calculated` event
- `calculateBurndown` produces daily time-series data points
- `calculateCycleTime` computes correct average from In Progress → Done
- `calculateLeadTime` computes correct average from creation → Done
- `recalculateAllMetrics` is idempotent (same input → same output)
- `handleWebhookEvent` routes issue_moved events to recordPipelineTransition
- `handlePollCompleted` processes bulk sprint data

### Key Patterns to Follow

- **Module registration**: Add `SprintModule` to `app.module.ts` imports array
- **Prisma upsert**: `prisma.sprintMetric.upsert({ where: { sprintId_domain: { sprintId, domain } }, update: {...}, create: {...} })`
- **Event emission**: `this.eventEmitter.emit('sprint.velocity.calculated', { sprintId, value, correlationId })`
- **Event listening**: `@OnEvent('zenhub.webhook.received')` on handler methods
- **Logging**: `this.logger.log({ msg: 'Velocity calculated', sprintId, velocity, correlationId })` — structured Pino format
- **Error handling**: Wrap calculations in try/catch, throw `DomainException(ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED, ...)` on failure
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2

### Dependencies

- Existing `PrismaService` for database access
- Existing `EventEmitter2` (via `@nestjs/event-emitter`) for event emission/listening
- Existing `ZenhubWebhookReceivedEvent` and `ZenhubPollCompletedEvent` types from `packages/shared`
- Existing `ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED` error code
- No new npm packages required
- Prisma migration required for new models

### Previous Story Intelligence (zh-1-4)

From the zh-1-4 (Manual Data Backfill) implementation:

- `ZenhubPollingService.executePoll(correlationId)` does the full poll cycle and emits `zenhub.poll.completed`
- `ZenhubPollingProcessor` handles BullMQ jobs from `zenhub-polling` queue
- Controller pattern: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility`
- Response format: `createSuccessResponse(data, correlationId)`
- Zod validation via `safeParse` with `DomainException` on failure
- 48 tests passing across 9 test files — no regressions allowed

### Files to Create

- `apps/api/src/modules/sprint/sprint.module.ts`
- `apps/api/src/modules/sprint/sprint-metrics.service.ts`
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts`
- `packages/shared/src/types/sprint.types.ts`
- `packages/shared/src/schemas/sprint-metrics.schema.ts`

### Files to Modify

- `apps/api/prisma/schema.prisma` — add `SprintMetric` and `PipelineTransition` models
- `apps/api/src/app.module.ts` — import `SprintModule`
- `packages/shared/src/index.ts` — export new sprint types and schemas

### Out of Scope

- Sprint dashboard API endpoints (Story zh-2-3)
- Sprint dashboard frontend/charts (Story zh-2-3)
- Scope change tracking (Story zh-2-2)
- Estimation accuracy per contributor (Story zh-2-2)
- Contribution enrichment / `contribution_sprint_context` table (Story zh-4-1)
- CASL permission enforcement on API endpoints (Story zh-2-3, this story is backend service only)

## Tasks / Subtasks

- [x] Task 1: Prisma schema — add SprintMetric and PipelineTransition models (AC: 1, 6)
  - [x] Add SprintMetric model with all fields, unique constraint, and indexes
  - [x] Add PipelineTransition model with FK to SprintMetric and indexes
  - [x] Run `npx prisma migrate dev --name add_sprint_metrics_schema`
  - [x] Verify generated Prisma client includes new models

- [x] Task 2: Shared types and schemas (AC: all)
  - [x] Create `packages/shared/src/types/sprint.types.ts` with BurndownDataPoint and event interfaces
  - [x] Create `packages/shared/src/schemas/sprint-metrics.schema.ts` with Zod schemas
  - [x] Export from `packages/shared/src/index.ts`
  - [x] Verify shared package builds cleanly

- [x] Task 3: Sprint module setup (AC: all)
  - [x] Create `apps/api/src/modules/sprint/sprint.module.ts`
  - [x] Register SprintModule in `apps/api/src/app.module.ts`

- [x] Task 4: Sprint metrics service — core calculation methods (AC: 1-5)
  - [x] Create `sprint-metrics.service.ts` with `upsertSprintMetric()` (upsert by sprintId+domain)
  - [x] Implement `recordPipelineTransition()` to store raw transition data
  - [x] Implement `calculateVelocity()` — sum Done transitions' story points, emit event
  - [x] Implement `calculateBurndown()` — daily time-series from committed to remaining
  - [x] Implement `calculateCycleTime()` — avg In Progress → Done time per issue
  - [x] Implement `calculateLeadTime()` — avg creation → Done time per issue
  - [x] Implement `recalculateAllMetrics()` orchestrator

- [x] Task 5: Event listeners — integrate with zenhub events (AC: 1, 2)
  - [x] Implement `@OnEvent('zenhub.webhook.received')` handler — route issue_moved events
  - [x] Implement `@OnEvent('zenhub.poll.completed')` handler — process bulk sprint data

- [x] Task 6: Unit tests (AC: all)
  - [x] Write tests for upsertSprintMetric (create + update)
  - [x] Write tests for recordPipelineTransition
  - [x] Write tests for calculateVelocity (correct sum + event emission)
  - [x] Write tests for calculateBurndown (time-series generation)
  - [x] Write tests for calculateCycleTime and calculateLeadTime
  - [x] Write tests for recalculateAllMetrics idempotency
  - [x] Write tests for event handlers (webhook + poll)
  - [x] Verify all existing tests still pass (no regressions)

## Dev Notes

- The `sprint` PostgreSQL schema already exists (used by `ZenhubSync`) — no need to create the schema, only new tables
- `SprintMetric.sprintId` is the Zenhub sprint ID (string), NOT a UUID FK — Zenhub uses its own ID format
- The unique constraint `[sprintId, domain]` allows per-domain metric breakdowns: domain=null for overall, domain='Technology' for tech-only, etc.
- `burndown_data` is stored as JSONB array: `[{date: "2026-03-01", remainingPoints: 85, idealPoints: 80}, ...]`
- Pipeline names come from Zenhub (e.g., "Backlog", "In Progress", "Review", "Done") — do not hardcode, store as strings
- The `contributorId` on PipelineTransition is nullable because not all transitions have an assignee
- Metric calculation events (`sprint.velocity.calculated`) will be consumed by later stories (zh-2-3 dashboard, zh-4-1 enrichment)

### References

- [Source: apps/api/prisma/schema.prisma] — Existing ZenhubSync model pattern (lines 1127-1166)
- [Source: apps/api/src/modules/zenhub/zenhub-polling.service.ts] — Poll completion event emission
- [Source: apps/api/src/modules/zenhub/zenhub-webhook.service.ts] — Webhook event processing
- [Source: packages/shared/src/types/zenhub.types.ts] — Existing Zenhub event type interfaces
- [Source: packages/shared/src/constants/error-codes.ts] — SPRINT_METRIC_CALCULATION_FAILED
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md] — Sprint Metric Calculation Pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 6 tasks completed with all subtasks checked
- 21 tests passing in sprint-metrics.service.spec.ts (2 upsert, 2 transition, 4 velocity, 3 burndown, 2 cycle time, 2 lead time, 2 recalculate, 2 webhook handler, 2 poll handler)
- No regressions — pre-existing test failures in redis.service.spec.ts (10, ioredis mock issue) and ability.factory.spec.ts (1) unchanged
- No new npm dependencies
- Prisma migration created manually (shadow DB incompatibility with existing migrations) and applied via `prisma db push` + `prisma migrate resolve`
- Shared package builds cleanly
- All calculations are idempotent, use upsert semantics, calculate from raw pipeline_transitions only
- Event listeners integrate with existing zenhub.webhook.received and zenhub.poll.completed events

### File List

**Created:**

- `apps/api/prisma/migrations/20260315100000_add_sprint_metrics_and_pipeline_transitions/migration.sql`
- `apps/api/src/modules/sprint/sprint.module.ts`
- `apps/api/src/modules/sprint/sprint-metrics.service.ts`
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts`
- `packages/shared/src/types/sprint.types.ts`
- `packages/shared/src/schemas/sprint-metrics.schema.ts`

**Modified:**

- `apps/api/prisma/schema.prisma` — added SprintMetric and PipelineTransition models
- `apps/api/src/app.module.ts` — imported SprintModule
- `packages/shared/src/index.ts` — exported sprint types and schemas

### Change Log

- 2026-03-15: Implemented sprint metrics schema (SprintMetric + PipelineTransition Prisma models), core calculation service (velocity, burndown, cycle time, lead time), event listeners for webhook/poll integration, shared types, and 21 unit tests
