# Story zh-2.3: Sprint Dashboard — Velocity & Burndown Views

Status: done

## Story

As a project lead,
I want to view velocity and burndown charts on an admin dashboard,
So that I can monitor sprint performance and delivery trends at a glance.

## Epic

zh-Epic 2: Sprint Metrics & Project Lead Dashboard
**FRs covered:** FR20, FR21

## Acceptance Criteria

1. **Given** a project lead is authenticated and has `SprintDashboard` read permission **When** they navigate to `/admin/sprints` **Then** they see a velocity chart showing story points delivered across up to 12 sprints **And** the chart renders within 1 second for 12-sprint history **And** the data is fetched via `GET /api/v1/sprints/velocity` returning chart-ready format `[{x: sprintEndDate, y: deliveredPoints}]`

2. **Given** a project lead navigates to `/admin/sprints/[sprintId]` **When** the page loads **Then** they see a burndown chart for the selected sprint showing remaining story points over time **And** the burndown chart renders within 500ms **And** the data is fetched via `GET /api/v1/sprints/burndown/:sprintId`

3. **Given** a chart is displayed **When** the user activates the "View as table" toggle **Then** an accessible data table alternative is shown with the same data **And** the table has proper ARIA labels and is keyboard navigable

4. **Given** the dashboard page **When** it loads with up to 12 months of historical data **Then** the page load completes within 2 seconds **And** TanStack Query hooks manage data fetching with 5-minute stale time

5. **Given** the dashboard is viewed on a tablet or desktop **When** the viewport changes **Then** charts and layout adapt responsively following existing admin patterns

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Sprint module** (`apps/api/src/modules/sprint/`):

- `SprintMetricsService` already exists with calculation methods for velocity, burndown, cycle time, lead time, scope changes, estimation accuracy
- `SprintModule` registered in `app.module.ts` with `PrismaModule` import
- No controller exists yet — this story adds the first API endpoints
- 37 existing tests in `sprint-metrics.service.spec.ts`

**Prisma schema** (`apps/api/prisma/schema.prisma`):

- `SprintMetric` model with velocity, burndownData (JSONB), committedPoints, deliveredPoints, cycleTimeAvg, leadTimeAvg, scopeChanges, estimationAccuracy
- Unique constraint on `[sprintId, domain]` — supports per-domain filtering
- Composite index on `[sprintEnd, domain]` for dashboard query performance

**Auth/CASL** (`apps/api/src/modules/auth/casl/`):

- `subjects.ts` includes `'SprintMetric'` and `'SprintDashboard'`
- ADMIN: `can(Action.Manage, 'all')`
- WORKING_GROUP_LEAD: `can(Action.Read, 'SprintMetric')` + `can(Action.Read, 'SprintDashboard')`
- CONTRIBUTOR: `can(Action.Read, 'SprintMetric', { contributorId: user.id })` — self-only

**API response pattern** (`apps/api/src/common/types/api-response.type.ts`):

- `createSuccessResponse(data, correlationId, pagination?)` returns `{ data, meta: { timestamp, correlationId, pagination? } }`

**Controller pattern** (from `apps/api/src/modules/admin/`):

- `@Controller({ path: 'admin/...', version: '1' })`
- `@UseGuards(JwtAuthGuard, AbilityGuard)`
- `@CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))`
- Extract `correlationId` from `req?.correlationId ?? ''`
- Return `createSuccessResponse(data, correlationId, pagination?)`

**Shared Zod schemas** (`packages/shared/src/schemas/sprint-metrics.schema.ts`):

- `sprintMetricsQuerySchema` — `{ domain?: string, limit?: number (1-52, default 12), cursor?: string }`
- `sprintBurndownQuerySchema` — `{ domain?: string }`

**Frontend chart pattern** (`apps/web/components/features/metrics/domain-distribution-chart.tsx`):

