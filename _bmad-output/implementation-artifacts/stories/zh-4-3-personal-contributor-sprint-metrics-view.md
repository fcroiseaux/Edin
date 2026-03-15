# Story zh-4.3: Personal Contributor Sprint Metrics View

Status: done

## Story

As a contributor,
I want to view my own sprint metrics (personal velocity, estimation accuracy, planning reliability),
So that I can track my sprint performance and improve my estimation skills.

## Epic

zh-Epic 4: Contribution Enrichment & Contributor Metrics
**FRs covered:** FR28

## Acceptance Criteria

1. **Given** a contributor is authenticated **When** they navigate to `/dashboard/sprint-metrics` **Then** they see their personal velocity across recent sprints **And** their estimation accuracy trend (planned vs delivered per sprint) **And** their planning reliability score (delivery ratio)

2. **Given** the personal metrics page **When** data is fetched via `GET /api/v1/sprints/contributors/:id/metrics` **Then** CASL enforces that contributors can only view their own metrics **And** a contributor attempting to view another contributor's metrics receives 403

3. **Given** a contributor has no sprint history yet **When** they view the sprint metrics page **Then** a helpful empty state is displayed explaining that metrics will appear after their first sprint

4. **Given** the personal metrics page **When** charts are displayed **Then** accessible data table alternatives are available **And** the page complies with WCAG 2.1 AA

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Backend — Sprint module** (`apps/api/src/modules/sprint/`):

- `SprintMetricsService`: has `getContributorAccuracyTrends()` returning `ContributorAccuracyTrend[]` — filters by contributorId at the Sprint level. Also has `getCombinedContributorMetrics()` returning `CombinedContributorMetric[]`
- `SprintPlanningReliabilityService`: has `getContributorReliability(contributorId, limit)` returning `PlanningReliabilityDto[]` and `getReliabilitySummary()` returning `ContributorPlanningReliabilitySummary[]`
- `SprintEnrichmentService`: has `getContributionSprintContext(contributionId)` returning enrichment data
- Existing controllers use `@Controller({ path: 'sprints', version: '1' })` with `@UseGuards(JwtAuthGuard, AbilityGuard)`

**CASL Ability Factory** (`apps/api/src/modules/auth/casl/ability.factory.ts`):

- Contributors: `can(Action.Read, 'SprintMetric', { contributorId: user.id })` — read only own SprintMetric
- Working Group Leads: `can(Action.Read, 'SprintMetric')` + `can(Action.Read, 'SprintDashboard')` — read all
- Admins: `can(Action.Manage, 'all')` — full access
- `CurrentUser` decorator: `@CurrentUser('id') userId: string` extracts user.id from req.user

**Frontend — Dashboard patterns** (`apps/web/`):

- Dashboard pages at `apps/web/app/(dashboard)/dashboard/` follow `page.tsx` pattern
- Hooks in `apps/web/hooks/` use TanStack Query with `apiClient` from `lib/api-client`
- Chart components use Recharts (BarChart, LineChart, ResponsiveContainer) in `components/features/sprint-dashboard/`
- `useAuth()` hook returns `{ user: { id, name, role, ... }, isAuthenticated, isLoading }`
- User.id is the contributor's UUID
- ROSE design system: CSS variables (`var(--spacing-xl)`, `var(--color-brand-primary)`), `font-serif` for headings, `font-sans` for body
- Accessible chart pattern: each chart has a "View as table" toggle with `aria-label` on the section

**Shared types** (`packages/shared/src/types/sprint.types.ts`):

- `ContributorAccuracyTrend`: contributorId, sprints[] (sprintId, sprintName, sprintEnd, plannedPoints, deliveredPoints, accuracy)
- `CombinedContributorMetric`: contributorId, contributorName, sprintCount, totalPlannedPoints, totalDeliveredPoints, averageAccuracy, evaluationCount, averageEvaluationScore
- `PlanningReliabilityDto`: id, contributorId, sprintId, committedPoints, deliveredPoints, deliveryRatio, estimationVariance
- `ContributorPlanningReliabilitySummary`: contributorId, contributorName, domain, sprintCount, averageDeliveryRatio, averageEstimationVariance, trend[]

### Implementation Approach

#### 1. New Shared Type — PersonalSprintMetrics

Add to `packages/shared/src/types/sprint.types.ts`:

```typescript
export interface PersonalSprintMetrics {
  contributorId: string;
  contributorName: string | null;
  domain: string | null;
  velocity: Array<{
    sprintId: string;
    sprintName: string;
    sprintEnd: string;
    deliveredPoints: number;
  }>;
  estimationAccuracy: Array<{
    sprintId: string;
    sprintName: string;
    sprintEnd: string;
    plannedPoints: number;
    deliveredPoints: number;
    accuracy: number | null;
  }>;
  planningReliability: {
    averageDeliveryRatio: number | null;
    averageEstimationVariance: number | null;
    trend: Array<{
      sprintId: string;
      sprintName: string;
      sprintEnd: string;
      deliveryRatio: number | null;
      estimationVariance: number | null;
    }>;
  };
  summary: {
    totalSprints: number;
    totalDeliveredPoints: number;
    averageVelocity: number | null;
    averageAccuracy: number | null;
  };
}
```

Export from `packages/shared/src/index.ts`.

#### 2. Backend — Personal Metrics Endpoint

Add to `SprintMetricsController` (since it already handles `/sprints/contributors` routes):

```typescript
@Get('contributors/:contributorId/metrics')
@CheckAbility((ability) => ability.can(Action.Read, 'SprintMetric'))
async getPersonalMetrics(
  @Param('contributorId') contributorId: string,
  @CurrentUser('id') userId: string,
  @Req() req?: Request & { correlationId?: string; ability?: AppAbility },
)
```

This endpoint:

- Checks that the requesting user can read SprintMetric for the given contributorId (CASL check: `req.ability.can(Action.Read, subject('SprintMetric', { contributorId }))`)
- If not authorized, throws 403
- Aggregates data from: `ContributorSprintEstimation` (velocity, estimation accuracy), `PlanningReliability` (reliability), `Contributor` (name, domain)
- Returns `PersonalSprintMetrics`

The service method `getPersonalMetrics(contributorId)` is added to `SprintMetricsService`:

- Queries `ContributorSprintEstimation` for the contributor across sprints
- Joins with `SprintMetric` for sprint names/dates
- Queries `PlanningReliability` for the contributor
- Queries `Contributor` for name and domain
- Returns assembled `PersonalSprintMetrics`

#### 3. Frontend — Hook `usePersonalSprintMetrics`

Add to `apps/web/hooks/use-sprint-metrics.ts`:

```typescript
export function usePersonalSprintMetrics(contributorId: string | null) {
  const { data, isLoading, error } = useQuery<ApiResponse<PersonalSprintMetrics>>({
    queryKey: ['dashboard', 'sprint-metrics', contributorId],
    queryFn: () =>
      apiClient<ApiResponse<PersonalSprintMetrics>>(
        `/api/v1/sprints/contributors/${contributorId}/metrics`,
      ),
    staleTime: 5 * 60_000,
    enabled: !!contributorId,
  });

  return {
    metrics: data?.data ?? null,
    isLoading,
    error,
  };
}
```

#### 4. Frontend — Sprint Metrics Page

Create `apps/web/app/(dashboard)/dashboard/sprint-metrics/page.tsx`:

- Uses `useAuth()` to get the current user's ID
- Uses `usePersonalSprintMetrics(user.id)` to fetch data
- Renders three chart sections:
  1. **Personal Velocity** — BarChart showing delivered points per sprint
  2. **Estimation Accuracy** — LineChart showing accuracy % per sprint with 100% reference line
  3. **Planning Reliability** — LineChart showing delivery ratio per sprint with 1.0 reference line
- Each chart has "View as table" toggle for accessibility (WCAG 2.1 AA — AC4)
- Summary cards at the top: total sprints, total delivered points, average velocity, average accuracy
- Empty state when no data (AC3)

#### 5. Frontend — Chart Components

Create `apps/web/components/features/sprint-dashboard/personal-velocity-chart.tsx`:

- BarChart (same pattern as VelocityChart but single-contributor)

Create `apps/web/components/features/sprint-dashboard/personal-accuracy-chart.tsx`:

- LineChart (same pattern as EstimationAccuracyChart but single-contributor)

Create `apps/web/components/features/sprint-dashboard/personal-reliability-chart.tsx`:

- LineChart showing delivery ratio trend with 1.0 (100%) reference line

### Key Patterns to Follow

- **CASL enforcement**: Use `@CheckAbility` decorator + manual `req.ability.can()` check for field-level authorization
- **CurrentUser decorator**: `@CurrentUser('id') userId: string` to get the requesting user's ID
- **Response envelope**: `createSuccessResponse(data, correlationId)`
- **Logging**: `this.logger.log({ msg: '...', contributorId, correlationId })` — structured Pino format
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2
- **React hooks**: TanStack Query with `apiClient`, 5-minute stale time
- **Charts**: Recharts with ROSE design system CSS variables, "View as table" toggle, ARIA labels

