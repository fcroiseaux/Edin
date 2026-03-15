---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: complete
completedAt: '2026-03-15'
inputDocuments:
  - _bmad-output/planning-artifacts/prd-zenhub-integration.md
  - _bmad-output/planning-artifacts/architecture-zenhub-integration.md
---

# Edin Zenhub Integration - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Edin Zenhub Integration, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**Zenhub Data Ingestion (MVP)**

- FR1: System can receive and process Zenhub webhook events (issue moved, sprint started, sprint ended, estimate changed) in real-time
- FR2: System can verify Zenhub webhook payload signatures (HMAC) before processing events
- FR3: System can process webhook events idempotently (duplicate events do not create duplicate data)
- FR4: System can poll the Zenhub GraphQL API on a configurable schedule to retrieve sprint, velocity, epic, and issue data
- FR5: System can handle Zenhub API rate limits without failing silently or losing data
- FR6: System can paginate through historical Zenhub data during initial setup or backfill operations
- FR7: Admin can trigger a manual API poll to backfill missing data after outages

**Sprint Metrics & Storage (MVP)**

- FR8: System can store sprint metrics (velocity, burndown data, cycle time, lead time) in the database
- FR9: System can calculate sprint velocity (total story points delivered per sprint)
- FR10: System can calculate burndown data (remaining story points over time within a sprint)
- FR11: System can calculate cycle time (time from "In Progress" to "Done" per issue)
- FR12: System can calculate lead time (time from issue creation to completion)
- FR13: System can track scope changes within a sprint (issues added or removed mid-sprint)
- FR14: System can track estimation accuracy (planned vs delivered story points per contributor and per sprint)
- FR15: System can store pipeline transition history for each issue (timestamps of status changes)

**Contribution Enrichment (MVP)**

- FR16: System can link existing GitHub contributions (commits, PRs, code reviews) to their corresponding Zenhub sprint context (sprint ID, story points, epic)
- FR17: System can associate story points with contributions of all types (dev, research, governance, documentation, finance)
- FR18: System can calculate planning reliability metrics per contributor (delivery ratio, estimation accuracy)
- FR19: System can identify and record cross-domain collaboration events (contributors from different domains working on the same epic or sprint)

**Sprint Dashboard (MVP)**

- FR20: Project leads can view a velocity chart showing story points delivered across up to 12 sprints
- FR21: Project leads can view a burndown chart for the current and historical sprints
- FR22: Project leads can view cycle time and lead time metrics per sprint
- FR23: Project leads can view scope change history within a sprint
- FR24: Project leads can view estimation accuracy trends (planned vs delivered) per contributor
- FR25: Project leads can view sprint data filtered by contribution domain (dev, research, governance, docs)
- FR26: Project leads can view a combined view showing sprint metrics alongside AI evaluation scores per contributor
- FR27: Project leads can export sprint reports (velocity, burndown, contributor metrics) for stakeholder sharing
- FR28: Contributors can view their own sprint metrics (personal velocity, estimation accuracy, planning reliability)

**Integration Configuration (MVP)**

- FR29: Admin can configure Zenhub API credentials (API key) in the admin panel
- FR30: Admin can configure the Zenhub webhook URL and secret
- FR31: Admin can set the API polling interval (default: 15 minutes)
- FR32: Admin can map a Zenhub workspace to Edin's working groups
- FR33: Admin can view webhook delivery logs (success, failure, retry status, timestamps)
- FR34: Admin can view API polling logs (success, failure, data volume, timestamps)
- FR35: Admin can configure monitoring alerts for webhook failure rates exceeding a threshold
- FR36: Admin can view sync conflict events and their resolution outcomes

**Permissions & Access Control (MVP)**

- FR37: System can enforce role-based access to sprint data: admins have full access, project leads can view all sprint data, contributors can view their own metrics
- FR38: System can extend existing role-based permission definitions with new sprint-related subjects (SprintMetric, SprintDashboard)
- FR39: System can restrict sprint configuration actions to admin role only

**Task Sync (Phase 2)**

- FR40: System can automatically create Edin tasks from Zenhub issues labeled with a configurable tag [Phase 2]
- FR41: System can sync status changes from Zenhub pipeline transitions to Edin task statuses [Phase 2]
- FR42: System can sync story point estimates from Zenhub issues to linked Edin tasks [Phase 2]
- FR43: System can resolve sync conflicts between Zenhub and Edin task status using Zenhub as source of truth [Phase 2]
- FR44: Admin can view and manually resolve sync conflicts that require human judgment [Phase 2]

**Evaluation Engine Extension (Phase 2)**

- FR45: System can include planning context in AI evaluation prompts [Phase 2]
- FR46: System can generate a planning reliability score per contributor based on sprint data [Phase 2]
- FR47: System can produce combined evaluation scores that incorporate both contribution quality and planning reliability [Phase 2]
- FR48: System can operate evaluation without planning context if Zenhub data is temporarily unavailable [Phase 2]

**Activity & Notifications (Phase 2)**

- FR49: System can publish sprint lifecycle events to the existing activity feed [Phase 2]
- FR50: System can send sprint-related notifications through the existing notification system [Phase 2]

