# Story 2.1: Contributor Profile Creation & Editing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want to create and edit my personal profile with bio, domain expertise, and skill areas,
so that other contributors and visitors can understand my background and contributions.

## Acceptance Criteria

### AC1: Profile Editing Form

**Given** I am authenticated as a contributor
**When** I navigate to /dashboard/profile
**Then** I see a profile editing form with fields for: display name, bio (rich text, max 500 characters), primary domain (select: Technology, Fintech, Impact, Governance), skill areas (multi-select tags), and a profile photo (synced from GitHub by default, with override option)
**And** the form is validated using the shared Zod schema (contributorProfileSchema) on both frontend and backend

### AC2: Profile Update via API

**Given** I am editing my profile
**When** I update my bio and primary domain and click Save
**Then** the profile is updated via PATCH /api/v1/contributors/me
**And** the response follows the API envelope format { data, meta }
**And** a success toast notification appears: "Profile updated"
**And** the form uses optimistic updates via TanStack Query

### AC3: Validation Error Handling

**Given** I submit a profile update with invalid data (e.g., bio exceeding 500 characters)
**When** the Zod validation fails
**Then** field-level error messages are displayed inline
**And** the API returns 400 with a details array listing each validation error

### AC4: Audit Logging

**Given** I update my profile
**When** the update is saved
**Then** an audit log entry is created recording the profile change with my contributor ID and correlation ID

## Tasks / Subtasks

- [x] Task 1: Add `skillAreas` field to Prisma Contributor model (AC: 1)
  - [x] 1.1: Add `skillAreas String[] @default([]) @map("skill_areas")` to the Contributor model in `apps/api/prisma/schema.prisma`
  - [x] 1.2: Run `pnpm --filter api prisma migrate dev --name add-contributor-skill-areas` to create migration
  - [x] 1.3: Run `pnpm --filter api prisma generate` to regenerate the client
  - [x] 1.4: Verify migration runs cleanly against local PostgreSQL (Docker Compose)

- [x] Task 2: Update shared validation schema (AC: 1, 3)
  - [x] 2.1: Update `packages/shared/src/schemas/contributor.schema.ts` — rename `avatar_url` to `avatarUrl` in `updateContributorSchema` (currently UNUSED by any consumer, so safe to change)
  - [x] 2.2: Add `skillAreas` field to `updateContributorSchema`: `z.array(z.string().trim().min(1, 'Tag cannot be empty').max(50, 'Tag too long')).max(10, 'Maximum 10 skill areas').optional()`
  - [x] 2.3: Export `updateContributorSchema` type as `UpdateContributorDto` for frontend/backend use
  - [x] 2.4: Run `pnpm --filter @edin/shared build` to verify compilation

- [x] Task 3: Add profile methods to ContributorService (AC: 2, 3, 4)
  - [x] 3.1: Add `getProfile(contributorId: string)` method — fetch contributor by ID, throw `CONTRIBUTOR_NOT_FOUND` (404) if not found
  - [x] 3.2: Add `updateProfile(contributorId: string, dto: UpdateContributorDto, correlationId?: string)` method
  - [x] 3.3: In `updateProfile()` — fetch contributor (throw 404 if not found), detect changed fields, update via `prisma.contributor.update()`
  - [x] 3.4: Create audit log entry with action `PROFILE_UPDATED`, details containing `{ changedFields, actorId }` where `changedFields` lists field names that were actually modified
  - [x] 3.5: Log at `info` level: `{ contributorId, changedFields, correlationId }`
  - [x] 3.6: Return the updated contributor record

- [x] Task 4: Create ProfileController (AC: 1, 2, 3)
  - [x] 4.1: Create `apps/api/src/modules/contributor/profile.controller.ts` with path `contributors`, version `1`
  - [x] 4.2: Add `GET me` endpoint — protected by `JwtAuthGuard`, extracts user ID via `@CurrentUser('id')`, calls `contributorService.getProfile(userId)`
  - [x] 4.3: Add `PATCH me` endpoint — protected by `JwtAuthGuard`, validates body with `updateContributorSchema.safeParse()`, calls `contributorService.updateProfile(userId, parsed.data, req.correlationId)`
  - [x] 4.4: Throw `DomainException(VALIDATION_ERROR, ...)` on Zod parse failure with `parsed.error.errors` detail mapping
  - [x] 4.5: Register `ProfileController` in `ContributorModule` controllers array

