# Story zh-2.4: Sprint Dashboard — Detailed Analytics & Domain Filtering

Status: done

## Story

As a project lead,
I want to view cycle time, lead time, scope changes, and estimation accuracy trends with domain filtering,
So that I can analyze sprint performance in depth and across contribution domains.

## Epic

zh-Epic 2: Sprint Metrics & Project Lead Dashboard
**FRs covered:** FR22, FR23, FR24, FR25

## Acceptance Criteria

1. **Given** a project lead is on the sprint detail page `/admin/sprints/[sprintId]` **When** they view sprint analytics **Then** they see cycle time and lead time metrics already displayed (from zh-2-3) **And** scope change history is visible in a table showing issue number, change type (ADDED/REMOVED with text+icon, not color-only), story points, and timestamp **And** the scope change data is fetched via `GET /api/v1/sprints/:sprintId/scope-changes`

2. **Given** a project lead navigates to `/admin/sprints/contributors` **When** the page loads **Then** they see estimation accuracy trends per contributor over time as a line chart **And** each contributor's planned vs delivered points (delivery ratio) are shown **And** data is fetched via `GET /api/v1/sprints/contributors`

3. **Given** any sprint dashboard view (main, detail, contributors) **When** the user selects a domain filter (dev, research, governance, docs) **Then** all displayed metrics, charts, and tables update to show only data for the selected domain **And** the filter is applied via `?domain=` query parameter on all API requests **And** selecting "All domains" clears the filter

4. **Given** all chart components on these pages **When** they are rendered **Then** each includes an accessible data table alternative toggled by "View as table" button **And** status indicators use text/icons alongside color (not color-only) **And** full keyboard navigation is supported

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Sprint module** (`apps/api/src/modules/sprint/`):

- `SprintMetricsService` (1016 lines) has calculation methods for velocity, burndown, cycle time, lead time, scope changes, estimation accuracy
- `SprintMetricsController` has 4 endpoints: `GET /`, `GET /velocity`, `GET /burndown/:sprintId`, `GET /:id`
- `SprintModule` registered in `app.module.ts`
- 57 existing tests (37 service + 10 service dashboard + 10 controller)

**Already available service methods (DO NOT recreate):**

- `calculateCycleTime(sprintId, domain?)` — average "In Progress" → "Done" time in days
- `calculateLeadTime(sprintId, domain?)` — average first-transition → "Done" time in days
- `calculateScopeChanges(sprintId, domain?)` — count of scope changes
- `calculateEstimationAccuracy(sprintId, domain?)` — per-contributor planned vs delivered, stores ContributorSprintEstimation records
- `getContributorEstimations(sprintId, domain?)` — fetches ContributorSprintEstimation records for a sprint
- `getSprintMetricById(id)` — returns `SprintMetricDetail` DTO (already includes cycleTimeAvg, leadTimeAvg, scopeChanges, estimationAccuracy)
- `getVelocityChartData(options)` — chart-ready velocity data
- `getBurndownChartData(sprintId, domain?)` — parsed burndown JSONB
- `listSprints(options)` — paginated sprint list
- `findSprintMetric(sprintId, domain?)` — private helper

**Prisma models available:**

- `SprintMetric` — velocity, burndownData (JSONB), cycleTimeAvg, leadTimeAvg, scopeChanges, estimationAccuracy, committedPoints, deliveredPoints; unique constraint [sprintId, domain]; index [sprintEnd, domain]
- `ScopeChange` — sprintMetricId, issueId, issueNumber, changeType (ADDED|REMOVED), storyPoints, changedAt; index [sprintMetricId, changedAt]
- `ContributorSprintEstimation` — sprintMetricId, contributorId, plannedPoints, deliveredPoints, accuracy; unique [sprintMetricId, contributorId]; index [contributorId]
- `PipelineTransition` — sprintMetricId, issueId, issueNumber, fromPipeline, toPipeline, storyPoints, contributorId, transitionedAt

**Auth/CASL** — already configured:

- `SprintDashboard` subject: admin (manage all), working group lead (read), contributor (none)
- Guards: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility`

**Existing shared types** (`packages/shared/src/types/sprint.types.ts`):

- `BurndownDataPoint`, `VelocityDataPoint`, `SprintMetricDetail`, `SprintMetricSummary`
- `ContributorEstimationData { contributorId, plannedPoints, deliveredPoints, accuracy }`
- `ScopeChangeType = 'ADDED' | 'REMOVED'`

**Existing shared schemas** (`packages/shared/src/schemas/sprint-metrics.schema.ts`):

- `sprintMetricsQuerySchema` — `{ domain?, limit (1-52, default 12), cursor? }`
- `sprintBurndownQuerySchema` — `{ domain? }`

**Existing frontend hooks** (`apps/web/hooks/use-sprint-metrics.ts`):

- `useSprintVelocity(options?)`, `useSprintBurndown(sprintId, options?)`, `useSprintList(options?)`, `useSprintDetail(id)`
- All accept `domain?: string` already — just needs to be passed from UI
- Pattern: `buildParams()` utility, `useQuery<ApiResponse<T>>()`, 5-min staleTime

**Existing frontend pages:**

- `/admin/sprints/page.tsx` — velocity chart + sprint history table (no domain filter yet)
- `/admin/sprints/[sprintId]/page.tsx` — burndown chart + metric cards (shows cycleTimeAvg, leadTimeAvg already; no scope changes yet)
- Both use `MetricCard` component (defined locally in `[sprintId]/page.tsx`)

**Existing chart pattern** (`apps/web/components/features/sprint-dashboard/velocity-chart.tsx`):

- Recharts + ResponsiveContainer, accessible table toggle, ROSE CSS variables
- `aria-label` on chart container, `role="img"` on chart div
- Toggle button: `aria-label={showTable ? 'Show chart view' : 'Show data table view'}`

### Implementation Approach

#### 1. Shared Types — New Types for Scope Changes & Contributor Trends

**Add to `packages/shared/src/types/sprint.types.ts`:**

```typescript
export interface ScopeChangeRecord {
  id: string;
  issueId: string;
  issueNumber: number;
  changeType: ScopeChangeType;
  storyPoints: number | null;
  changedAt: string; // ISO string
}