**Audit & Compliance**

- FR51: System can log all sync events with timestamps and actor identifiers (MVP)
- FR52: System can retain Zenhub sprint data according to platform data retention policy — minimum 7 years (MVP)
- FR53: System can provide an audit trail of how sprint data influenced evaluation scores [Phase 2]

### NonFunctional Requirements

**Performance**

- NFR-P1: Webhook endpoint responds with HTTP 200 acknowledgment within 500ms; processing continues asynchronously
- NFR-P2: Sprint dashboard pages load within 2s for up to 12 months of historical sprint data
- NFR-P3: Burndown chart renders within 500ms for a single sprint view
- NFR-P4: Velocity chart renders within 1s for 12-sprint historical view
- NFR-P5: API polling cycle completes within 60s per scheduled run
- NFR-P6: Contribution enrichment completes within 30s per sprint close event
- NFR-P7: Sprint metric calculations execute in <5s per sprint

**Security**

- NFR-S1: Zenhub API tokens stored as encrypted environment variables, never in client-side code, logs, or version control
- NFR-S2: Zenhub webhook payloads verified via HMAC signature; unsigned/invalid payloads rejected with HTTP 401
- NFR-S3: All sprint data API endpoints require authentication and enforce role-based permission checks
- NFR-S4: Sprint data encrypted at rest (database) and in transit (TLS)
- NFR-S5: Webhook secrets support rotation without downtime (dual-secret verification)
- NFR-S6: Admin actions on integration configuration are audit-logged with actor and timestamp

**Scalability**

- NFR-SC1: Webhook receiver handles burst events of up to 100 events/minute
- NFR-SC2: Sprint metrics storage supports 100 concurrent contributors across 52 sprints/year
- NFR-SC3: API polling service scales to up to 5 Zenhub workspaces
- NFR-SC4: Dashboard queries remain performant with up to 5 years of historical sprint data

**Reliability**

- NFR-R1: Webhook processing achieves 99.9% success rate; failed webhooks retried 3 times (1m/5m/15m)
- NFR-R2: API polling service recovers automatically from transient Zenhub API failures
- NFR-R3: If Zenhub unreachable >1 hour, alert sent to admin; cached data continues serving dashboards
- NFR-R4: Sprint metric calculations are idempotent
- NFR-R5: Evaluation engine continues without planning context if Zenhub data unavailable (graceful degradation)

**Accessibility**

- NFR-A1: Sprint dashboard pages comply with WCAG 2.1 AA
- NFR-A2: All chart visualizations include accessible data table alternatives and ARIA labels
- NFR-A3: Sprint status indicators use text/icons alongside color (not color-only)
- NFR-A4: Dashboard navigation supports full keyboard accessibility

**Integration**

- NFR-I1: Integration handles Zenhub API versioning gracefully — breaking changes detected, logged, fallback to cached data
- NFR-I2: Integration does not degrade existing GitHub webhook processing performance
- NFR-I3: Sprint data stored as first-class data model — historical data remains if Zenhub discontinued
- NFR-I4: Integration supports configurable webhook event filtering

**Observability**

- NFR-O1: All operations emit structured log entries (JSON) with correlation IDs for end-to-end tracing
- NFR-O2: Key operational metrics (webhook success rate, polling duration, sync lag, queue depth) exposed for monitoring
- NFR-O3: Admin dashboard includes integration health panel showing real-time sync status

### Additional Requirements

From Architecture document:

- New `sprint` schema in PostgreSQL following domain-separation pattern, with models: `sprint_metrics`, `zenhub_syncs`, `pipeline_transitions`, `contribution_sprint_context`
- Separate join table `sprint.contribution_sprint_context` to enrich contributions without modifying core `contributions` table
- Pre-computed sprint metrics with raw event data retained for idempotent recalculation
- HMAC-SHA256 webhook signature verification mirroring existing GitHub webhook pattern
- Dual-secret verification for webhook secret rotation with configurable transition window (default 24 hours)
- Two new CASL subjects: `SprintMetric` and `SprintDashboard` extending existing permission model
- Webhook controller follows existing GitHub webhook handler pattern — returns 200 immediately, processes asynchronously via EventEmitter2
- New BullMQ queue `zenhub-polling` with scheduled repeatable job (default 15-minute interval)
- REST endpoints under `/api/v1/sprints/` returning chart-ready response format
- EventEmitter2 events following `{domain}.{entity}.{action}` naming: `zenhub.*` for integration plumbing, `sprint.*` for domain logic
- Frontend admin routes under `app/(admin)/admin/sprints/`; contributor view at `app/(dashboard)/dashboard/sprint-metrics/`
- Recharts chart components co-located in `components/features/sprint-dashboard/`
- TanStack Query hooks with 5-minute stale time for dashboard data
- New environment variables: `ZENHUB_API_TOKEN`, `ZENHUB_WEBHOOK_SECRET`, `ZENHUB_WEBHOOK_SECRET_PREVIOUS`, `ZENHUB_POLLING_INTERVAL_MS`, `ZENHUB_WORKSPACE_ID`
- OpenTelemetry + Pino instrumentation on all new services with correlation IDs
- Database indexing: composite index on `sprint_metrics(sprint_end, domain)` and `pipeline_transitions(sprint_id, transitioned_at)` for dashboard performance
- Two backend modules: `zenhub` (integration plumbing) and `sprint` (domain logic)
- Zod-validated configuration and shared schemas in `packages/shared`

