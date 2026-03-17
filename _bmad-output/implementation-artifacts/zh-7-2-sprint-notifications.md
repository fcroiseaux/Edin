# Story zh-7.2: Sprint Notifications

Status: done

## Story

As a project lead,
I want to receive notifications for sprint-related events (approaching deadline, velocity drop, scope change),
So that I can respond to sprint issues proactively without constantly monitoring the dashboard.

## Acceptance Criteria (BDD)

### AC1: Sprint Deadline Approaching Notification

**Given** a sprint deadline is approaching (configurable threshold, default 48 hours before sprint end)
**When** the system detects the approaching deadline during poll processing
**Then** a notification is sent to all contributors with `SprintDashboard` read permission
**And** the notification includes: sprint name, time remaining, committed vs delivered points
**And** the notification is not re-sent for the same sprint deadline

### AC2: Velocity Drop Notification

**Given** sprint velocity is trending below a configurable threshold (default 70% of committed points)
**When** the system detects the velocity drop mid-sprint (delivered/committed ratio below threshold with >50% of sprint elapsed)
**Then** a notification is sent to all contributors with `SprintDashboard` read permission
**And** the notification includes: sprint name, current delivery percentage, committed points, delivered points
**And** the notification is sent at most once per sprint per threshold crossing

### AC3: Scope Change Notification

**Given** a scope change occurs (issues added/removed mid-sprint)
**When** the `sprint.scope.changed` event is processed
**Then** a notification is sent to all contributors with `SprintDashboard` read permission
**And** the notification includes: sprint name, change type (added/removed), story points affected

### AC4: Notification System Integration

**Given** sprint notifications
**When** they are delivered
**Then** they follow existing notification system patterns (BullMQ queue, Redis Pub/Sub SSE, Prisma DB)
**And** they use the `sprints` notification category
**And** they appear in the notification inbox alongside other notifications
**And** notification preferences are configurable per user (future — not in scope for this story)

## Tasks / Subtasks

### Task 1: Extend NotificationType Enum in Prisma Schema (AC: #1, #2, #3, #4)

- [x] 1.1 Add `SPRINT_DEADLINE_APPROACHING`, `SPRINT_VELOCITY_DROP`, `SPRINT_SCOPE_CHANGED` to `NotificationType` enum in `apps/api/prisma/schema.prisma` (line ~168)
- [x] 1.2 Create migration: `npx prisma migrate dev --name add_sprint_notification_types`
- [x] 1.3 Regenerate Prisma client

### Task 2: Update Shared Types & Schemas (AC: #1, #2, #3, #4)

- [x] 2.1 Add `SPRINT_DEADLINE_APPROACHING`, `SPRINT_VELOCITY_DROP`, `SPRINT_SCOPE_CHANGED` to `NotificationType` union in `packages/shared/src/types/notification.types.ts`
- [x] 2.2 Add `'sprints'` to `NotificationCategory` union in same file
- [x] 2.3 Add new values to `notificationTypeEnum` in `packages/shared/src/schemas/notification.schema.ts`
- [x] 2.4 Add `'sprints'` to `notificationCategoryEnum` in same file
- [x] 2.5 Add `SprintNotificationEvent` interface to `packages/shared/src/types/sprint.types.ts`:
  - `eventType: 'sprint.notification.deadline' | 'sprint.notification.velocity_drop' | 'sprint.notification.scope_changed'`
  - `timestamp: string`
  - `correlationId: string`
  - `payload: { sprintId: string; sprintName: string; ... }` (event-specific fields)
- [x] 2.6 Export `SprintNotificationEvent` from `packages/shared/src/index.ts`

### Task 3: Extend SprintLifecycleService for Notification Events (AC: #1, #2)

- [x] 3.1 In `apps/api/src/modules/sprint/sprint-lifecycle.service.ts`, add detection logic within the existing `@OnEvent('zenhub.poll.completed')` handler:
  - **Deadline approaching**: For each active sprint, check if `sprintEnd - now <= deadlineThresholdHours` (load from PlatformSetting key `sprint.deadline_notification_hours`, default `48`). If approaching and not yet notified for this sprint, emit `sprint.notification.deadline`.
  - **Velocity drop**: For each active sprint where `>50%` of sprint duration elapsed, check if `deliveredPoints / committedPoints < velocityDropThreshold` (load from PlatformSetting key `sprint.velocity_drop_threshold`, default `0.7`). If dropping and not yet notified for this sprint, emit `sprint.notification.velocity_drop`.