export interface ContributorAccuracyTrend {
  contributorId: string;
  sprints: Array<{
    sprintId: string;
    sprintName: string;
    sprintEnd: string;
    plannedPoints: number;
    deliveredPoints: number;
    accuracy: number | null;
  }>;
}
```

Export both from `packages/shared/src/index.ts`.

#### 2. Shared Schemas — Scope Changes Query + Contributors Query

**Add to `packages/shared/src/schemas/sprint-metrics.schema.ts`:**

```typescript
export const sprintScopeChangesQuerySchema = z.object({
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const contributorTrendsQuerySchema = z.object({
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(52).default(12),
});
```

Export both schemas and their inferred types from `packages/shared/src/index.ts`.

#### 3. Backend — New Service Methods

**Add to `apps/api/src/modules/sprint/sprint-metrics.service.ts`:**

```typescript
async getScopeChangeHistory(sprintMetricId: string, options: { domain?: string; limit: number }): Promise<ScopeChangeRecord[]> {
  // 1. Find sprint metric by ID (database UUID)
  // 2. Query ScopeChange records by sprintMetricId, ordered by changedAt desc, limit
  // 3. Map to ScopeChangeRecord DTO (ISO string dates)
}

async getContributorAccuracyTrends(options: { domain?: string; limit: number }): Promise<ContributorAccuracyTrend[]> {
  // 1. Get last N sprints (ordered by sprintEnd desc) with domain filter
  // 2. For each sprint, fetch ContributorSprintEstimation records
  // 3. Group by contributorId, build per-sprint accuracy data
  // 4. Return sorted by contributorId for stable ordering
}
```

Architecture rules:

- Return DTO format — never raw DB records
- Domain filter: pass `domain ?? null` to Prisma where clause
- Dates returned as ISO strings

#### 4. Backend — New Controller Endpoints

**Add to `apps/api/src/modules/sprint/sprint-metrics.controller.ts`:**

```typescript
@Get(':sprintId/scope-changes')
@CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
async getScopeChanges(@Param('sprintId') sprintId, @Query() query, @Req() req) {
  // 1. Validate query with sprintScopeChangesQuerySchema
  // 2. Call sprintMetricsService.getScopeChangeHistory(sprintId, options)
  // 3. Return createSuccessResponse(data, correlationId)
}

@Get('contributors')
@CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
async getContributorTrends(@Query() query, @Req() req) {
  // 1. Validate query with contributorTrendsQuerySchema
  // 2. Call sprintMetricsService.getContributorAccuracyTrends(options)
  // 3. Return createSuccessResponse(data, correlationId)
}
```

**CRITICAL ROUTE ORDER:** The `contributors` endpoint MUST be registered BEFORE the `:id` dynamic route in the controller. NestJS matches routes top-to-bottom — if `:id` is first, "contributors" matches as an ID parameter. Place the `@Get('contributors')` method ABOVE `@Get(':id')` in the controller class.

Similarly, `@Get(':sprintId/scope-changes')` must work alongside `:id`. Since `:sprintId/scope-changes` has a sub-path, NestJS will match it correctly even below `:id`. But for clarity, place it near the `burndown/:sprintId` endpoint.

#### 5. Frontend — New Hooks

**Add to `apps/web/hooks/use-sprint-metrics.ts`:**

```typescript
export function useScopeChanges(sprintId: string | null, options?: { domain?: string }) {
  // queryKey: ['admin', 'scope-changes', sprintId, options?.domain]
  // queryFn: apiClient(`/api/v1/sprints/${sprintId}/scope-changes${params}`)
  // enabled: !!sprintId
  // staleTime: 5 * 60_000
  // Returns { scopeChanges: ScopeChangeRecord[], isLoading, error }
}

export function useContributorTrends(options?: { domain?: string; limit?: number }) {
  // queryKey: ['admin', 'contributor-trends', options?.domain, options?.limit]
  // queryFn: apiClient(`/api/v1/sprints/contributors${params}`)
  // staleTime: 5 * 60_000
  // Returns { trends: ContributorAccuracyTrend[], isLoading, error }
}
```

#### 6. Frontend — Domain Filter Component

**Create `apps/web/components/features/sprint-dashboard/domain-filter.tsx`:**

Reusable domain filter dropdown used on all sprint dashboard pages.

```typescript
interface DomainFilterProps {
  value: string | undefined;
  onChange: (domain: string | undefined) => void;
}
```

- Renders a `<select>` or button group with options: All, dev, research, governance, docs
- Uses `DOMAINS` constant from `@edin/shared` if available, or hardcode the four domains
- Styled with ROSE design system CSS variables
- Accessible: proper `<label>` and keyboard support

#### 7. Frontend — Scope Changes Table Component

**Create `apps/web/components/features/sprint-dashboard/scope-changes-table.tsx`:**

```typescript
interface ScopeChangesTableProps {
  data: ScopeChangeRecord[];
}
```

- Table showing: Issue #, Change Type (with icon: + for ADDED, - for REMOVED), Story Points, Timestamp
- Change type uses text + icon (not color-only per NFR-A3): "Added" with plus icon, "Removed" with minus icon
- Empty state: "No scope changes recorded for this sprint"
- Styled with ROSE variables, follows velocity-chart table pattern

#### 8. Frontend — Estimation Accuracy Chart Component

**Create `apps/web/components/features/sprint-dashboard/estimation-accuracy-chart.tsx`:**

```typescript
interface EstimationAccuracyChartProps {
  data: ContributorAccuracyTrend[];
}
```

- Recharts `LineChart` with one line per contributor showing accuracy % over sprints
- X-axis: sprint names, Y-axis: accuracy percentage (0-200% range to show over-delivery)
- Reference line at 100% (perfect estimation)
- Accessible table toggle (same pattern as velocity-chart)
- Legend showing contributor IDs
- If no data: empty state message

#### 9. Frontend — Update Sprint Detail Page

**Update `apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx`:**

- Add domain filter at the top (pass domain to all hooks)
- Add scope changes table section below burndown chart
- Use `useScopeChanges(sprintId, { domain })` hook
- Add `estimationAccuracy` and `scopeChanges` count to MetricCard grid (already available from `SprintMetricDetail`)

#### 10. Frontend — Create Contributors Page

**Create `apps/web/app/(admin)/admin/sprints/contributors/page.tsx`:**

- New page showing estimation accuracy trends across contributors
- Domain filter at top
- `EstimationAccuracyChart` component
- Uses `useContributorTrends({ domain })` hook
- Back link to sprint dashboard

#### 11. Frontend — Update Main Sprint Dashboard

**Update `apps/web/app/(admin)/admin/sprints/page.tsx`:**

- Add domain filter at top (pass domain to velocity and sprint list hooks)
- Add "Contributors" navigation link to contributors page
- No other changes needed

#### 12. Tests

**Extend `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts`:**

Test cases for new methods:

- `getScopeChangeHistory` returns mapped ScopeChangeRecord DTOs
- `getScopeChangeHistory` respects limit
- `getScopeChangeHistory` returns empty for unknown sprint
- `getContributorAccuracyTrends` aggregates across multiple sprints
- `getContributorAccuracyTrends` filters by domain
- `getContributorAccuracyTrends` returns empty when no sprints

**Extend `apps/api/src/modules/sprint/sprint-metrics.controller.spec.ts`:**

Test cases:

- `GET /api/v1/sprints/:sprintId/scope-changes` returns scope change history
- `GET /api/v1/sprints/:sprintId/scope-changes` respects domain filter
- `GET /api/v1/sprints/contributors` returns contributor trends
- `GET /api/v1/sprints/contributors` respects domain filter
- Query validation rejects invalid parameters

### Key Patterns to Follow

- **Chart-ready data**: Controller returns DTO arrays — never raw database records
- **CASL permissions**: `@CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))` on all endpoints
- **Validation**: Zod `safeParse()` with `DomainException` on failure (HTTP 400)
- **Dates**: Return as ISO strings in DTOs (convert from Prisma Date objects)
- **Domain filter**: Pass `domain ?? null` to Prisma `where` clause; `undefined` → `null` for Prisma
- **Frontend stale time**: 5 minutes for all sprint data queries
- **Accessibility**: All charts have "View as table" toggle, text+icon for status indicators (not color-only)
- **Responsive**: Charts use `ResponsiveContainer` width="100%"
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2

### Dependencies

- Existing `PrismaService` — for database access
- Existing `JwtAuthGuard`, `AbilityGuard`, `@CheckAbility` — for auth
- Existing `createSuccessResponse` — for API responses
- Existing shared schemas — extend with new schemas
- Existing `Recharts` (v3.7.0) — for chart rendering
- Existing `@tanstack/react-query` — for data fetching
- Existing `DOMAINS` from `@edin/shared` — for domain filter options
- No new npm packages required

### Previous Story Intelligence (zh-2-3)

From zh-2-3 implementation:

- Controller path is `sprints` (not `admin/sprints`) — CASL handles auth
- `getSprintMetricById()` returns typed `SprintMetricDetail` DTO with ISO string dates — never raw DB
- Cursor-based pagination uses Prisma native `cursor + skip: 1` pattern (fixed from UUID comparison bug)
- Sprint metric `id` in URL is the UUID database record ID, not the Zenhub sprint ID
- Mock structure: `mockPrisma` with per-model mock objects, `mockEventEmitter` with `emit: vi.fn()`
- Pre-existing test failures: redis.service.spec.ts (10), ability.factory.spec.ts (1) — these are unchanged, ignore them
- Shared package must build cleanly (`tsc`)

### Files to Create

- `apps/web/components/features/sprint-dashboard/domain-filter.tsx`
- `apps/web/components/features/sprint-dashboard/scope-changes-table.tsx`
- `apps/web/components/features/sprint-dashboard/estimation-accuracy-chart.tsx`
- `apps/web/app/(admin)/admin/sprints/contributors/page.tsx`

### Files to Modify

- `packages/shared/src/types/sprint.types.ts` — add ScopeChangeRecord, ContributorAccuracyTrend
- `packages/shared/src/schemas/sprint-metrics.schema.ts` — add sprintScopeChangesQuerySchema, contributorTrendsQuerySchema
- `packages/shared/src/index.ts` — export new types and schemas
- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — add getScopeChangeHistory, getContributorAccuracyTrends
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts` — add tests for new methods
- `apps/api/src/modules/sprint/sprint-metrics.controller.ts` — add scope-changes and contributors endpoints
- `apps/api/src/modules/sprint/sprint-metrics.controller.spec.ts` — add tests for new endpoints
- `apps/web/hooks/use-sprint-metrics.ts` — add useScopeChanges, useContributorTrends
- `apps/web/app/(admin)/admin/sprints/page.tsx` — add domain filter, contributors nav link
- `apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx` — add domain filter, scope changes table, extra metric cards

