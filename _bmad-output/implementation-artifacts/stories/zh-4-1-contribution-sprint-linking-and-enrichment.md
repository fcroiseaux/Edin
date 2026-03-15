# Story zh-4.1: Contribution-Sprint Linking & Enrichment

Status: done

## Story

As a contributor,
I want my GitHub contributions (commits, PRs, code reviews) automatically linked to their Zenhub sprint context,
So that my work is tracked within the sprint framework and enriched with planning data.

## Epic

zh-Epic 4: Contribution Enrichment & Contributor Metrics
**FRs covered:** FR16, FR17

## Acceptance Criteria

1. **Given** a GitHub contribution is ingested by the existing pipeline **When** the contribution corresponds to a Zenhub issue with sprint context **Then** a record is created in `sprint.contribution_sprint_context` linking: contribution_id, sprint_id, story_points, zenhub_issue_id, epic_id, and pipeline_status **And** the core `contributions` table is NOT modified

2. **Given** contributions of any type (dev, research, governance, documentation, finance) **When** they are associated with a Zenhub issue that has story points **Then** the story points are recorded in the enrichment join table regardless of contribution domain

3. **Given** the enrichment process runs on a sprint close event **When** all contributions for the sprint are processed **Then** enrichment completes within 30 seconds **And** a `sprint.contribution.enriched` event is emitted for each enriched contribution

4. **Given** the same contribution is enriched multiple times (e.g., sprint data updated) **When** enrichment runs again **Then** it uses upsert semantics and does not create duplicate records

5. **Given** a contribution has no corresponding Zenhub sprint context **When** enrichment is attempted **Then** the contribution remains valid without sprint context **And** no error is raised (enrichment is optional)

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Prisma schema** (`apps/api/prisma/schema.prisma`):