- [x] Task 5: Add frontend dependencies (AC: 1, 2)
  - [x] 5.1: Run `pnpm --filter web add react-hook-form @hookform/resolvers zod` — `zod` must be a direct dependency because `@hookform/resolvers/zod` requires it as a peer dependency (having it only through `@edin/shared` is insufficient)
  - [x] 5.2: Verify imports resolve: `import { updateContributorSchema } from '@edin/shared'` and `import { zodResolver } from '@hookform/resolvers/zod'`

- [x] Task 6: Create profile API hooks (AC: 2)
  - [x] 6.1: Create `apps/web/hooks/use-profile.ts` with:
    - `useProfile()` — TanStack Query hook fetching `GET /api/v1/contributors/me`, returns `{ profile, isLoading, error }`
    - `useUpdateProfile()` — TanStack Query mutation calling `PATCH /api/v1/contributors/me` with optimistic update pattern
  - [x] 6.2: Implement optimistic update in mutation: `onMutate` sets query data optimistically, `onError` rolls back, `onSettled` invalidates query
  - [x] 6.3: Also invalidate the `['auth', 'me']` query on successful profile update (since `useAuth` caches user data)

- [x] Task 7: Create profile editing page and form component (AC: 1, 2, 3)
  - [x] 7.1: Create `apps/web/components/features/contributor-profile/profile-form.tsx` — React Hook Form + Zod resolver using `updateContributorSchema` from `@edin/shared`
  - [x] 7.2: Implement form fields:
    - Display name: text input (required, min 1 char)
    - Bio: textarea with character counter (max 500 chars)
    - Primary domain: select dropdown (Technology, Fintech, Impact, Governance) using Radix Select
    - Skill areas: tag input (freeform add/remove, max 10 tags, max 50 chars each)
    - Profile photo: display current avatar, URL input for override
  - [x] 7.3: Display field-level inline error messages from Zod validation
  - [x] 7.4: Show success toast notification "Profile updated" on successful save using Radix Toast
  - [x] 7.5: Create `apps/web/app/(dashboard)/profile/page.tsx` — uses `useProfile()` for data, renders skeleton loader while loading, renders `ProfileForm` when data is ready
  - [x] 7.6: Follow design system: serif headings, warm off-white background (#FAFAF7), 8px spacing base, skeleton loaders (NOT spinners)

- [x] Task 8: Unit tests for ContributorService profile methods (AC: 2, 3, 4)
  - [x] 8.1: Update `apps/api/src/modules/contributor/contributor.service.spec.ts` — add tests for `getProfile()`:
    - Successful fetch: returns contributor data
    - Not found: throws `CONTRIBUTOR_NOT_FOUND` with 404
  - [x] 8.2: Add tests for `updateProfile()`:
    - Successful update with bio change: updates contributor, creates audit log with `PROFILE_UPDATED` action and `changedFields`
    - Successful update with multiple fields: audit log reflects all changed fields
    - Not found: throws `CONTRIBUTOR_NOT_FOUND` with 404
    - Partial update: only changed fields sent to Prisma

- [x] Task 9: Unit tests for ProfileController (AC: 1, 2, 3)
  - [x] 9.1: Create `apps/api/src/modules/contributor/profile.controller.spec.ts` — add tests for:
    - `GET me`: returns contributor profile
    - `PATCH me`: successful update returns updated profile
    - `PATCH me` with invalid data: throws `VALIDATION_ERROR` with 400 and field details
    - `PATCH me` with bio > 500 chars: throws `VALIDATION_ERROR`
    - `PATCH me` with > 10 skill areas: throws `VALIDATION_ERROR`

- [x] Task 10: Build and test verification (AC: all)
  - [x] 10.1: `pnpm build` passes without errors
  - [x] 10.2: `pnpm lint` passes (0 errors)
  - [x] 10.3: `pnpm test` passes (all existing 130 tests + new profile tests)

## Dev Notes

### Architecture Compliance

- **New controller:** `ProfileController` at path `contributors`, version `1` → produces `GET /api/v1/contributors/me` and `PATCH /api/v1/contributors/me`. This is SEPARATE from the existing admin `ContributorController` (path: `admin/contributors`) which handles admin-only operations
- **Authorization:** `GET /me` and `PATCH /me` use `JwtAuthGuard` only (no AbilityGuard needed since `/me` is inherently self-referential — the authenticated user always accesses their own profile). CASL rule `can(Action.Update, 'Contributor', { id: user.id })` is implicitly satisfied
- **Error responses:** Use `DomainException` with error codes from `@edin/shared` — NEVER throw raw HttpException
- **API envelope:** All responses through `ResponseWrapperInterceptor` `{ data, meta }` format — no manual wrapping needed
- **Audit logging:** Profile updates logged to `audit.audit_logs` with action `PROFILE_UPDATED`, changed field names in details, and correlation ID
- **Validation:** Shared Zod schema in `packages/shared` validates on both frontend (React Hook Form resolver) and backend (manual `.safeParse()` in controller)

### Schema Migration

- Adding `skillAreas String[]` to the Prisma Contributor model requires a database migration
- The `@default([])` ensures existing contributor records get an empty array
- PostgreSQL will create a `text[]` column at `core.contributors.skill_areas`
- Prisma maps `skillAreas` (camelCase in code) to `skill_areas` (snake_case in DB) via `@map("skill_areas")`
- **CRITICAL:** Ensure Docker Compose PostgreSQL is running before running migration: `docker compose up -d postgres`

### Shared Schema Update — Naming Convention Fix

The existing `updateContributorSchema` in `packages/shared/src/schemas/contributor.schema.ts` uses `avatar_url` (snake_case), but the architecture naming convention specifies camelCase for API request/response bodies. Since `updateContributorSchema` is currently **UNUSED** by any consumer (verified: no imports found), it is safe to rename `avatar_url` → `avatarUrl` to align with the convention. The `createContributorSchema` retains snake_case because it's used in the OAuth callback which receives snake_case from the GitHub API.

### ProfileController Design

```typescript
// ProfileController at path 'contributors', version '1'
// GET /api/v1/contributors/me → getMyProfile()
// PATCH /api/v1/contributors/me → updateMyProfile()
//
// Key differences from admin ContributorController:
// - No AbilityGuard (self-referential /me endpoints)
// - Uses updateContributorSchema (not updateRoleSchema)
// - Actor is always the authenticated user (contributorId === userId)
```

### Service Method: updateProfile()

```typescript
// ContributorService.updateProfile()
// 1. Find contributor by ID → throw 404 if not found
// 2. Build update data object from validated DTO (only include provided fields)
// 3. Detect which fields actually changed vs current values
// 4. Update contributor via prisma.contributor.update()
// 5. Create audit log: { action: 'PROFILE_UPDATED', entityType: 'contributor',
//    entityId, details: { changedFields: ['bio', 'domain'], actorId }, correlationId }
// 6. Log at info level and return updated contributor
```

### Frontend Profile Form Implementation

**Dependencies to add:**

- `react-hook-form` — form state management with uncontrolled components
- `@hookform/resolvers` — Zod resolver for React Hook Form

**Form pattern:**

```typescript
// Uses React Hook Form + Zod from @edin/shared
const form = useForm({
  resolver: zodResolver(updateContributorSchema),
  defaultValues: { name, bio, domain, avatarUrl, skillAreas },
});
```

**Skill Areas Tag Input:** Since there's no off-the-shelf tag input in Radix UI, implement a simple custom component:

- Text input + "Add" button (or Enter key to add)
- Tags displayed as removable pills below input
- Validates max 10 tags, max 50 chars each (via Zod schema)
- Accessible: keyboard navigation for tag removal

**Profile Photo:** For MVP, display the current avatar (from GitHub) and provide a URL text input for override. File upload (requiring S3/Cloudflare R2) is out of scope — note as future enhancement.

**Bio Field:** For MVP, implement as a `<textarea>` with character counter showing `{current}/{max}`. The AC mentions "rich text" but 500 characters is too short for meaningful rich text formatting. A textarea with character counter is the pragmatic choice. Rich text via minimal Tiptap can be added as a future enhancement if needed.

**Optimistic Update Pattern:**

```typescript
const mutation = useMutation({
  mutationFn: (data) =>
    apiClient('/api/v1/contributors/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['profile', 'me'] });
    const previous = queryClient.getQueryData(['profile', 'me']);
    queryClient.setQueryData(['profile', 'me'], (old) => ({ ...old, ...newData }));
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['profile', 'me'], context.previous);
    // Show error toast
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  },
});
```

**Toast Notifications:** Use `@radix-ui/react-toast` (already installed). No toast provider/component exists yet in the codebase. Create a minimal reusable toast component at `apps/web/components/ui/toast.tsx` (or use the Radix Toast primitive directly with a provider in the dashboard layout). The toast must be added to the `(dashboard)/layout.tsx` as a provider wrapping `{children}`. Success: "Profile updated". Error: "Failed to update profile" with error detail.

**Navigation to Profile Page:** The dashboard currently has no sidebar or navigation to the profile page. For this story, add a minimal "Edit Profile" link on the existing dashboard page (`apps/web/app/(dashboard)/dashboard/page.tsx`) that links to `/dashboard/profile`. Full sidebar navigation is a separate infrastructure task but a basic link ensures the profile page is discoverable.

### Design System Compliance

- **Typography:** Serif headings (Libre Baskerville / Source Serif Pro) for page title and editorial elements; sans-serif (Inter / Source Sans Pro) for form labels, buttons, interface chrome
- **Colors:** Warm off-white base (#FAFAF7), domain accent colors for domain selector preview
- **Spacing:** 8px base unit, 24px+ between content blocks, 16px card padding
- **Loading:** Skeleton loaders (NOT spinners) — use `@radix-ui/react-skeleton` pattern or CSS shimmer
- **Accessibility:** WCAG 2.1 AA, proper label associations, keyboard-only form navigation, 4.5:1 color contrast, 44x44px minimum touch targets

### CASL Integration Notes

The `ProfileController` does NOT need `AbilityGuard` for `/me` endpoints because:

1. `JwtAuthGuard` ensures authentication (401 if not authenticated)
2. The `/me` route inherently maps to the authenticated user's own record
3. The service receives `userId` directly from `@CurrentUser('id')`, never from URL params

CASL rule `can(Action.Update, 'Contributor', { id: user.id })` exists but is redundant for self-referential endpoints. If later stories add `GET /api/v1/contributors/:id` for viewing OTHER profiles, AbilityGuard + CASL will be needed.

### Existing Infrastructure (Do NOT recreate — REUSE)

- **ContributorService** at `apps/api/src/modules/contributor/contributor.service.ts` — ADD `getProfile()` and `updateProfile()` methods here
- **ContributorModule** at `apps/api/src/modules/contributor/contributor.module.ts` — ADD `ProfileController` to controllers array
- **JwtAuthGuard** at `apps/api/src/common/guards/jwt-auth.guard.ts` — already handles 401
- **CurrentUser decorator** at `apps/api/src/common/decorators/current-user.decorator.ts` — `@CurrentUser('id')` for userId
- **DomainException** at `apps/api/src/common/exceptions/domain.exception.ts` — for all error responses
- **ERROR_CODES** in `@edin/shared` — `CONTRIBUTOR_NOT_FOUND`, `VALIDATION_ERROR` already defined
- **ResponseWrapperInterceptor** — automatically wraps responses in `{ data, meta }`
- **CorrelationIdInterceptor** — automatically assigns correlation IDs via `req.correlationId`
- **apiClient** at `apps/web/lib/api-client.ts` — handles auth headers, token refresh, error extraction
- **useAuth** at `apps/web/hooks/use-auth.ts` — provides authenticated user context (invalidate on profile update)
- **Dashboard layout** at `apps/web/app/(dashboard)/layout.tsx` — auth-guarded layout, redirects unauthenticated users
- **Radix UI primitives** — `@radix-ui/react-select`, `@radix-ui/react-toast`, `@radix-ui/react-avatar` already installed
- **TanStack Query** — `@tanstack/react-query@5.90.21` already installed
- **130 existing tests** passing — do NOT break them

### Previous Story Intelligence (Story 1.5)

**Key patterns to follow:**

- ContributorService injects `PrismaService` and `Logger` via NestJS DI — same pattern for new methods
- Controller uses `@Body() body: unknown` with manual Zod `.safeParse()` — NOT NestJS `ValidationPipe`
- Controller uses `@CurrentUser('id') actorId: string` and `@Req() req: Request` for correlation ID
- Audit log entries follow pattern: `{ action: string, entityType: 'contributor', entityId, details: { ...context }, correlationId }`
- Test files use Vitest with `vi.fn()` for mocks and `Test.createTestingModule()` for NestJS testing

**Known issues from Story 1.5:**

- Pre-existing build error in `vitest.config.ts` (@types/node version conflict) — not introduced by stories, ignore
- Pre-existing lint errors in `*.spec.ts` files (vitest globals not typed for ESLint) — same pattern as existing test files

**Files modified in Story 1.5 relevant to this story:**

- `apps/api/src/modules/contributor/contributor.service.ts` — existing service to extend with profile methods
- `apps/api/src/modules/contributor/contributor.module.ts` — module to register new ProfileController
- `apps/api/src/modules/contributor/contributor.service.spec.ts` — existing test file to extend

### Git Intelligence (Recent Commits)

Last 5 commits implement Stories 1.1 → 1.2 → 1.3 → 1.4 → 1.5 progressively:

- `03e5e35 feat: implement founding contributor designation endpoint (Story 1.5)`
- `20d1176 feat: implement role-based access control with CASL authorization (Story 1.4)`
- `da2e772 feat: implement GitHub OAuth authentication with JWT sessions (Story 1.3)`
- `e6bcbd9 feat: implement database schema foundation and Prisma configuration (Story 1.2)`
- `19a4697 feat: scaffold Edin monorepo with NestJS, Next.js, and infrastructure (Story 1.1)`

**Patterns established:**

- Commit messages: `feat: implement [feature description] (Story X.Y)`
- Each story extends existing modules — Story 2.1 extends ContributorModule and adds first real frontend feature
- Dependencies added to workspace-specific `package.json` via `pnpm --filter <workspace> add <pkg>`
- Co-located tests as `*.spec.ts` next to source files
- Frontend uses CSS custom properties from Tailwind for spacing and colors (e.g., `var(--spacing-lg)`)

### Prisma 7 Critical Gotchas (from Story 1.2 & 1.3 & 1.4 & 1.5 learnings)

- **PrismaClient constructor:** Requires config object with PrismaPg adapter — do NOT use zero-argument constructor
- **Import path:** Import PrismaClient from `../../generated/prisma/client/` (generated output path), NOT from `@prisma/client`
- **PrismaService** is already available and injected into ContributorService — reuse it, do NOT create a new one
- **Multi-schema:** Contributor model is in `@@schema("core")`, AuditLog in `@@schema("audit")` — both accessed via single PrismaClient instance
- **Array fields:** Prisma 7 supports `String[]` natively, mapping to PostgreSQL `text[]`. Use `@default([])` for existing rows

### NestJS 11 Patterns

- **Express v5 is default in NestJS 11:** Route patterns use `/users/*path` not `/users/*`
- **Controller path prefix:** New `ProfileController` at `@Controller({ path: 'contributors', version: '1' })` — produces `/api/v1/contributors/me`
- **Adding a new controller:** Create `profile.controller.ts` in the contributor module, register in `ContributorModule.controllers`
- **DTO validation:** Use Zod schema with `.safeParse()` and throw `DomainException` on failure — same pattern as existing endpoints
- **CRITICAL route ordering:** `GET /me` is a literal path, not a route parameter. If Story 2.2 later adds `GET /:contributorId`, NestJS Express routes are matched in registration order. Ensure `ProfileController` (with `/me`) is registered BEFORE any controller with `/:contributorId` routes. Within the same controller, place `@Get('me')` ABOVE any `@Get(':id')` method to avoid `:id` matching "me" as a UUID

### Next.js 16 + React 19 Patterns

- **App Router:** Profile page at `apps/web/app/(dashboard)/profile/page.tsx` — within the auth-guarded `(dashboard)` route group
- **Client components:** Forms require `'use client'` directive since they use React hooks and browser APIs
- **React 19:** `useActionState` available but not needed — stick with React Hook Form for form management since it provides better integration with Zod and TanStack Query
- **TanStack Query v5:** Use `useMutation` with `onMutate`/`onError`/`onSettled` for optimistic updates
- **Tailwind CSS 4:** Uses CSS custom properties (`var(--spacing-md)`) — follow existing patterns in `dashboard/page.tsx`

### Naming Conventions (from architecture + previous stories)

| Element          | Convention                  | Example                                               |
| ---------------- | --------------------------- | ----------------------------------------------------- |
| Files (NestJS)   | kebab-case with suffix      | `profile.controller.ts`, `profile.controller.spec.ts` |
| Files (Next.js)  | kebab-case                  | `profile-form.tsx`, `use-profile.ts`                  |
| Test files       | `.spec.ts` co-located       | `profile.controller.spec.ts`                          |
| Classes          | PascalCase                  | `ProfileController`                                   |
| React components | PascalCase                  | `ProfileForm`, `TagInput`                             |
| React hooks      | camelCase with `use` prefix | `useProfile()`, `useUpdateProfile()`                  |
| Zod schemas      | camelCase                   | `updateContributorSchema`                             |
| API body keys    | camelCase                   | `skillAreas`, `avatarUrl`                             |
| DB columns       | snake_case via `@map`       | `skill_areas`                                         |
| Audit actions    | UPPER_SNAKE_CASE            | `PROFILE_UPDATED`                                     |

### Logging Standards

- Log profile update at `info` level: `{ contributorId, changedFields, correlationId }`
- NEVER log PII (email, name, bio content) at `info` level or above — use contributor ID and field names only
- Always include `correlationId` from CorrelationIdInterceptor

### Project Structure Notes

- Monorepo uses Turborepo + pnpm workspaces
- Local packages: `"@edin/shared": "workspace:*"`
- New controller goes under `apps/api/src/modules/contributor/`
- New frontend components: `apps/web/components/features/contributor-profile/`
- New frontend hook: `apps/web/hooks/use-profile.ts`
- New frontend page: `apps/web/app/(dashboard)/profile/page.tsx`
- Build: `pnpm build` (all), `pnpm --filter api build` (API only), `pnpm --filter web build` (Web only)
- Test: `pnpm test` (all), `pnpm --filter api test` (API only)

### Cross-Story Dependencies

**This story depends on:**

- Story 1.1 (DONE) — Monorepo scaffold, Docker Compose, NestJS bootstrap, Next.js with Tailwind
- Story 1.2 (DONE) — Contributor model with role enum, AuditLog model, PrismaService, shared Zod schemas
- Story 1.3 (DONE) — GitHub OAuth, JWT tokens, JwtAuthGuard, @CurrentUser decorator, useAuth hook, apiClient
- Story 1.4 (DONE) — CASL RBAC, ContributorModule, AbilityGuard, CaslAbilityFactory with Contributor Update permission
- Story 1.5 (DONE) — ContributorService patterns, controller validation patterns, test patterns, audit log patterns

**This story blocks:**

- Story 2.2 (Public & Private Contributor Profile Views) — needs profile data to display, uses same getProfile method
- Story 2.3 (Public Project Showcase Page) — needs contributor profiles for Founding Circle roster display
- Story 2.4 (Domain Manifestos & Contributor Roster) — needs contributor roster data with profile details

### Scope Boundaries

**IN scope for this story:**

- `GET /api/v1/contributors/me` endpoint for fetching own profile
- `PATCH /api/v1/contributors/me` endpoint for updating own profile
- Adding `skillAreas` field to Prisma Contributor model + migration
- Updating shared `updateContributorSchema` with camelCase keys and skillAreas
- Frontend profile editing page at `/dashboard/profile`
- Frontend profile form component with React Hook Form + Zod
- Optimistic updates via TanStack Query
- Success/error toast notifications
- Audit logging for profile changes
- Unit tests for service and controller

**NOT in scope (deferred to later stories):**

- Public profile view at `/contributors/:id` (Story 2.2)
- Private dashboard with contribution history, evaluations, feedback (Story 2.2)
- Server-side rendered public profile page (Story 2.2)
- Contributor roster with search/filter (Story 2.4)
- File upload for profile photo (future enhancement — uses URL override for MVP)
- Rich text editing for bio via Tiptap (future enhancement — uses textarea for MVP)
- Dashboard sidebar navigation (separate UI infrastructure task)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1, FR2: Contributor profiles and editing]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Patterns, Data Architecture (Zod validation), Frontend Architecture (TanStack Query, React Hook Form)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Naming Patterns, Structure Patterns, Format Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ContributorProfile component (#10), Design System, Typography, Spacing]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Boundaries: Contributor /api/v1/contributors/* (Auth required)]
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts — CONTRIBUTOR can Update own Contributor { id: user.id }]
- [Source: packages/shared/src/schemas/contributor.schema.ts — updateContributorSchema (currently unused)]
- [Source: apps/api/prisma/schema.prisma — Contributor model, ContributorDomain enum]
- [Source: _bmad-output/implementation-artifacts/1-5-founding-contributor-designation.md — Previous story patterns and learnings]

### File Locations

| File                      | Path                                                                | Action                                            |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| Prisma schema             | `apps/api/prisma/schema.prisma`                                     | UPDATE (add skillAreas field)                     |
| Prisma migration          | `apps/api/prisma/migrations/TIMESTAMP_add_contributor_skill_areas/` | CREATE (auto-generated by prisma migrate)         |
| Shared contributor schema | `packages/shared/src/schemas/contributor.schema.ts`                 | UPDATE (camelCase + skillAreas)                   |
| Contributor service       | `apps/api/src/modules/contributor/contributor.service.ts`           | UPDATE (add getProfile + updateProfile)           |
| Profile controller        | `apps/api/src/modules/contributor/profile.controller.ts`            | CREATE                                            |
| Contributor module        | `apps/api/src/modules/contributor/contributor.module.ts`            | UPDATE (register ProfileController)               |
| Contributor service tests | `apps/api/src/modules/contributor/contributor.service.spec.ts`      | UPDATE (add profile tests)                        |
| Profile controller tests  | `apps/api/src/modules/contributor/profile.controller.spec.ts`       | CREATE                                            |
| Web package.json          | `apps/web/package.json`                                             | UPDATE (add react-hook-form, @hookform/resolvers) |
| Profile hook              | `apps/web/hooks/use-profile.ts`                                     | CREATE                                            |
| Profile form component    | `apps/web/components/features/contributor-profile/profile-form.tsx` | CREATE                                            |
| Profile page              | `apps/web/app/(dashboard)/profile/page.tsx`                         | CREATE                                            |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Database migration drift required `prisma migrate reset` before applying new migration (pre-existing condition from Story 1.2)
- Next.js Turbopack could not resolve `.js` extensions in `@edin/shared` TypeScript source — fixed by updating shared package.json to use `exports` field pointing to compiled `dist/` output
- TanStack Query v5 `useMutation` context type required explicit generic parameter for proper `onError` typing

### Completion Notes List

- Task 1: Added `skillAreas String[]` field to Prisma Contributor model with `@default([])` and `@map("skill_areas")`. Migration `20260303084922_add_contributor_skill_areas` creates `text[]` column in PostgreSQL.
- Task 2: Renamed `avatar_url` to `avatarUrl` in `updateContributorSchema` (camelCase convention). Added `skillAreas` array validation (max 10 items, max 50 chars each, trimmed). Exported `UpdateContributorDto` type.
- Task 3: Added `getProfile()` and `updateProfile()` to ContributorService. `updateProfile()` detects changed fields, creates audit log with `PROFILE_UPDATED` action and `changedFields` detail.
- Task 4: Created `ProfileController` at path `contributors`, version `1`. `GET me` and `PATCH me` endpoints with `JwtAuthGuard`. Registered BEFORE `ContributorController` for route priority.
- Task 5: Added `react-hook-form@^7.71.2`, `@hookform/resolvers@^5.2.2`, `zod@^3.25.76` to web package.
- Task 6: Created `useProfile()` and `useUpdateProfile()` hooks with optimistic updates, cache rollback on error, and `['auth', 'me']` invalidation on settle.
- Task 7: Created `ProfileForm` component with React Hook Form + Zod, Radix Select for domain, custom tag input for skill areas, character counter for bio, skeleton loaders. Created `ToastProvider` using Radix Toast. Added "Edit Profile" link to dashboard page.
- Task 8: Added 6 tests for `getProfile()` and `updateProfile()` service methods covering success, not-found, multi-field, and partial-update scenarios.
- Task 9: Created 6 controller tests for GET/PATCH me, validation errors (invalid data, bio >500 chars, >10 skill areas), and field detail assertions.
- Task 10: `pnpm build` passes (all 4 packages), `pnpm lint` passes (0 errors, 2 React Compiler warnings expected with RHF), `pnpm test` passes (142 API + 54 shared + 2 web tests).
- Infrastructure fix: Updated `@edin/shared` package.json to use `exports` field with `dist/` output for Turbopack compatibility. Updated `next.config.ts` with `transpilePackages` and `turbopack.resolveExtensions`. Updated shared schema test for `avatarUrl` rename.
- Code review fixes: Added `contributorProfileSchema` alias and switched frontend/backend profile validation to use it explicitly.
- Code review fixes: Implemented rich-text bio editing (bold/italic toolbar + sanitized contentEditable input) while preserving shared schema validation and 500-character limit enforcement.
- Code review fixes: Added `/dashboard/profile` route and updated dashboard CTA link to match AC route requirement.
- Code review fixes: Updated profile mutation cache strategy to invalidate `['auth','me']` only on successful profile updates.
- Code review fixes: Prevented no-op profile updates from creating database writes and audit logs; added service test coverage for no-change updates.

### Senior Developer Review (AI)

- 2026-03-03: Adversarial review completed. Identified 7 issues total (3 High, 3 Medium, 1 Low).
- Resolved all High and Medium issues in this pass:
  - Added explicit `/dashboard/profile` route and updated navigation link.
  - Upgraded bio field to rich-text editor behavior (toolbar + sanitized editable content).
  - Switched profile validation usage to `contributorProfileSchema` on frontend and backend.
  - Moved `['auth','me']` invalidation to mutation success path.
  - Skipped DB update/audit log creation on no-op profile updates.
  - Added missing git-tracked artifact to File List (`sprint-status.yaml`).
- Remaining issue(s): 1 Low (non-blocking UX improvement for profile fetch error state).

### Change Log

- 2026-03-03: Implemented Story 2.1 — Contributor Profile Creation & Editing. Added backend profile API (GET/PATCH /api/v1/contributors/me), frontend profile form with React Hook Form + Zod validation, optimistic TanStack Query mutations, toast notifications, skill areas tag input, audit logging. Fixed shared package Turbopack compatibility.
- 2026-03-03: Completed adversarial code review fixes. Closed all High/Medium findings and finalized story for done status.

### File List

- `apps/api/prisma/schema.prisma` — MODIFIED (added skillAreas field)
- `apps/api/prisma/migrations/20260303084922_add_contributor_skill_areas/migration.sql` — CREATED
- `packages/shared/src/schemas/contributor.schema.ts` — MODIFIED (avatarUrl rename, skillAreas, UpdateContributorDto)
- `packages/shared/src/schemas/contributor.schema.spec.ts` — MODIFIED (avatarUrl test fix)
- `packages/shared/src/index.ts` — MODIFIED (export UpdateContributorDto)
- `packages/shared/package.json` — MODIFIED (exports field for Turbopack compatibility)
- `apps/api/src/modules/contributor/contributor.service.ts` — MODIFIED (getProfile, updateProfile methods)
- `apps/api/src/modules/contributor/profile.controller.ts` — CREATED
- `apps/api/src/modules/contributor/contributor.module.ts` — MODIFIED (registered ProfileController)
- `apps/api/src/modules/contributor/contributor.service.spec.ts` — MODIFIED (profile method tests)
- `apps/api/src/modules/contributor/profile.controller.spec.ts` — CREATED
- `apps/web/package.json` — MODIFIED (react-hook-form, @hookform/resolvers, zod)
- `apps/web/next.config.ts` — MODIFIED (transpilePackages, turbopack config)
- `apps/web/hooks/use-profile.ts` — CREATED
- `apps/web/components/ui/toast.tsx` — CREATED
- `apps/web/components/features/contributor-profile/profile-form.tsx` — CREATED
- `apps/web/app/(dashboard)/layout.tsx` — MODIFIED (ToastProvider)
- `apps/web/app/(dashboard)/profile/page.tsx` — CREATED
- `apps/web/app/(dashboard)/dashboard/profile/page.tsx` — CREATED (AC route `/dashboard/profile`)
- `apps/web/app/(dashboard)/dashboard/page.tsx` — MODIFIED (Edit Profile link)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED (story status sync)
- `pnpm-lock.yaml` — MODIFIED (new dependencies)
