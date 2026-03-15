# Story zh-2.5: Combined Evaluation View & Sprint Report Export

Status: done

## Story

As a project lead,
I want to view sprint metrics alongside AI evaluation scores per contributor and export sprint reports,
So that I can see a holistic view of contributor performance and share data with stakeholders.

## Epic

zh-Epic 2: Sprint Metrics & Project Lead Dashboard
**FRs covered:** FR26, FR27

## Acceptance Criteria

1. **Given** a project lead is on the contributors analytics page **When** they view the combined view **Then** sprint metrics (velocity, estimation accuracy) are displayed alongside AI evaluation scores per contributor **And** the data is fetched from both sprint and evaluation data sources via `GET /api/v1/sprints/contributors/combined`

2. **Given** a project lead wants to share sprint data **When** they click export on any dashboard view **Then** a sprint report is generated containing velocity, burndown, and contributor metrics **And** the report is downloadable as CSV (for data portability) or PDF (for stakeholder sharing), selectable by the user **And** the export is generated via `GET /api/v1/sprints/export?format=csv|pdf`

3. **Given** a project lead with `SprintDashboard` read permission **When** they access any dashboard endpoint **Then** CASL permissions are enforced via `@CheckAbility` decorator **And** contributors without `SprintDashboard` permission receive 403

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`

### Existing Codebase Context

**Sprint module** (`apps/api/src/modules/sprint/`):

- `SprintMetricsService` (1122 lines) has calculation/query methods
- `SprintMetricsController` has 6 endpoints: `GET /`, `GET /velocity`, `GET /burndown/:sprintId`, `GET /contributors`, `GET /:sprintId/scope-changes`, `GET /:id`
- `SprintModule` registered in `app.module.ts`
- 68 existing tests (53 service + 15 controller)

**Already available service methods (DO NOT recreate):**

- `getContributorAccuracyTrends(options)` — per-contributor accuracy across sprints
- `getVelocityChartData(options)` — chart-ready velocity data
- `getBurndownChartData(sprintId, domain?)` — parsed burndown JSONB
- `listSprints(options)` — paginated sprint list
- `getScopeChangeHistory(sprintMetricId, options)` — scope change records
- `getSprintMetricById(id)` — single sprint metric detail

**Evaluation data available via PrismaService:**

- `evaluation` model: has `contributorId`, `compositeScore`, `status`, `completedAt` fields
- `contributor` model: has `id`, `name`, `githubUsername`
- The sprint module already has PrismaService injected — can query evaluation and contributor data directly

**Existing shared types** (`packages/shared/src/types/sprint.types.ts`):

- `ContributorAccuracyTrend`, `VelocityDataPoint`, `SprintMetricDetail`, `SprintMetricSummary`
- `ScopeChangeRecord`, `ContributorEstimationData`, `BurndownDataPoint`

**Existing shared schemas** (`packages/shared/src/schemas/sprint-metrics.schema.ts`):

- `sprintMetricsQuerySchema`, `sprintBurndownQuerySchema`
- `sprintScopeChangesQuerySchema`, `contributorTrendsQuerySchema`

**Existing frontend hooks** (`apps/web/hooks/use-sprint-metrics.ts`):

- `useSprintVelocity`, `useSprintBurndown`, `useSprintList`, `useSprintDetail`
- `useScopeChanges`, `useContributorTrends`
- All accept `domain?: string` — pattern: `buildParams()` utility, `useQuery<ApiResponse<T>>()`, 5-min staleTime

**Existing frontend pages:**

- `/admin/sprints/page.tsx` — velocity chart + sprint history table + domain filter + contributors link
- `/admin/sprints/[sprintId]/page.tsx` — burndown chart + metric cards + scope changes + domain filter
- `/admin/sprints/contributors/page.tsx` — estimation accuracy chart + domain filter

**Existing chart/component patterns:**

- Recharts + ResponsiveContainer, accessible table toggle, ROSE CSS variables
- `aria-label` on chart container, `role="img"` on chart div
- Toggle button: `aria-label={showTable ? 'Show chart view' : 'Show data table view'}`

### Implementation Approach

#### 1. Shared Types — Combined Metrics & Export

**Add to `packages/shared/src/types/sprint.types.ts`:**

```typescript
export interface CombinedContributorMetric {
  contributorId: string;
  contributorName: string | null;
  githubUsername: string | null;
  // Sprint metrics (aggregated across recent sprints)
  sprintCount: number;
  totalPlannedPoints: number;
  totalDeliveredPoints: number;
  averageAccuracy: number | null;
  // Evaluation metrics
  evaluationCount: number;
  averageEvaluationScore: number | null;
}