- Sprint schema already exists with `SprintMetric`, `PipelineTransition`, `ScopeChange`, `ContributorSprintEstimation`, `ZenhubSync`, `ZenhubSyncConflict` models
- `Contribution` model lives in the `core` schema with fields: id, contributorId, taskId, repositoryId, source, sourceRef, contributionType, title, description, rawData, status, etc.
- `Contribution` has relations to: Contributor, Task, MonitoredRepository, ContributionCollaboration[], PeerFeedback[], Evaluation[]
- Unique constraint: `[source, repositoryId, sourceRef]`
- The `ContributionSprintContext` model does NOT exist yet — must be created
- Pattern: PascalCase Prisma models with `@@map("snake_case_table")` and `@@schema("sprint")`
- UUID primary keys via `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- Column mapping: `@map("snake_case_column")`

**Sprint module** (`apps/api/src/modules/sprint/`):

- Already exists with `SprintMetricsService` and `SprintMetricsController`
- Service listens to `zenhub.webhook.received` and `zenhub.poll.completed` events
- Service methods: upsertSprintMetric, recordPipelineTransition, calculateVelocity, calculateBurndown, calculateCycleTime, calculateLeadTime, recalculateAllMetrics
- Controller exposes endpoints: GET /sprints, /sprints/velocity, /sprints/burndown/:sprintId, /sprints/contributors, /sprints/contributors/combined, /sprints/export, /sprints/:sprintId/scope-changes, /sprints/:id
- CASL guards: `@CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))`
- Module registered in `app.module.ts`

**Zenhub module** (`apps/api/src/modules/zenhub/`):

- Fully functional: webhook receiver, polling service, config, backfill, sync logs, alerts
- Events emitted: `zenhub.webhook.received`, `zenhub.poll.completed`, `zenhub.poll.failed`
- `ZenhubWebhookReceivedEvent` contains: eventType, timestamp, correlationId, payload (syncId, webhookEventType, deliveryId)
- `ZenhubPollCompletedEvent` contains: eventType, timestamp, correlationId, payload (syncId, sprintCount, issueCount, durationMs)
- The polling service fetches sprint and issue data from Zenhub GraphQL API
- Polling data includes issue info (id, number, estimate, pipeline, sprints, assignees)

**Shared types** (`packages/shared/src/types/sprint.types.ts`):

- Already has: BurndownDataPoint, SprintMetricCalculatedEvent, ScopeChangeEvent, ContributorEstimationData, VelocityDataPoint, SprintMetricDetail, SprintMetricSummary, ScopeChangeRecord, ContributorAccuracyTrend, CombinedContributorMetric, SprintExportFormat, EstimationAccuracyCalculatedEvent
- Does NOT have contribution enrichment types — must be added

**Error codes** (`packages/shared/src/constants/error-codes.ts`):

- Already includes: `SPRINT_METRIC_CALCULATION_FAILED`, `SPRINT_CONTRIBUTION_NOT_FOUND`
- `SPRINT_CONTRIBUTION_NOT_FOUND` can be reused for contribution lookups

**Event patterns**:

- Constructor injection: `private readonly eventEmitter: EventEmitter2`
- Emission: `this.eventEmitter.emit('sprint.contribution.enriched', eventObject)`
- Listening: `@OnEvent('zenhub.poll.completed')` decorator

**API response pattern**:

- `createSuccessResponse(data, correlationId, pagination?)` returns `{ data, meta: { timestamp, correlationId, pagination? } }`
- Errors via `DomainException(errorCode, message, httpStatus, details?)`

### Implementation Approach

#### 1. Prisma Schema — ContributionSprintContext Model

Add to `apps/api/prisma/schema.prisma` in the sprint schema, after `ContributorSprintEstimation`:

```prisma
model ContributionSprintContext {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  contributionId String   @map("contribution_id") @db.Uuid
  sprintId       String   @map("sprint_id")
  storyPoints    Int?     @map("story_points")
  zenhubIssueId  String   @map("zenhub_issue_id")
  epicId         String?  @map("epic_id")
  pipelineStatus String?  @map("pipeline_status")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@unique([contributionId, sprintId], map: "contribution_sprint_context_contribution_sprint_uq")
  @@index([sprintId], map: "contribution_sprint_context_sprint_idx")
  @@index([contributionId], map: "contribution_sprint_context_contribution_idx")
  @@index([zenhubIssueId], map: "contribution_sprint_context_issue_idx")
  @@map("contribution_sprint_context")
  @@schema("sprint")
}
```

Key decisions:

- Separate join table in `sprint` schema — core `contributions` table is NOT modified (architecture rule)
- Unique constraint on `[contributionId, sprintId]` enables upsert semantics
- `contributionId` is a UUID FK to `core.contributions` but NO Prisma relation defined (cross-schema FK limitation) — validated in application code
- `sprintId` is the Zenhub sprint ID (string, not UUID)
- Indexes on sprintId, contributionId, and zenhubIssueId for query performance

Run migration after adding model.

#### 2. Shared Types — Enrichment Events

Add to `packages/shared/src/types/sprint.types.ts`:

```typescript
export interface ContributionEnrichedEvent {
  eventType: 'sprint.contribution.enriched';
  timestamp: string;
  correlationId: string;
  payload: {
    contributionId: string;
    sprintId: string;
    zenhubIssueId: string;
    storyPoints: number | null;
    epicId: string | null;
    pipelineStatus: string | null;
  };
}