### UX Design Requirements

No UX Design document for this feature — inherits existing admin dashboard patterns from the Edin platform.

### FR Coverage Map

FR1: Epic 1 - Webhook event reception
FR2: Epic 1 - HMAC signature verification
FR3: Epic 1 - Idempotent event processing
FR4: Epic 1 - GraphQL API polling
FR5: Epic 1 - API rate limit handling
FR6: Epic 1 - Historical data pagination/backfill
FR7: Epic 1 - Manual backfill trigger
FR8: Epic 2 - Sprint metrics storage
FR9: Epic 2 - Velocity calculation
FR10: Epic 2 - Burndown calculation
FR11: Epic 2 - Cycle time calculation
FR12: Epic 2 - Lead time calculation
FR13: Epic 2 - Scope change tracking
FR14: Epic 2 - Estimation accuracy tracking
FR15: Epic 2 - Pipeline transition history
FR16: Epic 4 - Contribution-to-sprint linking
FR17: Epic 4 - Story points for all contribution types
FR18: Epic 4 - Planning reliability metrics
FR19: Epic 4 - Cross-domain collaboration events
FR20: Epic 2 - Velocity chart
FR21: Epic 2 - Burndown chart
FR22: Epic 2 - Cycle time and lead time views
FR23: Epic 2 - Scope change history view
FR24: Epic 2 - Estimation accuracy trends
FR25: Epic 2 - Domain-filtered sprint data
FR26: Epic 2 - Combined sprint + evaluation view
FR27: Epic 2 - Sprint report export
FR28: Epic 4 - Personal contributor sprint metrics
FR29: Epic 1 - Zenhub API credential configuration
FR30: Epic 1 - Webhook URL and secret configuration
FR31: Epic 1 - Polling interval configuration
FR32: Epic 1 - Workspace-to-working-group mapping
FR33: Epic 3 - Webhook delivery logs
FR34: Epic 3 - API polling logs
FR35: Epic 3 - Monitoring alert configuration
FR36: Epic 3 - Sync conflict event viewer
FR37: Epic 1 - Role-based sprint data access
FR38: Epic 1 - CASL sprint subjects extension
FR39: Epic 1 - Admin-only configuration restriction
FR40: Epic 5 - Auto-create Edin tasks from Zenhub issues (Phase 2)
FR41: Epic 5 - Status sync from Zenhub to Edin (Phase 2)
FR42: Epic 5 - Story point sync (Phase 2)
FR43: Epic 5 - Sync conflict resolution (Phase 2)
FR44: Epic 5 - Manual conflict resolution (Phase 2)
FR45: Epic 6 - Planning context in evaluation prompts (Phase 2)
FR46: Epic 6 - Planning reliability score (Phase 2)
FR47: Epic 6 - Combined evaluation scores (Phase 2)
FR48: Epic 6 - Graceful degradation without planning data (Phase 2)
FR49: Epic 7 - Sprint events in activity feed (Phase 2)
FR50: Epic 7 - Sprint notifications (Phase 2)
FR51: Epic 1 - Sync event audit logging
FR52: Epic 1 - 7-year data retention
FR53: Epic 6 - Evaluation audit trail (Phase 2)

## Epic List

### Epic 1: Integration Setup & Data Pipeline

Admin can configure Zenhub credentials, set up webhooks and API polling, and start receiving sprint data securely. CASL permissions enforce role-based access. Audit logging captures all sync events.
**FRs covered:** FR1-FR7, FR29-FR32, FR37-FR39, FR51-FR52

### Epic 2: Sprint Metrics & Project Lead Dashboard

Sprint metrics (velocity, burndown, cycle time, scope changes, estimation accuracy) are calculated from ingested data. Project leads access a full analytics dashboard with domain filtering, combined evaluation views, and report export.
**FRs covered:** FR8-FR15, FR20-FR27

### Epic 3: Integration Monitoring & Operations

Admin can view webhook and polling logs, configure failure alerts, and review sync conflict events. Integration health panel provides operational visibility.
**FRs covered:** FR33-FR36

### Epic 4: Contribution Enrichment & Contributor Metrics

Contributions are linked to sprint context (story points, sprint, epic). Planning reliability is calculated per contributor. Contributors see their personal sprint metrics.
**FRs covered:** FR16-FR19, FR28

### Epic 5: Bidirectional Task Sync (Phase 2)

Zenhub issues auto-create Edin tasks. Status and story points sync bidirectionally. Conflicts are resolved with Zenhub as source of truth.
**FRs covered:** FR40-FR44

### Epic 6: Evaluation Engine Extension (Phase 2)