export type SprintExportFormat = 'csv' | 'pdf';
```

Export both from `packages/shared/src/index.ts`.

#### 2. Shared Schemas — Export Query

**Add to `packages/shared/src/schemas/sprint-metrics.schema.ts`:**

```typescript
export const sprintExportQuerySchema = z.object({
  format: z.enum(['csv', 'pdf']),
  domain: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(52).default(12),
});
```

Export schema and inferred type from `packages/shared/src/index.ts`.

#### 3. Backend — New Service Methods

**Add to `apps/api/src/modules/sprint/sprint-metrics.service.ts`:**

```typescript
async getCombinedContributorMetrics(options: {
  domain?: string;
  limit: number;
}): Promise<CombinedContributorMetric[]> {
  // 1. Get last N sprints with domain filter
  // 2. Fetch ContributorSprintEstimation records for those sprints
  // 3. Aggregate per contributor: total planned, delivered, average accuracy
  // 4. For each contributor, query evaluation aggregate (count, avg compositeScore)
  // 5. Query contributor names
  // 6. Return combined DTO sorted by contributorId
}

async generateSprintReportCsv(options: {
  domain?: string;
  limit: number;
}): Promise<string> {
  // 1. Fetch velocity data, sprint list, contributor estimations
  // 2. Generate CSV string with sections: Sprint Velocity, Contributor Metrics
  // 3. Return CSV string
}

async generateSprintReportPdf(options: {
  domain?: string;
  limit: number;
}): Promise<Buffer> {
  // 1. Fetch same data as CSV
  // 2. Use pdfkit to generate PDF with formatted tables
  // 3. Return Buffer
}
```

#### 4. Backend — New Controller Endpoints

**Add to `apps/api/src/modules/sprint/sprint-metrics.controller.ts`:**

```typescript
@Get('contributors/combined')
@CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
async getCombinedContributorMetrics(@Query() query, @Req() req) {
  // Validate with contributorTrendsQuerySchema (reuse)
  // Call sprintMetricsService.getCombinedContributorMetrics(options)
  // Return createSuccessResponse(data, correlationId)
}