### Out of Scope

- Combined evaluation view (Story zh-2-5)
- Sprint report export (Story zh-2-5)
- Personal contributor sprint metrics view (Story zh-2-5)
- Integration configuration page (already done in zh-1-x)
- Webhook/polling log viewer (Story zh-3-1)

## Tasks / Subtasks

- [x] Task 1: Shared types — scope change records and contributor trends (AC: 1, 2)
  - [x]Add ScopeChangeRecord and ContributorAccuracyTrend interfaces to sprint.types.ts
  - [x]Export from packages/shared/src/index.ts
  - [x]Verify shared package builds cleanly

- [x] Task 2: Shared schemas — new query schemas (AC: 1, 2, 3)
  - [x]Add sprintScopeChangesQuerySchema and contributorTrendsQuerySchema
  - [x]Export schemas and inferred types from index.ts

- [x] Task 3: Sprint metrics service — new query methods (AC: 1, 2)
  - [x]Add getScopeChangeHistory() — fetch and map scope change records
  - [x]Add getContributorAccuracyTrends() — aggregate per-contributor accuracy across sprints

- [x] Task 4: Sprint metrics controller — new API endpoints (AC: 1, 2, 3)
  - [x]Add GET :sprintId/scope-changes endpoint with CASL and Zod validation
  - [x]Add GET contributors endpoint with CASL and Zod validation
  - [x]Verify route order: `contributors` before `:id`

