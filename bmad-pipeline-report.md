# BMAD Pipeline Report: Story zh-7-2

**Story:** zh-7-2-sprint-notifications
**Epic:** zh-Epic 7 — Sprint Activity & Notifications (Phase 2)
**Pipeline:** bmad-cycle (create-story -> dev-story -> code-review)
**Date:** 2026-03-16
**Model:** Claude Opus 4.6 (1M context)

## Pipeline Steps

### Step 1: Create Story

- **Status:** Completed
- **Output:** `_bmad-output/implementation-artifacts/zh-7-2-sprint-notifications.md`
- 4 acceptance criteria (BDD), 7 tasks with subtasks
- Covers FR50 (sprint-related notifications via existing notification system)
- Extends SprintLifecycleService for deadline/velocity detection, adds NotificationService handlers

### Step 2: Dev Story (Implementation)

- **Status:** Completed (no retries needed)
- **Files modified:** 12 (1 new, 11 modified)

**New Files (1):**

- `apps/api/prisma/migrations/20260316100000_add_sprint_notification_types/migration.sql` — Adds SPRINT_DEADLINE_APPROACHING, SPRINT_VELOCITY_DROP, SPRINT_SCOPE_CHANGED to NotificationType enum

**Modified Files (11):**

- `apps/api/prisma/schema.prisma` — Extended NotificationType enum with 3 sprint notification values
- `packages/shared/src/types/notification.types.ts` — Added 3 types to NotificationType union, 'sprints' to NotificationCategory
- `packages/shared/src/schemas/notification.schema.ts` — Extended Zod enums for types and category
- `packages/shared/src/types/sprint.types.ts` — Added SprintNotificationEvent interface
- `packages/shared/src/index.ts` — Exported SprintNotificationEvent
- `apps/api/src/modules/sprint/sprint-lifecycle.service.ts` — Added deadline approaching and velocity drop detection with configurable thresholds via PlatformSetting
- `apps/api/src/modules/sprint/sprint-lifecycle.service.spec.ts` — Added 7 tests for notification detection
- `apps/api/src/modules/notification/notification.service.ts` — Added 3 sprint event handlers with cached recipient resolution
- `apps/api/src/modules/notification/notification.service.spec.ts` — Added 5 sprint notification handler tests
- `apps/web/components/features/notification/notification-toast.tsx` — Added sprints category routing to /admin/sprints
- `apps/web/components/features/notification/notification.test.tsx` — Added sprint routing test

### Step 3: Code Review

- **Status:** Completed — 3 review layers ran in parallel (Blind Hunter, Edge Case Hunter, Acceptance Auditor)
- **Raw findings:** 16 total
- **Triage result:** 0 intent_gap, 0 bad_spec, 2 patch, 4 defer, 12 rejected as noise

**Patches Applied:**

| #   | Source  | Issue                                                              | Fix Applied                                                                       |
| --- | ------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | edge    | SprintMetric lookup returns null for scope change — no log warning | Added `logger.warn()` when fallback to sprintId                                   |
| 2   | auditor | Missing test for configurable velocity drop threshold              | Added test verifying custom `sprint.velocity_drop_threshold` from PlatformSetting |

**Deferred (pre-existing patterns, not caused by this change):**

- `as never[]` type cast pattern for Prisma role filtering (used throughout codebase)
- Recipient cache not invalidated on role changes (5-min TTL is acceptable tradeoff)
- Settings loaded every poll cycle without per-method caching (settings service may cache internally)
- Frontend routing fallback for unknown categories (pre-existing pattern)

## Final Status

- **Story status:** done
- **Sprint status:** zh-7-2-sprint-notifications -> done
- **Epic status:** zh-epic-7 -> done (2/2 stories complete)

## Test Results

| Suite                             | Tests   | Status       |
| --------------------------------- | ------- | ------------ |
| sprint-lifecycle.service.spec.ts  | 13      | PASS         |
| notification.service.spec.ts      | 23      | PASS         |
| activity.service.spec.ts          | 22      | PASS         |
| activity.controller.spec.ts       | 10      | PASS         |
| notification.test.tsx (frontend)  | 18      | PASS         |
| activity-feed.test.tsx (frontend) | 32      | PASS         |
| **Total**                         | **118** | **ALL PASS** |

## Auto-Approve Criteria

- [x] Green tests (118 tests, zero regressions)
- [x] Consistent with existing architecture (event-driven, BullMQ, Redis SSE, CASL permissions)
- [x] Code review: 2 patches applied, all findings resolved
- [x] No new npm dependencies
- [x] 1 Prisma migration (enum extension only)
- [x] 0 retries needed

## Key Architecture Compliance

- **Event flow (deadline/velocity):** `zenhub.poll.completed` -> `SprintLifecycleService` -> `sprint.notification.deadline` / `sprint.notification.velocity_drop` -> `NotificationService` handlers -> BullMQ queue -> Prisma + Redis SSE
- **Event flow (scope change):** `sprint.scope.changed` (from SprintMetricsService) -> `NotificationService.handleSprintScopeChanged` -> BullMQ queue -> Prisma + Redis SSE
- **Recipient targeting:** ADMIN + WORKING_GROUP_LEAD roles (matching CASL `SprintDashboard` read permission), cached 5 minutes
- **Configurable thresholds:** `sprint.deadline_notification_hours` (default 48), `sprint.velocity_drop_threshold` (default 0.7) via PlatformSetting
- **State tracking:** Extended `sprint.known_states` with `deadlineNotified` and `velocityDropNotified` flags (idempotent, one-shot per sprint)
- **Notification category:** `'sprints'` — new category for all sprint notifications
- **Frontend:** Sprint notifications route to `/admin/sprints` dashboard
