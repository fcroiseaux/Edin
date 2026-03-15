# Story zh-4.2: Planning Reliability & Cross-Domain Collaboration Metrics

Status: done

## Story

As a project lead,
I want planning reliability metrics calculated per contributor and cross-domain collaboration events tracked,
So that I can assess contributor predictability and encourage cross-domain teamwork.

## Epic

zh-Epic 4: Contribution Enrichment & Contributor Metrics
**FRs covered:** FR18, FR19

## Acceptance Criteria

1. **Given** a contributor has sprint history (committed and delivered story points) **When** planning reliability is calculated **Then** the delivery ratio (delivered / committed points) is computed **And** estimation accuracy (variance between estimated and actual effort) is computed **And** both metrics are available per contributor and per sprint

2. **Given** contributors from different domains (e.g., dev + research) work on the same epic or sprint **When** cross-domain collaboration is detected **Then** a collaboration event is recorded linking the contributing domains, the shared epic/sprint, and the contributors involved

3. **Given** planning reliability metrics are calculated **When** the calculation runs **Then** it uses data from `contribution_sprint_context` and `sprint_metrics` **And** calculations are idempotent

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Prisma schema** (`apps/api/prisma/schema.prisma`):

- `SprintMetric` model: has `sprintId`, `sprintName`, `sprintStart`, `sprintEnd`, `domain`, `velocity`, `committedPoints`, `deliveredPoints`, `estimationAccuracy`, and relations to `ContributorSprintEstimation[]`
- `ContributorSprintEstimation` model: has `sprintMetricId` (FK to SprintMetric), `contributorId` (UUID), `plannedPoints`, `deliveredPoints`, `accuracy`, unique constraint on `[sprintMetricId, contributorId]`
- `ContributionSprintContext` model (from zh-4-1): has `contributionId` (UUID FK to core.contributions), `sprintId`, `storyPoints`, `zenhubIssueId`, `epicId`, `pipelineStatus`
- `Contribution` model (core schema): has `contributorId` (UUID FK to Contributor), `contributionType` enum (COMMIT, PULL_REQUEST, CODE_REVIEW, DOCUMENTATION)
- `Contributor` model (core schema): has `domain` (ContributorDomain enum: Technology, Finance, Impact, Governance), `name`, `githubUsername`
- No `PlanningReliability` or `CrossDomainCollaboration` models exist yet — must be created
- Pattern: PascalCase Prisma models with `@@map("snake_case_table")` and `@@schema("sprint")`
- UUID primary keys via `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`

**Sprint module** (`apps/api/src/modules/sprint/`):

- `SprintMetricsService`: calculates velocity, burndown, cycle time, lead time, estimation accuracy. Listens to `zenhub.webhook.received` and `zenhub.poll.completed`. Uses `calculateEstimationAccuracy(sprintId, domain?)` which stores per-contributor data in `ContributorSprintEstimation` and overall accuracy in `SprintMetric`
- `SprintMetricsController`: exposes GET /sprints, /sprints/velocity, /sprints/burndown/:sprintId, /sprints/contributors, /sprints/contributors/combined, /sprints/export, /sprints/:sprintId/scope-changes, /sprints/:id
- `SprintEnrichmentService` (from zh-4-1): enriches contributions with sprint context via `ContributionSprintContext` join table. Listens to `zenhub.poll.completed`
- `SprintEnrichmentController` (from zh-4-1): GET endpoints for querying enrichment data
- Module: `sprint.module.ts` registers all services and controllers

**Shared types** (`packages/shared/src/types/sprint.types.ts`):

- Existing: `ContributorEstimationData` (contributorId, plannedPoints, deliveredPoints, accuracy), `ContributorAccuracyTrend` (sprints array with per-sprint accuracy), `CombinedContributorMetric`, `ContributionEnrichedEvent`, `ContributionSprintContextDto`
- Does NOT have planning reliability or cross-domain collaboration types — must be added

