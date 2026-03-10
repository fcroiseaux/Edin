# Story 10.1: Admin Health Metrics Dashboard

Status: done

## Story

As an admin,
I want to view a health metrics dashboard showing community vitals and platform KPIs,
so that I can make data-driven decisions about community health and go/no-go readiness.

## Acceptance Criteria

1. **Health Metrics Dashboard** — Route: `/admin` (existing page, currently blank). Displays community vitals (FR48): active contributor count with trend, retention rate (30-day cohort), domain balance (contributor distribution across Technology/Fintech/Impact/Governance), and feedback turnaround (average time from peer feedback assignment to submission). Each metric card includes editorial context — a brief textual interpretation (e.g., "Technology domain has 45% of contributors — consider recruiting for Impact"). All leading and lagging KPIs from PRD Success Criteria are available (NFR-O3). Dashboard data has <5 minute lag via Redis-cached aggregations.

2. **Progressive Disclosure** — Each metric card shows summary value at a glance, expandable to show: trend chart (Recharts AreaChart), breakdown by domain or time period, and historical comparison. Keyboard-navigable (NFR-A3). TTI <3s (NFR-P2).

3. **Metrics Reports Export** — Route: `/admin/reports` (existing page, currently blank). Admin can configure a report with: date range picker, selectable KPIs (checkboxes from all available metrics), and format (CSV or JSON) (FR51). Report generation runs asynchronously via BullMQ. Admin receives notification when report is ready for download. Generated reports available for 30 days before automatic cleanup. Data export supports quarterly reporting (NFR-O3).

4. **System Health Alerts** — Priority notification banner on the dashboard when thresholds are breached (NFR-O1): API error rate >1%, ingestion pipeline failure, evaluation throughput drop >50%, database query p95 >2s. Alert fired within 60 seconds of breach. Each alert includes: threshold breached, current value, time of breach, and suggested action. Alerts are dismissible but logged.

5. **Accessibility** — All charts have equivalent text descriptions (NFR-A4). All interactive elements keyboard-navigable (NFR-A3). WCAG 2.1 Level AA compliance (NFR-A1). Screen reader compatible with ARIA labels.

## Tasks / Subtasks

