# Story zh-7.1: Sprint Events in Activity Feed

Status: done

## Story

As a project lead,
I want sprint lifecycle events (sprint started, sprint completed, velocity milestone) visible in the existing activity feed,
So that sprint progress is part of the overall platform activity stream.

## Acceptance Criteria (BDD)

### AC1: Sprint Lifecycle Events Published to Activity Feed

**Given** a sprint lifecycle event occurs (sprint started, sprint completed, velocity milestone reached)
**When** the event is processed by the sprint module
**Then** a corresponding activity feed entry is published through the existing activity feed system
**And** the entry includes: event type, sprint name, key metrics (e.g., velocity for completion events), and timestamp

### AC2: Chronological Integration with Existing Events

**Given** the activity feed includes sprint events
**When** a user views their activity feed
**Then** sprint events appear chronologically alongside existing contribution events
**And** sprint events are visually distinct but follow existing activity feed formatting patterns

### AC3: Permission-Based Visibility

**Given** a user without `SprintDashboard` read permission
**When** they view their activity feed
**Then** they do not see sprint-level events (only their own contribution-related sprint context if permitted)

## Tasks / Subtasks

### Task 1: Extend ActivityEventType Enum in Prisma Schema (AC: #1, #2)

- [x] 1.1 Add `SPRINT_STARTED`, `SPRINT_COMPLETED`, `SPRINT_VELOCITY_MILESTONE` to `ActivityEventType` enum in `apps/api/prisma/schema.prisma` (line ~143)
- [x] 1.2 Create migration: `npx prisma migrate dev --name add_sprint_activity_event_types`
- [x] 1.3 Regenerate Prisma client

### Task 2: Update Shared Types & Schemas (AC: #1, #2)

- [x] 2.1 Add `SPRINT_STARTED`, `SPRINT_COMPLETED`, `SPRINT_VELOCITY_MILESTONE` to `ActivityEventType` union in `packages/shared/src/types/activity.types.ts`
- [x] 2.2 Add new values to `activityEventTypeEnum` in `packages/shared/src/schemas/activity.schema.ts`
- [x] 2.3 Add `SprintActivityPayload` interface to `packages/shared/src/types/sprint.types.ts`:
  - `eventType: 'sprint.lifecycle.started' | 'sprint.lifecycle.completed' | 'sprint.velocity.milestone'`
  - `timestamp: string`
  - `correlationId: string`
  - `payload: { sprintId: string; sprintName: string; velocity?: number; committedPoints?: number; deliveredPoints?: number }`
- [x] 2.4 Export `SprintActivityPayload` from `packages/shared/src/index.ts`

### Task 3: Add Sprint Lifecycle Event Detection (AC: #1)

- [x] 3.1 Create `apps/api/src/modules/sprint/sprint-lifecycle.service.ts`:
  - Listen to `zenhub.poll.completed` via `@OnEvent`
  - Query `SprintMetric` table for sprints whose `sprintStart <= now < sprintEnd` (active) and sprints where `sprintEnd < now` (completed)
  - Track known sprint states in-memory or via a lightweight `PlatformSetting` key (`sprint.known_states`)
  - Emit `sprint.lifecycle.started` when a new active sprint is detected (not previously known)
  - Emit `sprint.lifecycle.completed` when a sprint transitions to completed (sprintEnd has passed and was previously active)
  - Emit `sprint.velocity.milestone` when `deliveredPoints` crosses configurable thresholds (e.g., 50%, 75%, 100% of committedPoints)
- [x] 3.2 Register `SprintLifecycleService` as provider in `apps/api/src/modules/sprint/sprint.module.ts`
- [x] 3.3 Add `SettingsModule` import to `sprint.module.ts` (for PlatformSetting access via SettingsService)

### Task 4: Add Sprint Event Handlers to ActivityService (AC: #1)

- [x] 4.1 Add event handlers in `apps/api/src/modules/activity/activity.service.ts`:
  - `@OnEvent('sprint.lifecycle.started')` → creates `SPRINT_STARTED` activity event
  - `@OnEvent('sprint.lifecycle.completed')` → creates `SPRINT_COMPLETED` activity event with velocity in metadata
  - `@OnEvent('sprint.velocity.milestone')` → creates `SPRINT_VELOCITY_MILESTONE` activity event with milestone percentage in metadata
- [x] 4.2 For sprint events, use a system contributor ID. Create a helper to resolve the first admin contributor for `contributorId` (required FK). Alternatively use the `entityId` as `sprintId` and associate with the admin/lead who configured the sprint.
  - Pattern: Query `Contributor` where role = `ADMIN`, take first, use as `contributorId`. Log a warning if no admin exists.