**Shared schemas** (`packages/shared/src/schemas/sprint-metrics.schema.ts`):

- Existing: `sprintMetricsQuerySchema`, `contributorTrendsQuerySchema` (with domain filter, limit)
- Does NOT have reliability or collaboration query schemas — must be added

**Event patterns**:

- Constructor injection: `private readonly eventEmitter: EventEmitter2`
- Emission: `this.eventEmitter.emit('sprint.planning.reliability.calculated', eventObject)`
- Listening: `@OnEvent('zenhub.poll.completed')` decorator

**API response pattern**:

- `createSuccessResponse(data, correlationId, pagination?)` returns `{ data, meta: { timestamp, correlationId, pagination? } }`
- Errors via `DomainException(errorCode, message, httpStatus, details?)`

**Error codes** (`packages/shared/src/constants/error-codes.ts`):

- Existing: `SPRINT_METRIC_CALCULATION_FAILED`, `SPRINT_CONTRIBUTION_NOT_FOUND`

### Implementation Approach

#### 1. Prisma Schema — New Models

Add two new models to `apps/api/prisma/schema.prisma` in the sprint schema:

**PlanningReliability** — per-contributor, per-sprint reliability metrics:

```prisma
model PlanningReliability {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  contributorId   String   @map("contributor_id") @db.Uuid
  sprintId        String   @map("sprint_id")
  committedPoints Int      @default(0) @map("committed_points")
  deliveredPoints Int      @default(0) @map("delivered_points")
  deliveryRatio   Float?   @map("delivery_ratio")    // delivered / committed
  estimationVariance Float? @map("estimation_variance") // absolute variance %
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@unique([contributorId, sprintId], map: "planning_reliability_contributor_sprint_uq")
  @@index([contributorId], map: "planning_reliability_contributor_idx")
  @@index([sprintId], map: "planning_reliability_sprint_idx")
  @@map("planning_reliability")
  @@schema("sprint")
}
```

**CrossDomainCollaboration** — records collaboration events between domains:

```prisma
model CrossDomainCollaboration {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sprintId        String   @map("sprint_id")
  epicId          String?  @map("epic_id")
  domains         String[] // array of domain names involved (e.g., ["Technology", "Finance"])
  contributorIds  String[] @map("contributor_ids") @db.Uuid // contributors involved
  collaborationType String @default("sprint") @map("collaboration_type") // "sprint" or "epic"
  detectedAt      DateTime @default(now()) @map("detected_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@unique([sprintId, epicId, collaborationType], map: "cross_domain_collab_sprint_epic_type_uq")
  @@index([sprintId], map: "cross_domain_collab_sprint_idx")
  @@index([detectedAt], map: "cross_domain_collab_detected_idx")
  @@map("cross_domain_collaborations")
  @@schema("sprint")
}
```

Key decisions:

- Both models in `sprint` schema — consistent with existing sprint-domain separation
- `PlanningReliability` uses `[contributorId, sprintId]` unique constraint for upsert semantics (AC3: idempotent)
- `contributorId` is a UUID FK to `core.contributors` but NO Prisma relation defined (cross-schema FK limitation, same pattern as `ContributionSprintContext`)
- `CrossDomainCollaboration` uses `[sprintId, epicId, collaborationType]` unique constraint for upsert — one record per sprint/epic combination
- `domains` stored as String[] for flexibility (PostgreSQL text array)
- `contributorIds` stored as UUID[] for the same reason — avoids need for additional join table

Run migration after adding models.

#### 2. Shared Types — Planning Reliability and Collaboration Events

Add to `packages/shared/src/types/sprint.types.ts`:

```typescript
export interface PlanningReliabilityDto {
  id: string;
  contributorId: string;
  sprintId: string;
  committedPoints: number;
  deliveredPoints: number;
  deliveryRatio: number | null;
  estimationVariance: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContributorPlanningReliabilitySummary {
  contributorId: string;
  contributorName: string | null;
  githubUsername: string | null;
  domain: string | null;
  sprintCount: number;
  averageDeliveryRatio: number | null;
  averageEstimationVariance: number | null;
  trend: Array<{
    sprintId: string;
    sprintName: string;
    sprintEnd: string;
    deliveryRatio: number | null;
    estimationVariance: number | null;
  }>;
}

export interface CrossDomainCollaborationDto {
  id: string;
  sprintId: string;
  epicId: string | null;
  domains: string[];
  contributorIds: string[];
  collaborationType: string;
  detectedAt: string;
}

export interface CrossDomainCollaborationSummary {
  totalCollaborations: number;
  domainPairs: Array<{
    domains: string[];
    count: number;
  }>;
  recentCollaborations: CrossDomainCollaborationDto[];
}

export interface PlanningReliabilityCalculatedEvent {
  eventType: 'sprint.planning.reliability.calculated';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    contributorCount: number;
    averageDeliveryRatio: number | null;
  };
}

export interface CrossDomainCollaborationDetectedEvent {
  eventType: 'sprint.collaboration.detected';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    epicId: string | null;
    domains: string[];
    contributorCount: number;
  };
}
```

Export from `packages/shared/src/index.ts`.

#### 3. Shared Schemas — Query Validation

Add to `packages/shared/src/schemas/sprint-metrics.schema.ts`:

```typescript
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
```

Export from `packages/shared/src/index.ts`.

#### 4. Sprint Planning Reliability Service (`apps/api/src/modules/sprint/sprint-planning-reliability.service.ts`)

New service within the existing `sprint` module:

```typescript
@Injectable()
export class SprintPlanningReliabilityService {
  private readonly logger = new Logger(SprintPlanningReliabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Calculate planning reliability for all contributors in a sprint.
   * Uses data from ContributorSprintEstimation (committed/delivered points)
   * and ContributionSprintContext (enrichment data).
   * Idempotent: upserts results into PlanningReliability table (AC3).
   */
  async calculateSprintReliability(sprintId: string, correlationId?: string): Promise<{ calculated: number }>;
  // 1. Find SprintMetric by sprintId (use findFirst with no domain filter for overall)
  // 2. Get all ContributorSprintEstimation for that sprint metric
  // 3. For each contributor: compute deliveryRatio = deliveredPoints / committedPoints (handle 0 committed)
  // 4. For each contributor: compute estimationVariance = abs(deliveredPoints - committedPoints) / committedPoints * 100
  // 5. Upsert into PlanningReliability for each contributor+sprint
  // 6. Emit sprint.planning.reliability.calculated event
  // 7. Return count of calculated records

  /**
   * Detect cross-domain collaboration in a sprint.
   * Looks at ContributionSprintContext joined with core.contributions → contributors
   * to find contributors from different domains working in the same sprint/epic.
   * Idempotent: upserts into CrossDomainCollaboration (AC3).
   */
  async detectCrossDomainCollaboration(sprintId: string, correlationId?: string): Promise<{ detected: number }>;
  // 1. Get all ContributionSprintContext for the sprint
  // 2. For each, look up the contribution's contributorId, then the contributor's domain
  // 3. Group by epicId (and overall sprint): collect unique domains and contributor IDs
  // 4. For each group with 2+ domains: upsert CrossDomainCollaboration
  // 5. Emit sprint.collaboration.detected for each new detection
  // 6. Return count of detected collaborations

  /**
   * Listen for poll completed events to trigger reliability calculation and collaboration detection.
   */
  @OnEvent('sprint.contribution.enriched')
  async handleContributionEnriched(event: ContributionEnrichedEvent): Promise<void>;
  // After enrichment, recalculate reliability for the sprint
  // This is a debounced/batched operation — only run after enrichment batch completes

  /**
   * Also trigger on metric recalculation (which updates estimation data).
   */
  @OnEvent('sprint.metrics.recalculated')
  async handleMetricsRecalculated(event: SprintMetricCalculatedEvent): Promise<void>;
  // Recalculate planning reliability when sprint metrics are recalculated
  // This ensures reliability is updated when estimation accuracy changes

  /**
   * Get planning reliability for a specific contributor across sprints.
   */
  async getContributorReliability(contributorId: string, limit?: number): Promise<PlanningReliabilityDto[]>;

  /**
   * Get planning reliability summary for all contributors (for dashboard).
   */
  async getReliabilitySummary(options?: { domain?: string; limit?: number }): Promise<ContributorPlanningReliabilitySummary[]>;
  // 1. Get all PlanningReliability records
  // 2. Join with Contributor for name/domain (cross-schema: separate query)
  // 3. Filter by domain if provided
  // 4. Aggregate per contributor: avg delivery ratio, avg estimation variance, trend array
  // 5. Sort by sprintCount desc, then averageDeliveryRatio desc

  /**
   * Get cross-domain collaboration events.
   */
  async getCollaborations(options?: { sprintId?: string; limit?: number }): Promise<CrossDomainCollaborationDto[]>;

  /**
   * Get collaboration summary (domain pairs and counts).
   */
  async getCollaborationSummary(): Promise<CrossDomainCollaborationSummary>;
  // 1. Get all CrossDomainCollaboration records
  // 2. Count total
  // 3. Group by domain pairs, count occurrences
  // 4. Return summary with recent collaborations
}
```