- [ ] Task 1: Shared Types & Constants (AC: #1, #3, #4)
  - [ ] 1.1 Add `HealthMetrics`, `CommunityVitals`, `MetricCard`, `DomainDistribution`, `RetentionCohort`, `SystemAlert`, `AlertThreshold` types to `packages/shared/src/types/admin.types.ts`
  - [ ] 1.2 Add `ReportConfig`, `ReportStatus`, `ReportFormat`, `GeneratedReport` types to same file
  - [ ] 1.3 Add `KpiDefinition` type with all leading/lagging KPI definitions as constant array in `packages/shared/src/constants/kpi-definitions.ts`
  - [ ] 1.4 Add admin-related error codes to `packages/shared/src/constants/error-codes.ts`
  - [ ] 1.5 Export new types and constants from `packages/shared/src/index.ts`

- [ ] Task 2: Admin Health Metrics API (AC: #1, #2)
  - [ ] 2.1 Create `apps/api/src/modules/admin/admin.module.ts` — register controllers, services, BullMQ queue
  - [ ] 2.2 Create `apps/api/src/modules/admin/health-metrics.service.ts` — aggregates community vitals from Prisma queries with Redis caching (5-minute TTL)
  - [ ] 2.3 Create `apps/api/src/modules/admin/health-metrics.controller.ts` — `GET /api/v1/admin/health-metrics` with JwtAuthGuard + AbilityGuard (Action.Manage)
  - [ ] 2.4 Import AdminModule in `apps/api/src/app.module.ts`

- [ ] Task 3: System Alerts API (AC: #4)
  - [ ] 3.1 Create `apps/api/src/modules/admin/alerts.service.ts` — monitors thresholds using Prisma + Redis health checks, returns active alerts
  - [ ] 3.2 Add alerts endpoint to health-metrics controller: `GET /api/v1/admin/alerts`
  - [ ] 3.3 Add alert dismissal endpoint: `POST /api/v1/admin/alerts/:id/dismiss`

- [ ] Task 4: Metrics Reports API (AC: #3)
  - [ ] 4.1 Create `apps/api/src/modules/admin/reports.service.ts` — enqueue report generation, list reports, get download URL
  - [ ] 4.2 Create `apps/api/src/modules/admin/reports.controller.ts` — `POST /api/v1/admin/reports` (create), `GET /api/v1/admin/reports` (list), `GET /api/v1/admin/reports/:id/download` (download)
  - [ ] 4.3 Create `apps/api/src/modules/admin/reports.processor.ts` — BullMQ processor that generates CSV/JSON from Prisma data, stores in filesystem

- [ ] Task 5: Backend Tests (AC: #1, #2, #3, #4)
  - [ ] 5.1 Create `health-metrics.service.spec.ts` — 10+ tests: aggregation queries, caching behavior, domain distribution, retention calculation, feedback turnaround
  - [ ] 5.2 Create `health-metrics.controller.spec.ts` — 5 tests: auth guard, ability guard, response format, error handling
  - [ ] 5.3 Create `alerts.service.spec.ts` — 6 tests: threshold detection, alert creation, dismissal, no false positives
  - [ ] 5.4 Create `reports.service.spec.ts` — 5 tests: report enqueueing, listing, download, cleanup
  - [ ] 5.5 Create `reports.controller.spec.ts` — 5 tests: auth, validation, pagination, format options

- [ ] Task 6: Frontend — Health Metrics Dashboard (AC: #1, #2, #5)
  - [ ] 6.1 Create `apps/web/components/features/admin/health-metrics/metric-card.tsx` — progressive disclosure card with summary, trend chart, editorial context
  - [ ] 6.2 Create `apps/web/components/features/admin/health-metrics/domain-distribution-chart.tsx` — Recharts PieChart/BarChart for domain balance
  - [ ] 6.3 Create `apps/web/components/features/admin/health-metrics/retention-chart.tsx` — Recharts AreaChart for cohort retention trends
  - [ ] 6.4 Create `apps/web/components/features/admin/health-metrics/alert-banner.tsx` — priority notification banner for threshold breaches
  - [ ] 6.5 Create `apps/web/components/features/admin/health-metrics/kpi-grid.tsx` — grid layout for all leading/lagging KPIs
  - [ ] 6.6 Create `apps/web/hooks/use-health-metrics.ts` — TanStack Query hook for health metrics with 5-min stale time
  - [ ] 6.7 Create `apps/web/hooks/use-alerts.ts` — TanStack Query hook for system alerts with 30s refetch interval
  - [ ] 6.8 Implement `apps/web/app/(admin)/admin/page.tsx` — compose all health metric components
  - [ ] 6.9 Create `apps/web/app/(admin)/admin/loading.tsx` — skeleton loader

- [ ] Task 7: Frontend — Reports Page (AC: #3, #5)
  - [ ] 7.1 Create `apps/web/components/features/admin/reports/report-config-form.tsx` — date range, KPI selection, format picker
  - [ ] 7.2 Create `apps/web/components/features/admin/reports/reports-list.tsx` — list of generated reports with status and download
  - [ ] 7.3 Create `apps/web/hooks/use-reports.ts` — TanStack Query hooks for report CRUD
  - [ ] 7.4 Implement `apps/web/app/(admin)/admin/reports/page.tsx` — compose report components
  - [ ] 7.5 Create `apps/web/app/(admin)/admin/reports/loading.tsx` — skeleton loader

- [ ] Task 8: Admin Layout Update (AC: #1, #3)
  - [ ] 8.1 Update `apps/web/app/(admin)/layout.tsx` — add "Dashboard" and "Reports" nav items to `ADMIN_NAV_ITEMS`

## Dev Notes

### Architecture & Module Structure

**NEW module**: `apps/api/src/modules/admin/` — the admin module does NOT exist yet. Create it from scratch.

```
apps/api/src/modules/admin/
├── admin.module.ts                    # NEW — register all controllers, services, BullMQ queue
├── health-metrics.controller.ts       # NEW — GET /api/v1/admin/health-metrics, GET /api/v1/admin/alerts
├── health-metrics.controller.spec.ts  # NEW
├── health-metrics.service.ts          # NEW — aggregation queries + Redis caching
├── health-metrics.service.spec.ts     # NEW
├── alerts.service.ts                  # NEW — threshold monitoring + alert state
├── alerts.service.spec.ts             # NEW
├── reports.controller.ts             # NEW — report CRUD endpoints
├── reports.controller.spec.ts        # NEW
├── reports.service.ts                # NEW — report generation orchestration
├── reports.service.spec.ts           # NEW
└── reports.processor.ts              # NEW — BullMQ processor for async report generation
```

**Frontend new components** (new admin features directory):

```
apps/web/components/features/admin/
├── health-metrics/
│   ├── metric-card.tsx                # NEW — progressive disclosure metric card
│   ├── domain-distribution-chart.tsx  # NEW — domain balance visualization
│   ├── retention-chart.tsx            # NEW — retention trend AreaChart
│   ├── alert-banner.tsx               # NEW — system health alert banner
│   └── kpi-grid.tsx                   # NEW — leading/lagging KPI grid
└── reports/
    ├── report-config-form.tsx         # NEW — report configuration form
    └── reports-list.tsx               # NEW — generated reports list
```

**Pages** (modify existing blank pages):

```
apps/web/app/(admin)/
├── admin/
│   ├── page.tsx                       # MODIFY — implement health metrics dashboard (currently blank)
│   ├── loading.tsx                    # NEW — skeleton loader
│   └── reports/
│       ├── page.tsx                   # NEW — reports page (may already exist blank)
│       └── loading.tsx                # NEW — skeleton loader
├── layout.tsx                         # MODIFY — add Dashboard + Reports nav items
```

**New hooks**:

```
apps/web/hooks/
├── use-health-metrics.ts              # NEW — health metrics query hook
├── use-alerts.ts                      # NEW — system alerts query hook
└── use-reports.ts                     # NEW — reports CRUD hooks
```

### Admin Controller Pattern — CRITICAL

Follow the existing `ScoringAdminController` pattern exactly:

```typescript
@Controller({ path: 'admin/health', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class HealthMetricsController {
  @Get('metrics')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getHealthMetrics(@Req() req: RequestWithUser) {
    const metrics = await this.healthMetricsService.getHealthMetrics();
    return createSuccessResponse(metrics, req.correlationId);
  }
}
```

Key patterns:

- `@UseGuards(JwtAuthGuard, AbilityGuard)` at controller level
- `@CheckAbility((ability) => ability.can(Action.Manage, 'all'))` on each endpoint
- `@Req() req: RequestWithUser` to access `correlationId` and user
- Return `createSuccessResponse(data, req.correlationId)` or with pagination

### Health Metrics Aggregation — Service Design

The `HealthMetricsService` queries Prisma for community vitals and caches in Redis with 5-minute TTL:

```typescript
@Injectable()
export class HealthMetricsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService, // or inject CACHE_MANAGER
  ) {}

  async getHealthMetrics(): Promise<HealthMetrics> {
    const cached = await this.redis.get('admin:health-metrics');
    if (cached) return JSON.parse(cached);

    const metrics = await this.aggregateMetrics();
    await this.redis.set('admin:health-metrics', JSON.stringify(metrics), 'EX', 300);
    return metrics;
  }
}
```

**Aggregation queries** (all from Prisma — no new tables needed):

| Metric                     | Query                                                                        |
| -------------------------- | ---------------------------------------------------------------------------- |
| Active contributors        | `COUNT WHERE isActive = true` on `Contributor`                               |
| Active trend               | Compare current count vs 30 days ago using `createdAt`                       |
| Retention (30-day)         | Contributors active in last 30 days / contributors who joined 30-60 days ago |
| Domain distribution        | `GROUP BY domain` on `Contributor WHERE isActive = true`                     |
| Feedback turnaround        | `AVG(submittedAt - createdAt)` on `PeerFeedback WHERE status = COMPLETED`    |
| Contribution frequency     | `COUNT` on `Contribution` per active contributor in last 7 days              |
| Evaluation completion rate | `COUNT by status` on `Evaluation`                                            |
| Publication rate           | `COUNT WHERE status = PUBLISHED` on `Article` in last 30 days                |
| Average AI eval score      | `AVG(compositeScore)` on `Evaluation WHERE status = COMPLETED`               |

**Leading KPIs** (from PRD Success Criteria):

- Application rate (applications/week)
- 30-day contributor retention (>50% target)
- Contribution frequency (>2/week per contributor)
- Cross-domain engagement (>30% cross-domain)
- Referral rate — not trackable in current schema, show as N/A
- Publication submission rate (submissions/week)
- Editorial turnaround (days from submission to decision)

**Lagging KPIs** (from PRD Success Criteria):

- Active contributor count (target: 20 Phase 1)
- Quarterly retention (>40% QoQ)
- Contribution quality trend (avg AI scores over time)
- Publication external reach — not trackable, show as N/A
- Author-to-Editor conversion (% who become Editor)

### Editorial Context Generation

Each metric card should include a computed editorial interpretation. Logic:

```typescript
function generateEditorialContext(metric: string, value: number, target: number): string {
  const ratio = value / target;
  if (ratio >= 1.2) return `${metric} is exceeding target by ${Math.round((ratio - 1) * 100)}%`;
  if (ratio >= 0.8) return `${metric} is on track — ${value} vs ${target} target`;
  return `${metric} needs attention — ${value} is ${Math.round((1 - ratio) * 100)}% below target`;
}
```

For domain distribution specifically: flag if any domain has <10% or >50% of contributors.

### System Alerts Design

Alerts are computed on-demand (no separate alert table needed at Phase 1). The `AlertsService` checks:

1. **API error rate** — query recent request logs or use in-memory counter. For Phase 1, use an approximation: count `Evaluation` records with status=FAILED in last hour vs total.
2. **Ingestion pipeline** — check BullMQ `github-ingestion` queue for failed jobs count.
3. **Evaluation throughput** — compare evaluations completed this hour vs hourly average.
4. **Database query p95** — use Prisma query timing if available, or skip for Phase 1 (requires OpenTelemetry metrics integration).

Alert response shape:

```typescript
interface SystemAlert {
  id: string; // Generated deterministic ID from type + timestamp bucket
  type: 'API_ERROR_RATE' | 'INGESTION_FAILURE' | 'EVALUATION_THROUGHPUT' | 'DB_LATENCY';
  severity: 'WARNING' | 'CRITICAL';
  threshold: number; // e.g., 1 for 1% error rate
  currentValue: number; // e.g., 2.5 for 2.5% error rate
  message: string; // Human-readable description
  occurredAt: string; // ISO timestamp
  dismissed: boolean;
}
```

Alert dismissal: store dismissed alert IDs in Redis with 24-hour TTL (no DB table needed).

### BullMQ Reports Queue

Register a new `admin-reports` queue in the admin module:

```typescript
BullModule.registerQueue({
  name: 'admin-reports',
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 30 * 24 * 60 * 60 }, // 30 days
    removeOnFail: false,
  },
});
```

The `ReportsProcessor` processes jobs:

1. Read job data (date range, selected KPIs, format)
2. Query Prisma for each selected KPI in date range
3. Format as CSV or JSON
4. Write to filesystem (`data/reports/{reportId}.{csv|json}`)
5. Update job status to completed

Reports are served via `GET /api/v1/admin/reports/:id/download` which reads from the filesystem.

**Report storage directory**: `apps/api/data/reports/` — ensure `.gitignore` excludes this.

### Prisma Schema — NO New Models Needed

All metrics are computed from existing tables:

- `Contributor` — active count, domain distribution, retention
- `Application` — application rate
- `Contribution` — contribution frequency
- `Evaluation` — eval rate, quality trends
- `PeerFeedback` — feedback turnaround
- `Article` — publication metrics
- `TemporalScoreAggregate` — score trends
- `AuditLog` — existing audit entries

For reports, store metadata in BullMQ job data (no separate reports table needed). BullMQ retains completed jobs for 30 days per the queue config.

### Redis Caching Strategy

| Cache Key                         | TTL          | Content                         |
| --------------------------------- | ------------ | ------------------------------- |
| `admin:health-metrics`            | 300s (5 min) | Full health metrics aggregation |
| `admin:alert:dismissed:{alertId}` | 86400s (24h) | Dismissed alert flag            |

Use the existing `RedisService` or `CACHE_MANAGER` pattern from the codebase. Check what Redis client is available — the codebase uses `ioredis` via BullMQ, likely also for direct cache operations.

### Frontend Recharts Patterns

Follow established Edin chart conventions (from stories 9-2, 9-3):

- `ResponsiveContainer` with percentage width, fixed height (200-250px for metric cards)
- Gradient via `<defs><linearGradient>` with `#C4956A` brand accent
- Axis styling: `tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}`, `axisLine={false}`, `tickLine={false}`
- Custom tooltip: `background: 'var(--color-surface-raised)'`, `border: '1px solid var(--color-surface-border)'`
- `'use client'` directive required for all Recharts components
- `useId()` for gradient IDs to avoid SSR hydration mismatches
- `role="img"` and `aria-label` on chart containers
- `sr-only` data table fallback for screen readers

### Progressive Disclosure Pattern

Use native HTML `<details>/<summary>` elements — same pattern as `GlossarySection` and `FormulaBreakdown` from rewards:

```tsx
<div className="rounded-lg border border-surface-border bg-surface-raised p-md">
  <div className="flex items-center justify-between">
    <h3 className="font-serif text-lg font-bold">{metric.label}</h3>
    <span className="text-3xl font-bold text-brand-primary">{metric.value}</span>
  </div>
  <p className="mt-xs text-sm text-brand-secondary">{metric.editorialContext}</p>
  <details className="mt-md">
    <summary className="cursor-pointer text-sm font-medium text-brand-accent">
      View trend & breakdown
    </summary>
    <div className="mt-sm">{/* Recharts chart + detailed breakdown */}</div>
  </details>
</div>
```

### Admin Layout Navigation Update

Add two new nav items to `ADMIN_NAV_ITEMS` in `apps/web/app/(admin)/layout.tsx`:

```typescript
const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' }, // NEW — first position
  { href: '/admin/admission', label: 'Admission' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/evaluations/models', label: 'Evaluations' },
  { href: '/admin/evaluations/review-queue', label: 'Review Queue' },
  { href: '/admin/publication/moderation', label: 'Moderation' },
  { href: '/admin/reports', label: 'Reports' }, // NEW
  { href: '/admin/settings', label: 'Settings' },
];
```

For the "Dashboard" link, use exact match (`pathname === item.href`) instead of `startsWith` since `/admin` is a prefix of all admin routes. Add `exact?: boolean` flag to nav items.

### TanStack Query Hook Pattern

Follow existing hook patterns (e.g., `use-scores.ts`, `use-platform-metrics.ts`):

```typescript
// use-health-metrics.ts
export function useHealthMetrics() {
  return useQuery<HealthMetrics>({
    queryKey: ['admin', 'health-metrics'],
    staleTime: 5 * 60 * 1000, // 5 minutes — matches Redis TTL
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/health/metrics');
      return response.data;
    },
  });
}

// use-alerts.ts
export function useAlerts() {
  return useQuery<SystemAlert[]>({
    queryKey: ['admin', 'alerts'],
    refetchInterval: 30_000, // Poll every 30 seconds for near-real-time alerts
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/admin/alerts');
      return response.data;
    },
  });
}
```

### API Client Usage

Use `apiClient` from `apps/web/lib/api-client.ts` for authenticated admin requests — it handles JWT token refresh automatically. The admin hooks should use the same fetch pattern as other hooks.

### Existing Code to Reuse (DO NOT Reinvent)

- **Guard pattern**: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility` from `ScoringAdminController`
- **Response wrapper**: `createSuccessResponse(data, correlationId, pagination?)` from `common/types/api-response.type.ts`
- **Cursor pagination**: Base64url cursor encoding pattern from existing controllers
- **BullMQ registration**: Queue config pattern from `reward.module.ts`
- **Recharts conventions**: Chart styling from `trajectory-chart.tsx` and `score-distribution-chart.tsx`
- **Admin layout**: Existing `(admin)/layout.tsx` with role check
- **Redis service**: Existing Redis connection from `RedisModule`
- **Error handling**: `DomainException` with `ERROR_CODES` from `@edin/shared`
- **Prisma queries**: Use existing `PrismaService` — do not create a new database connection
- **apiClient**: `apps/web/lib/api-client.ts` for authenticated requests

### Critical Patterns to Follow

1. **Auth on ALL endpoints**: `@UseGuards(JwtAuthGuard, AbilityGuard)` — this is admin-only
2. **Ability check**: `@CheckAbility((ability) => ability.can(Action.Manage, 'all'))` on every method
3. **Redis caching**: 5-minute TTL for health metrics aggregation (NFR-O3 <5min lag)
4. **No new DB tables**: All metrics computed from existing Prisma models
5. **BullMQ for reports only**: Metrics dashboard is sync (cached), only report generation is async
6. **Frontend `'use client'`**: Required for Recharts and interactive components
7. **Progressive disclosure**: `<details>/<summary>` for expandable metric cards
8. **Keyboard navigation**: Tab-navigable metric cards and report form
9. **Screen reader**: `role="img"` + `aria-label` on charts, `aria-describedby` on form inputs
10. **Prisma decimals**: Pass plain numbers, NOT `Decimal` class (lesson from 8-5, 9-1, 9-2)
11. **Mock PrismaService**: In tests, mock with `{ provide: PrismaService, useValue: mockPrisma }` using `any` type
12. **Admin page routing**: `/admin` page is the dashboard (not `/admin/dashboard`) per architecture spec

### Testing Standards

- **Vitest** with NestJS Test module
- Mock PrismaService, RedisService, BullMQ Queue
- Test health metrics aggregation with known data → expected results
- Test caching: first call queries Prisma, second call returns cached
- Test alert thresholds: values above/below thresholds produce correct alerts
- Test report enqueueing: correct job data passed to BullMQ
- Test auth guards reject non-admin users
- Test controller response format matches API envelope
- Target: ~30 backend tests total (10 health metrics service, 5 health metrics controller, 6 alerts, 5 reports service, 5 reports controller)

### Previous Story (9-3) Learnings

- MethodologyController registered FIRST in reward module (static routes first pattern) — same for admin controllers
- Full test suite: 953/953 passing — maintain zero regressions
- Prisma decimals: pass plain numbers, NOT Decimal class
- mockPrisma type: use `any` to resolve Mock type assignability
- `useId()` for Recharts gradient IDs prevents SSR hydration mismatch
- DomainException with ERROR_CODES for all error handling

### Project Structure Notes

- New admin module at `apps/api/src/modules/admin/` — not in existing module
- Frontend components in `apps/web/components/features/admin/health-metrics/` — new directory under features
- Admin pages at `apps/web/app/(admin)/admin/` — uses existing admin route group
- Hooks in `apps/web/hooks/` — new files alongside existing hooks
- Shared types in new `packages/shared/src/types/admin.types.ts` — new type file
- Shared constants in new `packages/shared/src/constants/kpi-definitions.ts` — new constants file
- Report data stored at `apps/api/data/reports/` — new directory, gitignored

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 10, Story 10.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR48 — health metrics dashboard with community vitals]
- [Source: _bmad-output/planning-artifacts/prd.md#FR51 — metrics reports export]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-O1 — alerting within 60s of threshold breach]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-O3 — KPI dashboard <5min lag, quarterly reporting]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-P2 — TTI <3s]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-A3 — keyboard navigable]
- [Source: _bmad-output/planning-artifacts/prd.md#Success Criteria — leading and lagging KPIs]
- [Source: _bmad-output/planning-artifacts/architecture.md#Admin Operations (FR48-FR52b) → modules/admin/]
- [Source: _bmad-output/planning-artifacts/architecture.md#(admin)/admin/page.tsx — Health metrics dashboard]
- [Source: _bmad-output/planning-artifacts/architecture.md#Recharts for admin health metrics]
- [Source: _bmad-output/planning-artifacts/architecture.md#BullMQ for async processing]
- [Source: _bmad-output/planning-artifacts/architecture.md#Redis for caching]
- [Source: apps/api/src/modules/reward/scoring-admin.controller.ts — admin controller pattern with guards]
- [Source: apps/api/src/modules/reward/reward.module.ts — BullMQ queue registration pattern]
- [Source: apps/web/app/(admin)/layout.tsx — admin layout with nav items]
- [Source: apps/api/src/common/types/api-response.type.ts — response wrapper]
- [Source: _bmad-output/implementation-artifacts/9-3-reward-methodology-explanation.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