AI evaluation prompts are enriched with planning context. Planning reliability scores are generated. Combined evaluation incorporates contribution quality + planning reliability. Graceful degradation if Zenhub is unavailable.
**FRs covered:** FR45-FR48, FR53

### Epic 7: Sprint Activity & Notifications (Phase 2)

Sprint lifecycle events appear in the activity feed. Sprint-related alerts flow through the existing notification system.
**FRs covered:** FR49-FR50

---

## Epic 1: Integration Setup & Data Pipeline

Admin can configure Zenhub credentials, set up webhooks and API polling, and start receiving sprint data securely. CASL permissions enforce role-based access. Audit logging captures all sync events.

### Story 1.1: Zenhub Integration Configuration & Permissions

As an admin,
I want to configure Zenhub API credentials, webhook settings, polling interval, and workspace mapping with role-based access control enforced,
So that I can securely set up and manage the integration before data starts flowing.

**Acceptance Criteria:**

**Given** an admin is authenticated
**When** they navigate to the Zenhub configuration page
**Then** they can view and update the Zenhub API key, webhook URL, webhook secret, polling interval, and workspace mapping
**And** changes are persisted securely (API tokens never in client-side code or logs)

**Given** a non-admin user (contributor or project lead)
**When** they attempt to access the Zenhub configuration page or API
**Then** they receive a 403 Forbidden response

**Given** the CASL permission model
**When** sprint-related subjects are queried
**Then** `SprintMetric` grants: admin (CRUD), project_lead (read all), contributor (read own)
**And** `SprintDashboard` grants: admin (full), project_lead (read), contributor (none)
**And** `IntegrationConfig` grants: admin only

**Given** environment variables are not configured
**When** the application starts
**Then** Zod validation reports missing required variables clearly without exposing secrets

### Story 1.2: Zenhub Webhook Receiver with HMAC Verification

As an admin,
I want the system to receive Zenhub webhook events with HMAC signature verification and idempotent processing, logging all events for audit,
So that sprint data flows into Edin securely and reliably.

**Acceptance Criteria:**

**Given** a valid Zenhub webhook event with correct HMAC-SHA256 signature
**When** it is received at `POST /api/v1/webhooks/zenhub`
**Then** the endpoint returns HTTP 200 within 500ms
**And** the event is logged to `zenhub_syncs` with correlation ID, event type, payload, and timestamp
**And** a `zenhub.webhook.received` event is emitted for async processing

**Given** a webhook event with invalid or missing HMAC signature
**When** it is received at the webhook endpoint
**Then** the endpoint returns HTTP 401
**And** the rejection is logged with details

**Given** a duplicate webhook event (same event ID already processed)
**When** it is received at the webhook endpoint
**Then** the endpoint returns HTTP 200 (no error to sender)
**And** no duplicate data is created
**And** the duplicate is logged as `ZENHUB_WEBHOOK_DUPLICATE_EVENT`

**Given** webhook secret rotation is in progress
**When** a webhook arrives signed with either the current or previous secret
**Then** the signature is accepted during the 24-hour transition window
**And** after the window, only the current secret is accepted

**Given** a burst of 100 webhook events per minute
**When** they arrive simultaneously
**Then** all events are acknowledged with HTTP 200 without dropping any
**And** async processing handles them via EventEmitter2 without blocking

**Given** any sync event (webhook receipt)
**When** it is processed
**Then** a structured JSON log entry with correlation ID is emitted
**And** the `zenhub_syncs` record serves as the audit trail with 7-year retention policy

### Story 1.3: Zenhub API Polling Service

As an admin,
I want the system to poll the Zenhub GraphQL API on a configurable schedule with rate limit handling and pagination,
So that aggregate sprint data is captured and any webhook gaps are filled.

**Acceptance Criteria:**

**Given** the Zenhub integration is configured with valid API credentials
**When** the configured polling interval elapses (default: 15 minutes)
**Then** the system queries the Zenhub GraphQL API for sprint, velocity, epic, and issue data
**And** the polling cycle completes within 60 seconds
**And** results are logged to `zenhub_syncs` with sync_type `poll`
**And** a `zenhub.poll.completed` event is emitted

**Given** the Zenhub API responds with rate limit headers (429)
**When** the polling service encounters the rate limit
**Then** it respects the Retry-After header with exponential backoff
**And** the rate limit event is logged as `ZENHUB_API_RATE_LIMITED`
**And** no data is lost

**Given** the Zenhub workspace contains more data than fits in one API response
**When** the polling service fetches data
**Then** it paginates through all results until complete
**And** uses upsert semantics (never creates duplicates)

**Given** the Zenhub API is temporarily unreachable
**When** a polling cycle fails
**Then** the system logs the failure as `ZENHUB_API_UNREACHABLE`
**And** BullMQ retries automatically according to configured retry policy
**And** the existing GitHub webhook pipeline is not affected

**Given** the BullMQ `zenhub-polling` queue
**When** it runs alongside existing queues
**Then** it does not cause resource contention or degrade existing job processing

### Story 1.4: Manual Data Backfill

As an admin,
I want to trigger a manual API poll to backfill missing data after outages,
So that data gaps can be recovered without waiting for the next scheduled poll.

