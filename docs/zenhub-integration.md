# Zenhub Integration

User guide for the Zenhub integration in the Edin platform.

## Overview

The Zenhub integration connects the Edin platform to Zenhub to:

- Receive Zenhub events in real time via webhooks (with HMAC-SHA256 verification)
- Synchronize sprints and issues through periodic polling (configurable interval, default 15 min)
- Calculate sprint metrics (velocity, burndown, scope changes, estimation accuracy)
- Automatically create Edin tasks from Zenhub issues (bidirectional sync)
- Synchronize statuses and story points between both systems
- Monitor integration health with alerts and conflict resolution

## Initial Setup

### Prerequisites

- A Zenhub account with API access
- A Zenhub API token (GraphQL API)
- Administrator permissions on Edin (`Action.Manage('IntegrationConfig')`)

### Step 1 — Configure in the Edin Admin Panel

Navigate to **Admin > Sprints > Configuration** (`/admin/sprints/configuration`).

Fill in the following fields:

| Field                 | Description                         | Constraints                                                    |
| --------------------- | ----------------------------------- | -------------------------------------------------------------- |
| **API Token**         | Zenhub GraphQL API token            | Displayed masked (last 4 characters)                           |
| **Webhook URL**       | URL where Zenhub sends events       | Auto-generated: `https://<your-domain>/api/v1/webhooks/zenhub` |
| **Webhook Secret**    | Shared secret for HMAC verification | Minimum 16 characters                                          |
| **Polling Interval**  | Automatic polling frequency         | 1 to 60 minutes (default: 15 min)                              |
| **Workspace Mapping** | workspace_id to domain association  | JSON format: `{ "workspace_id": "domain_name" }`               |

### Step 2 — Configure in Zenhub

1. In Zenhub, create an integration/application
2. Enter the Edin webhook URL
3. Copy the webhook secret
4. Go back to Edin and paste the secret

### Step 3 — Verify the Connection

Go to **Admin > Sprints > Monitoring** (`/admin/sprints/monitoring`) to:

- Verify that the overall status is `healthy`
- Confirm the first webhook was received in the sync logs
- Verify the first polling succeeded

### Environment Variables (Optional)

Configuration is primarily done through the admin panel. Environment variables can be used as a fallback:

```env
ZENHUB_API_TOKEN=<your-token>
ZENHUB_WEBHOOK_SECRET=<secret>
ZENHUB_POLLING_INTERVAL_MS=900000
ZENHUB_WORKSPACE_ID=<workspace-id>
```

The resolution hierarchy is: database settings > environment variables > default values.

## Task Synchronization

### Automatic Task Creation

To have Zenhub issues automatically create Edin tasks:

1. Enable `taskSyncEnabled` in the configuration
2. Set `contributorTaskLabel` (e.g., `"edin-contributor-task"`) — only issues with this label will be synced
3. Set `taskSyncCreatorId` — the UUID of the Edin user who will author the created tasks
4. Tag the relevant Zenhub issues with the configured label

On the next polling cycle, matching issues will create Edin tasks with:

- Title: Zenhub issue title
- Status: `AVAILABLE`
- Difficulty: `INTERMEDIATE`
- Domain: inferred from workspace mapping
- Link: `zenhubIssueId` field (unique constraint)

### Status Synchronization

To synchronize Zenhub statuses to Edin:

1. Enable `statusSyncEnabled`
2. (Optional) Customize the pipeline mapping

**Default mapping:**

| Zenhub Pipeline | Edin Status |
| --------------- | ----------- |
| Backlog         | AVAILABLE   |
| Sprint Backlog  | AVAILABLE   |
| In Progress     | IN_PROGRESS |
| In Review       | IN_PROGRESS |
| Done            | COMPLETED   |

Terminal Edin statuses (`EVALUATED`, `RETIRED`) are never overwritten by synchronization.

### Story Points Synchronization

