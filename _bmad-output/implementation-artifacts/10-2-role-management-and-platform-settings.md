# Story 10.2: Role Management & Platform Settings

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to manage contributor roles and configure platform settings,
so that I can control access, adjust operational parameters, and adapt the platform as the community evolves.

## Acceptance Criteria

1. **Contributor Management List** — Route: `/admin/contributors` (NEW page). Displays contributor list with: name, email, current role, domain, join date, and last activity. List supports search by name/email and filtering by role and domain. Uses cursor-based pagination (default limit 20, max 100).

2. **Role Management** — Selecting a contributor and clicking "Manage Role" opens a confirmation dialog. Admin can assign or change role across the six RBAC tiers: Public, Applicant, Contributor, Founding Contributor, Working Group Lead, Admin (FR49). Role changes require a confirmation dialog with a reason field. Every role change is recorded in the audit log with: admin ID, contributor ID, previous role, new role, reason, timestamp (NFR-S6). A domain event `contributor.role.changed` is emitted. The contributor receives a notification of their role change.

3. **Platform Settings Page** — Route: `/admin/settings` (NEW page — currently only `/admin/settings/scoring` exists as a sub-page). Platform configuration organized into sections (FR50): monitored GitHub repositories (list repos, toggle active monitoring), feedback assignment rules (SLA threshold, maximum concurrent assignments, auto-reassignment timing), onboarding parameters (72-Hour Ignition timeline thresholds, buddy assignment rules), and scoring formula configuration (link to existing `/admin/settings/scoring` page). Each settings change requires confirmation and is recorded in the audit log. Settings changes take effect immediately for new operations but do not retroactively alter existing data.

4. **Settings Update API** — `PATCH /api/v1/admin/settings/:section` updates a settings section. Previous value is archived with timestamp for audit purposes. A domain event `platform.settings.updated` is emitted with the section name and admin ID. Response confirms the update with the new effective value.

5. **Contributor List API** — `GET /api/v1/admin/contributors` returns paginated contributor list with search and filter query params. Uses cursor-based pagination matching the existing codebase pattern.

## Tasks / Subtasks