**Acceptance Criteria:**

**Given** an admin is authenticated
**When** they trigger a manual backfill from the admin panel or API endpoint
**Then** the system initiates an immediate Zenhub API poll for the specified date range
**And** the backfill paginates through all historical data for the requested period
**And** all fetched data is upserted (no duplicates)
**And** the backfill is logged to `zenhub_syncs` with sync_type `backfill`

**Given** a backfill is in progress
**When** the admin checks status
**Then** progress is visible (records processed, completion status)

**Given** a non-admin user
**When** they attempt to trigger a backfill
**Then** they receive a 403 Forbidden response

---

## Epic 2: Sprint Metrics & Project Lead Dashboard

Sprint metrics (velocity, burndown, cycle time, scope changes, estimation accuracy) are calculated from ingested data. Project leads access a full analytics dashboard with domain filtering, combined evaluation views, and report export.

### Story 2.1: Sprint Metrics Schema & Core Calculations

As a project lead,
I want sprint metrics (velocity, burndown, cycle time, lead time) calculated automatically from ingested Zenhub data,
So that I have accurate, up-to-date sprint analytics to inform planning decisions.

**Acceptance Criteria:**

**Given** pipeline transition events have been received via webhooks or polling
**When** the sprint metrics service processes them
**Then** the `sprint_metrics` table is created/populated with velocity, burndown_data (JSONB), cycle_time_avg, lead_time_avg, committed_points, delivered_points, sprint_start, and sprint_end
**And** the `pipeline_transitions` table stores raw transition records (issue_id, from_pipeline, to_pipeline, transitioned_at, contributor_id)

**Given** a sprint has closed
**When** velocity is calculated
**Then** it equals the total story points of issues moved to "Done" during that sprint
**And** the calculation executes in <5 seconds
**And** a `sprint.velocity.calculated` event is emitted

**Given** an active sprint
**When** burndown data is calculated
**Then** it produces a time-series of remaining story points at daily intervals
**And** the data is stored as JSONB in `sprint_metrics`

**Given** pipeline transition records exist for a sprint
**When** cycle time is calculated
**Then** it measures the average time from "In Progress" to "Done" per issue
**And** lead time measures the average time from issue creation to completion

**Given** a metric calculation is run twice on the same data
**When** the second calculation completes
**Then** it produces identical results (idempotent)
**And** uses upsert semantics without creating duplicate records

**Given** composite indexes on `sprint_metrics(sprint_end, domain)` and `pipeline_transitions(sprint_id, transitioned_at)`
**When** queries run against 5 years of historical data
**Then** query performance remains within acceptable limits

### Story 2.2: Scope Change & Estimation Accuracy Tracking

As a project lead,
I want to track scope changes within sprints and estimation accuracy per contributor,
So that I can identify planning issues and improve sprint predictability.

**Acceptance Criteria:**

**Given** an issue is added to or removed from an active sprint
**When** the scope change event is processed
**Then** the scope change is recorded with timestamp, issue ID, change type (added/removed), and story points affected
**And** the `sprint_metrics` scope_changes count is updated

**Given** a sprint has closed
**When** estimation accuracy is calculated for each contributor
**Then** planned vs delivered story points are compared
**And** estimation_accuracy is stored as a percentage in `sprint_metrics`
**And** per-contributor accuracy data is available for trend analysis

**Given** scope changes occur mid-sprint
**When** the sprint metrics are recalculated
**Then** committed_points reflects the original sprint commitment
**And** delivered_points reflects actual completion including scope changes

### Story 2.3: Sprint Dashboard — Velocity & Burndown Views

As a project lead,
I want to view velocity and burndown charts on an admin dashboard,
So that I can monitor sprint performance and delivery trends at a glance.

**Acceptance Criteria:**

**Given** a project lead is authenticated and has `SprintDashboard` read permission
**When** they navigate to `/admin/sprints`
**Then** they see a velocity chart showing story points delivered across up to 12 sprints
**And** the chart renders within 1 second for 12-sprint history
**And** the data is fetched via `GET /api/v1/sprints/velocity` returning chart-ready format `[{x: sprintEndDate, y: deliveredPoints}]`

**Given** a project lead navigates to `/admin/sprints/[sprintId]`
**When** the page loads
**Then** they see a burndown chart for the selected sprint showing remaining story points over time
**And** the burndown chart renders within 500ms
**And** the data is fetched via `GET /api/v1/sprints/burndown/:sprintId`

**Given** a chart is displayed
**When** the user activates the "View as table" toggle
**Then** an accessible data table alternative is shown with the same data
**And** the table has proper ARIA labels and is keyboard navigable

**Given** the dashboard page
**When** it loads with up to 12 months of historical data
**Then** the page load completes within 2 seconds
**And** TanStack Query hooks manage data fetching with 5-minute stale time

**Given** the dashboard is viewed on a tablet or desktop
**When** the viewport changes
**Then** charts and layout adapt responsively following existing admin patterns

### Story 2.4: Sprint Dashboard — Detailed Analytics & Domain Filtering