- [x] Task 5: Backend tests (AC: 1, 2)
  - [x]Add service tests for getScopeChangeHistory (3 cases)
  - [x]Add service tests for getContributorAccuracyTrends (3 cases)
  - [x]Add controller tests for new endpoints (5 cases)
  - [x]Verify all existing tests still pass (no regressions)

- [x] Task 6: Frontend components — domain filter, scope changes, accuracy chart (AC: 1, 2, 3, 4)
  - [x]Create domain-filter.tsx — reusable domain selector
  - [x]Create scope-changes-table.tsx — table with text+icon change type indicators
  - [x]Create estimation-accuracy-chart.tsx — Recharts LineChart with accessible table toggle

- [x] Task 7: Frontend hooks — new data fetching (AC: 1, 2, 3)
  - [x]Add useScopeChanges hook
  - [x]Add useContributorTrends hook

- [x] Task 8: Frontend pages — update existing + create contributors (AC: 1, 2, 3, 4)
  - [x]Update /admin/sprints/page.tsx — add domain filter, contributors link
  - [x]Update /admin/sprints/[sprintId]/page.tsx — add domain filter, scope changes section, extra metric cards
  - [x]Create /admin/sprints/contributors/page.tsx — accuracy trends chart

## Dev Notes

- The `getScopeChangeHistory` method receives the sprint metric `id` (UUID) directly from the URL param, same as burndown endpoint — use `getSprintMetricById` to look it up first, then query ScopeChange by `sprintMetricId`
- Contributor trends aggregation: query `sprintMetric.findMany` to get last N sprints, then for each sprint query `contributorSprintEstimation.findMany`. Group results by contributorId across sprints. This is an N+1 query pattern but acceptable for N≤52 sprints with small contributor counts per sprint
- Domain filter state: manage as `useState<string | undefined>()` in each page component, pass as `domain` option to hooks. Hooks already accept `domain?: string` — just wire it up
- The `mockPrisma.scopeChange` object already has `findMany` mock in the existing test setup — reuse it
- Route ordering in NestJS controller: method declaration order determines route matching priority. Place `@Get('velocity')` and `@Get('contributors')` ABOVE `@Get(':id')` to prevent "contributors" from being captured as an ID
- Change type indicators: use "+" prefix for ADDED, "−" prefix for REMOVED (Unicode minus sign U+2212), with green/red text as secondary signal — text+icon is primary per NFR-A3