@Get('export')
@CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
async exportSprintReport(@Query() query, @Req() req, @Res() res) {
  // Validate with sprintExportQuerySchema
  // Generate CSV or PDF based on format
  // Set appropriate Content-Type and Content-Disposition headers
  // Stream file response
}
```

**CRITICAL ROUTE ORDER:** `contributors/combined` MUST be before `contributors` and both before `:id`. `export` MUST be before `:id`. Place both new methods above existing static routes in the controller.

#### 5. Frontend — New Hook

**Add to `apps/web/hooks/use-sprint-metrics.ts`:**

```typescript
export function useCombinedContributorMetrics(options?: { domain?: string; limit?: number }) {
  // queryKey: ['admin', 'combined-contributor-metrics', options?.domain, options?.limit]
  // queryFn: apiClient(`/api/v1/sprints/contributors/combined${params}`)
  // staleTime: 5 * 60_000
  // Returns { metrics: CombinedContributorMetric[], isLoading, error }
}
```

#### 6. Frontend — Combined Metrics Table Component

**Create `apps/web/components/features/sprint-dashboard/combined-metrics-table.tsx`:**

```typescript
interface CombinedMetricsTableProps {
  data: CombinedContributorMetric[];
}
```

- Table showing: Contributor (name or username or truncated ID), Sprint Count, Planned Pts, Delivered Pts, Accuracy %, Eval Count, Avg Eval Score
- Empty state: "No combined metrics available yet"
- Styled with ROSE variables, follows existing table pattern
- Accessible: proper `aria-label`, keyboard-navigable

#### 7. Frontend — Export Button Component

**Create `apps/web/components/features/sprint-dashboard/export-button.tsx`:**

```typescript
interface ExportButtonProps {
  domain?: string;
  limit?: number;
}
```

- Dropdown button with CSV and PDF options
- Uses `window.location.href` to trigger download via API URL with token
- Styled as secondary action button with ROSE variables
- Accessible: proper `aria-label`, keyboard support

#### 8. Frontend — Update Contributors Page

**Update `apps/web/app/(admin)/admin/sprints/contributors/page.tsx`:**

- Add combined metrics table section below estimation accuracy chart
- Use `useCombinedContributorMetrics({ domain })` hook
- Section header: "Combined Sprint & Evaluation Metrics"

#### 9. Frontend — Update Sprint Dashboard Pages

**Update `apps/web/app/(admin)/admin/sprints/page.tsx`:**

- Add export button in the header area

**Update `apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx`:**

- Add export button in the header area

#### 10. Tests

**Extend `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts`:**

Test cases for new methods:

- `getCombinedContributorMetrics` returns combined sprint + eval data
- `getCombinedContributorMetrics` handles contributors with no evaluations
- `getCombinedContributorMetrics` filters by domain
- `getCombinedContributorMetrics` returns empty when no sprints
- `generateSprintReportCsv` generates valid CSV with headers and data
- `generateSprintReportCsv` includes velocity and contributor sections

**Extend `apps/api/src/modules/sprint/sprint-metrics.controller.spec.ts`:**

Test cases:

- `GET /api/v1/sprints/contributors/combined` returns combined metrics
- `GET /api/v1/sprints/contributors/combined` respects domain filter
- `GET /api/v1/sprints/export?format=csv` returns CSV with correct headers
- `GET /api/v1/sprints/export?format=pdf` returns PDF with correct headers
- Query validation rejects invalid format

### Key Patterns to Follow

- **Chart-ready data**: Controller returns DTO arrays — never raw database records
- **CASL permissions**: `@CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))` on all endpoints
- **Validation**: Zod `safeParse()` with `DomainException` on failure (HTTP 400)
- **Dates**: Return as ISO strings in DTOs (convert from Prisma Date objects)
- **Domain filter**: Pass `domain ?? null` to Prisma where clause
- **Frontend stale time**: 5 minutes for all sprint data queries
- **Accessibility**: Tables have proper `aria-label`, keyboard navigation
- **Testing**: Vitest with `describe/it`, mock PrismaService and EventEmitter2

### Dependencies

- Existing `PrismaService` — for database access (sprint metrics + evaluations + contributors)
- Existing `JwtAuthGuard`, `AbilityGuard`, `@CheckAbility` — for auth
- Existing `createSuccessResponse` — for API responses
- Existing shared schemas — extend with new schemas
- Existing `@tanstack/react-query` — for data fetching
- **New: `pdfkit`** — for server-side PDF generation (add to `apps/api/package.json`)
- **New: `@types/pdfkit`** — TypeScript types for pdfkit (add to `apps/api/package.json` devDependencies)

### Previous Story Intelligence (zh-2-4)

From zh-2-4 implementation:

- Controller path is `sprints` (not `admin/sprints`) — CASL handles auth
- Route ordering in NestJS: method declaration order determines route matching priority
- Mock structure: `mockPrisma` with per-model mock objects, `mockEventEmitter` with `emit: vi.fn()`
- Pre-existing test failures: redis.service.spec.ts (10), ability.factory.spec.ts (1) — ignore them
- Shared package must build cleanly (`tsc`)
- `contributors` route is BEFORE `:id` route — `contributors/combined` must be BEFORE `contributors`

### Files to Create

- `apps/web/components/features/sprint-dashboard/combined-metrics-table.tsx`
- `apps/web/components/features/sprint-dashboard/export-button.tsx`

### Files to Modify

- `packages/shared/src/types/sprint.types.ts` — add CombinedContributorMetric, SprintExportFormat
- `packages/shared/src/schemas/sprint-metrics.schema.ts` — add sprintExportQuerySchema
- `packages/shared/src/index.ts` — export new types and schemas
- `apps/api/package.json` — add pdfkit dependency
- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — add getCombinedContributorMetrics, generateSprintReportCsv, generateSprintReportPdf
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts` — add tests for new methods
- `apps/api/src/modules/sprint/sprint-metrics.controller.ts` — add combined and export endpoints
- `apps/api/src/modules/sprint/sprint-metrics.controller.spec.ts` — add tests for new endpoints
- `apps/web/hooks/use-sprint-metrics.ts` — add useCombinedContributorMetrics
- `apps/web/app/(admin)/admin/sprints/page.tsx` — add export button
- `apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx` — add export button
- `apps/web/app/(admin)/admin/sprints/contributors/page.tsx` — add combined metrics section