As a project lead,
I want to view cycle time, lead time, scope changes, and estimation accuracy trends with domain filtering,
So that I can analyze sprint performance in depth and across contribution domains.

**Acceptance Criteria:**

**Given** a project lead is on the sprint detail page
**When** they view sprint analytics
**Then** they see cycle time and lead time metrics displayed per sprint
**And** scope change history is visible showing issues added/removed with timestamps

**Given** a project lead views the contributors analytics page at `/admin/sprints/contributors`
**When** the page loads
**Then** they see estimation accuracy trends (planned vs delivered) per contributor over time
**And** the data includes per-contributor delivery ratios

**Given** any sprint dashboard view
**When** the user selects a domain filter (dev, research, governance, docs)
**Then** all displayed metrics and charts update to show only data for the selected domain
**And** the filter is applied via `?domain=` query parameter on API requests

**Given** all chart components on this page
**When** they are rendered
**Then** each includes an accessible data table alternative
**And** status indicators use text/icons alongside color (not color-only)
**And** full keyboard navigation is supported

### Story 2.5: Combined Evaluation View & Sprint Report Export

As a project lead,
I want to view sprint metrics alongside AI evaluation scores per contributor and export sprint reports,
So that I can see a holistic view of contributor performance and share data with stakeholders.

**Acceptance Criteria:**

**Given** a project lead is on the contributors analytics page
**When** they view the combined view
**Then** sprint metrics (velocity, estimation accuracy, planning reliability) are displayed alongside AI evaluation scores per contributor
**And** the data is fetched from both sprint and evaluation APIs

**Given** a project lead wants to share sprint data
**When** they click export on any dashboard view
**Then** a sprint report is generated containing velocity, burndown, and contributor metrics
**And** the report is downloadable as CSV (for data portability) or PDF (for stakeholder sharing), selectable by the user
**And** the export is generated via `GET /api/v1/sprints/export?format=csv|pdf`

**Given** a project lead with `SprintDashboard` read permission
**When** they access any dashboard endpoint
**Then** CASL permissions are enforced via `@CheckAbility` decorator
**And** contributors without `SprintDashboard` permission receive 403

---

## Epic 3: Integration Monitoring & Operations

Admin can view webhook and polling logs, configure failure alerts, and review sync conflict events. Integration health panel provides operational visibility.

### Story 3.1: Webhook & Polling Log Viewer

As an admin,
I want to view webhook delivery logs and API polling logs in the admin panel,
So that I can monitor integration health and troubleshoot sync issues.

**Acceptance Criteria:**

**Given** an admin is authenticated
**When** they navigate to the integration monitoring section
**Then** they see a table of webhook delivery logs showing: timestamp, event type, status (success/failure/retry), correlation ID, and payload summary
**And** they see a table of API polling logs showing: timestamp, status, data volume (records synced), duration, and error messages if any

**Given** webhook or polling logs exist
**When** the admin filters or paginates through logs
**Then** results are returned using cursor-based pagination consistent with existing API patterns
**And** logs can be filtered by status (success, failure, retry), event type, and date range

**Given** operational metrics are tracked
**When** the admin views the integration health panel
**Then** they see real-time sync status, last successful poll timestamp, webhook success rate, and polling duration trends

**Given** the log viewer
**When** rendering log entries
**Then** correlation IDs are displayed for end-to-end tracing
**And** sensitive data (API tokens, webhook secrets) is never displayed in log entries

### Story 3.2: Monitoring Alerts & Sync Conflict Viewer

As an admin,
I want to configure monitoring alerts for webhook failure rates and view sync conflict events,
So that I am proactively notified of issues and can review conflict resolutions.

**Acceptance Criteria:**

**Given** an admin is on the monitoring configuration page
**When** they set a webhook failure rate threshold (e.g., >1%)
**Then** the system sends an alert to the admin when the failure rate exceeds the threshold
**And** the alert configuration is persisted

**Given** the Zenhub API has been unreachable for >1 hour
**When** the system detects the outage
**Then** an alert is sent to the admin
**And** cached sprint data continues serving dashboards

**Given** sync conflict events have occurred
**When** the admin navigates to the conflict viewer
**Then** they see a list of conflict events with: timestamp, conflict type, affected entity, resolution outcome (auto-resolved or pending), and actor
**And** conflicts are displayed with enough context for the admin to understand what happened

**Given** a non-admin user
**When** they attempt to access monitoring or alert configuration
**Then** they receive a 403 Forbidden response

---

## Epic 4: Contribution Enrichment & Contributor Metrics

Contributions are linked to sprint context (story points, sprint, epic). Planning reliability is calculated per contributor. Contributors see their personal sprint metrics.

### Story 4.1: Contribution-Sprint Linking & Enrichment

As a contributor,
I want my GitHub contributions (commits, PRs, code reviews) automatically linked to their Zenhub sprint context,
So that my work is tracked within the sprint framework and enriched with planning data.

**Acceptance Criteria:**

**Given** a GitHub contribution is ingested by the existing pipeline
**When** the contribution corresponds to a Zenhub issue with sprint context
**Then** a record is created in `sprint.contribution_sprint_context` linking: contribution_id, sprint_id, story_points, zenhub_issue_id, epic_id, and pipeline_status
**And** the core `contributions` table is NOT modified