### References

- [Source: apps/api/src/modules/sprint/sprint-metrics.service.ts] — Existing service with 30+ methods
- [Source: apps/api/src/modules/sprint/sprint-metrics.controller.ts] — Controller with 4 existing endpoints
- [Source: apps/web/hooks/use-sprint-metrics.ts] — 4 existing hooks with domain support
- [Source: apps/web/components/features/sprint-dashboard/velocity-chart.tsx] — Chart + accessible table toggle pattern
- [Source: apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx] — Sprint detail with MetricCard component
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md] — Dashboard Data Pattern, FR22-FR25

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 8 tasks completed with all subtasks checked
- 68 tests passing in sprint module (53 service + 15 controller) — 11 new tests (6 service + 5 controller)
- No regressions — pre-existing test failures in redis.service.spec.ts (10) and ability.factory.spec.ts (1) unchanged
- No new npm dependencies
- Shared package builds cleanly
- Backend: 2 new REST endpoints (GET :sprintId/scope-changes, GET contributors) with CASL + Zod validation
- Backend: 2 new service methods (getScopeChangeHistory, getContributorAccuracyTrends)
- Frontend: Domain filter component reusable across all sprint dashboard pages
- Frontend: Scope changes table with text+icon indicators (NFR-A3 compliant)
- Frontend: Estimation accuracy chart with accessible table toggle
- Frontend: Contributors analytics page at /admin/sprints/contributors
- Frontend: Domain filter wired to all hooks on main, detail, and contributors pages

### File List

**Created:**

- `apps/web/components/features/sprint-dashboard/domain-filter.tsx`
- `apps/web/components/features/sprint-dashboard/scope-changes-table.tsx`
- `apps/web/components/features/sprint-dashboard/estimation-accuracy-chart.tsx`
- `apps/web/app/(admin)/admin/sprints/contributors/page.tsx`

**Modified:**

- `packages/shared/src/types/sprint.types.ts` — added ScopeChangeRecord, ContributorAccuracyTrend interfaces
- `packages/shared/src/schemas/sprint-metrics.schema.ts` — added sprintScopeChangesQuerySchema, contributorTrendsQuerySchema
- `packages/shared/src/index.ts` — exported 2 new types, 2 new schemas, 2 new schema types
- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — added getScopeChangeHistory, getContributorAccuracyTrends methods
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts` — 6 new tests (scope changes: 3, contributor trends: 3)
- `apps/api/src/modules/sprint/sprint-metrics.controller.ts` — added GET contributors, GET :sprintId/scope-changes endpoints
- `apps/api/src/modules/sprint/sprint-metrics.controller.spec.ts` — 5 new tests (scope changes: 3, contributors: 2)
- `apps/web/hooks/use-sprint-metrics.ts` — added useScopeChanges, useContributorTrends hooks
- `apps/web/app/(admin)/admin/sprints/page.tsx` — added domain filter, contributors nav link
- `apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx` — added domain filter, scope changes table, extra metric cards

### Change Log

- 2026-03-15: Implemented sprint dashboard detailed analytics & domain filtering — 2 new API endpoints (scope changes, contributor trends), 3 new frontend components (domain filter, scope changes table, estimation accuracy chart), contributors analytics page, domain filtering across all dashboard views, and 11 new unit tests