Critical rules from architecture:

- Never modify `core.contributions` or `core.contributors` tables — read-only access
- All calculations must be idempotent — upsert semantics (AC3)
- Compute from existing data: `ContributorSprintEstimation` for committed/delivered, `ContributionSprintContext` for sprint-contribution linking, `Contributor` for domain info
- Handle edge cases: 0 committed points (deliveryRatio = null), contributors with no domain set (skip for cross-domain detection)

#### 5. Sprint Planning Reliability Controller (`apps/api/src/modules/sprint/sprint-planning-reliability.controller.ts`)

Add API endpoints:

```typescript
@Controller({ path: 'sprints', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class SprintPlanningReliabilityController {

  @Get('reliability')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getReliabilitySummary(@Query() query: PlanningReliabilityQueryDto);
  // Returns ContributorPlanningReliabilitySummary[] for all contributors
  // Supports domain filter and limit

  @Get('reliability/:contributorId')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintMetric'))
  async getContributorReliability(
    @Param('contributorId') contributorId: string,
    @Query('limit') limit?: number,
  );
  // Returns PlanningReliabilityDto[] for a specific contributor

  @Get('collaborations')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getCollaborations(@Query() query: CrossDomainCollaborationQueryDto);
  // Returns CrossDomainCollaborationDto[]

  @Get('collaborations/summary')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getCollaborationSummary();
  // Returns CrossDomainCollaborationSummary
}
```

#### 6. Module Updates

Update `sprint.module.ts` to register `SprintPlanningReliabilityService` and `SprintPlanningReliabilityController`.

#### 7. Tests

**Service tests** (`sprint-planning-reliability.service.spec.ts`):

- `calculateSprintReliability` computes delivery ratio and estimation variance per contributor
- `calculateSprintReliability` uses upsert on re-run (idempotent — AC3)
- `calculateSprintReliability` handles 0 committed points (deliveryRatio = null)
- `calculateSprintReliability` emits `sprint.planning.reliability.calculated` event
- `calculateSprintReliability` uses data from `ContributorSprintEstimation` and `SprintMetric` (AC3)
- `detectCrossDomainCollaboration` records event when 2+ domains in same sprint
- `detectCrossDomainCollaboration` records event when 2+ domains in same epic
- `detectCrossDomainCollaboration` uses upsert (idempotent)
- `detectCrossDomainCollaboration` skips contributors with no domain set
- `detectCrossDomainCollaboration` emits `sprint.collaboration.detected` event
- `getContributorReliability` returns sorted reliability records for a contributor
- `getReliabilitySummary` returns aggregated per-contributor summaries with trends
- `getReliabilitySummary` filters by domain
- `getCollaborations` returns collaboration records filtered by sprint
- `getCollaborationSummary` returns total count and domain pair aggregation