- [x] 4.3 Sprint events use domain `Technology` as default (sprint is cross-domain). Set `contributionType` to `null`.

### Task 5: Permission-Based Filtering for Sprint Events (AC: #3)

- [x] 5.1 Modify `getFeed()` in `activity.service.ts` to accept an optional `excludeEventTypes?: string[]` parameter
- [x] 5.2 In `activity.controller.ts`, inject `CaslAbilityFactory` or use the request's ability from the guard. Check if user `can(Action.Read, 'SprintDashboard')`. If NOT, add `SPRINT_STARTED`, `SPRINT_COMPLETED`, `SPRINT_VELOCITY_MILESTONE` to `excludeEventTypes`.
- [x] 5.3 In `getFeed()`, apply `NOT IN` filter on `eventType` when `excludeEventTypes` is non-empty
- [x] 5.4 Public feed (`getPublicFeed`) must also exclude sprint events (public endpoint has no auth)

### Task 6: Update Activity Item Frontend Rendering (AC: #2)

- [x] 6.1 Add sprint event labels to `EVENT_TYPE_LABELS` map in `apps/web/components/features/activity-feed/activity-item.tsx`:
  - `SPRINT_STARTED`: 'Sprint Started'
  - `SPRINT_COMPLETED`: 'Sprint Completed'
  - `SPRINT_VELOCITY_MILESTONE`: 'Velocity Milestone'
- [x] 6.2 Sprint events render with a sprint-specific icon/badge (use a distinct color like `#7C3AED` purple to differentiate from domain colors). Show sprint name in title and velocity/milestone data in description when available from metadata.

### Task 7: Unit & Integration Tests (AC: #1, #2, #3)

- [x] 7.1 Create `apps/api/src/modules/sprint/sprint-lifecycle.service.spec.ts`:
  - Test: emits `sprint.lifecycle.started` when new active sprint detected
  - Test: emits `sprint.lifecycle.completed` when sprint end passes
  - Test: emits `sprint.velocity.milestone` at threshold crossings
  - Test: does not re-emit for already-known sprint states
- [x] 7.2 Add tests to `apps/api/src/modules/activity/activity.service.spec.ts`:
  - Test: `handleSprintStarted` creates SPRINT_STARTED activity event
  - Test: `handleSprintCompleted` creates SPRINT_COMPLETED with velocity metadata
  - Test: `handleVelocityMilestone` creates SPRINT_VELOCITY_MILESTONE
- [x] 7.3 Add tests to `apps/api/src/modules/activity/activity.controller.spec.ts`:
  - Test: users without SprintDashboard permission do not see sprint events
  - Test: users with SprintDashboard permission see sprint events
  - Test: public feed excludes sprint events
- [x] 7.4 Update `apps/web/components/features/activity-feed/activity-feed.test.tsx`:
  - Test: sprint event items render with correct labels and visual treatment

## Dev Notes

### Architecture Requirements

- **Monorepo**: pnpm + Turbo. Backend: NestJS v11. Frontend: Next.js. ORM: Prisma v7.4. Testing: Vitest v4.0.
- **Event-driven**: NestJS `@nestjs/event-emitter` for internal events. `@OnEvent` decorators for handlers. EventEmitter2 for emitting.
- **Activity feed pattern**: `ActivityService.createActivityEvent()` writes to DB + publishes to Redis `activity-feed` channel for SSE. All handlers follow try/catch with logger.error pattern (see feedback, evaluation handlers).
- **Sprint module events currently emitted**: `sprint.velocity.calculated`, `sprint.burndown.calculated`, `sprint.metrics.recalculated`, `sprint.scope.changed`, `sprint.estimation.calculated`, `sprint.contribution.enriched`, `sprint.planning.reliability.calculated`, `sprint.collaboration.detected`.
- **Zenhub module events**: `zenhub.webhook.received`, `zenhub.poll.completed`, `zenhub.poll.failed`.
- **CASL permissions**: `SprintDashboard` read = project leads + admins. `SprintMetric` read = own data for contributors. Defined in `apps/api/src/modules/auth/casl/ability.factory.ts`.

### Existing Patterns to Follow

