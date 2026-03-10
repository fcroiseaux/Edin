# Story 9.2: Reward Trajectory Visualization

Status: done

## Story

As a contributor,
I want to see how my scaling-law compounding rewards grow with sustained engagement,
so that I understand the long-term value of consistent, quality contributions.

## Acceptance Criteria

1. **Trajectory Visualization Page** — Route: `/dashboard/rewards/trajectory`. Displays a reward trajectory visualization showing scaling-law compounding growth curve. The curve illustrates the compounding effect: early contributions build slowly, sustained engagement accelerates reward accumulation. Uses organic, garden-inspired visual language — growth metaphors ("Your garden is growing"), not financial charts. Primary curve color uses the contributor's domain accent color (teal/amber/rose/violet).

2. **Interactive Trajectory** — Hover/tap on points along the curve shows: the contribution that generated the score, the temporal horizon context, and the compounding multiplier at that point. Toggle between time ranges: last 30 days, last quarter, last year, all time. Includes a projected trajectory (dotted/faded line) showing where sustained engagement at the current rate would lead — framed as possibility, not pressure.

3. **Accessibility** — Screen reader alternative text describes trajectory pattern: overall trend, key inflection points, current position (NFR-A4). Underlying data available as a table via "View as table" toggle. Color contrast meets 4.5:1 minimum ratio (NFR-A4).

4. **Trajectory API** — `GET /api/v1/rewards/trajectory` returns computed trajectory points based on multi-temporal scores. Cursor-based pagination for large datasets. 95th percentile response time <500ms (NFR-P4).

## Tasks / Subtasks