**Given** contributions of any type (dev, research, governance, documentation, finance)
**When** they are associated with a Zenhub issue that has story points
**Then** the story points are recorded in the enrichment join table regardless of contribution domain

**Given** the enrichment process runs on a sprint close event
**When** all contributions for the sprint are processed
**Then** enrichment completes within 30 seconds
**And** a `sprint.contribution.enriched` event is emitted for each enriched contribution

**Given** the same contribution is enriched multiple times (e.g., sprint data updated)
**When** enrichment runs again
**Then** it uses upsert semantics and does not create duplicate records

**Given** a contribution has no corresponding Zenhub sprint context
**When** enrichment is attempted
**Then** the contribution remains valid without sprint context
**And** no error is raised (enrichment is optional)

### Story 4.2: Planning Reliability & Cross-Domain Collaboration Metrics

As a project lead,
I want planning reliability metrics calculated per contributor and cross-domain collaboration events tracked,
So that I can assess contributor predictability and encourage cross-domain teamwork.

**Acceptance Criteria:**

**Given** a contributor has sprint history (committed and delivered story points)
**When** planning reliability is calculated
**Then** the delivery ratio (delivered / committed points) is computed
**And** estimation accuracy (variance between estimated and actual effort) is computed
**And** both metrics are available per contributor and per sprint

**Given** contributors from different domains (e.g., dev + research) work on the same epic or sprint
**When** cross-domain collaboration is detected
**Then** a collaboration event is recorded linking the contributing domains, the shared epic/sprint, and the contributors involved

**Given** planning reliability metrics are calculated
**When** the calculation runs
**Then** it uses data from `contribution_sprint_context` and `sprint_metrics`
**And** calculations are idempotent

### Story 4.3: Personal Contributor Sprint Metrics View

As a contributor,
I want to view my own sprint metrics (personal velocity, estimation accuracy, planning reliability),
So that I can track my sprint performance and improve my estimation skills.

**Acceptance Criteria:**

**Given** a contributor is authenticated
**When** they navigate to `/dashboard/sprint-metrics`
**Then** they see their personal velocity across recent sprints
**And** their estimation accuracy trend (planned vs delivered per sprint)
**And** their planning reliability score (delivery ratio)

**Given** the personal metrics page
**When** data is fetched via `GET /api/v1/sprints/contributors/:id/metrics`
**Then** CASL enforces that contributors can only view their own metrics
**And** a contributor attempting to view another contributor's metrics receives 403

**Given** a contributor has no sprint history yet
**When** they view the sprint metrics page
**Then** a helpful empty state is displayed explaining that metrics will appear after their first sprint

**Given** the personal metrics page
**When** charts are displayed
**Then** accessible data table alternatives are available
**And** the page complies with WCAG 2.1 AA

---

## Epic 5: Bidirectional Task Sync (Phase 2)

Zenhub issues auto-create Edin tasks. Status and story points sync bidirectionally. Conflicts are resolved with Zenhub as source of truth.

### Story 5.1: Auto-Create Edin Tasks from Zenhub Issues

As a contributor,
I want Zenhub issues tagged for contributor work to automatically appear as Edin tasks,
So that I can see my sprint assignments in the Edin platform without manual duplication.

**Acceptance Criteria:**

**Given** a Zenhub issue is labeled with the configurable contributor tag (e.g., `contributor-task`)
**When** the label event is received via webhook or polling
**Then** a corresponding Edin task is automatically created with title, description, and assignment mapped from the Zenhub issue
**And** the task is linked to the source Zenhub issue ID for ongoing sync

**Given** the configurable tag
**When** an admin changes the tag value in configuration
**Then** only newly tagged issues trigger task creation (no retroactive processing unless backfill is requested)

**Given** a Zenhub issue that already has a linked Edin task
**When** the same issue event is processed again
**Then** no duplicate task is created (idempotent)

### Story 5.2: Status & Story Point Sync

As a contributor,
I want Zenhub pipeline changes and story point updates to automatically sync to my Edin tasks,
So that my task status stays current across both platforms.

**Acceptance Criteria:**

**Given** a Zenhub issue linked to an Edin task moves through pipeline stages
**When** a pipeline transition event is received
**Then** the Edin task status is updated according to the mapping: Backlog→AVAILABLE, In Progress→IN_PROGRESS, Done→COMPLETED

**Given** story point estimates change on a Zenhub issue
**When** the estimate change event is received
**Then** the linked Edin task's story points are updated to match

**Given** a status mapping configuration
**When** the admin reviews or adjusts it
**Then** the mapping is stored in the database (not hardcoded)
**And** changes take effect on subsequent sync events

### Story 5.3: Sync Conflict Resolution

As an admin,
I want sync conflicts between Zenhub and Edin resolved automatically with manual override available,
So that data stays consistent across platforms without constant intervention.

**Acceptance Criteria:**