### Out of Scope

- Personal contributor sprint metrics view (zh-4-3, Phase 2)
- Planning reliability score (zh-6-2, Phase 2)
- Bidirectional task sync (zh-5-x, Phase 2)
- Integration configuration page (done in zh-1-x)

## Tasks / Subtasks

- [x] Task 1: Shared types — combined metrics and export format (AC: 1, 2)
  - [x]Add CombinedContributorMetric and SprintExportFormat to sprint.types.ts
  - [x]Export from packages/shared/src/index.ts
  - [x]Verify shared package builds cleanly

- [x] Task 2: Shared schemas — export query schema (AC: 2)
  - [x]Add sprintExportQuerySchema
  - [x]Export schema and inferred type from index.ts

- [x] Task 3: Install pdfkit dependency (AC: 2)
  - [x]Add pdfkit to apps/api/package.json dependencies
  - [x]Add @types/pdfkit to apps/api/package.json devDependencies
  - [x]Run pnpm install

- [x] Task 4: Sprint metrics service — new methods (AC: 1, 2)
  - [x]Add getCombinedContributorMetrics() — aggregate sprint + eval data per contributor
  - [x]Add generateSprintReportCsv() — generate CSV report string
  - [x]Add generateSprintReportPdf() — generate PDF report buffer

- [x] Task 5: Sprint metrics controller — new API endpoints (AC: 1, 2, 3)
  - [x]Add GET contributors/combined endpoint with CASL and Zod validation
  - [x]Add GET export endpoint with CASL and Zod validation + file response
  - [x]Verify route order: contributors/combined → export → contributors → :id

- [x] Task 6: Backend tests (AC: 1, 2)
  - [x]Add service tests for getCombinedContributorMetrics (4 cases)
  - [x]Add service tests for generateSprintReportCsv (2 cases)
  - [x]Add controller tests for new endpoints (5 cases)
  - [x]Verify all existing tests still pass (no regressions)

- [x] Task 7: Frontend hooks and components (AC: 1, 2)
  - [x]Add useCombinedContributorMetrics hook
  - [x]Create combined-metrics-table.tsx — table with sprint + eval columns
  - [x]Create export-button.tsx — dropdown with CSV/PDF options

- [x] Task 8: Frontend pages — update existing (AC: 1, 2, 3)
  - [x]Update /admin/sprints/contributors/page.tsx — add combined metrics section
  - [x]Update /admin/sprints/page.tsx — add export button
  - [x]Update /admin/sprints/[sprintId]/page.tsx — add export button

## Dev Notes

