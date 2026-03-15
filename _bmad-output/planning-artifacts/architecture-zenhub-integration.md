---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-15'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-zenhub-integration.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/zenhub-edin-integration-proposal.md
  - _bmad-output/planning-artifacts/research/technical-github-zenhub-project-management-research-2026-03-13.md
  - _bmad-output/planning-artifacts/prd.md
  - docs/edin_platform_description.md
workflowType: 'architecture'
project_name: 'Edin Zenhub Integration'
user_name: 'Fabrice'
date: '2026-03-15'
---

# Architecture Decision Document — Edin Zenhub Integration

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

_References core architecture: `_bmad-output/planning-artifacts/architecture.md`_

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

53 FRs across 10 categories, with clear MVP/Phase 2 phase annotations:

| Category                     | FR Count      | Phase                         | Architectural Implication                                                            |
| ---------------------------- | ------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| Zenhub Data Ingestion        | 7 (FR1-FR7)   | MVP                           | Webhook receiver endpoint, API polling service, rate limiting, idempotent processing |
| Sprint Metrics & Storage     | 8 (FR8-FR15)  | MVP                           | New Prisma models, metric calculation services, pipeline transition tracking         |
| Contribution Enrichment      | 4 (FR16-FR19) | MVP                           | Extension of existing Contribution model, planning reliability computation           |
| Sprint Dashboard             | 9 (FR20-FR28) | MVP                           | New admin routes, chart components, data filtering, export capability                |
| Integration Configuration    | 8 (FR29-FR36) | MVP                           | Admin UI for credentials, webhook config, polling config, monitoring                 |
| Permissions & Access Control | 3 (FR37-FR39) | MVP                           | Extension of existing CASL with new sprint-related subjects                          |
| Task Sync                    | 5 (FR40-FR44) | Phase 2                       | Bidirectional sync engine, conflict resolution, status mapping                       |
| Evaluation Engine Extension  | 4 (FR45-FR48) | Phase 2                       | Planning context injection into AI prompts, graceful degradation                     |
| Activity & Notifications     | 2 (FR49-FR50) | Phase 2                       | Sprint events in existing activity feed and notification system                      |
| Audit & Compliance           | 3 (FR51-FR53) | MVP (FR51-52), Phase 2 (FR53) | Sync event logging, 7-year data retention, evaluation audit trail                    |

**Non-Functional Requirements:**

25 NFRs across 7 categories driving architectural decisions:

- **Performance (NFR-P1-P7):** Webhook acknowledgment <500ms, dashboard load <2s for 12 months data, burndown render <500ms, polling cycle <60s, enrichment <30s, metric calculation <5s
- **Security (NFR-S1-S6):** Encrypted API tokens, HMAC webhook verification, role-based permission enforcement, encryption at rest/transit, webhook secret rotation, admin action audit logging
- **Scalability (NFR-SC1-SC4):** 100 events/minute burst handling, 100 contributors across 52 sprints/year, multi-workspace support, 5 years historical data
- **Reliability (NFR-R1-R5):** 99.9% webhook success rate with retry (3 retries: 1m/5m/15m), auto-recovery from API failures, cached data fallback after 1hr outage, idempotent calculations, graceful degradation
- **Accessibility (NFR-A1-A4):** WCAG 2.1 AA, accessible chart alternatives, color-independent status indicators, keyboard navigation
- **Integration (NFR-I1-I4):** API versioning tolerance, zero GitHub pipeline degradation, data persistence beyond Zenhub dependency, configurable event filtering
- **Observability (NFR-O1-O3):** Structured JSON logs with correlation IDs, operational metrics exposure, admin health panel

**Scale & Complexity:**

- Primary domain: Backend integration extending existing full-stack web application (fintech)
- Complexity level: High (external API dependency, dual-path data ingestion, bidirectional sync, evaluation engine extension, compliance requirements)
- Estimated new architectural components: 6 (webhook receiver, polling service, sprint metrics service, contribution enrichment extension, sprint dashboard, sync engine)

### Technical Constraints & Dependencies

- **Zenhub GraphQL API dependency** — External API with rate limits; dual-path ingestion (webhooks + polling) provides redundancy; API deprecation must be handled gracefully
- **Existing GitHub webhook pipeline** — Must not be degraded by Zenhub integration; contribution enrichment is additive, not disruptive
- **Existing evaluation engine** — Phase 2 extension must support graceful degradation; evaluation continues without planning context if Zenhub data is unavailable
- **Existing CASL permission model** — Sprint data subjects extend existing role-based access; no new roles, only new subjects and actions
- **Existing BullMQ infrastructure** — New polling queue must coexist with existing queues without resource contention
- **Existing Prisma schema** — New models must be backward-compatible; migrations must not break existing data
- **MiCA/GDPR regulatory context** — Sprint data influences token rewards; planning metrics are contributor performance data requiring GDPR consent; 7-year audit retention

### Cross-Cutting Concerns Identified