- [x] Task 1: Shared Types & Constants (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 Add `ContributorListItem`, `ContributorListFilters`, `ContributorListResponse` types to `packages/shared/src/types/admin.types.ts`
  - [x] 1.2 Add `PlatformSettingsSection`, `PlatformSettingsResponse`, `SettingsSectionKey` types to same file
  - [x] 1.3 Add `RoleChangeEvent`, `SettingsUpdatedEvent` event types to same file
  - [x] 1.4 Add admin-related error codes (`ADMIN_SETTINGS_SECTION_NOT_FOUND`, `ADMIN_ROLE_CHANGE_REASON_REQUIRED`) to `packages/shared/src/constants/error-codes.ts`
  - [x] 1.5 Export new types from `packages/shared/src/index.ts`

- [x] Task 2: Contributor List API (AC: #1, #5)
  - [x] 2.1 Create `apps/api/src/modules/admin/contributors.controller.ts` — `GET /api/v1/admin/contributors` with search, role/domain filters, cursor-based pagination
  - [x] 2.2 Create `apps/api/src/modules/admin/contributors.service.ts` — Prisma query with dynamic WHERE clause for search/filter, cursor pagination
  - [x] 2.3 Register controller and service in `apps/api/src/modules/admin/admin.module.ts`

- [x] Task 3: Role Management Enhancement (AC: #2)
  - [x] 3.1 Update `apps/api/src/modules/contributor/dto/update-role.dto.ts` — add required `reason` field to schema
  - [x] 3.2 Update `apps/api/src/modules/contributor/contributor.service.ts` — include `reason` in audit log details, emit `contributor.role.changed` domain event via EventEmitter2
  - [x] 3.3 Update `apps/api/src/modules/contributor/contributor.controller.ts` — pass reason through to service
  - [x] 3.4 Add `@OnEvent('contributor.role.changed')` handler in notification service to notify contributor of role change

- [x] Task 4: Platform Settings API (AC: #3, #4)
  - [x] 4.1 Create `apps/api/src/modules/admin/settings.controller.ts` — `GET /api/v1/admin/settings` (all sections), `GET /api/v1/admin/settings/:section` (single section), `PATCH /api/v1/admin/settings/:section` (update section)
  - [x] 4.2 Create `apps/api/src/modules/admin/settings-admin.service.ts` — wraps existing `SettingsService` with section-based logic, emits `platform.settings.updated` domain event
  - [x] 4.3 Import `SettingsModule` in `AdminModule` to use `SettingsService`
  - [x] 4.4 Register new controller and service in admin module

- [x] Task 5: Backend Tests (AC: #1, #2, #3, #4, #5)
  - [x] 5.1 Create `apps/api/src/modules/admin/contributors.service.spec.ts` — 6+ tests: pagination, search, role filter, domain filter, empty results, cursor encoding
  - [x] 5.2 Create `apps/api/src/modules/admin/contributors.controller.spec.ts` — 5 tests: auth guard, ability guard, query params, response format, pagination
  - [x] 5.3 Create `apps/api/src/modules/admin/settings.controller.spec.ts` — 5 tests: get all sections, get single section, update section, auth guard, invalid section
  - [x] 5.4 Create `apps/api/src/modules/admin/settings-admin.service.spec.ts` — 5 tests: get sections, update with audit, event emission, default values, section validation
  - [x] 5.5 Update `apps/api/src/modules/contributor/contributor.service.spec.ts` — add tests for reason field, event emission
  - [x] 5.6 Update `apps/api/src/modules/contributor/contributor.controller.spec.ts` — add tests for reason validation

- [x] Task 6: Frontend — Contributor Management Page (AC: #1, #2)
  - [x] 6.1 Create `apps/web/components/features/admin/contributors/contributor-list.tsx` — table with search, role/domain filters, pagination
  - [x] 6.2 Create `apps/web/components/features/admin/contributors/role-change-dialog.tsx` — confirmation dialog with role selector and reason field
  - [x] 6.3 Create `apps/web/hooks/use-admin-contributors.ts` — TanStack Query hook for contributor list with search/filter params
  - [x] 6.4 Create `apps/web/app/(admin)/admin/contributors/page.tsx` — compose contributor management page
  - [x] 6.5 Create `apps/web/app/(admin)/admin/contributors/loading.tsx` — skeleton loader

- [x] Task 7: Frontend — Platform Settings Page (AC: #3, #4)
  - [x] 7.1 Create `apps/web/components/features/admin/settings/settings-section.tsx` — reusable settings section card with form fields and save button
  - [x] 7.2 Create `apps/web/components/features/admin/settings/github-repos-settings.tsx` — repo list management
  - [x] 7.3 Create `apps/web/components/features/admin/settings/feedback-settings.tsx` — feedback assignment rules form
  - [x] 7.4 Create `apps/web/components/features/admin/settings/onboarding-settings.tsx` — onboarding parameter form
  - [x] 7.5 Create `apps/web/hooks/use-admin-settings.ts` — TanStack Query hooks for settings CRUD
  - [x] 7.6 Create `apps/web/app/(admin)/admin/settings/page.tsx` — compose all settings sections with link to scoring sub-page
  - [x] 7.7 Create `apps/web/app/(admin)/admin/settings/loading.tsx` — skeleton loader

- [x] Task 8: Admin Layout Update (AC: #1)
  - [x] 8.1 Update `apps/web/app/(admin)/layout.tsx` — add "Contributors" nav item to `ADMIN_NAV_ITEMS`

## Dev Notes

### Architecture & Module Structure

**EXTEND existing module**: `apps/api/src/modules/admin/` — the admin module already exists from story 10-1. Add contributor and settings controllers/services to it.

```
apps/api/src/modules/admin/
├── admin.module.ts                        # MODIFY — add new controllers, services, import SettingsModule
├── contributors.controller.ts             # NEW — GET /api/v1/admin/contributors
├── contributors.controller.spec.ts        # NEW
├── contributors.service.ts                # NEW — paginated contributor list with search/filter
├── contributors.service.spec.ts           # NEW
├── settings.controller.ts                 # NEW — admin settings CRUD endpoints
├── settings.controller.spec.ts            # NEW
├── settings-admin.service.ts              # NEW — wraps SettingsService with section logic
├── settings-admin.service.spec.ts         # NEW
├── health-metrics.controller.ts           # EXISTS
├── health-metrics.service.ts              # EXISTS
├── alerts.service.ts                      # EXISTS
├── reports.controller.ts                  # EXISTS
├── reports.service.ts                     # EXISTS
└── reports.processor.ts                   # EXISTS
```

**MODIFY existing files**:

```
apps/api/src/modules/contributor/
├── contributor.controller.ts              # MODIFY — pass reason to updateRole
├── contributor.controller.spec.ts         # MODIFY — add reason field tests
├── contributor.service.ts                 # MODIFY — add reason to audit, emit event
├── contributor.service.spec.ts            # MODIFY — add reason and event tests
└── dto/update-role.dto.ts                 # MODIFY — add reason field
```

**Frontend new components**:

```
apps/web/components/features/admin/
├── contributors/
│   ├── contributor-list.tsx               # NEW — contributor management table
│   └── role-change-dialog.tsx             # NEW — role change confirmation dialog
└── settings/
    ├── settings-section.tsx               # NEW — reusable settings section card
    ├── github-repos-settings.tsx          # NEW — repo management
    ├── feedback-settings.tsx              # NEW — feedback rules form
    └── onboarding-settings.tsx            # NEW — onboarding params form
```

**Pages**:

```
apps/web/app/(admin)/
├── admin/
│   ├── contributors/
│   │   ├── page.tsx                       # NEW — contributor management page
│   │   └── loading.tsx                    # NEW — skeleton loader
│   ├── settings/
│   │   ├── page.tsx                       # NEW — platform settings hub page
│   │   ├── loading.tsx                    # NEW — skeleton loader
│   │   └── scoring/page.tsx              # EXISTS — keep as-is
│   └── layout.tsx                         # MODIFY — add Contributors nav item
```

**New hooks**:

```
apps/web/hooks/
├── use-admin-contributors.ts              # NEW — contributor list + role change hooks
└── use-admin-settings.ts                  # NEW — settings CRUD hooks
```

### Admin Controller Pattern — CRITICAL

Follow the existing pattern established in 10-1 (`HealthMetricsController`, `ReportsController`):

```typescript
@Controller({ path: 'admin/contributors', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class AdminContributorsController {
  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listContributors(@Query() query: ContributorListQuery, @Req() req: RequestWithUser) {
    const result = await this.contributorsService.list(query);
    return createSuccessResponse(result.data, req.correlationId, result.pagination);
  }
}
```

Key patterns:

- `@UseGuards(JwtAuthGuard, AbilityGuard)` at controller level
- `@CheckAbility((ability) => ability.can(Action.Manage, 'all'))` on each endpoint
- `@Req() req: RequestWithUser` to access `correlationId` and user
- Return `createSuccessResponse(data, req.correlationId)` or with pagination

### Contributor List — Service Design

**Query with search, filters, and cursor pagination**:

```typescript
@Injectable()
export class AdminContributorsService {
  constructor(private prisma: PrismaService) {}

  async list(params: {
    search?: string;
    role?: string;
    domain?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(params.limit || 20, 100);
    const where: Prisma.ContributorWhereInput = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.role) where.role = params.role as ContributorRole;
    if (params.domain) where.domain = params.domain as ContributorDomain;

    // Cursor-based pagination using base64url encoded cursor
    const contributors = await this.prisma.contributor.findMany({
      where,
      take: limit + 1,
      cursor: params.cursor ? { id: this.decodeCursor(params.cursor) } : undefined,
      skip: params.cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        domain: true,
        createdAt: true,
        updatedAt: true, // use as "last activity"
        isActive: true,
      },
    });

    const hasMore = contributors.length > limit;
    const items = hasMore ? contributors.slice(0, limit) : contributors;
    const nextCursor = hasMore ? this.encodeCursor(items[items.length - 1].id) : null;

    return {
      data: items,
      pagination: { nextCursor, hasMore, limit },
    };
  }
}
```

### Role Change Enhancement — CRITICAL

The existing `ContributorController.updateRole()` and `ContributorService.updateRole()` already handle role changes with audit logging. Enhancements needed:

1. **Add `reason` field to `UpdateRoleDto`**: Make it required (z.string().min(1).max(500))
2. **Include reason in audit log**: Add `reason` to `details` JSON
3. **Emit domain event**: Use EventEmitter2 to emit `contributor.role.changed`
4. **Add notification handler**: Listen for event in NotificationService

**Event emission pattern** (follow existing codebase):

```typescript
// In contributor.service.ts after audit log creation:
this.eventEmitter.emit('contributor.role.changed', {
  eventType: 'contributor.role.changed',
  timestamp: new Date().toISOString(),
  correlationId,
  actorId,
  payload: {
    contributorId,
    oldRole,
    newRole: dto.role,
    reason: dto.reason,
  },
});
```

**IMPORTANT**: The `ContributorService` currently does NOT inject `EventEmitter2`. You need to add it:

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly eventEmitter: EventEmitter2,  // ADD THIS
) {}
```

And import `EventEmitterModule` is already registered globally in `app.module.ts`, so no module-level import needed — just inject in constructor.

### Platform Settings — Section-Based Design

Settings are organized by section. Use the existing `PlatformSetting` table (key-value store) with section-prefixed keys:

| Section Key  | Setting Keys                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| `github`     | `github.monitored_repos` (JSON array of {repoUrl, isActive})                                              |
| `feedback`   | `feedback.sla_threshold_hours`, `feedback.max_concurrent_assignments`, `feedback.auto_reassignment_hours` |
| `onboarding` | `onboarding.ignition_timeline_hours`, `onboarding.buddy_assignment_rules` (JSON)                          |

**Section retrieval**: Query `PlatformSetting WHERE key LIKE '{section}.%'` → group into section response.

**Section update**: Accept partial updates per section. Each key updated individually through existing `SettingsService.updateSetting()`.

**Default values**: When no setting exists in DB, return sensible defaults (e.g., SLA 48h, max concurrent 3, auto-reassignment 72h, ignition 72h).

```typescript
const SETTINGS_DEFAULTS: Record<string, Record<string, unknown>> = {
  github: { 'github.monitored_repos': [] },
  feedback: {
    'feedback.sla_threshold_hours': 48,
    'feedback.max_concurrent_assignments': 3,
    'feedback.auto_reassignment_hours': 72,
  },
  onboarding: {
    'onboarding.ignition_timeline_hours': 72,
    'onboarding.buddy_assignment_rules': { maxAssignments: 3, domainMatch: true },
  },
};
```

### Domain Event Emission for Settings

```typescript
// In settings-admin.service.ts after updating:
this.eventEmitter.emit('platform.settings.updated', {
  eventType: 'platform.settings.updated',
  timestamp: new Date().toISOString(),
  correlationId,
  actorId: adminId,
  payload: { section, updatedKeys: Object.keys(updates) },
});
```

### Admin Layout Navigation Update

Add "Contributors" nav item to `ADMIN_NAV_ITEMS` in `apps/web/app/(admin)/layout.tsx`:

```typescript
const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/admission', label: 'Admission' },
  { href: '/admin/contributors', label: 'Contributors' }, // NEW
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/evaluations/models', label: 'Evaluations' },
  { href: '/admin/evaluations/review-queue', label: 'Review Queue' },
  { href: '/admin/publication/moderation', label: 'Moderation' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/settings', label: 'Settings' },
];
```

**Note**: "Settings" nav item already exists. The `/admin/settings` page currently has no index page — only `/admin/settings/scoring` sub-page exists. Create the settings index page.

### TanStack Query Hook Patterns

Follow existing hook patterns (e.g., `use-health-metrics.ts`, `use-reports.ts`):

```typescript
// use-admin-contributors.ts
export function useAdminContributors(params: {
  search?: string;
  role?: string;
  domain?: string;
  cursor?: string;
}) {
  return useQuery({
    queryKey: ['admin', 'contributors', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.role) searchParams.set('role', params.role);
      if (params.domain) searchParams.set('domain', params.domain);
      if (params.cursor) searchParams.set('cursor', params.cursor);
      return apiClient(`/api/v1/admin/contributors?${searchParams}`);
    },
  });
}

export function useUpdateContributorRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contributorId,
      role,
      reason,
    }: {
      contributorId: string;
      role: string;
      reason: string;
    }) =>
      apiClient(`/api/v1/admin/contributors/${contributorId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contributors'] });
    },
  });
}
```

### Role Change Dialog Pattern

Use native `<dialog>` element or a modal pattern consistent with the codebase. Check if there's an existing modal/dialog component. The dialog should include:

- Current role display
- Role selector (dropdown/radio) with all 6 RBAC tiers
- Required reason textarea (min 1 char, max 500)
- Cancel and Confirm buttons
- Loading state during submission

### Settings Page — Link to Existing Scoring Page

The settings hub page (`/admin/settings/page.tsx`) should:

1. Show all settings sections (github, feedback, onboarding)
2. Include a link/card to the existing scoring formula settings at `/admin/settings/scoring`
3. Each section is a collapsible card with inline editing

### Existing Code to Reuse (DO NOT Reinvent)

- **Guard pattern**: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility` from all admin controllers
- **Response wrapper**: `createSuccessResponse(data, correlationId, pagination?)` from `common/types/api-response.type.ts`
- **Cursor pagination**: Base64url cursor encoding pattern from `ContributorService` (for roster) — REUSE the same encoding pattern
- **Zod validation**: `updateRoleSchema` in `contributor/dto/update-role.dto.ts` — extend with reason
- **SettingsService**: `apps/api/src/modules/settings/settings.service.ts` — already has `getSetting`, `getSettingValue`, `updateSetting` with audit logging
- **EventEmitter2**: Already registered globally via `EventEmitterModule.forRoot()` in `app.module.ts`
- **NotificationService**: `apps/api/src/modules/notification/notification.service.ts` — add `@OnEvent('contributor.role.changed')` handler
- **Admin layout**: `apps/web/app/(admin)/layout.tsx` with ADMIN_NAV_ITEMS array
- **apiClient**: `apps/web/lib/api-client.ts` for authenticated requests
- **Error handling**: `DomainException` with `ERROR_CODES` from `@edin/shared`

### Critical Patterns to Follow

1. **Auth on ALL endpoints**: `@UseGuards(JwtAuthGuard, AbilityGuard)` — this is admin-only
2. **Ability check**: `@CheckAbility((ability) => ability.can(Action.Manage, 'all'))` on every method
3. **Audit logging**: All role changes and settings updates MUST create AuditLog entries — existing `SettingsService.updateSetting()` already does this in a transaction
4. **Domain events**: Emit events AFTER successful DB operations
5. **Notification for role change**: Contributor MUST be notified when their role changes
6. **No retroactive changes**: Settings updates apply to NEW operations only — add a note in the UI
7. **Founding Contributor protection**: Existing guard prevents changing FOUNDING_CONTRIBUTOR role — do NOT bypass
8. **Frontend `'use client'`**: Required for interactive components (forms, dialogs, search inputs)
9. **Reason field required**: Role changes MUST include a reason — validate on both client and server
10. **Prisma decimals**: Pass plain numbers, NOT `Decimal` class (lesson from previous stories)
11. **Mock PrismaService**: In tests, mock with `{ provide: PrismaService, useValue: mockPrisma }` using `any` type
12. **Static routes first**: Register settings controller BEFORE any parameterized routes in admin module

### Notification Type Addition

Add a new `NotificationType` for role changes. Check if the Prisma enum `NotificationType` needs a new value. The notification handler should:

```typescript
@OnEvent('contributor.role.changed')
async handleRoleChanged(event: RoleChangeEvent): Promise<void> {
  await this.enqueueNotification({
    contributorId: event.payload.contributorId,
    type: 'ROLE_CHANGED',  // May need to add to NotificationType enum
    title: 'Your role has been updated',
    description: `Your role has been changed from ${event.payload.oldRole} to ${event.payload.newRole}`,
    entityId: event.payload.contributorId,
  });
}
```

**IMPORTANT**: Check the `NotificationType` enum in `prisma/schema.prisma`. If `ROLE_CHANGED` doesn't exist, you'll need to add it and run `prisma generate`. This will require a Prisma migration.

### Testing Standards

- **Vitest** with NestJS Test module
- Mock PrismaService, SettingsService, EventEmitter2
- Test contributor list: pagination, search, role filter, domain filter
- Test role update: reason required, event emitted, audit created
- Test settings: get by section, update with audit, event emitted, defaults for missing keys
- Test auth guards reject non-admin users
- Test controller response format matches API envelope
- Target: ~30 backend tests total (6 contributor list service, 5 contributor list controller, 5 settings controller, 5 settings service, 4 contributor service updates, 4 contributor controller updates)

### Previous Story (10-1) Learnings

- Admin module structure established at `apps/api/src/modules/admin/`
- BullMQ queue registration pattern in admin module
- HealthMetrics and Reports controllers use standard admin guard pattern
- Redis caching for dashboard metrics — no Redis needed for contributor list or settings (small data)
- Admin layout nav items already include Dashboard, Reports, Settings
- `createSuccessResponse` wrapper for all responses
- Frontend admin components in `apps/web/components/features/admin/` directory

### Project Structure Notes

- Extend existing admin module — do NOT create a new module
- Frontend components in `apps/web/components/features/admin/contributors/` and `admin/settings/` — new directories
- Admin pages at `apps/web/app/(admin)/admin/contributors/` and `apps/web/app/(admin)/admin/settings/` — new and modified pages
- Hooks in `apps/web/hooks/` — new files alongside existing hooks
- Shared types extend existing `packages/shared/src/types/admin.types.ts`
- Settings uses existing `PlatformSetting` table — no new DB tables needed
- If `ROLE_CHANGED` NotificationType is needed, requires Prisma schema update + migration

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 10, Story 10.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR49 — contributor role management]
- [Source: _bmad-output/planning-artifacts/prd.md#FR50 — platform settings configuration]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-S6 — audit logging for role changes]
- [Source: _bmad-output/planning-artifacts/architecture.md#(admin)/contributors/page.tsx — Manage roles & permissions (FR49)]
- [Source: _bmad-output/planning-artifacts/architecture.md#(admin)/settings/page.tsx — Platform settings (FR50)]
- [Source: apps/api/src/modules/contributor/contributor.controller.ts — existing role update endpoint]
- [Source: apps/api/src/modules/contributor/contributor.service.ts — updateRole with audit logging]
- [Source: apps/api/src/modules/settings/settings.service.ts — existing settings service with audit]
- [Source: apps/api/src/modules/admin/admin.module.ts — existing admin module to extend]
- [Source: apps/api/src/modules/notification/notification.service.ts — event handler patterns]
- [Source: apps/web/app/(admin)/layout.tsx — admin layout with nav items]
- [Source: packages/shared/src/types/admin.types.ts — existing admin types]
- [Source: packages/shared/src/constants/error-codes.ts — existing error codes]
- [Source: _bmad-output/implementation-artifacts/10-1-admin-health-metrics-dashboard.md — previous story patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 1010 backend tests passing (0 regressions, 57 new tests added across admin contributors, settings, and contributor role enhancement)
- Added ROLE_CHANGED notification type to Prisma schema
- Role change now requires mandatory reason field and emits contributor.role.changed domain event
- Platform settings organized by section (github, feedback, onboarding) with defaults
- Settings updates use existing SettingsService with audit logging in transactions
- Admin layout updated with Contributors nav item
- Frontend type-checks clean (no new TS errors)

### Change Log

- 2026-03-10: Story 10.2 implemented — role management with reason + event, platform settings, contributor list

### File List

packages/shared/src/types/admin.types.ts (MODIFIED — added contributor list, settings, event types)
packages/shared/src/constants/error-codes.ts (MODIFIED — added ADMIN_SETTINGS_SECTION_NOT_FOUND, ADMIN_ROLE_CHANGE_REASON_REQUIRED)
packages/shared/src/index.ts (MODIFIED — exported new types)
apps/api/prisma/schema.prisma (MODIFIED — added ROLE_CHANGED to NotificationType enum)
apps/api/src/modules/admin/admin.module.ts (MODIFIED — added contributors + settings controllers/services, imported SettingsModule)
apps/api/src/modules/admin/contributors.controller.ts (NEW)
apps/api/src/modules/admin/contributors.controller.spec.ts (NEW)
apps/api/src/modules/admin/contributors.service.ts (NEW)
apps/api/src/modules/admin/contributors.service.spec.ts (NEW)
apps/api/src/modules/admin/settings.controller.ts (NEW)
apps/api/src/modules/admin/settings.controller.spec.ts (NEW)
apps/api/src/modules/admin/settings-admin.service.ts (NEW)
apps/api/src/modules/admin/settings-admin.service.spec.ts (NEW)
apps/api/src/modules/contributor/dto/update-role.dto.ts (MODIFIED — added required reason field)
apps/api/src/modules/contributor/contributor.service.ts (MODIFIED — inject EventEmitter2, include reason in audit, emit contributor.role.changed event)
apps/api/src/modules/contributor/contributor.service.spec.ts (MODIFIED — updated for reason field + event emission)
apps/api/src/modules/contributor/contributor.controller.spec.ts (MODIFIED — updated for reason field validation)
apps/api/src/modules/notification/notification.service.ts (MODIFIED — added handleRoleChanged event handler)
apps/web/app/(admin)/layout.tsx (MODIFIED — added Contributors nav item)
apps/web/app/(admin)/admin/contributors/page.tsx (NEW)
apps/web/app/(admin)/admin/contributors/loading.tsx (NEW)
apps/web/app/(admin)/admin/settings/page.tsx (NEW)
apps/web/app/(admin)/admin/settings/loading.tsx (NEW)
apps/web/components/features/admin/contributors/contributor-list.tsx (NEW)
apps/web/components/features/admin/contributors/role-change-dialog.tsx (NEW)
apps/web/components/features/admin/settings/settings-section.tsx (NEW)
apps/web/components/features/admin/settings/github-repos-settings.tsx (NEW)
apps/web/components/features/admin/settings/feedback-settings.tsx (NEW)
apps/web/components/features/admin/settings/onboarding-settings.tsx (NEW)
apps/web/hooks/use-admin-contributors.ts (NEW)
apps/web/hooks/use-admin-settings.ts (NEW)