- Uses Recharts (v3.7.0) with `ResponsiveContainer`
- Includes accessible table toggle (chart/table view)
- Uses ROSE design system CSS variables for styling
- Tooltip styled with `--color-surface-raised`, `--color-surface-border`

**TanStack Query hook pattern** (`apps/web/hooks/use-zenhub-config.ts`):

- `useQuery<ApiResponse>()` with `queryKey`, `queryFn`, `staleTime`
- Returns `{ data, isLoading, error }` destructured pattern
- Uses `apiClient<T>(path)` from `apps/web/lib/api-client.ts`

**Existing sprint dashboard page** (`apps/web/app/(admin)/admin/sprints/page.tsx`):

- Currently a placeholder — has Zenhub Integration link and "metrics will appear here" text
- Uses ROSE design system variables: `--spacing-*`, `--radius-*`, `--color-*`

### Implementation Approach

#### 1. Backend — Sprint Metrics Controller

**Create `apps/api/src/modules/sprint/sprint-metrics.controller.ts`:**

```typescript
@Controller({ path: 'sprints', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class SprintMetricsController {
  constructor(private readonly sprintMetricsService: SprintMetricsService) {}

  @Get('velocity')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getVelocityData(@Query() query, @Req() req): Promise<ApiSuccessResponse> {
    // 1. Validate query with sprintMetricsQuerySchema
    // 2. Fetch sprint metrics ordered by sprintEnd desc, limit by query.limit
    // 3. Transform to chart-ready format: [{x: sprintEndDate, y: deliveredPoints, label: sprintName}]
    // 4. Return createSuccessResponse(chartData, correlationId)
  }

  @Get('burndown/:sprintId')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getBurndownData(
    @Param('sprintId') sprintId,
    @Query() query,
    @Req() req,
  ): Promise<ApiSuccessResponse> {
    // 1. Validate query with sprintBurndownQuerySchema
    // 2. Find sprint metric by sprintId and domain
    // 3. Return burndownData (JSONB) as chart-ready format
    // 4. Return createSuccessResponse(burndownData, correlationId)
  }

  @Get()
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async listSprints(@Query() query, @Req() req): Promise<ApiSuccessResponse> {
    // 1. Fetch sprint metrics list with pagination (cursor-based)
    // 2. Return with pagination metadata
  }
}
```

Architecture rule: Always return chart-ready data — never raw database records.

#### 2. Sprint Metrics Service — Dashboard Query Methods

**Add to `apps/api/src/modules/sprint/sprint-metrics.service.ts`:**

```typescript
async getVelocityChartData(options: { domain?: string; limit: number }): Promise<VelocityDataPoint[]>;
// 1. Query sprint_metrics ordered by sprintEnd desc, limit options.limit
// 2. Filter by domain if provided
// 3. Transform to chart-ready: [{x: sprintEnd ISO, y: velocity, label: sprintName}]
// 4. Reverse to chronological order (oldest first)

async getBurndownChartData(sprintId: string, domain?: string): Promise<BurndownDataPoint[]>;
// 1. Find sprint metric by sprintId+domain
// 2. Return burndownData JSONB parsed as BurndownDataPoint[]
// 3. Return empty array if not found or no burndown data

async listSprints(options: { domain?: string; limit: number; cursor?: string }): Promise<{ data: SprintMetricSummary[]; pagination: PaginationMeta }>;
// 1. Query sprint_metrics ordered by sprintEnd desc
// 2. Cursor-based pagination using sprint metric id
// 3. Return summary data: id, sprintId, sprintName, sprintStart, sprintEnd, velocity, committedPoints, deliveredPoints
```

#### 3. Shared Types — Chart Data Types

**Add to `packages/shared/src/types/sprint.types.ts`:**

```typescript
export interface VelocityDataPoint {
  x: string; // sprintEnd ISO date
  y: number; // velocity (delivered points)
  label: string; // sprint name
}

export interface SprintMetricSummary {
  id: string;
  sprintId: string;
  sprintName: string;
  sprintStart: string;
  sprintEnd: string;
  velocity: number;
  committedPoints: number;
  deliveredPoints: number;
}
```