1. **Dual-Path Data Ingestion** — Webhooks provide real-time events; API polling provides aggregate data webhooks don't carry (velocity, historical sprints). Both paths must produce consistent data. Polling serves as fallback when webhooks fail.
2. **Contribution Model Extension** — Adding sprint context to existing contributions affects queries, indexes, and the evaluation pipeline. Must be backward-compatible (contributions without sprint context remain valid).
3. **Sync Consistency** — Phase 2 bidirectional sync requires conflict resolution strategy. Zenhub is source of truth for sprint data; Edin is source of truth for contributor-facing task assignment.
4. **Evaluation Pipeline Extension** — Phase 2 adds planning context to AI prompts. Must be additive (evaluation works without it) and auditable (how sprint data influenced scores must be traceable).
5. **Dashboard Performance** — Sprint metrics involve aggregation over time-series data (velocity, burndown, cycle time). Must remain performant with 5 years of historical data through proper indexing and pagination.
6. **Observability Integration** — All new components (webhook receiver, polling service, sync engine) must emit structured logs with correlation IDs, following existing OpenTelemetry + Pino patterns.

## Starter Template Evaluation

### Inherited Technology Stack

This is a brownfield feature extension to the existing Edin platform. All technology decisions are inherited from the core architecture (`architecture.md`):

| Component     | Choice                  | Inherited From    |
| ------------- | ----------------------- | ----------------- |
| Monorepo      | Turborepo + pnpm        | Core architecture |
| Frontend      | Next.js 16 (App Router) | Core architecture |
| Backend       | NestJS 11               | Core architecture |
| ORM           | Prisma 7.x              | Core architecture |
| Database      | PostgreSQL 16+          | Core architecture |
| Cache/Queue   | Redis 7.x + BullMQ      | Core architecture |
| Charts        | Recharts                | Core architecture |
| Permissions   | CASL                    | Core architecture |
| Styling       | Tailwind CSS 4.x        | Core architecture |
| Testing       | Vitest + Playwright     | Core architecture |
| Observability | OpenTelemetry + Pino    | Core architecture |

No new technology selections are required. The Zenhub integration adds new modules, models, and endpoints using the existing stack and patterns.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Schema placement: New `sprint` schema (domain-separated, following existing pattern)
- Module structure: Two modules — `zenhub` (integration plumbing) + `sprint` (domain logic)
- Contribution enrichment: Separate join table `sprint.contribution_sprint_context`
- Data ingestion boundaries: Webhooks for real-time events, polling for aggregates, polling reconciles gaps
- Metric calculation: Hybrid pre-computed with on-demand recalculation fallback

**Important Decisions (Shape Architecture):**

- Event naming: `zenhub.*` and `sprint.*` event families following existing dot.case convention
- CASL subjects: `SprintMetric`, `SprintDashboard` with role-based access
- Dashboard API: REST under `/api/v1/sprints/` with chart-ready response format
- Webhook secret rotation: Dual-secret verification during transition window

**Deferred Decisions (Phase 2):**

- Bidirectional sync conflict resolution strategy (Zenhub = sprint truth, Edin = task truth)
- Evaluation engine planning context injection (feature-flagged, graceful degradation)
- Task status mapping configuration (database-stored, not hardcoded)

### Data Architecture

**Schema Design:**

- Decision: New `sprint` schema in PostgreSQL, following domain-separation pattern
- Models: `sprint.sprint_metrics`, `sprint.zenhub_syncs`, `sprint.pipeline_transitions`, `sprint.contribution_sprint_context`
- Rationale: Clean bounded context. Sprint is a distinct domain from core contributor/contribution data. Foreign keys cross schemas where needed (contribution_id, contributor_id)

**Contribution Enrichment:**

- Decision: Separate join table `sprint.contribution_sprint_context`
- Columns: `id`, `contribution_id` (FK → core.contributions), `sprint_id`, `story_points`, `zenhub_issue_id`, `epic_id`, `pipeline_status`, `created_at`, `updated_at`
- Rationale: Core contributions table remains untouched. Integration-specific data is isolated. Safely reversible if integration is removed. Join required for enriched queries but keeps concerns separated

**Sprint Metrics Storage:**

- Decision: Pre-computed metrics with raw event data retained for recalculation
- `sprint.sprint_metrics`: velocity, burndown_data (JSONB), cycle_time_avg, lead_time_avg, scope_changes, estimation_accuracy, committed_points, delivered_points, sprint_start, sprint_end
- `sprint.pipeline_transitions`: issue_id, from_pipeline, to_pipeline, transitioned_at, contributor_id — raw event log for recalculation
- Rationale: Fast dashboard reads (NFR-P2 <2s). Raw data enables idempotent recalculation (NFR-R4). Admin backfill (FR7) triggers recalculation from raw events

**Sync State:**

- `sprint.zenhub_syncs`: sync_type (webhook/poll), status, event_type, payload (JSONB), received_at, processed_at, error_message, retry_count, correlation_id
- Serves as audit log (FR51) and monitoring source (FR33-FR34)

### Security

**Webhook Verification:**

- Decision: HMAC-SHA256 signature verification on all incoming Zenhub webhooks, following existing GitHub webhook pattern
- Unsigned or invalid payloads rejected with HTTP 401 and logged
- Rationale: Prevents spoofed events from manipulating sprint data and downstream evaluation scores