Zenhub estimates (`estimate.value`) are automatically synced to the `estimatedEffort` field of linked tasks.

## Sprint Metrics

### Main Dashboard

Accessible via **Admin > Sprints** (`/admin/sprints`), the dashboard displays:

- **Velocity** — Points delivered per sprint, trend across multiple sprints
- **Burndown** — Remaining points curve during the sprint
- **Scope changes** — Issues added/removed mid-sprint
- **Estimation accuracy** — Percentage of issues delivered at planned story points

### Domain Filtering

All views support a domain filter, based on the configured workspace mapping.

### Sprint Detail View

**Admin > Sprints > [Sprint ID]** (`/admin/sprints/{sprintId}`):

- Detailed metrics for the selected sprint
- Contributor breakdown
- Scope change timeline
- Pipeline transitions

### Contributor Metrics

**Admin > Sprints > Contributors** (`/admin/sprints/contributors`):

- Estimation accuracy trends
- Velocity trends
- Planning reliability scores
- Personal contribution tracking

### Individual Contributor View

**Dashboard > Sprint Metrics** (`/dashboard/sprint-metrics`):

- Personal sprint metrics
- Velocity, accuracy, and reliability charts

### Export

An export button generates a PDF report of sprint metrics.

## Monitoring and Alerts

### Health Panel

**Admin > Sprints > Monitoring** (`/admin/sprints/monitoring`) displays:

| Indicator                    | Description                                |
| ---------------------------- | ------------------------------------------ |
| **Overall status**           | `healthy` / `degraded` / `down`            |
| **Last successful poll**     | Timestamp of the last successful execution |
| **Last successful webhook**  | Timestamp of the last processed webhook    |
| **Webhook success rate**     | Percentage over the last 24 hours          |
| **Average polling duration** | Average execution time                     |

### Alerts

Two types of automatic alerts:

1. **Webhook failure rate** — Triggers if the failure rate exceeds the threshold (default: 1%). Escalates to `CRITICAL` at 5x the threshold.
2. **Polling timeout** — Triggers if no successful poll within N minutes (default: 60 min). Escalates to `CRITICAL` at 2x the threshold.

Alert configuration via **Monitoring > Alert Config**:

- `webhookFailureThreshold` — Failure rate threshold (%)
- `pollingTimeoutMinutes` — Timeout without successful poll (minutes)
- `enabled` — Enable/disable alerts

Alerts can be dismissed (hidden for 24 hours).

### Sync Logs

The log table displays all sync operations (webhooks, polls, backfills) with:

- Sync type, status, event type
- Received and processed timestamps
- Error messages (if any)
- Correlation ID for tracing

Available filters: sync type, status, event type, date range, correlation ID.

### Sync Conflicts

When a status misalignment is detected between Edin and Zenhub, a conflict is created.

Available resolutions:

- **keep-edin** — Keep the Edin status
- **apply-status** — Apply the Zenhub status

Resolutions are recorded with the administrator's ID and a timestamp.

## Manual Backfill

To import Zenhub history or resynchronize data:

- **Endpoint**: `POST /api/v1/admin/zenhub-backfill`
- **Optional parameters**: date range
- **Status**: `GET /api/v1/admin/zenhub-backfill/status`

The backfill uses the same pipeline as polling with duplicate handling.

## Webhook Secret Rotation

The system supports webhook secret rotation without downtime:

1. Update the secret in Edin configuration
2. The old secret remains valid for **24 hours**
3. Update the secret in Zenhub
4. Both secrets are accepted during the transition window

## Reliability and Error Handling

### Webhooks

- **Idempotency**: Each webhook has a unique `deliveryId`. Duplicates are detected and ignored.
- **HMAC verification**: Timing-safe comparison to prevent timing attacks.
- **Rate limiting**: 100 requests per second.

### Polling

- **Retry**: 3 attempts with exponential backoff (60s, 120s, 240s)
- **Zenhub rate limit**: 2 retries on HTTP 429 respecting the `Retry-After` header
- **Dead Letter Queue**: Polls that fail after all retries are placed in the DLQ