- [x] 3.2 Extend the known states structure (`sprint.known_states` PlatformSetting) to track: `{ deadlineNotified: boolean, velocityDropNotified: boolean }` alongside existing `status` and `milestonesEmitted`
- [x] 3.3 Add new PlatformSetting keys: `sprint.deadline_notification_hours` (default 48), `sprint.velocity_drop_threshold` (default 0.7)
- [x] 3.4 Update `sprint-lifecycle.service.spec.ts` with tests for deadline and velocity drop detection

### Task 4: Add Sprint Notification Handlers to NotificationService (AC: #1, #2, #3, #4)

- [x] 4.1 In `apps/api/src/modules/notification/notification.service.ts`, add 3 event handlers:
  - `@OnEvent('sprint.notification.deadline')` → Resolve recipients (contributors with `SprintDashboard` read permission: ADMIN + WORKING_GROUP_LEAD roles). Create `SPRINT_DEADLINE_APPROACHING` notification for each. Use `addBulk()` pattern from announcement handler.
  - `@OnEvent('sprint.notification.velocity_drop')` → Same recipients. Create `SPRINT_VELOCITY_DROP` notification for each.
  - `@OnEvent('sprint.scope.changed')` → Same recipients. Create `SPRINT_SCOPE_CHANGED` notification for each.
- [x] 4.2 All sprint notifications use:
  - `category: 'sprints'`
  - `entityId: sprintId`
  - `correlationId` from event payload
- [x] 4.3 Add a private helper `resolveSprintNotificationRecipients()` that queries contributors with ADMIN or WORKING_GROUP_LEAD roles (matching CASL `SprintDashboard` read permission). Cache result for 5 minutes (same pattern as `resolveSystemContributorId` in activity.service.ts).
- [x] 4.4 Notification titles and descriptions:
  - Deadline: title=`"Sprint deadline approaching: {sprintName}"`, description=`"{hoursRemaining}h remaining — {deliveredPoints}/{committedPoints} points delivered"`
  - Velocity drop: title=`"Sprint velocity alert: {sprintName}"`, description=`"Delivery at {percentage}% of committed ({deliveredPoints}/{committedPoints} points)"`
  - Scope change: title=`"Sprint scope changed: {sprintName}"`, description=`"Issue {changeType}: {storyPoints} story points {changeType === 'ADDED' ? 'added to' : 'removed from'} sprint"`

### Task 5: Import NotificationModule in SprintModule (AC: #4)

- [x] 5.1 The NotificationService listens to events via EventEmitter2 — no module import needed since events are decoupled. But verify that the `notification` module is registered in the root AppModule and that events emitted from sprint module are globally visible. This should already work since both modules use `@nestjs/event-emitter` which is global.

### Task 6: Update Frontend Notification Components (AC: #4)

- [x] 6.1 In `apps/web/components/features/notification/notification-toast.tsx`, handle `sprints` category in `handleClick()` — route to `/admin/sprints` (sprint dashboard is in admin area)
- [x] 6.2 In `apps/web/components/features/notification/notification-inline-list.tsx`, the component already accepts category prop — verified `'sprints'` works
- [x] 6.3 Verify that the notification-badge, use-notifications hook, and use-notification-sse hook all work with the new `'sprints'` category (they do since category is string-typed in the DB)

### Task 7: Unit Tests (AC: #1, #2, #3, #4)

- [x] 7.1 Extend `apps/api/src/modules/sprint/sprint-lifecycle.service.spec.ts`:
  - Test: emits `sprint.notification.deadline` when sprint end approaches within threshold
  - Test: does NOT emit deadline notification if already notified
  - Test: emits `sprint.notification.velocity_drop` when velocity drops below threshold mid-sprint
  - Test: does NOT emit velocity drop if sprint is <50% elapsed
  - Test: does NOT re-emit velocity drop for already-notified sprint
  - Test: loads configurable thresholds from PlatformSetting