**Secret Rotation:**

- Decision: Dual-secret verification during rotation window (NFR-S5)
- Implementation: Store current and previous webhook secrets. Accept either during configurable transition window (default: 24 hours). After window expires, previous secret is revoked
- Rationale: Zero-downtime rotation without missing webhook events

**Permissions:**

- Decision: Two new CASL subjects extending existing permission model
- `SprintMetric`: admin (CRUD), project_lead (read all), contributor (read own)
- `SprintDashboard`: admin (full), project_lead (read), contributor (none)
- `IntegrationConfig` (existing subject pattern): admin only for Zenhub configuration
- Rationale: No new roles needed. New subjects follow existing CASL patterns exactly

### API & Communication Patterns

**Zenhub Webhook Endpoint:**

- Decision: `POST /api/v1/webhooks/zenhub` — new controller in `zenhub` module
- Pattern: Mirror existing GitHub webhook handler — controller validates signature, routes by event type, delegates to service, returns 200 immediately, processes asynchronously via EventEmitter2
- Rationale: Proven pattern, consistent codebase

**Zenhub API Polling:**

- Decision: New BullMQ queue `zenhub-polling` with scheduled repeatable job
- Default interval: 15 minutes (configurable via admin, FR31)
- Polling job queries Zenhub GraphQL API for sprint, velocity, and issue data
- Handles pagination for large datasets, respects rate limit headers
- Rationale: BullMQ repeatable jobs provide reliable scheduling with built-in retry. Coexists with existing queues without contention

**Sprint Dashboard API:**

- Decision: REST endpoints under `/api/v1/sprints/`
- Endpoints: `/velocity` (chart data), `/burndown/:sprintId` (chart data), `/metrics` (aggregated), `/contributors/:id/metrics` (personal), `/export` (report generation)
- Response format: Chart-ready arrays (`[{x: date, y: points}]`) to minimize frontend transformation
- Pagination: Cursor-based for historical sprint lists, consistent with existing API patterns
- Rationale: REST with chart-ready responses keeps frontend simple. No GraphQL needed for this read-heavy, well-defined data

**Internal Events:**

- Decision: EventEmitter2 events following existing naming convention
- Zenhub events: `zenhub.webhook.received`, `zenhub.webhook.processed`, `zenhub.poll.completed`, `zenhub.poll.failed`
- Sprint events: `sprint.started`, `sprint.closed`, `sprint.velocity.calculated`, `sprint.contribution.enriched`, `sprint.scope.changed`
- Rationale: `zenhub` module emits integration events, `sprint` module listens and processes domain logic. Same loose coupling pattern as `github` → `evaluation`

### Frontend Architecture

**Sprint Dashboard Pages:**

- Decision: New admin routes under `app/(admin)/admin/sprints/`
- Pages: `/sprints` (overview + velocity), `/sprints/[sprintId]` (burndown + detail), `/sprints/contributors` (per-contributor metrics)
- Contributor personal view: `app/(dashboard)/dashboard/sprint-metrics/page.tsx`
- Rationale: Follows existing route group pattern. Admin pages in `(admin)`, contributor views in `(dashboard)`

**Chart Components:**

- Decision: Recharts components in `components/features/sprint-dashboard/`
- Components: `VelocityChart`, `BurndownChart`, `CycleTimeChart`, `EstimationAccuracyChart`
- Each chart includes accessible data table alternative (NFR-A2) toggled by a "View as table" button
- Rationale: Recharts already in stack. Feature-based co-location follows existing patterns

**Data Fetching:**