**Controller tests** (`sprint-planning-reliability.controller.spec.ts`):

- GET /sprints/reliability returns summary array
- GET /sprints/reliability/:contributorId returns contributor-specific reliability
- GET /sprints/collaborations returns collaboration list
- GET /sprints/collaborations/summary returns collaboration summary
- Zod validation on query parameters

### Key Patterns to Follow

- **Prisma upsert**: `prisma.planningReliability.upsert({ where: { contributorId_sprintId: { contributorId, sprintId } }, update: {...}, create: {...} })`
- **Cross-schema read**: `prisma.contributor.findUnique({ where: { id }, select: { id: true, name: true, domain: true, githubUsername: true } })` to get contributor domain info
- **Delivery ratio**: `deliveredPoints / committedPoints` — if committedPoints === 0, set deliveryRatio to null
- **Estimation variance**: `Math.abs(deliveredPoints - committedPoints) / committedPoints * 100` — if committedPoints === 0, set to null
- **Event emission**: Follow existing pattern with `eventType`, `timestamp`, `correlationId`, `payload`
- **Logging**: `this.logger.log({ msg: 'Planning reliability calculated', sprintId, contributorCount, correlationId })` — structured Pino format
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2. Follow pattern from `sprint-enrichment.service.spec.ts`
- **Zod validation**: `safeParse(query)` with `DomainException` on failure in controller
- **Response envelope**: `createSuccessResponse(data, correlationId)`

### Dependencies

- Existing `PrismaService` for database access
- Existing `EventEmitter2` (via `@nestjs/event-emitter`) for event emission/listening
- Existing `ContributionEnrichedEvent`, `SprintMetricCalculatedEvent` types from `packages/shared`
- Existing `ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED` error code
- No new npm packages required
- Prisma migration required for new models

### Previous Story Intelligence

From zh-4-1 implementation:

- `SprintEnrichmentService` enriches contributions with sprint context via upsert — planning reliability builds on this enrichment data
- `ContributionSprintContext` has `epicId` field — use this for epic-level cross-domain detection
- Cross-schema lookups validated at application level (not Prisma relations)
- 19 tests passing across enrichment service/controller — do not regress
- Pre-existing test failures unchanged: redis.service.spec.ts (10), ability.factory.spec.ts (1) — known and accepted
- Sprint module already exports `SprintEnrichmentService` — new service can import via module
- Prisma migration pattern: manual SQL migration file with timestamp prefix

### Files to Create

- `apps/api/prisma/migrations/YYYYMMDD_add_planning_reliability_and_collaborations/migration.sql`
- `apps/api/src/modules/sprint/sprint-planning-reliability.service.ts`
- `apps/api/src/modules/sprint/sprint-planning-reliability.service.spec.ts`
- `apps/api/src/modules/sprint/sprint-planning-reliability.controller.ts`
- `apps/api/src/modules/sprint/sprint-planning-reliability.controller.spec.ts`

### Files to Modify

- `apps/api/prisma/schema.prisma` — add PlanningReliability and CrossDomainCollaboration models
- `apps/api/src/modules/sprint/sprint.module.ts` — register new service and controller
- `packages/shared/src/types/sprint.types.ts` — add reliability and collaboration types
- `packages/shared/src/schemas/sprint-metrics.schema.ts` — add query schemas
- `packages/shared/src/index.ts` — export new types and schemas

### Out of Scope

- Personal contributor sprint metrics view (Story zh-4-3)
- Frontend dashboard components for reliability/collaboration visualization (covered by zh-4-3 or existing sprint dashboard)
- Evaluation engine planning context injection (Phase 2, Epic 6)
- Planning reliability score for combined evaluation (Phase 2, zh-6-2)
- Bidirectional task sync (Phase 2, Epic 5)