**Given** a Zenhub issue status and its linked Edin task status diverge
**When** a sync conflict is detected
**Then** Zenhub is treated as source of truth for sprint data and the Edin task is updated
**And** the conflict is logged to `zenhub_syncs` with type `SPRINT_SYNC_CONFLICT`
**And** a `sprint.sync.conflict` event is emitted

**Given** a sync conflict requires human judgment (e.g., ambiguous mapping)
**When** the admin views the conflict resolution UI
**Then** they see conflict details (both states, timestamps, affected contributor)
**And** they can manually resolve by choosing which state to apply
**And** the resolution is logged with actor and timestamp

**Given** automatic conflict resolution
**When** the same conflict pattern recurs
**Then** the system applies the same resolution consistently
**And** all resolutions are auditable

---

## Epic 6: Evaluation Engine Extension (Phase 2)

AI evaluation prompts are enriched with planning context. Planning reliability scores are generated. Combined evaluation incorporates contribution quality + planning reliability. Graceful degradation if Zenhub is unavailable.

### Story 6.1: Planning Context in Evaluation Prompts

As a project lead,
I want AI evaluation to consider planning context (story points, sprint velocity, estimation accuracy) alongside contribution quality,
So that evaluations reflect not just what was built but whether it was planned, committed, and delivered reliably.

**Acceptance Criteria:**

**Given** a contribution is being evaluated by the AI engine
**When** sprint context is available (via `contribution_sprint_context`)
**Then** the evaluation prompt is enriched with: story points, sprint velocity at time of delivery, estimation accuracy, and commitment ratio
**And** the enrichment is additive — existing evaluation dimensions (code quality, impact, collaboration) are unchanged

**Given** a contribution is being evaluated
**When** Zenhub data is temporarily unavailable or the contribution has no sprint context
**Then** the evaluation proceeds without planning context (graceful degradation)
**And** the evaluation result is flagged as "without planning context" for transparency

**Given** the planning context enrichment feature
**When** it is first deployed
**Then** it is behind a feature flag that allows enabling/disabling without code changes
**And** evaluation continues to function identically when the flag is off

### Story 6.2: Planning Reliability Score & Combined Evaluation

As a project lead,
I want a planning reliability score generated per contributor and combined with quality evaluation into a holistic assessment,
So that token rewards reflect both contribution quality and planning discipline.

**Acceptance Criteria:**

**Given** a contributor has sprint history
**When** the planning reliability score is calculated
**Then** it incorporates delivery ratio, estimation accuracy, and commitment consistency
**And** the score is available alongside the AI evaluation score

**Given** both quality evaluation and planning reliability scores exist
**When** a combined evaluation is generated
**Then** it produces a composite score incorporating both dimensions
**And** the weighting between quality and planning reliability is configurable

**Given** sprint data influenced an evaluation score
**When** an audit trail is requested
**Then** the system provides a clear record of: which sprint data was used, how it affected the score, and the before/after comparison
**And** the audit trail is retained per platform data retention policy

**Given** planning reliability data is sparse (contributor's first 1-2 sprints)
**When** the combined score is generated
**Then** planning reliability weight is reduced proportionally
**And** the evaluation does not penalize contributors with limited sprint history

---

## Epic 7: Sprint Activity & Notifications (Phase 2)

Sprint lifecycle events appear in the activity feed. Sprint-related alerts flow through the existing notification system.

### Story 7.1: Sprint Events in Activity Feed

As a project lead,
I want sprint lifecycle events (sprint started, sprint completed, velocity milestone) visible in the existing activity feed,
So that sprint progress is part of the overall platform activity stream.

**Acceptance Criteria:**

**Given** a sprint lifecycle event occurs (sprint started, sprint completed, velocity milestone reached)
**When** the event is processed by the sprint module
**Then** a corresponding activity feed entry is published through the existing activity feed system
**And** the entry includes: event type, sprint name, key metrics (e.g., velocity for completion events), and timestamp

**Given** the activity feed includes sprint events
**When** a user views their activity feed
**Then** sprint events appear chronologically alongside existing contribution events
**And** sprint events are visually distinct but follow existing activity feed formatting patterns

**Given** a user without `SprintDashboard` read permission
**When** they view their activity feed
**Then** they do not see sprint-level events (only their own contribution-related sprint context if permitted)

### Story 7.2: Sprint Notifications

As a project lead,
I want to receive notifications for sprint-related events (approaching deadline, velocity drop, scope change),
So that I can respond to sprint issues proactively without constantly monitoring the dashboard.

**Acceptance Criteria:**

**Given** a sprint deadline is approaching (configurable threshold, e.g., 2 days before sprint end)
**When** the system detects the approaching deadline
**Then** a notification is sent to the project lead via the existing notification system

**Given** sprint velocity drops below a configurable threshold (e.g., trending below 70% of committed points)
**When** the system detects the velocity drop mid-sprint
**Then** a notification is sent to the project lead with the current velocity data

**Given** a scope change occurs (issues added/removed mid-sprint)
**When** the scope change event is processed
**Then** a notification is sent to the project lead detailing the change

**Given** sprint notifications
**When** they are delivered
**Then** they follow existing notification system patterns (channels, formatting, delivery)
**And** notification preferences are configurable per user