- Decision: TanStack Query hooks in `hooks/use-sprint-metrics.ts`
- Stale time: 5 minutes for dashboard data (sprint metrics don't change rapidly)
- Rationale: Consistent with existing data fetching patterns. Background refetch keeps dashboard reasonably fresh without excessive polling

### Infrastructure & Deployment

**No new infrastructure required.** The Zenhub integration uses existing PostgreSQL, Redis, and BullMQ infrastructure. New Prisma migrations add the `sprint` schema. New BullMQ queue (`zenhub-polling`) runs alongside existing queues.

**Environment Variables (new):**

- `ZENHUB_API_TOKEN` — encrypted, never in client-side code or logs
- `ZENHUB_WEBHOOK_SECRET` — for HMAC verification
- `ZENHUB_WEBHOOK_SECRET_PREVIOUS` — for dual-secret rotation
- `ZENHUB_POLLING_INTERVAL_MS` — default 900000 (15 minutes)
- `ZENHUB_WORKSPACE_ID` — mapped to Edin working groups

**Observability:**

- All new services instrumented with OpenTelemetry (auto-instrumentation covers HTTP, Prisma, BullMQ)
- Pino structured logging with correlation IDs on all webhook/polling operations
- New operational metrics: webhook success rate, polling duration, sync lag, queue depth (NFR-O2)

### Decision Impact Analysis

**Implementation Sequence:**

1. Prisma schema: `sprint` schema with all models + migration
2. `zenhub` module: webhook receiver (controller, service, HMAC guard)
3. `zenhub` module: API polling service (BullMQ queue, GraphQL client)
4. `sprint` module: metric calculation service (velocity, burndown, cycle time)
5. `sprint` module: contribution enrichment service (join table population)
6. CASL: new subjects (`SprintMetric`, `SprintDashboard`)
7. Admin API: sprint dashboard REST endpoints
8. Admin frontend: sprint dashboard pages with Recharts
9. Admin frontend: integration configuration UI
10. Contributor frontend: personal sprint metrics view

**Cross-Component Dependencies:**

- Prisma migration (step 1) must complete before any module work
- `zenhub` module (steps 2-3) must be functional before `sprint` module (steps 4-5) can receive data
- CASL subjects (step 6) must be defined before API endpoints (step 7) can enforce permissions
- API endpoints (step 7) must exist before frontend (steps 8-10) can consume data

## Implementation Patterns & Consistency Rules

### Inherited Patterns

All patterns from the core architecture document apply without modification:

- Database naming (snake_case tables, PascalCase Prisma models, `@@map`)
- API naming (kebab-case endpoints, camelCase body, cursor-based pagination)
- Code naming (kebab-case files, PascalCase classes, camelCase functions)
- Module structure (one module per domain, co-located tests)
- API response envelope (`{ data, meta }` / `{ error }`)
- Event naming (`{domain}.{entity}.{action}` dot.case)
- Error handling (DomainException, global filter, standard envelope)
- Logging (Pino, correlation IDs, no PII at info+)

See `architecture.md` → "Implementation Patterns & Consistency Rules" for full reference.

### Zenhub Integration-Specific Patterns

**Webhook Processing Pattern:**

```typescript
// zenhub.controller.ts — follow GitHub webhook handler pattern exactly
@Post('webhooks/zenhub')
async handleWebhook(
  @Headers('x-zenhub-signature') signature: string,
  @Body() payload: ZenhubWebhookPayload,
  @Req() req: Request,
): Promise<void> {
  // 1. Verify HMAC signature (guard or inline)
  // 2. Check idempotency key (event ID) against zenhub_syncs
  // 3. Log receipt to zenhub_syncs with correlation ID
  // 4. Return 200 immediately
  // 5. Emit event asynchronously: zenhub.webhook.received
}
```

Rules:

- Always return 200 before processing (NFR-P1 <500ms)
- Always verify HMAC before any processing
- Always check idempotency before creating records
- Always log to `sprint.zenhub_syncs` before emitting events
- Never process inline — always emit event for async handling

**Polling Service Pattern:**

```typescript
// zenhub-polling.processor.ts
@Processor('zenhub-polling')
export class ZenhubPollingProcessor {
  @Process('sync-sprint-data')
  async handlePoll(job: Job): Promise<void> {
    // 1. Log poll start with correlation ID
    // 2. Query Zenhub GraphQL API with pagination
    // 3. Respect rate limit headers (Retry-After)
    // 4. Reconcile with existing data (upsert, not insert)
    // 5. Log to zenhub_syncs
    // 6. Emit zenhub.poll.completed event
  }
}
```

Rules:

- Always use upsert semantics — polling may re-fetch existing data
- Always respect rate limit headers — never retry immediately on 429
- Always paginate — never assume all data fits in one response
- Always log poll duration and record count for observability (NFR-O2)

**Sprint Metric Calculation Pattern:**

```typescript
// sprint-metrics.service.ts
async calculateVelocity(sprintId: string): Promise<SprintMetric> {
  // 1. Fetch raw pipeline_transitions for sprint
  // 2. Calculate metric from raw data
  // 3. Upsert into sprint_metrics (idempotent — NFR-R4)
  // 4. Emit sprint.velocity.calculated event
  // 5. Return calculated metric
}
```

Rules:

- All calculations must be idempotent — running twice produces the same result
- Always calculate from raw `pipeline_transitions`, never from other pre-computed metrics
- Always upsert, never insert — supports recalculation and backfill
- Always emit event after calculation for downstream consumers

**Contribution Enrichment Pattern:**

```typescript
// contribution-enrichment.service.ts
async enrichContribution(
  contributionId: string,
  sprintContext: SprintContext,
): Promise<ContributionSprintContext> {
  // 1. Verify contribution exists in core.contributions
  // 2. Upsert into sprint.contribution_sprint_context
  // 3. Emit sprint.contribution.enriched event
  // 4. Return enriched context
}
```

Rules:

- Never modify the `core.contributions` table — always use the join table
- Always verify the contribution exists before creating context
- Enrichment is optional — contributions without sprint context are valid
- Use upsert — the same contribution may be enriched multiple times as sprint data updates

**Dashboard Data Pattern:**

```typescript
// sprint-dashboard.controller.ts
@Get('sprints/velocity')
@CheckAbility({ action: 'read', subject: 'SprintDashboard' })
async getVelocityData(
  @Query() query: SprintDashboardQueryDto,
): Promise<ApiResponse<ChartDataPoint[]>> {
  // Return chart-ready data: [{x: sprintEndDate, y: deliveredPoints}]
}
```

Rules:

- Always return chart-ready arrays (`{x, y}` data points) — never raw database records
- Always enforce CASL permissions via `@CheckAbility` decorator
- Always support `?domain=` filter for cross-domain sprint views (FR25)
- Always include cursor-based pagination for historical queries

**Zenhub-Specific Error Codes:**

| Code                               | Usage                                     |
| ---------------------------------- | ----------------------------------------- |
| `ZENHUB_WEBHOOK_SIGNATURE_INVALID` | HMAC verification failed                  |
| `ZENHUB_WEBHOOK_DUPLICATE_EVENT`   | Idempotency check caught duplicate        |
| `ZENHUB_API_RATE_LIMITED`          | Polling hit rate limit, backing off       |
| `ZENHUB_API_UNREACHABLE`           | API connection failed                     |
| `SPRINT_METRIC_CALCULATION_FAILED` | Metric calculation error                  |
| `SPRINT_CONTRIBUTION_NOT_FOUND`    | Contribution ID not in core.contributions |
| `SPRINT_SYNC_CONFLICT`             | Phase 2: bidirectional sync conflict      |

Follow existing pattern: UPPER_SNAKE_CASE, domain-prefixed, extend `DomainException`.

**BullMQ Queue Naming:**

| Queue                | Job Names                                                      | Pattern                          |
| -------------------- | -------------------------------------------------------------- | -------------------------------- |
| `zenhub-polling`     | `syncSprintData`, `backfillHistoricalData`                     | camelCase jobs, kebab-case queue |
| `sprint-calculation` | `calculateVelocity`, `calculateBurndown`, `enrichContribution` | Same pattern as existing queues  |

### Enforcement Guidelines

**All AI Agents Implementing Zenhub Integration MUST:**

- Follow the webhook processing pattern exactly — return 200 before processing, verify HMAC, check idempotency
- Use upsert semantics for all sprint data writes — never assume data doesn't exist
- Calculate metrics from raw events only — never derive metrics from other metrics
- Never modify `core.contributions` table — use `sprint.contribution_sprint_context` join table
- Return chart-ready data from dashboard endpoints — never raw database records
- Use `zenhub.*` events for integration plumbing, `sprint.*` events for domain logic
- Follow all core architecture patterns without exception (see `architecture.md`)

## Project Structure & Boundaries

### New Files Added to Existing Structure

The Zenhub integration adds the following to the existing monorepo:

```
edin/
├── apps/
│   ├── api/src/
│   │   ├── modules/
│   │   │   ├── zenhub/                              # NEW — Integration plumbing
│   │   │   │   ├── zenhub.module.ts
│   │   │   │   ├── zenhub-webhook.controller.ts      # FR1-FR3: Webhook receiver
│   │   │   │   ├── zenhub-webhook.service.ts
│   │   │   │   ├── zenhub-webhook.guard.ts            # HMAC verification
│   │   │   │   ├── zenhub-polling.service.ts          # FR4-FR6: API polling
│   │   │   │   ├── zenhub-polling.processor.ts        # BullMQ processor
│   │   │   │   ├── zenhub-graphql.client.ts           # GraphQL API client
│   │   │   │   ├── zenhub-config.controller.ts        # FR29-FR32: Admin config
│   │   │   │   ├── zenhub-config.service.ts
│   │   │   │   ├── zenhub-sync-log.controller.ts      # FR33-FR36: Monitoring
│   │   │   │   ├── zenhub-sync-log.service.ts
│   │   │   │   ├── dto/
│   │   │   │   │   ├── zenhub-webhook-payload.dto.ts
│   │   │   │   │   ├── zenhub-config.dto.ts
│   │   │   │   │   ├── zenhub-sync-log-query.dto.ts
│   │   │   │   ├── zenhub-webhook.controller.spec.ts
│   │   │   │   ├── zenhub-webhook.service.spec.ts
│   │   │   │   ├── zenhub-polling.service.spec.ts
│   │   │   │   └── zenhub-polling.processor.spec.ts
│   │   │   │
│   │   │   ├── sprint/                               # NEW — Domain logic
│   │   │   │   ├── sprint.module.ts
│   │   │   │   ├── sprint-metrics.service.ts          # FR8-FR15: Metric calculations
│   │   │   │   ├── sprint-metrics.controller.ts       # FR20-FR27: Dashboard API
│   │   │   │   ├── sprint-enrichment.service.ts       # FR16-FR19: Contribution enrichment
│   │   │   │   ├── sprint-contributor.controller.ts   # FR28: Personal metrics
│   │   │   │   ├── sprint-export.service.ts           # FR27: Report export
│   │   │   │   ├── dto/
│   │   │   │   │   ├── sprint-dashboard-query.dto.ts
│   │   │   │   │   ├── sprint-metrics-response.dto.ts
│   │   │   │   │   ├── chart-data-point.dto.ts
│   │   │   │   │   ├── contributor-sprint-metrics.dto.ts
│   │   │   │   ├── sprint-metrics.service.spec.ts
│   │   │   │   ├── sprint-metrics.controller.spec.ts
│   │   │   │   ├── sprint-enrichment.service.spec.ts
│   │   │   │   └── sprint-contributor.controller.spec.ts
│   │   │   │
│   │   │   ├── auth/                                 # MODIFIED — extend CASL
│   │   │   │   └── casl/
│   │   │   │       └── sprint-abilities.ts            # FR37-FR39: New subjects
│   │   │
│   │   ├── config/
│   │   │   └── zenhub.config.ts                       # NEW — Zod-validated env vars
│   │
│   ├── web/
│   │   ├── app/
│   │   │   ├── (admin)/
│   │   │   │   └── admin/
│   │   │   │       └── sprints/                       # NEW — Admin sprint dashboard
│   │   │   │           ├── page.tsx                    # FR20: Velocity overview
│   │   │   │           ├── [sprintId]/
│   │   │   │           │   └── page.tsx               # FR21-FR23: Sprint detail
│   │   │   │           ├── contributors/
│   │   │   │           │   └── page.tsx               # FR24-FR26: Per-contributor
│   │   │   │           └── configuration/
│   │   │   │               └── page.tsx               # FR29-FR36: Integration config
│   │   │   ├── (dashboard)/
│   │   │   │   └── dashboard/
│   │   │   │       └── sprint-metrics/
│   │   │   │           └── page.tsx                   # FR28: Personal metrics
│   │   │
│   │   ├── components/
│   │   │   └── features/
│   │   │       └── sprint-dashboard/                  # NEW — Chart components
│   │   │           ├── velocity-chart.tsx
│   │   │           ├── burndown-chart.tsx
│   │   │           ├── cycle-time-chart.tsx
│   │   │           ├── estimation-accuracy-chart.tsx
│   │   │           ├── sprint-scope-timeline.tsx
│   │   │           ├── chart-data-table.tsx            # NFR-A2: Accessible alternative
│   │   │           ├── sprint-health-panel.tsx         # NFR-O3: Admin health view
│   │   │           └── webhook-log-table.tsx           # FR33-FR34: Log viewer
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-sprint-metrics.ts                  # NEW — TanStack Query hooks
│   │   │   ├── use-sprint-velocity.ts
│   │   │   ├── use-sprint-burndown.ts
│   │   │   ├── use-zenhub-config.ts
│   │   │   └── use-zenhub-sync-logs.ts
│
├── packages/
│   └── shared/src/
│       ├── schemas/
│       │   ├── sprint-metrics.schema.ts               # NEW — Zod schemas
│       │   ├── zenhub-config.schema.ts
│       │   └── zenhub-webhook.schema.ts
│       └── types/
│           ├── sprint.types.ts                        # NEW — Shared types
│           └── zenhub.types.ts
│
├── prisma/
│   ├── schema.prisma                                  # MODIFIED — add sprint schema
│   └── migrations/
│       └── YYYYMMDD_add_sprint_schema/                # NEW — Migration
│           └── migration.sql
│
└── tests/
    └── e2e/
        ├── sprint-dashboard.spec.ts                   # NEW — Playwright E2E
        ├── zenhub-webhook.spec.ts
        └── zenhub-config.spec.ts
```

### Architectural Boundaries

**API Boundaries:**

| Boundary            | Endpoints                                      | Module   | Auth                           |
| ------------------- | ---------------------------------------------- | -------- | ------------------------------ |
| Zenhub Webhook      | `POST /api/v1/webhooks/zenhub`                 | `zenhub` | HMAC signature (no JWT)        |
| Sprint Dashboard    | `GET /api/v1/sprints/*`                        | `sprint` | JWT + CASL (SprintDashboard)   |
| Contributor Metrics | `GET /api/v1/sprints/contributors/:id/metrics` | `sprint` | JWT + CASL (SprintMetric, own) |
| Integration Config  | `GET/PATCH /api/v1/admin/zenhub-config`        | `zenhub` | JWT + CASL (admin only)        |
| Sync Logs           | `GET /api/v1/admin/zenhub-sync-logs`           | `zenhub` | JWT + CASL (admin only)        |

**Module Communication:**

```
Zenhub Webhooks ──→ zenhub module ──→ EventEmitter2 ──→ sprint module
Zenhub API     ──→ zenhub module ──→ EventEmitter2 ──→ sprint module
                                                         │
                                                         ├──→ sprint_metrics (pre-computed)
                                                         ├──→ contribution_sprint_context (enrichment)
                                                         └──→ EventEmitter2 ──→ (Phase 2: evaluation, activity)
```

**Data Boundaries:**

| Schema   | Tables                                                                          | Owned By                    | Accessed By                                  |
| -------- | ------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------- |
| `sprint` | sprint_metrics, pipeline_transitions, contribution_sprint_context, zenhub_syncs | `zenhub` + `sprint` modules | Dashboard API, evaluation (Phase 2)          |
| `core`   | contributions (read only)                                                       | `contribution` module       | `sprint` module (read via FK for enrichment) |

### FR Category to Structure Mapping

| FR Category                                | Backend Module             | Frontend Route                                                    | Prisma Model                             |
| ------------------------------------------ | -------------------------- | ----------------------------------------------------------------- | ---------------------------------------- |
| Zenhub Data Ingestion (FR1-FR7)            | `zenhub`                   | —                                                                 | `zenhub_syncs`                           |
| Sprint Metrics (FR8-FR15)                  | `sprint`                   | —                                                                 | `sprint_metrics`, `pipeline_transitions` |
| Contribution Enrichment (FR16-FR19)        | `sprint`                   | —                                                                 | `contribution_sprint_context`            |
| Sprint Dashboard (FR20-FR28)               | `sprint`                   | `(admin)/admin/sprints/*`, `(dashboard)/dashboard/sprint-metrics` | reads all sprint tables                  |
| Integration Config (FR29-FR36)             | `zenhub`                   | `(admin)/admin/sprints/configuration`                             | `zenhub_syncs` (logs)                    |
| Permissions (FR37-FR39)                    | `auth` (extended)          | —                                                                 | —                                        |
| Task Sync Phase 2 (FR40-FR44)              | `zenhub` (Phase 2)         | —                                                                 | new Phase 2 models                       |
| Evaluation Extension Phase 2 (FR45-FR48)   | `evaluation` (Phase 2)     | —                                                                 | —                                        |
| Activity/Notifications Phase 2 (FR49-FR50) | existing modules (Phase 2) | —                                                                 | —                                        |
| Audit (FR51-FR53)                          | `zenhub` + `sprint`        | —                                                                 | `zenhub_syncs`                           |

### Data Flow

```
Zenhub Cloud
    │
    ├── Webhooks ──→ POST /api/v1/webhooks/zenhub
    │                    │
    │                    ├── HMAC verify
    │                    ├── Idempotency check
    │                    ├── Log to zenhub_syncs
    │                    └── Emit zenhub.webhook.received
    │                         │
    │                         └──→ sprint module listens
    │                              ├── Update pipeline_transitions
    │                              ├── Recalculate sprint_metrics
    │                              └── Enrich contribution_sprint_context
    │
    └── GraphQL API ◄── BullMQ zenhub-polling (every 15min)
                         │
                         ├── Fetch sprint/velocity/epic data
                         ├── Upsert sprint_metrics
                         ├── Reconcile missed webhook data
                         ├── Log to zenhub_syncs
                         └── Emit zenhub.poll.completed

Dashboard reads ◄── GET /api/v1/sprints/* ◄── pre-computed sprint_metrics
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All decisions are internally consistent:

- `sprint` schema + `zenhub`/`sprint` modules + EventEmitter2 loose coupling — clean bounded contexts with event-driven communication ✓
- BullMQ `zenhub-polling` queue + webhook receiver — complementary dual-path ingestion with polling as reconciliation layer ✓
- Pre-computed metrics + raw event storage + idempotent recalculation — consistent read/write/recovery strategy ✓
- Join table `contribution_sprint_context` + untouched `core.contributions` — zero-risk enrichment with clean separation ✓
- No contradictory decisions found

**Pattern Consistency:**
All Zenhub-specific patterns align with core architecture patterns:

- Webhook handler mirrors GitHub webhook pattern exactly ✓
- BullMQ queue naming follows existing convention (kebab-case queue, camelCase jobs) ✓
- Event naming follows `{domain}.{entity}.{action}` convention ✓
- Error codes follow UPPER_SNAKE_CASE domain-prefix convention ✓
- API endpoints follow REST kebab-case plural nouns ✓

**Structure Alignment:**
Project structure supports all decisions:

- Two new backend modules (`zenhub`, `sprint`) mapped to the `sprint` schema ✓
- Frontend routes follow existing `(admin)` / `(dashboard)` route group pattern ✓
- Chart components co-located by feature in `components/features/sprint-dashboard/` ✓
- Shared Zod schemas and types in `packages/shared` ✓

### Requirements Coverage Validation ✅

**Functional Requirements (53/53 covered):**

| FR Range  | Category                         | Architectural Support                                                              | Status |
| --------- | -------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| FR1-FR7   | Data Ingestion                   | `zenhub` module: webhook controller, polling processor, backfill job               | ✅     |
| FR8-FR15  | Sprint Metrics                   | `sprint` module: metrics service, `sprint_metrics` + `pipeline_transitions` models | ✅     |
| FR16-FR19 | Contribution Enrichment          | `sprint` module: enrichment service, `contribution_sprint_context` join table      | ✅     |
| FR20-FR28 | Sprint Dashboard                 | `sprint` module: dashboard API + admin/contributor frontend pages                  | ✅     |
| FR29-FR36 | Integration Config               | `zenhub` module: config controller/service, `zenhub_syncs` for logs                | ✅     |
| FR37-FR39 | Permissions                      | CASL extension: `SprintMetric`, `SprintDashboard` subjects                         | ✅     |
| FR40-FR44 | Task Sync (Phase 2)              | Deferred — `zenhub` module ownership documented                                    | ✅     |
| FR45-FR48 | Evaluation Extension (Phase 2)   | Deferred — `evaluation` module ownership, feature flag documented                  | ✅     |
| FR49-FR50 | Activity/Notifications (Phase 2) | Deferred — existing module ownership documented                                    | ✅     |
| FR51-FR53 | Audit                            | `zenhub_syncs` table serves as audit log; 7-year retention via platform policy     | ✅     |

**Non-Functional Requirements (25/25 covered):**

| NFR Category          | Key Targets                                                    | Architectural Support                                              | Status |
| --------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| Performance (P1-P7)   | Webhook <500ms, dashboard <2s, polling <60s                    | Async webhook processing, pre-computed metrics, BullMQ scheduling  | ✅     |
| Security (S1-S6)      | HMAC, encrypted tokens, CASL, secret rotation                  | Webhook guard, env vars, CASL subjects, dual-secret pattern        | ✅     |
| Scalability (SC1-SC4) | 100 events/min burst, 5 years data, multi-workspace            | BullMQ queue buffering, database indexing, configurable workspace  | ✅     |
| Reliability (R1-R5)   | 99.9% webhook, auto-recovery, idempotent, graceful degradation | BullMQ retry, polling reconciliation, upsert semantics             | ✅     |
| Accessibility (A1-A4) | WCAG 2.1 AA, chart alternatives, keyboard nav                  | `chart-data-table.tsx` toggle, inherited WCAG patterns             | ✅     |
| Integration (I1-I4)   | API versioning, zero GitHub degradation, data persistence      | Separate module, no GitHub pipeline modification, local data store | ✅     |
| Observability (O1-O3) | Structured logs, operational metrics, health panel             | OpenTelemetry + Pino, `sprint-health-panel.tsx`                    | ✅     |

### Implementation Readiness Validation ✅

**Decision Completeness:**

- All critical decisions documented with rationale ✓
- Technology versions inherited from core architecture (verified) ✓
- Integration patterns (webhook, polling, enrichment) fully specified ✓
- Phase 2 deferred decisions documented with ownership and strategy ✓

**Structure Completeness:**

- Complete file tree with ~50 new files mapped to FRs ✓
- API boundaries defined with auth requirements per endpoint ✓
- Module communication flow diagrammed ✓
- Data flow from Zenhub to dashboard diagrammed ✓

**Pattern Completeness:**

- 5 integration-specific patterns with code examples ✓
- 7 error codes defined ✓
- 2 BullMQ queues specified ✓
- 7 enforcement rules documented ✓

### Gap Analysis Results

**Critical Gaps:** 0

**Important Gaps:** 1

- **Database indexing strategy:** Pre-computed metrics need indexes for dashboard performance (NFR-P2 <2s for 12 months). Recommend: composite index on `sprint_metrics(sprint_end, domain)` and `pipeline_transitions(sprint_id, transitioned_at)`. Address during Prisma schema migration story.

**Nice-to-Have Gaps:** 2

- **Zenhub GraphQL query specifications:** Exact queries for sprint/velocity/epic data not detailed — implementation specifics for polling service story.
- **Dashboard chart interaction specifications:** Tooltip formats, drill-down behaviors — UI details following existing admin patterns, handled during frontend stories.

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed (53 FRs, 25 NFRs mapped)
- [x] Scale and complexity assessed (high, backend integration + admin dashboard)
- [x] Technical constraints identified (Zenhub API, existing pipeline, compliance)
- [x] Cross-cutting concerns mapped (dual-path ingestion, enrichment, sync, observability)

**✅ Architectural Decisions**

- [x] Critical decisions documented with rationale (schema, modules, enrichment, metrics, ingestion)
- [x] Technology stack fully specified (inherited from core architecture)
- [x] Integration patterns defined (webhook, polling, enrichment, events)
- [x] Performance considerations addressed (pre-computed metrics, async processing)

**✅ Implementation Patterns**

- [x] Naming conventions inherited + integration-specific additions
- [x] Structure patterns defined (new modules, files, routes)
- [x] Communication patterns specified (EventEmitter2 events, API endpoints)
- [x] Process patterns documented (webhook flow, polling flow, calculation flow)

**✅ Project Structure**

- [x] Complete directory structure defined (~50 new files)
- [x] Component boundaries established (zenhub vs sprint modules)
- [x] Integration points mapped (API boundaries table, module communication diagram)
- [x] Requirements to structure mapping complete (FR category → module/route/model table)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- Clean separation between integration plumbing (`zenhub`) and domain logic (`sprint`)
- Zero modification of existing core domain models — fully reversible
- Dual-path data ingestion with polling as reconciliation — robust and fault-tolerant
- Every FR mapped to specific module, file, and model — no ambiguity for implementers
- Phase 2 decisions documented with ownership — no surprises during extension

**Areas for Future Enhancement:**

- Database indexing strategy (address during Prisma migration story)
- Zenhub GraphQL query specifications (address during polling service story)
- Phase 2 bidirectional sync detailed design (address when Phase 2 begins)

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all core architecture decisions exactly as documented in `architecture.md`
- Follow all Zenhub integration decisions exactly as documented in this document
- Use integration-specific patterns consistently across zenhub and sprint modules
- Respect module boundaries — `zenhub` handles plumbing, `sprint` handles domain logic
- Refer to this document for all Zenhub integration architectural questions

**First Implementation Priority:**

1. Prisma schema migration: add `sprint` schema with all 4 tables
2. `zenhub` module: webhook receiver with HMAC guard
3. `zenhub` module: API polling service with BullMQ