- `getCombinedContributorMetrics` queries ContributorSprintEstimation for sprint data, then evaluation table for eval scores — both via PrismaService. No cross-module dependency needed.
- For contributors with sprint data but no evaluations, evaluationCount=0, averageEvaluationScore=null
- For the export endpoint, use @Res() from NestJS to set response headers and stream the file
- CSV export sections: "Sprint Velocity" (sprintName, period, velocity, committed, delivered) and "Contributor Metrics" (contributor, planned, delivered, accuracy)
- PDF uses pdfkit: new PDFDocument(), pipe to buffer, add tables/text, end()
- Route ordering for NestJS: `contributors/combined` → `export` → `velocity` → `burndown/:sprintId` → `contributors` → `:sprintId/scope-changes` → `:id`
- The export endpoint needs to use @Res({ passthrough: false }) to control the response directly, so it won't use createSuccessResponse()
- mockPrisma already has `contributorSprintEstimation.findMany` — reuse it. Need to add `evaluation` and `contributor` mock objects.

### References

- [Source: apps/api/src/modules/sprint/sprint-metrics.service.ts] — Existing service with 30+ methods
- [Source: apps/api/src/modules/sprint/sprint-metrics.controller.ts] — Controller with 6 existing endpoints
- [Source: apps/web/hooks/use-sprint-metrics.ts] — 6 existing hooks
- [Source: apps/web/app/(admin)/admin/sprints/contributors/page.tsx] — Contributors analytics page
- [Source: packages/shared/src/types/evaluation.types.ts:311] — ContributorEvaluationSummaryDto
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md] — Dashboard Data Pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 8 tasks completed with all subtasks checked
- 79 tests passing in sprint module (59 service + 20 controller) — 11 new tests (6 service + 5 controller)
- No regressions — pre-existing test failures in redis.service.spec.ts (10) and ability.factory.spec.ts (1) unchanged
- 1 new npm dependency: pdfkit (+ @types/pdfkit dev)
- Shared package builds cleanly
- Backend: 2 new REST endpoints (GET contributors/combined, GET export) with CASL + Zod validation
- Backend: 3 new service methods (getCombinedContributorMetrics, generateSprintReportCsv, generateSprintReportPdf)
- Frontend: Combined metrics table component with sprint + evaluation data per contributor
- Frontend: Export button component with CSV/PDF dropdown
- Frontend: Combined metrics section added to contributors analytics page
- Frontend: Export button added to sprint dashboard, sprint detail, and contributors pages
- Frontend: New useCombinedContributorMetrics hook

### File List

**Created:**

- `apps/web/components/features/sprint-dashboard/combined-metrics-table.tsx`
- `apps/web/components/features/sprint-dashboard/export-button.tsx`

**Modified:**

- `packages/shared/src/types/sprint.types.ts` — added CombinedContributorMetric, SprintExportFormat
- `packages/shared/src/schemas/sprint-metrics.schema.ts` — added sprintExportQuerySchema
- `packages/shared/src/index.ts` — exported 2 new types, 1 new schema, 1 new schema type
- `apps/api/package.json` — added pdfkit dependency, @types/pdfkit devDependency
- `apps/api/src/modules/sprint/sprint-metrics.service.ts` — added getCombinedContributorMetrics, generateSprintReportCsv, generateSprintReportPdf methods
- `apps/api/src/modules/sprint/sprint-metrics.service.spec.ts` — 6 new tests (combined metrics: 4, CSV report: 2)
- `apps/api/src/modules/sprint/sprint-metrics.controller.ts` — added GET contributors/combined, GET export endpoints
- `apps/api/src/modules/sprint/sprint-metrics.controller.spec.ts` — 5 new tests (combined: 2, export: 3)
- `apps/web/hooks/use-sprint-metrics.ts` — added useCombinedContributorMetrics hook
- `apps/web/app/(admin)/admin/sprints/page.tsx` — added export button
- `apps/web/app/(admin)/admin/sprints/[sprintId]/page.tsx` — added export button
- `apps/web/app/(admin)/admin/sprints/contributors/page.tsx` — added combined metrics section, export button

### Change Log

- 2026-03-15: Implemented combined evaluation view & sprint report export — 2 new API endpoints (contributors/combined, export), 2 new frontend components (combined metrics table, export button), combined metrics section on contributors page, export buttons on all dashboard pages, and 11 new unit tests