- [x] 7.2 Add tests to `apps/api/src/modules/notification/notification.service.spec.ts`:
  - Test: `handleSprintDeadlineApproaching` sends notifications to admins and WG leads
  - Test: `handleSprintVelocityDrop` sends notifications to admins and WG leads
  - Test: `handleSprintScopeChanged` sends notifications to admins and WG leads
  - Test: uses `addBulk()` for batch enqueueing
  - Test: no notifications sent if no eligible recipients
- [x] 7.3 Verify `apps/web/components/features/notification/` components handle new category (added sprint route test in notification.test.tsx)

## Dev Notes

### Architecture Requirements

- **Monorepo**: pnpm + Turbo. Backend: NestJS v11. Frontend: Next.js. ORM: Prisma v7.4. Testing: Vitest v4.0.
- **Event-driven**: NestJS `@nestjs/event-emitter` for internal events. `@OnEvent` decorators for handlers. EventEmitter2 for emitting. Events are globally visible across all modules.
- **Notification pipeline**: Event → `NotificationService` `@OnEvent` handler → `notificationQueue.add()/addBulk()` → BullMQ `NotificationProcessor` → Prisma `notification.create()` → Redis Pub/Sub `notifications-${contributorId}` → SSE → Frontend.
- **Sprint lifecycle already detects**: sprint started, sprint completed, velocity milestones. This story EXTENDS that service to also detect deadline approaching and velocity drops.
- **Scope change events already emitted**: `sprint.scope.changed` from `SprintMetricsService` — just need to subscribe in `NotificationService`.

### Existing Patterns to Follow

- **Notification event handler pattern** (from `notification.service.ts`): `@OnEvent('event.name')` → async handler → resolve recipients → call `enqueueNotification()` or `notificationQueue.addBulk()`. Wrap in try/catch, log errors with module context.
- **Bulk notification pattern** (from `handleAnnouncementCreated`): Query recipients → filter → `notificationQueue.addBulk(jobs)`. Each job: `{ name: 'send-notification', data: NotificationJobData, opts: { removeOnComplete: true, removeOnFail: false } }`.
- **Admin/Lead recipient resolution**: Query `prisma.contributor.findMany({ where: { role: { in: ['ADMIN', 'WORKING_GROUP_LEAD'] }, isActive: true }, select: { id: true } })`. This matches CASL `SprintDashboard` read permission grants.
- **State tracking**: SprintLifecycleService uses PlatformSetting key `sprint.known_states` to persist JSON state. Extend the per-sprint state object, don't replace.
- **Configurable thresholds**: Use PlatformSetting (like `sprint.velocity_milestone_thresholds`). Load with `settingsService.getSettingValue()` with defaults.

### Critical Constraints

- **Do NOT create a new service** for sprint notification detection. Extend `SprintLifecycleService.detectSprintLifecycleEvents()` — it already runs on every poll completion and has access to sprint state.
- **Do NOT modify** the existing 3 sprint lifecycle event handlers in `ActivityService`. Those handle activity feed events (story zh-7-1). This story adds NEW event handlers in `NotificationService`.
- **Do NOT modify** `NotificationProcessor` or `NotificationSseService` — they are generic and handle any `NotificationType` automatically.
- **Prisma enum migration**: If shadow DB fails (known issue), create SQL manually. Pattern: `ALTER TYPE "core"."NotificationType" ADD VALUE 'SPRINT_DEADLINE_APPROACHING';` etc.
- **category field** in Notification model is a plain `String`, not an enum — so `'sprints'` works without DB migration for the category.

### Project Structure Notes

- API source: `apps/api/src/modules/`
- Shared types: `packages/shared/src/types/`
- Shared schemas: `packages/shared/src/schemas/`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Frontend notification components: `apps/web/components/features/notification/`
- Frontend hooks: `apps/web/hooks/`
- Tests collocated: `.spec.ts` suffix next to implementation files
- Sprint module: `apps/api/src/modules/sprint/`
- Notification module: `apps/api/src/modules/notification/`

### Key Files to Touch