- **Event handler pattern** (from `activity.service.ts`): `@OnEvent('event.name')` → async handler → call `createActivityEvent()` with proper params. Wrap in try/catch, log errors with module context.
- **ActivityEvent model** requires `contributorId` (UUID FK to Contributor). For system-level events (sprint lifecycle), resolve a system/admin contributor.
- **Prisma enum extension**: Add values to existing enum, create migration, regenerate client.
- **Shared type updates**: Update type union in `packages/shared/src/types/`, update Zod schema in `packages/shared/src/schemas/`, export from `packages/shared/src/index.ts`.
- **Controller permission check**: Use `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility()` for route-level. For conditional filtering within a route, inject ability from request context.

### Project Structure Notes

- API source: `apps/api/src/modules/`
- Shared types: `packages/shared/src/types/`
- Shared schemas: `packages/shared/src/schemas/`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Frontend components: `apps/web/components/features/`
- Frontend hooks: `apps/web/hooks/`
- Tests collocated: `.spec.ts` suffix next to implementation files
- Sprint module: `apps/api/src/modules/sprint/` (15 files)
- Activity module: `apps/api/src/modules/activity/` (6 files)

### Key Files to Touch

- `apps/api/prisma/schema.prisma` — extend `ActivityEventType` enum
- `packages/shared/src/types/activity.types.ts` — extend union type
- `packages/shared/src/schemas/activity.schema.ts` — extend Zod enum
- `packages/shared/src/types/sprint.types.ts` — add `SprintActivityPayload`
- `packages/shared/src/index.ts` — export new type
- `apps/api/src/modules/sprint/sprint-lifecycle.service.ts` — NEW
- `apps/api/src/modules/sprint/sprint-lifecycle.service.spec.ts` — NEW
- `apps/api/src/modules/sprint/sprint.module.ts` — register new service
- `apps/api/src/modules/activity/activity.service.ts` — add 3 event handlers
- `apps/api/src/modules/activity/activity.service.spec.ts` — add tests
- `apps/api/src/modules/activity/activity.controller.ts` — add permission filtering
- `apps/api/src/modules/activity/activity.controller.spec.ts` — add tests
- `apps/web/components/features/activity-feed/activity-item.tsx` — add sprint labels/styling
- `apps/web/components/features/activity-feed/activity-feed.test.tsx` — add tests

### References

- [Source: _bmad-output/planning-artifacts/epics-zenhub-integration.md#Epic 7, Story 7.1]
- [Source: apps/api/src/modules/activity/activity.service.ts] — existing event handler patterns
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts] — SprintDashboard permission
- [Source: packages/shared/src/types/sprint.types.ts] — existing sprint event interfaces
- [Source: apps/api/src/modules/sprint/sprint-metrics.service.ts] — sprint event emissions

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Prisma migrate dev failed due to shadow DB issue with legacy migration; created migration SQL manually
- All 17 pre-existing test failures are in unrelated files (redis, planning-reliability, zenhub-alerts, zenhub-sync-log, ability.factory)

### Completion Notes List

- Task 1: Extended Prisma ActivityEventType enum with 3 new sprint values; manual migration created
- Task 2: Updated shared types and Zod schemas for new event types
- Task 3: Created SprintLifecycleService — detects sprint transitions after each poll via PlatformSetting state tracking
- Task 4: Added 3 sprint event handlers to ActivityService with system contributor resolution
- Task 5: Added excludeEventTypes filtering; controller checks SprintDashboard permission; public feed always excludes sprint events
- Task 6: Updated activity-item.tsx with sprint labels and purple (#7C3AED) accent color
- Task 7: All 68 new/updated tests passing (36 backend + 32 frontend)

### Change Log

- 2026-03-16: Story implementation complete — all 7 tasks done, 68 tests passing

### File List

- apps/api/prisma/schema.prisma (modified)
- apps/api/prisma/migrations/20260316000000_add_sprint_activity_event_types/migration.sql (new)
- packages/shared/src/types/activity.types.ts (modified)
- packages/shared/src/schemas/activity.schema.ts (modified)
- packages/shared/src/types/sprint.types.ts (modified)
- packages/shared/src/index.ts (modified)
- apps/api/src/modules/sprint/sprint-lifecycle.service.ts (new)
- apps/api/src/modules/sprint/sprint-lifecycle.service.spec.ts (new)
- apps/api/src/modules/sprint/sprint.module.ts (modified)
- apps/api/src/modules/activity/activity.service.ts (modified)
- apps/api/src/modules/activity/activity.service.spec.ts (modified)
- apps/api/src/modules/activity/activity.controller.ts (modified)
- apps/api/src/modules/activity/activity.controller.spec.ts (modified)
- apps/web/components/features/activity-feed/activity-item.tsx (modified)
- apps/web/components/features/activity-feed/activity-feed.test.tsx (modified)