### Dependencies

- Existing `PrismaService` for database access
- Existing `SprintPlanningReliabilityService` for reliability data
- Existing `useAuth` hook for current user
- Existing Recharts library (already installed)
- No new npm packages required
- No new Prisma models or migrations required

### Previous Story Intelligence

From zh-4-1 and zh-4-2:

- `SprintPlanningReliabilityService.getContributorReliability()` already returns per-contributor reliability data
- `SprintMetricsService.getContributorAccuracyTrends()` already returns per-contributor accuracy trends
- CASL `SprintMetric` subject has field-level constraint `{ contributorId: user.id }` for contributors
- Pre-existing test failures unchanged: redis.service.spec.ts (10), ability.factory.spec.ts (1) — known and accepted
- Route ordering matters: static segments before dynamic `:id` params

### Files to Create

- `apps/web/app/(dashboard)/dashboard/sprint-metrics/page.tsx`
- `apps/web/components/features/sprint-dashboard/personal-velocity-chart.tsx`
- `apps/web/components/features/sprint-dashboard/personal-accuracy-chart.tsx`
- `apps/web/components/features/sprint-dashboard/personal-reliability-chart.tsx`
- `apps/api/src/modules/sprint/sprint-personal-metrics.controller.ts`
- `apps/api/src/modules/sprint/sprint-personal-metrics.controller.spec.ts`

### Files to Modify

- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — add `getPersonalMetrics()` method
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts` — add tests for new method
- `apps/api/src/modules/sprint/sprint.module.ts` — register new controller
- `packages/shared/src/types/sprint.types.ts` — add `PersonalSprintMetrics` type
- `packages/shared/src/index.ts` — export new type
- `apps/web/hooks/use-sprint-metrics.ts` — add `usePersonalSprintMetrics` hook

### Out of Scope

- Admin view of personal contributor metrics (admin already has contributor trends and combined metrics)
- Evaluation engine planning context injection (Phase 2, Epic 6)
- Bidirectional task sync (Phase 2, Epic 5)
- Comparison view between contributors (admin-only feature)

## Tasks / Subtasks

- [x] Task 1: Shared types — add PersonalSprintMetrics interface (AC: 1)
  - [x] Add PersonalSprintMetrics interface to sprint.types.ts
  - [x] Export from packages/shared/src/index.ts
  - [x] Verify shared package builds cleanly

- [x] Task 2: Backend service — add getPersonalMetrics method (AC: 1, 3)
  - [x] Add getPersonalMetrics(contributorId) to SprintMetricsService
  - [x] Aggregate velocity from ContributorSprintEstimation
  - [x] Aggregate estimation accuracy from ContributorSprintEstimation
  - [x] Fetch planning reliability from PlanningReliability table
  - [x] Fetch contributor info (name, domain) from Contributor table
  - [x] Handle empty data case (return empty arrays, null averages)

- [x] Task 3: Backend controller — personal metrics endpoint (AC: 2)
  - [x] Create SprintPersonalMetricsController with GET /sprints/contributors/:contributorId/metrics
  - [x] Apply CASL guard with field-level check: verify requesting user can read SprintMetric for target contributorId
  - [x] Return 403 for unauthorized access to other contributors' metrics
  - [x] Register controller in sprint.module.ts

- [x] Task 4: Backend unit tests (AC: 1-3)
  - [x] Test getPersonalMetrics returns assembled metrics for valid contributor
  - [x] Test getPersonalMetrics returns empty data for contributor with no sprint history
  - [x] Test controller returns 403 when contributor tries to access another contributor's metrics
  - [x] Test controller returns data when accessing own metrics
  - [x] Verify all existing tests still pass

- [x] Task 5: Frontend hook — usePersonalSprintMetrics (AC: 1)
  - [x] Add usePersonalSprintMetrics to use-sprint-metrics.ts
  - [x] Use TanStack Query with 5-minute stale time

- [x] Task 6: Frontend chart components (AC: 1, 4)
  - [x] Create personal-velocity-chart.tsx with BarChart + table toggle
  - [x] Create personal-accuracy-chart.tsx with LineChart + table toggle + 100% reference line
  - [x] Create personal-reliability-chart.tsx with LineChart + table toggle + 1.0 reference line
  - [x] Ensure all charts have ARIA labels and accessible data tables

- [x] Task 7: Frontend page — sprint-metrics dashboard (AC: 1, 3, 4)
  - [x] Create apps/web/app/(dashboard)/dashboard/sprint-metrics/page.tsx
  - [x] Use useAuth() to get current user ID
  - [x] Use usePersonalSprintMetrics(user.id) for data
  - [x] Display summary cards (total sprints, delivered points, avg velocity, avg accuracy)
  - [x] Display velocity, accuracy, and reliability chart sections
  - [x] Handle empty state with helpful message (AC3)
  - [x] Handle loading and error states

## Dev Notes

- The endpoint is at `/sprints/contributors/:contributorId/metrics` — this must be registered **before** the existing `/sprints/:id` route in `SprintMetricsController` to avoid the dynamic `:id` param matching "contributors" as a string. Using a separate controller with explicit path avoids route ordering conflicts.
- CASL field-level check: the `@CheckAbility` decorator checks `can(Action.Read, 'SprintMetric')` which for contributors is `{ contributorId: user.id }`. The controller must additionally check `ability.can(Action.Read, subject('SprintMetric', { contributorId }))` to enforce field-level filtering — or simply compare `userId === contributorId` since the CASL rule defines exactly this constraint.
- The personal metrics endpoint aggregates data from multiple tables (ContributorSprintEstimation, PlanningReliability, Contributor) — all read-only queries.
- Frontend route: `app/(dashboard)/dashboard/sprint-metrics/page.tsx` follows existing dashboard page convention.
- Recharts is already installed — no new packages needed.

### References

- [Source: apps/api/src/modules/sprint/sprint-metrics.service.ts] — getContributorAccuracyTrends, getCombinedContributorMetrics
- [Source: apps/api/src/modules/sprint/sprint-planning-reliability.service.ts] — getContributorReliability
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts] — SprintMetric field-level constraint
- [Source: apps/web/hooks/use-sprint-metrics.ts] — TanStack Query hook patterns
- [Source: apps/web/components/features/sprint-dashboard/velocity-chart.tsx] — Chart + table toggle pattern
- [Source: apps/web/hooks/use-auth.ts] — useAuth hook for current user

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 7 tasks completed with all subtasks checked
- 5 tests passing in new controller test file (sprint-personal-metrics.controller.spec.ts)
- 1310 tests passing across full API suite (no regressions from zh-4-2's 1305 + 5 new tests)
- Pre-existing test failures unchanged: redis.service.spec.ts (10, ioredis mock issue), ability.factory.spec.ts (1)
- No new npm dependencies
- No new Prisma models or migrations required — reuses existing ContributorSprintEstimation, PlanningReliability, and Contributor tables
- Shared package builds cleanly with new PersonalSprintMetrics type
- Frontend builds cleanly (Next.js static analysis passes)
- Backend controller uses CASL field-level authorization: contributors can only view their own metrics, admins/leads can view any
- Separate controller (SprintPersonalMetricsController) avoids route ordering conflicts with existing SprintMetricsController
- Three accessible chart components with "View as table" toggle and ARIA labels (WCAG 2.1 AA)
- Empty state handling for contributors with no sprint history

### File List

**Created:**

- `apps/api/src/modules/sprint/sprint-personal-metrics.controller.ts`
- `apps/api/src/modules/sprint/sprint-personal-metrics.controller.spec.ts`
- `apps/web/app/(dashboard)/dashboard/sprint-metrics/page.tsx`
- `apps/web/components/features/sprint-dashboard/personal-velocity-chart.tsx`
- `apps/web/components/features/sprint-dashboard/personal-accuracy-chart.tsx`
- `apps/web/components/features/sprint-dashboard/personal-reliability-chart.tsx`

**Modified:**

- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — added getPersonalMetrics() method
- `apps/api/src/modules/sprint/sprint.module.ts` — registered SprintPersonalMetricsController
- `packages/shared/src/types/sprint.types.ts` — added PersonalSprintMetrics interface
- `packages/shared/src/index.ts` — exported PersonalSprintMetrics type
- `apps/web/hooks/use-sprint-metrics.ts` — added usePersonalSprintMetrics hook

### Change Log

- 2026-03-15: Implemented personal contributor sprint metrics view (PersonalSprintMetrics shared type, getPersonalMetrics service method, SprintPersonalMetricsController with CASL field-level auth, usePersonalSprintMetrics hook, 3 accessible chart components, dashboard page at /dashboard/sprint-metrics, 5 unit tests)