Export from `packages/shared/src/index.ts`.

#### 4. Sprint Module — Register Controller

**Update `apps/api/src/modules/sprint/sprint.module.ts`:**

Add `SprintMetricsController` to `controllers` array. Add `AuthModule` import for guards.

#### 5. Frontend — TanStack Query Hooks

**Create `apps/web/hooks/use-sprint-metrics.ts`:**

```typescript
export function useSprintVelocity(options?: { domain?: string; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'sprint-velocity', options],
    queryFn: () => apiClient<VelocityApiResponse>(`/api/v1/sprints/velocity?${params}`),
    staleTime: 5 * 60_000, // 5 minutes
  });
}

export function useSprintBurndown(sprintId: string, options?: { domain?: string }) {
  return useQuery({
    queryKey: ['admin', 'sprint-burndown', sprintId, options],
    queryFn: () => apiClient<BurndownApiResponse>(`/api/v1/sprints/burndown/${sprintId}?${params}`),
    staleTime: 5 * 60_000,
    enabled: !!sprintId,
  });
}

export function useSprintList(options?: { domain?: string; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'sprint-list', options],
    queryFn: () => apiClient<SprintListApiResponse>(`/api/v1/sprints?${params}`),
    staleTime: 5 * 60_000,
  });
}
```

#### 6. Frontend — Chart Components

**Create `apps/web/components/features/sprint-dashboard/velocity-chart.tsx`:**

- Recharts `BarChart` with `ResponsiveContainer`
- Shows delivered points per sprint
- Accessible table toggle
- Uses ROSE design system colors

**Create `apps/web/components/features/sprint-dashboard/burndown-chart.tsx`:**

- Recharts `LineChart` with two lines: actual vs ideal
- Shows remaining story points over time
- Accessible table toggle
- Uses ROSE design system colors

#### 7. Frontend — Sprint Dashboard Pages

**Update `apps/web/app/(admin)/admin/sprints/page.tsx`:**

- Replace placeholder with actual velocity chart and sprint list
- Zenhub Integration config link remains
- Uses `useSprintVelocity()` and `useSprintList()` hooks

**Create `apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx`:**

- Sprint detail page with burndown chart
- Shows sprint summary metrics (velocity, committed, delivered, cycle time, lead time)
- Uses `useSprintBurndown(sprintId)` hook

#### 8. Tests

**Create `apps/api/src/modules/sprint/sprint-metrics.controller.spec.ts`:**

Test cases:

- `GET /api/v1/sprints/velocity` returns chart-ready velocity data
- `GET /api/v1/sprints/velocity` respects domain filter
- `GET /api/v1/sprints/velocity` respects limit parameter
- `GET /api/v1/sprints/burndown/:sprintId` returns burndown data
- `GET /api/v1/sprints/burndown/:sprintId` returns empty array for unknown sprint
- `GET /api/v1/sprints` returns sprint list with pagination
- Query validation rejects invalid parameters

**Extend `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts`:**

Test cases:

- `getVelocityChartData` returns chart-ready format in chronological order
- `getVelocityChartData` filters by domain
- `getVelocityChartData` respects limit
- `getBurndownChartData` returns parsed JSONB data
- `getBurndownChartData` returns empty array for missing sprint
- `listSprints` returns paginated results
- Existing 37 tests still pass (no regressions)

### Key Patterns to Follow

- **Chart-ready data**: Controller returns `{x, y, label}` arrays — never raw database records (architecture rule)
- **CASL permissions**: Use `@CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))` on all endpoints
- **Validation**: Use `sprintMetricsQuerySchema.safeParse()` with `DomainException` on failure
- **Pagination**: Cursor-based via sprint metric ID, consistent with existing API patterns
- **Frontend stale time**: 5 minutes for sprint data (not real-time)
- **Accessibility**: All charts must have "View as table" toggle with proper ARIA labels
- **Responsive**: Charts use `ResponsiveContainer` width="100%" for adaptive sizing
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2