## Tasks / Subtasks

- [x] Task 1: Prisma schema — add PlanningReliability and CrossDomainCollaboration models (AC: 1, 2, 3)
  - [x] Add PlanningReliability model with unique constraint [contributorId, sprintId] and indexes
  - [x] Add CrossDomainCollaboration model with unique constraint [sprintId, epicId, collaborationType] and indexes
  - [x] Create and apply migration
  - [x] Verify generated Prisma client includes new models

- [x] Task 2: Shared types — add planning reliability and collaboration types (AC: all)
  - [x] Add PlanningReliabilityDto, ContributorPlanningReliabilitySummary, CrossDomainCollaborationDto, CrossDomainCollaborationSummary, PlanningReliabilityCalculatedEvent, CrossDomainCollaborationDetectedEvent to sprint.types.ts
  - [x] Add planningReliabilityQuerySchema, crossDomainCollaborationQuerySchema to sprint-metrics.schema.ts
  - [x] Export all new types and schemas from packages/shared/src/index.ts
  - [x] Verify shared package builds cleanly

- [x] Task 3: Sprint planning reliability service (AC: 1, 3)
  - [x] Create sprint-planning-reliability.service.ts
  - [x] Implement calculateSprintReliability(): compute deliveryRatio and estimationVariance from ContributorSprintEstimation, upsert into PlanningReliability
  - [x] Implement detectCrossDomainCollaboration(): find contributors from different domains in same sprint/epic via ContributionSprintContext + Contributor lookup, upsert into CrossDomainCollaboration
  - [x] Implement event listeners: handleMetricsRecalculated (triggers both reliability and collaboration detection)
  - [x] Implement query methods: getContributorReliability, getReliabilitySummary, getCollaborations, getCollaborationSummary
  - [x] Emit appropriate events on calculation/detection

- [x] Task 4: Sprint planning reliability controller (AC: 1, 2)
  - [x] Create sprint-planning-reliability.controller.ts with REST endpoints
  - [x] Apply CASL guards: SprintDashboard for summary/collaborations, SprintMetric for contributor-specific
  - [x] Apply Zod validation on query parameters

- [x] Task 5: Module registration (AC: all)
  - [x] Update sprint.module.ts to register SprintPlanningReliabilityService and SprintPlanningReliabilityController

- [x] Task 6: Unit tests (AC: all)
  - [x] Write service tests for calculateSprintReliability (compute, upsert, edge cases, events)
  - [x] Write service tests for detectCrossDomainCollaboration (detection, upsert, skip no-domain, events)
  - [x] Write service tests for query methods (getContributorReliability, getReliabilitySummary with domain filter, getCollaborations, getCollaborationSummary)
  - [x] Write controller tests for all 4 endpoints with query validation
  - [x] Verify all existing tests still pass (no regressions)

## Dev Notes

- `PlanningReliability` computes from `ContributorSprintEstimation` data which already has `plannedPoints` (committed) and `deliveredPoints` per contributor per sprint. This is the primary data source for delivery ratio and estimation variance (AC1).
- Cross-domain detection requires a cross-schema lookup chain: `ContributionSprintContext.contributionId` → `core.Contribution.contributorId` → `core.Contributor.domain`. These are separate Prisma queries (no cross-schema joins).
- For cross-domain detection at sprint level: group all contributors in a sprint by domain. For epic level: group by `epicId` from `ContributionSprintContext`. If a group has 2+ distinct domains, record a collaboration event (AC2).
- `CrossDomainCollaboration.domains` is a PostgreSQL text array — in Prisma this maps to `String[]`. The `contributorIds` field uses `@db.Uuid` array.
- The event listener pattern: `handleContributionEnriched` fires after each enrichment. To avoid excessive recalculation, the service should check if this is the last enrichment in a batch (or debounce). Simplest approach: listen to `sprint.metrics.recalculated` instead, which fires once after all metrics are updated.
- `contributorId` in PlanningReliability references `core.contributors.id` — validated in application code, not as Prisma relation (cross-schema FK limitation).