- [x] Task 1: Shared Types & DTOs (AC: #4)
  - [x] 1.1 Add trajectory DTOs to `packages/shared/src/types/scoring.types.ts`: `TrajectoryPointDto`, `TrajectoryResponseDto`, `TrajectorySummaryDto`, `TrajectoryTimeRange`
  - [x] 1.2 Add trajectory error codes to `packages/shared/src/constants/error-codes.ts`

- [x] Task 2: Trajectory Service (AC: #1, #2, #4)
  - [x] 2.1 Create `apps/api/src/modules/reward/trajectory.service.ts`
  - [x] 2.2 Implement `getTrajectory(contributorId, timeRange, cursor?)` — fetches temporal aggregates, computes trajectory points with compounding multiplier from `REWARD_METHODOLOGY.scalingCurve`
  - [x] 2.3 Implement `computeProjectedTrajectory(contributorId)` — extrapolates future trajectory based on current contribution rate and trend
  - [x] 2.4 Implement cursor-based pagination for trajectory point results

- [x] Task 3: Trajectory Controller (AC: #4)
  - [x] 3.1 Create `apps/api/src/modules/reward/trajectory.controller.ts`
  - [x] 3.2 Implement `GET /api/v1/rewards/trajectory` with query params: `timeRange` (30d/quarter/year/all), `cursor`, `limit`
  - [x] 3.3 Register controller in `reward.module.ts`

- [x] Task 4: Frontend — Trajectory Chart Component (AC: #1, #2, #3)
  - [x] 4.1 Create `apps/web/components/features/reward-trajectory/trajectory-chart.tsx` — Recharts AreaChart with garden-inspired styling, gradient fill, interactive tooltips
  - [x] 4.2 Implement time range toggle (30 days, quarter, year, all time)
  - [x] 4.3 Implement projected trajectory as dashed/faded area overlay
  - [x] 4.4 Implement domain-accent color theming for curve
  - [x] 4.5 Implement chart/table toggle with screen-reader accessible table (sr-only fallback always present)
  - [x] 4.6 Implement hover tooltip showing: contribution detail, horizon context, compounding multiplier

- [x] Task 5: Frontend — Scaling Law Explainer Component (AC: #1)
  - [x] 5.1 Create `apps/web/components/features/reward-trajectory/scaling-law-explainer.tsx` — brief organic-language explanation of the compounding model below the chart
  - [x] 5.2 Use `REWARD_METHODOLOGY` constants from `@edin/shared` for scaling curve data and overview text

- [x] Task 6: Frontend — Trajectory Page & Hook (AC: #1, #2, #3)
  - [x] 6.1 Create `apps/web/hooks/use-trajectory.ts` — TanStack Query hook for trajectory endpoint
  - [x] 6.2 Create `apps/web/app/(dashboard)/dashboard/rewards/trajectory/page.tsx` — client component composing TrajectoryChart + ScalingLawExplainer

- [x] Task 7: Unit & Integration Tests (AC: #1, #2, #3, #4)
  - [x] 7.1 `trajectory.service.spec.ts` — trajectory computation, projection logic, pagination, time range filtering (19 tests)
  - [x] 7.2 `trajectory.controller.spec.ts` — auth guard, query param validation, response format (4 tests)

## Dev Notes

### Architecture & Module Structure

**Extends existing module**: `apps/api/src/modules/reward/` — add trajectory service and controller alongside existing scoring services.

```
apps/api/src/modules/reward/
├── reward.module.ts              # MODIFY — register new controller + service
├── scoring-formula.service.ts    # EXISTING — provides scoring data
├── temporal-aggregation.service.ts # EXISTING — provides temporal aggregates
├── trajectory.service.ts         # NEW
├── trajectory.service.spec.ts    # NEW
├── trajectory.controller.ts      # NEW
├── trajectory.controller.spec.ts # NEW
├── score.controller.ts           # EXISTING — do not modify
├── scoring-admin.controller.ts   # EXISTING — do not modify
└── ...existing files
```

**Frontend new directory** (per architecture plan):

```
apps/web/components/features/reward-trajectory/
├── trajectory-chart.tsx          # NEW — Recharts AreaChart with garden theming
└── scaling-law-explainer.tsx     # NEW — organic growth explanation
```

### Trajectory Data Model

The trajectory endpoint computes points from existing data — NO new database tables needed. It reads from:

- `TemporalScoreAggregate` — existing model with `aggregatedScore`, `contributionCount`, `trend`, `periodStart/periodEnd` per horizon
- `ContributionScore` — existing model for individual score details on hover
- `REWARD_METHODOLOGY.scalingCurve` — maps months of engagement to compounding multiplier (1mo=1.0x, 3mo=1.8x, 6mo=3.2x, 12mo=6.5x, 24mo=14.0x)

**Trajectory point computation:**

```typescript
interface TrajectoryPointDto {
  date: string; // ISO date of the period
  rawScore: number; // aggregated score for the period (0-100)
  compoundingMultiplier: number; // from scalingCurve based on months since first contribution
  compoundedScore: number; // rawScore * compoundingMultiplier
  contributionCount: number; // contributions in period
  trend: ScoreTrend; // RISING/STABLE/DECLINING
  isProjected: boolean; // true for future projections
}
```

**Compounding multiplier calculation:**

- Determine contributor's tenure in months (first contribution date to current period)
- Interpolate `REWARD_METHODOLOGY.scalingCurve` linearly between defined points
- Apply multiplier: `compoundedScore = rawScore * interpolatedMultiplier`

**Time range filtering:**

- `30d` → use DAILY aggregates for last 30 days
- `quarter` → use WEEKLY aggregates for last ~13 weeks
- `year` → use MONTHLY aggregates for last 12 months
- `all` → use MONTHLY aggregates for entire history

**Projected trajectory:**

- Take last 3 periods' average score and contribution rate
- Extrapolate forward 3-6 periods using same rate + continuing compounding multiplier
- Mark all projected points with `isProjected: true`

### Existing Code to Reuse (DO NOT Reinvent)

- **TemporalScoreAggregate queries**: `temporal-aggregation.service.ts` already has `getAggregatesForContributor()` — use it, do NOT write raw Prisma queries for aggregates
- **Scaling curve data**: Import `REWARD_METHODOLOGY` from `@edin/shared/constants/reward-methodology` — do NOT hardcode multiplier values
- **Recharts AreaChart pattern**: Follow `apps/web/components/features/rewards/growth-curve-chart.tsx` exactly — uses gradient fill, `#C4956A` brand accent, chart/table toggle, sr-only accessibility table
- **Evaluation Timeline chart**: Follow `apps/web/components/features/evaluation/history/evaluation-timeline.tsx` — uses custom tooltip, `useId()` for gradient IDs, domain `[0, 100]` for raw scores, responsive container
- **API response format**: Use `createSuccessResponse(data, req.correlationId)` from `apps/api/src/common/types/api-response.type.ts`
- **Controller auth**: `@UseGuards(JwtAuthGuard)` — same as `score.controller.ts`
- **Error handling**: `DomainException` with `ERROR_CODES` from `@edin/shared`
- **TanStack Query hooks**: Follow `apps/web/hooks/use-scores.ts` pattern — `queryKey` arrays, configurable staleTime

### Recharts Pattern Reference

All Edin charts follow these conventions:

- `ResponsiveContainer` with percentage width and fixed height (200-300px)
- Gradient definition via `<defs><linearGradient>` with brand color at top, transparent at bottom
- Axis styling: `tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}`, `axisLine={false}`, `tickLine={false}`
- Custom tooltip: `background: 'var(--color-surface-raised)'`, `border: '1px solid var(--color-surface-border)'`
- Projected data: render as separate `<Area>` with `strokeDasharray="5 5"` and lower opacity fill
- `'use client'` directive required for all Recharts components

### Domain Accent Colors

Per contributor's domain — use for primary curve color:

- Technology: teal (`#3A7D7E` or `var(--color-domain-technology)`)
- Fintech: amber
- Impact: rose
- Governance: violet

The contributor's domain should come from auth context or user profile data. Default to brand accent `#C4956A` if domain unknown.

### UX Design Requirements

**Emotional goal**: "Patient confidence" — sustained engagement is building something meaningful.

**Visual language**:

- Garden-inspired metaphors: "Your garden is growing", organic growth language
- NOT financial charts, NOT gamification bars
- Calm clarity aesthetic: no red/green, descriptive trend labels ("rising", "steady", "resting")
- Progressive disclosure: summary insight visible immediately, details on interaction
- Serif headings, sans-serif body (editorial design language)

**Page structure**:

1. Page heading with garden metaphor (e.g., "Your Growth Trajectory")
2. Trajectory chart with time range toggles
3. Brief scaling-law explainer below chart
4. Accessible table toggle

### API Endpoint Design

```
GET /api/v1/rewards/trajectory
Query params:
  timeRange: '30d' | 'quarter' | 'year' | 'all' (default: 'year')
  cursor?: string  (ISO date string for pagination)
  limit?: number   (default: 50, max: 200)

Response:
{
  data: {
    points: TrajectoryPointDto[],
    summary: {
      currentMultiplier: number,
      tenureMonths: number,
      overallTrend: ScoreTrend,
      totalContributions: number
    },
    projected: TrajectoryPointDto[]  // separate array for projected points
  },
  meta: {
    timestamp: string,
    correlationId: string,
    pagination: {
      total: number,
      hasMore: boolean,
      cursor?: string
    }
  }
}
```

### Critical Patterns to Follow

1. **Static routes first**: Register `trajectory.controller.ts` BEFORE any dynamic `:id` routes in reward module
2. **Prisma decimals**: Pass plain numbers, NOT `Decimal` imports (lesson from 8-5, 9-1)
3. **Event patterns**: This story does NOT need new events — it reads existing data
4. **No new DB models**: Trajectory is computed from existing `TemporalScoreAggregate` and `ContributionScore` tables
5. **Cursor pagination**: Use `periodStart` date as cursor — same pattern as other paginated endpoints
6. **Frontend `'use client'`**: Required for Recharts and interactive elements
7. **Screen reader**: Always include `<div className="sr-only">` with data table, plus `role="img"` and `aria-label` on chart container

### Testing Standards

- **Vitest** with NestJS Test module
- Mock PrismaService with `vi.fn()` for each method used
- Test trajectory computation with known inputs → expected outputs
- Test compounding multiplier interpolation at exact and between scaling curve points
- Test time range filtering (30d uses DAILY, quarter uses WEEKLY, year/all uses MONTHLY)
- Test projected trajectory extrapolation with various input patterns
- Test cursor-based pagination boundaries
- Test empty state (no contributions yet)
- Test controller auth guard and response format
- Target: ~12-15 tests per service file

### Project Structure Notes

- New trajectory files within existing `modules/reward/` — does NOT create a new module
- Frontend `reward-trajectory/` directory is a NEW feature directory in `components/features/` (separate from existing `reward/` which has scoring components)
- Dashboard page at `(dashboard)/dashboard/rewards/trajectory/` — new route within existing dashboard layout
- Hook in `hooks/use-trajectory.ts` — new file alongside existing `use-scores.ts`
- Shared types extend existing `scoring.types.ts` — no new type file needed

### Previous Story (9-1) Learnings

- Fixed PaginationMeta type — removed `limit` field (not in PaginationMeta type)
- Fixed mockPrisma type — use `any` to resolve Mock type assignability
- Fixed metadata Prisma JSON type — cast to `Prisma.InputJsonValue` following admission.service.ts pattern
- Prisma decimals: pass plain numbers, NOT Decimal class
- All 907 tests passing after 9-1 — maintain zero regressions
- BullMQ WorkerHost pattern works well for async processors
- Event-driven architecture: services listen to events and emit events

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9, Story 9.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR57]
- [Source: _bmad-output/planning-artifacts/architecture.md#Reward Module, reward-trajectory directory]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Patient confidence, garden metaphor]
- [Source: packages/shared/src/constants/reward-methodology.ts — scaling curve data, formula components]
- [Source: apps/api/src/modules/reward/temporal-aggregation.service.ts — aggregate queries to reuse]
- [Source: apps/web/components/features/rewards/growth-curve-chart.tsx — Recharts AreaChart pattern]
- [Source: apps/web/components/features/evaluation/history/evaluation-timeline.tsx — interactive chart pattern]
- [Source: apps/web/hooks/use-scores.ts — TanStack Query hook pattern]
- [Source: _bmad-output/implementation-artifacts/9-1-advanced-contribution-scoring-and-multi-temporal-tracking.md — previous story context]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing Vite type mismatch in API (unrelated to this story, same as 9-1)
- Shared package rebuild required for new type exports to resolve in API consumer

### Completion Notes List

- All 7 tasks implemented with 23 new unit tests (19 service + 4 controller)
- Full test suite: 930/930 passing, 0 regressions (up from 907 after 9-1)
- No new database models — trajectory computed from existing TemporalScoreAggregate and ContributionScore tables
- Compounding multiplier interpolated linearly from REWARD_METHODOLOGY.scalingCurve constants
- Projected trajectory extrapolates 3-7 periods forward based on last 3 periods' average
- Time range mapping: 30d→DAILY, quarter→WEEKLY, year/all→MONTHLY horizons
- Cursor-based pagination via periodStart date
- Frontend: Recharts AreaChart with dual areas (actual solid, projected dashed), custom tooltips, chart/table toggle
- Accessibility: sr-only data table always rendered, aria-label on chart, "View as table" button
- Garden-inspired UX: "Your Growth Trajectory" heading, organic trend labels (rising/steady/resting), scaling law explainer with REWARD_METHODOLOGY constants
- TrajectoryController registered BEFORE ScoreController in module (static routes first pattern)

### File List

**New files:**

- `apps/api/src/modules/reward/trajectory.service.ts`
- `apps/api/src/modules/reward/trajectory.service.spec.ts`
- `apps/api/src/modules/reward/trajectory.controller.ts`
- `apps/api/src/modules/reward/trajectory.controller.spec.ts`
- `apps/web/components/features/reward-trajectory/trajectory-chart.tsx`
- `apps/web/components/features/reward-trajectory/scaling-law-explainer.tsx`
- `apps/web/hooks/use-trajectory.ts`
- `apps/web/app/(dashboard)/dashboard/rewards/trajectory/page.tsx`

**Modified files:**

- `packages/shared/src/types/scoring.types.ts` — added TrajectoryPointDto, TrajectorySummaryDto, TrajectoryResponseDto, TrajectoryTimeRange
- `packages/shared/src/constants/error-codes.ts` — added TRAJECTORY_COMPUTATION_FAILED, TRAJECTORY_INVALID_TIME_RANGE
- `packages/shared/src/index.ts` — exported new trajectory types
- `apps/api/src/modules/reward/reward.module.ts` — registered TrajectoryController, TrajectoryService