### Dependencies

- Existing `PrismaService` for database access
- Existing `JwtAuthGuard`, `AbilityGuard`, `@CheckAbility` for auth
- Existing `createSuccessResponse` for API responses
- Existing `sprintMetricsQuerySchema`, `sprintBurndownQuerySchema` for validation
- Existing `Recharts` (v3.7.0) for chart rendering
- Existing `@tanstack/react-query` for data fetching
- No new npm packages required

### Previous Story Intelligence (zh-2-2)

From zh-2-2 implementation:

- `SprintMetricsService` follows consistent pattern: find metric → query raw data → calculate → upsert → emit event → log
- `findSprintMetric(sprintId, domain?)` is a private helper that returns `SprintMetric | null`
- Mock structure in tests: `mockPrisma`, `mockEventEmitter`, NestJS `Test.createTestingModule`
- 37 tests passing — no regressions allowed
- Pre-existing test failures in redis.service.spec.ts (10) and ability.factory.spec.ts (1) are unchanged

### Files to Create

- `apps/api/src/modules/sprint/sprint-metrics.controller.ts`
- `apps/api/src/modules/sprint/sprint-metrics.controller.spec.ts`
- `apps/web/hooks/use-sprint-metrics.ts`
- `apps/web/components/features/sprint-dashboard/velocity-chart.tsx`
- `apps/web/components/features/sprint-dashboard/burndown-chart.tsx`
- `apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx`

### Files to Modify