### Project Structure Notes

- New files follow existing sprint module structure: service + controller + spec files co-located
- No new API route paths conflict with existing controllers (SprintMetricsController handles `/sprints` prefix, new controller adds `/sprints/reliability` and `/sprints/collaborations` sub-paths)
- Prisma migration uses manual SQL with timestamp prefix matching existing pattern (YYYYMMDDHHMMSS)

### References

- [Source: apps/api/prisma/schema.prisma] — ContributorSprintEstimation model (lines 1258-1274), ContributionSprintContext model (lines 1276-1293), SprintMetric model (lines 1186-1212)
- [Source: apps/api/src/modules/sprint/sprint-metrics.service.ts] — calculateEstimationAccuracy method
- [Source: apps/api/src/modules/sprint/sprint-enrichment.service.ts] — enrichment patterns from zh-4-1
- [Source: apps/api/src/modules/sprint/sprint.module.ts] — module registration pattern
- [Source: packages/shared/src/types/sprint.types.ts] — existing sprint type interfaces
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md] — Contribution Enrichment Pattern, metric calculation rules
- [Source: _bmad-output/planning-artifacts/epics-zenhub-integration.md] — Story 4.2 acceptance criteria

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 6 tasks completed with all subtasks checked
- 24 tests passing across 2 new test files (17 service tests + 7 controller tests)
- 1305 tests passing across full API suite (no regressions)
- Pre-existing test failures unchanged: redis.service.spec.ts (10, ioredis mock issue), ability.factory.spec.ts (1)
- No new npm dependencies
- Prisma migration created manually for PlanningReliability and CrossDomainCollaboration models
- Shared package builds cleanly with new types and schemas
- Planning reliability calculates delivery ratio (delivered/committed) and estimation variance per contributor per sprint (AC1)
- Cross-domain collaboration detects when 2+ domains collaborate on same sprint or epic, records event with domains and contributors (AC2)
- All calculations use upsert semantics — fully idempotent (AC3)
- Data sourced from ContributorSprintEstimation and ContributionSprintContext (AC3)
- Event-driven: handleMetricsRecalculated triggers both reliability calculation and collaboration detection
- Core contributions table NOT modified — all new data in sprint schema tables

### File List

**Created:**

- `apps/api/prisma/migrations/20260315500000_add_planning_reliability_and_collaborations/migration.sql`
- `apps/api/src/modules/sprint/sprint-planning-reliability.service.ts`
- `apps/api/src/modules/sprint/sprint-planning-reliability.service.spec.ts`
- `apps/api/src/modules/sprint/sprint-planning-reliability.controller.ts`
- `apps/api/src/modules/sprint/sprint-planning-reliability.controller.spec.ts`

**Modified:**

- `apps/api/prisma/schema.prisma` — added PlanningReliability and CrossDomainCollaboration models
- `apps/api/src/modules/sprint/sprint.module.ts` — registered SprintPlanningReliabilityService and SprintPlanningReliabilityController
- `packages/shared/src/types/sprint.types.ts` — added 6 new types (PlanningReliabilityDto, ContributorPlanningReliabilitySummary, CrossDomainCollaborationDto, CrossDomainCollaborationSummary, PlanningReliabilityCalculatedEvent, CrossDomainCollaborationDetectedEvent)
- `packages/shared/src/schemas/sprint-metrics.schema.ts` — added planningReliabilityQuerySchema, crossDomainCollaborationQuerySchema
- `packages/shared/src/index.ts` — exported new types and schemas

### Change Log

- 2026-03-15: Implemented planning reliability & cross-domain collaboration metrics (PlanningReliability and CrossDomainCollaboration Prisma models, reliability service with delivery ratio/estimation variance calculation, cross-domain detection via contribution-contributor-domain chain, REST controller with CASL guards, 24 unit tests)