export interface ContributionSprintContextDto {
  id: string;
  contributionId: string;
  sprintId: string;
  storyPoints: number | null;
  zenhubIssueId: string;
  epicId: string | null;
  pipelineStatus: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Export from `packages/shared/src/index.ts`.

#### 3. Sprint Enrichment Service (`apps/api/src/modules/sprint/sprint-enrichment.service.ts`)

New service within the existing `sprint` module:

```typescript
@Injectable()
export class SprintEnrichmentService {
  private readonly logger = new Logger(SprintEnrichmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Enrich a single contribution with sprint context.
   * Uses upsert — safe to call multiple times (AC4).
   * Verifies contribution exists before creating context (architecture rule).
   */
  async enrichContribution(data: {
    contributionId: string;
    sprintId: string;
    storyPoints?: number;
    zenhubIssueId: string;
    epicId?: string;
    pipelineStatus?: string;
    correlationId?: string;
  }): Promise<ContributionSprintContext | null>;
  // 1. Verify contribution exists in core.contributions
  // 2. Upsert into sprint.contribution_sprint_context
  // 3. Emit sprint.contribution.enriched event
  // 4. Return enriched context (or null if contribution not found — AC5)

  /**
   * Batch enrich contributions for a sprint close event.
   * Maps Zenhub issue data to contributions via sourceRef matching.
   */
  async enrichSprintContributions(data: {
    sprintId: string;
    issues: Array<{
      zenhubIssueId: string;
      issueNumber: number;
      storyPoints?: number;
      epicId?: string;
      pipelineStatus?: string;
      assignees?: string[];
    }>;
    correlationId?: string;
  }): Promise<{ enriched: number; skipped: number }>;
  // 1. For each issue, find contributions by matching against sourceRef patterns
  // 2. Call enrichContribution for each match
  // 3. Track enriched vs skipped counts
  // 4. Log summary

  /**
   * Listen for poll completed events to trigger enrichment.
   */
  @OnEvent('zenhub.poll.completed')
  async handlePollCompleted(event: ZenhubPollCompletedEvent): Promise<void>;
  // Retrieve synced issue data from zenhub_syncs payload
  // Call enrichSprintContributions with the issue data

  /**
   * Get enrichment context for a specific contribution.
   */
  async getContributionSprintContext(contributionId: string): Promise<ContributionSprintContext[]>;

  /**
   * Get all enrichments for a sprint.
   */
  async getSprintContributions(sprintId: string): Promise<ContributionSprintContext[]>;
}
```

Critical rules from architecture:

- Never modify the `core.contributions` table — always use the join table
- Always verify the contribution exists before creating context
- Enrichment is optional — contributions without sprint context are valid
- Use upsert — the same contribution may be enriched multiple times as sprint data updates
- All operations must complete within 30 seconds for a full sprint (NFR-P6)

#### 4. Sprint Enrichment Controller (`apps/api/src/modules/sprint/sprint-enrichment.controller.ts`)

Add API endpoints for querying enrichment data:

```typescript
@Controller({ path: 'sprints', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class SprintEnrichmentController {

  @Get('contributions/:contributionId/sprint-context')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintMetric'))
  async getContributionSprintContext(@Param('contributionId') contributionId: string);

  @Get(':sprintId/contributions')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getSprintContributions(@Param('sprintId') sprintId: string);
}
```

#### 5. Module Updates

Update `sprint.module.ts` to register `SprintEnrichmentService` and `SprintEnrichmentController`.

#### 6. Tests (`apps/api/src/modules/sprint/sprint-enrichment.service.spec.ts`)

Test cases:

- `enrichContribution` creates new context record when contribution exists
- `enrichContribution` uses upsert on duplicate (AC4)
- `enrichContribution` returns null when contribution not found (AC5)
- `enrichContribution` emits `sprint.contribution.enriched` event
- `enrichContribution` works for all contribution types (AC2)
- `enrichSprintContributions` processes batch and returns enriched/skipped counts
- `enrichSprintContributions` handles empty issues array
- `handlePollCompleted` triggers enrichment from poll data
- `getContributionSprintContext` returns contexts for a contribution
- `getSprintContributions` returns all contexts for a sprint

### Key Patterns to Follow

- **Prisma upsert**: `prisma.contributionSprintContext.upsert({ where: { contributionId_sprintId: { contributionId, sprintId } }, update: {...}, create: {...} })`
- **Cross-schema query**: Verify contribution exists with `prisma.contribution.findUnique({ where: { id } })` before upserting enrichment
- **Event emission**: `this.eventEmitter.emit('sprint.contribution.enriched', { eventType: 'sprint.contribution.enriched', ... })`
- **Event listening**: `@OnEvent('zenhub.poll.completed')` on handler methods
- **Logging**: `this.logger.log({ msg: 'Contribution enriched', contributionId, sprintId, correlationId })` — structured Pino format
- **Error handling**: Wrap in try/catch, log errors, but do NOT throw for missing contributions (enrichment is optional)
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2

### Dependencies

- Existing `PrismaService` for database access
- Existing `EventEmitter2` (via `@nestjs/event-emitter`) for event emission/listening
- Existing `ZenhubPollCompletedEvent` type from `packages/shared`
- Existing `ERROR_CODES.SPRINT_CONTRIBUTION_NOT_FOUND` error code
- No new npm packages required
- Prisma migration required for new model

### Previous Story Intelligence

From zh-2.1 through zh-3.2 implementations:

- `SprintMetricsService` already handles webhook and poll events — enrichment service should handle its own poll event listening separately
- Controller pattern: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility`
- Response format: `createSuccessResponse(data, correlationId)`
- Zod validation via `safeParse` with `DomainException` on failure
- Pre-existing test failures in redis.service.spec.ts (10, ioredis mock issue) and ability.factory.spec.ts (1) are known and unchanged
- Prisma migration may need `prisma db push` + `prisma migrate resolve` if shadow DB is incompatible

### Files to Create

- `apps/api/src/modules/sprint/sprint-enrichment.service.ts`
- `apps/api/src/modules/sprint/sprint-enrichment.service.spec.ts`
- `apps/api/src/modules/sprint/sprint-enrichment.controller.ts`
- `apps/api/src/modules/sprint/sprint-enrichment.controller.spec.ts`
- `apps/api/prisma/migrations/YYYYMMDD_add_contribution_sprint_context/migration.sql`

### Files to Modify

- `apps/api/prisma/schema.prisma` — add `ContributionSprintContext` model
- `apps/api/src/modules/sprint/sprint.module.ts` — register enrichment service and controller
- `packages/shared/src/types/sprint.types.ts` — add enrichment event and DTO types
- `packages/shared/src/index.ts` — export new types

### Out of Scope

- Planning reliability and cross-domain collaboration metrics (Story zh-4-2)
- Personal contributor sprint metrics view (Story zh-4-3)
- Bidirectional task sync (Phase 2, Epic 5)
- Evaluation engine planning context injection (Phase 2, Epic 6)

## Tasks / Subtasks

- [x] Task 1: Prisma schema — add ContributionSprintContext model (AC: 1)
  - [x]Add ContributionSprintContext model with all fields, unique constraint, and indexes
  - [x]Create and apply migration
  - [x]Verify generated Prisma client includes new model

- [x] Task 2: Shared types — add enrichment event and DTO types (AC: all)
  - [x]Add ContributionEnrichedEvent and ContributionSprintContextDto to sprint.types.ts
  - [x]Export from packages/shared/src/index.ts
  - [x]Verify shared package builds cleanly

- [x] Task 3: Sprint enrichment service (AC: 1-5)
  - [x]Create sprint-enrichment.service.ts with enrichContribution() (upsert by contributionId+sprintId)
  - [x]Implement contribution existence verification before enrichment
  - [x]Implement enrichSprintContributions() for batch processing
  - [x]Implement handlePollCompleted() event listener
  - [x]Implement getContributionSprintContext() and getSprintContributions() queries
  - [x]Emit sprint.contribution.enriched event on successful enrichment

- [x] Task 4: Sprint enrichment controller (AC: 1)
  - [x]Create sprint-enrichment.controller.ts with query endpoints
  - [x]Apply CASL guards: SprintMetric for contribution context, SprintDashboard for sprint contributions

- [x] Task 5: Module registration (AC: all)
  - [x]Update sprint.module.ts to register SprintEnrichmentService and SprintEnrichmentController

- [x] Task 6: Unit tests (AC: all)
  - [x]Write tests for enrichContribution (create, upsert, not found, event emission, all types)
  - [x]Write tests for enrichSprintContributions (batch processing, empty array)
  - [x]Write tests for handlePollCompleted event handler
  - [x]Write tests for query methods
  - [x]Verify all existing tests still pass (no regressions)

## Dev Notes

- The `ContributionSprintContext` table is in the `sprint` schema but references `contribution_id` from the `core.contributions` table. Due to Prisma multi-schema limitations, this FK is validated in application code rather than as a Prisma `@relation`.
- `sprintId` is the Zenhub sprint ID (string, not UUID) — matches `SprintMetric.sprintId`
- Matching contributions to Zenhub issues: contributions have a `sourceRef` field that contains GitHub PR number or commit SHA. The polling data includes issue numbers. Matching is done by finding contributions whose sourceRef contains issue references (PR titles, branch names containing issue numbers, or explicit issue references in commit messages).
- Enrichment is triggered by `zenhub.poll.completed` which provides the full issue dataset. The enrichment service retrieves the ZenhubSync payload to get issue details.
- The enrichment service should be resilient: if a contribution lookup fails, skip and continue with the next one (AC5).
- All contribution types are treated equally for enrichment (AC2) — the contribution domain doesn't affect whether sprint context is created.

### References

- [Source: apps/api/prisma/schema.prisma] — Contribution model (core schema), SprintMetric model (sprint schema)
- [Source: apps/api/src/modules/sprint/sprint-metrics.service.ts] — Existing sprint service pattern
- [Source: apps/api/src/modules/sprint/sprint.module.ts] — Module registration pattern
- [Source: packages/shared/src/types/sprint.types.ts] — Existing sprint type interfaces
- [Source: packages/shared/src/types/zenhub.types.ts] — ZenhubPollCompletedEvent interface
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md] — Contribution Enrichment Pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 6 tasks completed with all subtasks checked
- 19 tests passing across 2 new test files (14 service tests + 5 controller tests)
- 100 tests passing across the full sprint module (4 test files, no regressions)
- Pre-existing test failures unchanged: redis.service.spec.ts (10, ioredis mock issue), ability.factory.spec.ts (1)
- No new npm dependencies
- Prisma migration created manually for ContributionSprintContext model
- Shared package builds cleanly with new types (ContributionEnrichedEvent, ContributionSprintContextDto)
- Enrichment uses upsert semantics, verifies contribution exists, emits events per architecture rules
- Core contributions table NOT modified — all enrichment data in sprint.contribution_sprint_context join table

### File List

**Created:**

- `apps/api/prisma/migrations/20260315400000_add_contribution_sprint_context/migration.sql`
- `apps/api/src/modules/sprint/sprint-enrichment.service.ts`
- `apps/api/src/modules/sprint/sprint-enrichment.service.spec.ts`
- `apps/api/src/modules/sprint/sprint-enrichment.controller.ts`
- `apps/api/src/modules/sprint/sprint-enrichment.controller.spec.ts`

**Modified:**

- `apps/api/prisma/schema.prisma` — added ContributionSprintContext model
- `apps/api/src/modules/sprint/sprint.module.ts` — registered SprintEnrichmentService and SprintEnrichmentController
- `packages/shared/src/types/sprint.types.ts` — added ContributionEnrichedEvent and ContributionSprintContextDto
- `packages/shared/src/index.ts` — exported new types

### Change Log

- 2026-03-15: Implemented contribution-sprint linking and enrichment (ContributionSprintContext Prisma model, enrichment service with poll event listener, REST controller with CASL guards, 19 unit tests)