- `apps/api/prisma/schema.prisma` — extend `NotificationType` enum (line ~168)
- `packages/shared/src/types/notification.types.ts` — extend `NotificationType` union + `NotificationCategory` union
- `packages/shared/src/schemas/notification.schema.ts` — extend Zod enums
- `packages/shared/src/types/sprint.types.ts` — add `SprintNotificationEvent` interface
- `packages/shared/src/index.ts` — export new type
- `apps/api/src/modules/sprint/sprint-lifecycle.service.ts` — add deadline + velocity drop detection
- `apps/api/src/modules/sprint/sprint-lifecycle.service.spec.ts` — add tests for new detection
- `apps/api/src/modules/notification/notification.service.ts` — add 3 sprint event handlers
- `apps/api/src/modules/notification/notification.service.spec.ts` — add tests for handlers
- `apps/web/components/features/notification/notification-toast.tsx` — verify sprints category routing

### ScopeChangeEvent Interface (already exists)

From `packages/shared/src/types/sprint.types.ts`:

```typescript
interface ScopeChangeEvent {
  eventType: 'sprint.scope.changed';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    issueId: string;
    changeType: 'ADDED' | 'REMOVED';
    storyPoints: number | null;
  };
}
```

The handler needs the sprint name for the notification title. Either:

1. Look up `SprintMetric` by sprintId to get sprintName, OR
2. Extend `ScopeChangeEvent.payload` to include `sprintName` (preferred — emit it from `SprintMetricsService.recordScopeChange()`)

### Previous Story Intelligence (zh-7-1)

- Prisma migration shadow DB may fail — create SQL manually if needed
- All sprint event handlers in ActivityService use try/catch with `this.logger.error()`
- System contributor resolution pattern: query first ADMIN, cache with TTL
- Sprint lifecycle state tracking via PlatformSetting `sprint.known_states` works reliably
- 68 tests passing (36 backend + 32 frontend) — do not break these

### References

- [Source: _bmad-output/planning-artifacts/epics-zenhub-integration.md#Epic 7, Story 7.2]
- [Source: _bmad-output/planning-artifacts/prd-zenhub-integration.md#FR50]
- [Source: apps/api/src/modules/notification/notification.service.ts] — event handler + bulk enqueue patterns
- [Source: apps/api/src/modules/sprint/sprint-lifecycle.service.ts] — lifecycle detection + state tracking
- [Source: apps/api/src/modules/sprint/sprint-metrics.service.ts] — sprint.scope.changed emission
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts] — SprintDashboard permission (ADMIN + WG_LEAD)
- [Source: packages/shared/src/types/sprint.types.ts] — existing sprint event interfaces
- [Source: packages/shared/src/types/notification.types.ts] — existing notification types

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Prisma migration created manually (SQL ALTER TYPE) following zh-7-1 pattern for shadow DB workaround
- Scope change handler resolves sprint name via SprintMetric lookup (option 1 from Dev Notes)

### Completion Notes List

- Task 1: Extended Prisma NotificationType enum with 3 new sprint notification values; manual migration created
- Task 2: Updated shared types (NotificationType, NotificationCategory unions) and Zod schemas; added SprintNotificationEvent interface
- Task 3: Extended SprintLifecycleService with deadline approaching and velocity drop detection; configurable thresholds via PlatformSetting; idempotent state tracking
- Task 4: Added 3 sprint event handlers to NotificationService with cached recipient resolution (5-min TTL) and addBulk() pattern
- Task 5: Verified NotificationModule registered in AppModule; EventEmitter2 events are globally visible
- Task 6: Updated notification-toast routing for sprints category to /admin/sprints; verified hooks and inline-list compatibility
- Task 7: All 117 tests passing (67 backend + 50 frontend) — 12 new backend tests + 1 new frontend test added

### Change Log

- 2026-03-16: Story implementation complete — all 7 tasks done, 117 tests passing (zero regressions)

### File List

- apps/api/prisma/schema.prisma (modified)
- apps/api/prisma/migrations/20260316100000_add_sprint_notification_types/migration.sql (new)
- packages/shared/src/types/notification.types.ts (modified)
- packages/shared/src/schemas/notification.schema.ts (modified)
- packages/shared/src/types/sprint.types.ts (modified)
- packages/shared/src/index.ts (modified)
- apps/api/src/modules/sprint/sprint-lifecycle.service.ts (modified)
- apps/api/src/modules/sprint/sprint-lifecycle.service.spec.ts (modified)
- apps/api/src/modules/notification/notification.service.ts (modified)
- apps/api/src/modules/notification/notification.service.spec.ts (modified)
- apps/web/components/features/notification/notification-toast.tsx (modified)
- apps/web/components/features/notification/notification.test.tsx (modified)