- `apps/api/src/modules/sprint/sprint.module.ts` — add controller, import AuthModule
- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — add dashboard query methods
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts` — add tests for new methods
- `apps/web/app/(admin)/admin/sprints/page.tsx` — replace placeholder with charts
- `packages/shared/src/types/sprint.types.ts` — add VelocityDataPoint, SprintMetricSummary
- `packages/shared/src/index.ts` — export new types

### Out of Scope

- Cycle time, lead time, scope changes, estimation accuracy charts (Story zh-2-4)
- Domain filtering UI (Story zh-2-4)
- Combined evaluation view (Story zh-2-5)
- Sprint report export (Story zh-2-5)
- Personal contributor sprint metrics view (Story zh-2-5)
- Integration configuration page (already done in zh-1-x)

## Tasks / Subtasks

- [x] Task 1: Shared types — chart data types (AC: 1, 2)
  - [x] Add VelocityDataPoint and SprintMetricSummary to sprint.types.ts
  - [x] Export from packages/shared/src/index.ts
  - [x] Verify shared package builds cleanly

- [x] Task 2: Sprint metrics service — dashboard query methods (AC: 1, 2, 4)
  - [x] Add getVelocityChartData() — chart-ready velocity data
  - [x] Add getBurndownChartData() — parsed burndown JSONB
  - [x] Add listSprints() — paginated sprint list

- [x] Task 3: Sprint metrics controller — API endpoints (AC: 1, 2, 4)
  - [x] Create sprint-metrics.controller.ts with GET /velocity, GET /burndown/:sprintId, GET /
  - [x] Apply JwtAuthGuard + AbilityGuard + @CheckAbility decorators
  - [x] Validate queries with Zod schemas
  - [x] Update sprint.module.ts to register controller and import AuthModule

- [x] Task 4: Backend tests (AC: 1, 2, 4)
  - [x] Create sprint-metrics.controller.spec.ts with 7+ test cases
  - [x] Extend sprint-metrics.service.spec.ts with dashboard query method tests
  - [x] Verify all existing tests still pass (no regressions)

- [x] Task 5: Frontend hooks — TanStack Query (AC: 1, 2, 4)
  - [x] Create use-sprint-metrics.ts with useSprintVelocity, useSprintBurndown, useSprintList hooks
  - [x] 5-minute stale time for sprint data

- [x] Task 6: Frontend chart components (AC: 1, 2, 3, 5)
  - [x] Create velocity-chart.tsx — Recharts BarChart with accessible table toggle
  - [x] Create burndown-chart.tsx — Recharts LineChart with accessible table toggle
  - [x] Responsive via ResponsiveContainer

- [x] Task 7: Frontend sprint dashboard pages (AC: 1, 2, 3, 4, 5)
  - [x] Update /admin/sprints/page.tsx — velocity chart + sprint list + config link
  - [x] Create /admin/sprints/[sprintId]/page.tsx — burndown chart + sprint summary

## Dev Notes

- The `SprintMetric.burndownData` is stored as JSONB — parse it as `BurndownDataPoint[]` when returning
- Velocity chart: use `BarChart` (bar per sprint) — shows `deliveredPoints` over time
- Burndown chart: use `LineChart` with two lines — "Actual" (remaining points) and "Ideal" (straight line from committed to 0)
- Sprint list on dashboard links to individual sprint detail pages `/admin/sprints/[sprintId]`
- The `sprintId` in the URL is the sprint metric record's `id` (UUID), not the Zenhub sprint ID — to match REST conventions and enable efficient lookups
- Query validation uses `safeParse` → on failure, throw `DomainException` with HTTP 400
- The controller path is `sprints` (not `admin/sprints`) because CASL handles auth — follows architecture pattern
- Sprint metrics query limit defaults to 12, max 52 (one year of sprints)

### References

- [Source: apps/api/src/modules/sprint/sprint-metrics.service.ts] — Existing service methods
- [Source: apps/api/src/modules/admin/health-metrics.controller.ts] — Controller pattern reference
- [Source: apps/web/components/features/metrics/domain-distribution-chart.tsx] — Chart component pattern
- [Source: apps/web/hooks/use-zenhub-config.ts] — TanStack Query hook pattern
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md] — Dashboard Data Pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- All 7 tasks completed with all subtasks checked
- 57 tests passing in sprint module (37 pre-existing service + 10 new service + 10 new controller)
- No regressions — pre-existing test failures in redis.service.spec.ts (10, ioredis mock issue) and ability.factory.spec.ts (1) unchanged
- No new npm dependencies
- Shared package builds cleanly
- TypeScript compilation clean (no new errors)
- Backend: REST controller with GET /velocity, GET /burndown/:sprintId, GET /, GET /:id — all with CASL permissions, Zod validation, chart-ready response format
- Frontend: Recharts BarChart (velocity) and LineChart (burndown) with accessible table toggles, TanStack Query hooks with 5-minute stale time, responsive via ResponsiveContainer

### File List

**Created:**

- `apps/api/src/modules/sprint/sprint-metrics.controller.ts`
- `apps/api/src/modules/sprint/sprint-metrics.controller.spec.ts`
- `apps/web/hooks/use-sprint-metrics.ts`
- `apps/web/components/features/sprint-dashboard/velocity-chart.tsx`
- `apps/web/components/features/sprint-dashboard/burndown-chart.tsx`
- `apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx`

**Modified:**

- `apps/api/src/modules/sprint/sprint.module.ts` — added SprintMetricsController
- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — added getVelocityChartData, getBurndownChartData, listSprints, getSprintMetricById
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts` — 57 tests (20 new: 3 velocity chart, 3 burndown chart, 2 list sprints, 2 getById, 10 controller)
- `apps/web/app/(admin)/admin/sprints/page.tsx` — replaced placeholder with velocity chart + sprint history table
- `packages/shared/src/types/sprint.types.ts` — added VelocityDataPoint, SprintMetricSummary interfaces
- `packages/shared/src/index.ts` — exported new types

### Change Log

- 2026-03-15: Implemented sprint dashboard velocity & burndown views — REST API endpoints (GET /velocity, /burndown/:sprintId, /, /:id), chart-ready service methods, Recharts chart components with accessible table alternatives, TanStack Query hooks, admin dashboard pages, and 20 new unit tests