### Task Sync

- Errors on an individual task do not interrupt processing of the others
- Conflicts are recorded for manual resolution

## API Endpoints

| Method  | Route                                                | Description                |
| ------- | ---------------------------------------------------- | -------------------------- |
| `GET`   | `/api/v1/admin/zenhub-config`                        | Retrieve configuration     |
| `PATCH` | `/api/v1/admin/zenhub-config`                        | Update configuration       |
| `POST`  | `/api/v1/webhooks/zenhub`                            | Receive Zenhub webhooks    |
| `GET`   | `/api/v1/admin/zenhub-sync-logs`                     | List sync logs             |
| `GET`   | `/api/v1/admin/zenhub-sync-logs/health`              | Integration health summary |
| `GET`   | `/api/v1/admin/zenhub-alerts`                        | Active alerts              |
| `GET`   | `/api/v1/admin/zenhub-alerts/config`                 | Alert configuration        |
| `PATCH` | `/api/v1/admin/zenhub-alerts/config`                 | Update alert configuration |
| `GET`   | `/api/v1/admin/zenhub-alerts/conflicts`              | Sync conflicts             |
| `PATCH` | `/api/v1/admin/zenhub-alerts/conflicts/{id}/resolve` | Resolve a conflict         |
| `POST`  | `/api/v1/admin/zenhub-alerts/dismiss/{alertId}`      | Dismiss an alert (24h)     |
| `POST`  | `/api/v1/admin/zenhub-backfill`                      | Trigger a manual backfill  |
| `GET`   | `/api/v1/admin/zenhub-backfill/status`               | Current backfill status    |

## Technical Architecture

### Key Files

| Component            | Path                                                        |
| -------------------- | ----------------------------------------------------------- |
| Zenhub Module        | `apps/api/src/modules/zenhub/zenhub.module.ts`              |
| Config Controller    | `apps/api/src/modules/zenhub/zenhub-config.controller.ts`   |
| Config Service       | `apps/api/src/modules/zenhub/zenhub-config.service.ts`      |
| Webhook Controller   | `apps/api/src/modules/zenhub/zenhub-webhook.controller.ts`  |
| Webhook Service      | `apps/api/src/modules/zenhub/zenhub-webhook.service.ts`     |
| Polling Service      | `apps/api/src/modules/zenhub/zenhub-polling.service.ts`     |
| GraphQL Client       | `apps/api/src/modules/zenhub/zenhub-graphql.client.ts`      |
| Task Sync Service    | `apps/api/src/modules/zenhub/zenhub-task-sync.service.ts`   |
| Sync Log Service     | `apps/api/src/modules/zenhub/zenhub-sync-log.service.ts`    |
| Alerts Service       | `apps/api/src/modules/zenhub/zenhub-alerts.service.ts`      |
| Backfill Controller  | `apps/api/src/modules/zenhub/zenhub-backfill.controller.ts` |
| Sprint Module        | `apps/api/src/modules/sprint/`                              |
| Prisma Schema        | `apps/api/prisma/schema.prisma`                             |
| Dashboard Components | `apps/web/components/features/sprint-dashboard/`            |
| Frontend Hooks       | `apps/web/hooks/use-sprint-metrics.ts`                      |

### Emitted Events

| Event                           | Trigger                        |
| ------------------------------- | ------------------------------ |
| `zenhub.config.updated`         | Configuration updated          |
| `zenhub.webhook.received`       | Webhook received               |
| `zenhub.poll.completed`         | Polling completed successfully |
| `zenhub.poll.failed`            | Polling failed                 |
| `zenhub.task.created`           | Task auto-created from Zenhub  |
| `zenhub.task.status.synced`     | Task status synchronized       |
| `zenhub.task.points.synced`     | Story points synchronized      |
| `sprint.sync.conflict.resolved` | Conflict resolved              |
