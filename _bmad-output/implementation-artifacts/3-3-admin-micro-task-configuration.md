# Story 3.3: Admin Micro-Task Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to configure domain-specific micro-tasks for the application process,
so that each domain has an appropriate competence demonstration aligned with current community needs.

## Acceptance Criteria

1. **Given** I am an authenticated admin **When** I navigate to `/admin/micro-tasks` **Then** I can view, create, edit, and deactivate micro-tasks for each of the four domains **And** each micro-task has fields for: domain, title, description (rich text), expected deliverable, estimated effort, and active/inactive status

2. **Given** I create or edit a micro-task **When** I save the micro-task **Then** the micro-task is persisted via the API **And** applicants selecting that domain see the updated micro-task on the application form **And** only one micro-task per domain can be active at a time (previous active task is automatically deactivated)

3. **Given** multiple micro-tasks exist for a domain **When** I view the micro-task list **Then** I see the history of micro-tasks with their active/inactive status and creation dates **And** deactivated micro-tasks remain in the database for reference but are not shown to applicants

## Tasks / Subtasks

- [x] Task 1: Modify Prisma schema for multi-task-per-domain support (AC: #1, #3)
  - [x] 1.1 Remove `@unique` constraint on `domain` field in `MicroTask` model
  - [x] 1.2 Enforce one-active-per-domain via Prisma transactions and DB partial unique index
  - [x] 1.3 Add `deactivatedAt` field (`DateTime?`) to track when a micro-task was deactivated
  - [x] 1.4 Generated migration SQL (manual — database drift prevented auto-migration)
  - [x] 1.5 Update seed script: use `findFirst` + conditional `create` instead of `upsert`

- [x] Task 2: Add shared Zod schemas and types for micro-task admin (AC: #1, #2)
  - [x] 2.1 Add `createMicroTaskSchema` to `packages/shared/src/schemas/admission.schema.ts`
  - [x] 2.2 Add `updateMicroTaskSchema` — all fields optional, plus optional isActive boolean
  - [x] 2.3 Add `listMicroTasksQuerySchema` — domain filter, isActive filter (string→boolean), cursor pagination
  - [x] 2.4 Export inferred types: `CreateMicroTaskInput`, `UpdateMicroTaskInput`, `ListMicroTasksQueryInput`
  - [x] 2.5 Add error codes: `MICRO_TASK_NOT_FOUND`, `MICRO_TASK_DOMAIN_ACTIVE_EXISTS`

- [x] Task 3: Extend admission backend with micro-task admin endpoints (AC: #1, #2, #3)
  - [x] 3.1 `listMicroTasks(filters)` — cursor-based pagination, domain/isActive filters, ordered by domain ASC then createdAt DESC
  - [x] 3.2 `createMicroTask(dto, adminId)` — auto-deactivate existing active task, Prisma transaction, audit log
  - [x] 3.3 `updateMicroTask(id, dto, adminId)` — if activating, auto-deactivate other, transaction, audit log
  - [x] 3.4 `deactivateMicroTask(id, adminId)` — soft-delete (isActive=false, deactivatedAt=now()), audit log
  - [x] 3.5 `getMicroTaskById(id)` — single task detail fetch
  - [x] 3.6 Admin endpoints: GET list, POST create, PATCH update, DELETE deactivate (removed GET detail to avoid route conflict with public GET /:domain)
  - [x] 3.7 All endpoints: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility`
  - [x] 3.8 Created DTOs: `create-micro-task.dto.ts`, `update-micro-task.dto.ts`, `list-micro-tasks-query.dto.ts`
  - [x] 3.9 Events emitted: `admission.microtask.created`, `admission.microtask.updated`, `admission.microtask.deactivated`

- [x] Task 4: Create admin micro-task management page — frontend (AC: #1, #2, #3)
  - [x] 4.1 Route: `apps/web/app/(admin)/micro-tasks/page.tsx` with `generateMetadata()`
  - [x] 4.2 Loading skeleton: `apps/web/app/(admin)/micro-tasks/loading.tsx`
  - [x] 4.3 `micro-task-list.tsx` — data table, domain badges, active-first sort, warm borders, 48px rows
  - [x] 4.4 `micro-task-form-panel.tsx` — slide-in panel (640px), React Hook Form + Zod, auto-grow textareas
  - [x] 4.5 `micro-task-status-toggle.tsx` — activate/deactivate with confirmation dialog
  - [x] 4.6 Domain filter using Radix Select
  - [x] 4.7 "Create Micro-Task" primary button opens form panel in create mode
  - [x] 4.8 Row click opens form panel in edit mode with pre-filled data
  - [x] 4.9 Empty state with domain-aware messaging
  - [x] 4.10 Loading state with skeleton screens

- [x] Task 5: Create TanStack Query hooks for micro-task admin (AC: #1, #2)
  - [x] 5.1 Created `use-micro-task-admin.ts` with all hooks (list, detail, create, update, deactivate)
  - [x] 5.2 Stale time: 30s for list (detail reuses list data, no separate query needed)

- [x] Task 6: Update CASL ability factory (AC: #1)
  - [x] 6.1 Verified `MicroTask` exists in CASL subjects — no changes needed
  - [x] 6.2 Verified Admin `can('manage', 'all')` covers MicroTask management — no changes needed
  - [x] 6.3 Verified `Action.Manage, 'MicroTask'` resolves through `manage all` — no changes needed

- [x] Task 7: Write tests (AC: #1, #2, #3)
  - [x] 7.1 Backend service tests: 12 new tests (listMicroTasks, createMicroTask, updateMicroTask, deactivateMicroTask, getMicroTaskById)
  - [x] 7.2 Backend controller tests: 5 new tests (admin list, create, update, deactivate)
  - [x] 7.3 Frontend tests: `micro-task-list.test.tsx` — 11 tests (table, domain filter, row click, empty state, skeleton)
  - [x] 7.4 Frontend tests: `micro-task-form-panel.test.tsx` — 12 tests (create/edit mode, fields, validation, mutations, toasts)

## Dev Notes

### Architecture & Patterns

- **Extend existing admission module:** Add micro-task admin methods to the existing `AdmissionService` and `AdmissionController` at `apps/api/src/modules/admission/`. Do NOT create a separate module.
- **Schema migration — active-domain integrity:** The `@unique` constraint on `domain` is removed to support history, and one-active-per-domain is enforced with transaction logic plus a PostgreSQL partial unique index (`micro_tasks_one_active_per_domain`) for concurrency safety.
- **Seed script update:** The current seed uses `prisma.microTask.upsert({ where: { domain } })` which relies on the unique constraint. After removing it, change to: `findFirst` by domain + isActive, then `create` if not found, or `update` if found. Alternatively, clear and re-seed micro-tasks.
- **Description field:** Rich text support is implemented with Markdown-authored descriptions (`**bold**`, `*italic*`, list items, inline code) and safe rendering. No full BlockEditor/TipTap editor is used.
- **Public endpoint unchanged:** The existing `GET /api/v1/admission/micro-tasks/:domain` (public, no auth) fetches the active micro-task by domain using `findFirst({ where: { domain, isActive: true } })`. This already works correctly with the new schema — no changes needed.
- **One active per domain enforcement:** Implement in `createMicroTask()` and `updateMicroTask()` service methods. Within a transaction: (1) if the new/updated task should be active, find and deactivate the current active task for that domain, (2) then create/update the target task. This ensures atomicity.
- **Deactivation vs. deletion:** Micro-tasks are NEVER deleted — only deactivated. The `DELETE /micro-tasks/:id/deactivate` endpoint is a soft-delete (sets `isActive=false`, `deactivatedAt=now()`). Use POST or PATCH instead of DELETE if preferred — the key is that the record persists.
- **Audit logging for every action:** Follow Story 3-2 pattern. Every create/update/deactivate MUST create an `AuditLog` entry: `admission.microtask.created`, `admission.microtask.updated`, `admission.microtask.deactivated`. Include actorId, entityId, correlationId, and relevant details (changed fields for update, deactivation reason if any).
- **API response envelope:** All responses MUST use `createSuccessResponse()` helper: `{ data, meta: { timestamp, correlationId, pagination? } }`.
- **Admin endpoints path:** Place under `/api/v1/admission/micro-tasks` (not `/api/v1/admin/micro-tasks`) to keep all admission-related endpoints together in the admission controller, consistent with how Story 3-2 placed admin application endpoints under `/api/v1/admission/applications`.

### UX Design Requirements

- **Admin micro-task page:** Desktop-optimized. Follow editorial design language — warm borders, generous row height (48px minimum), no zebra striping. Sans-serif, 15px text.
- **Data table layout:** Group or visually separate by domain. Columns: Domain (DomainBadge with accent color: teal/amber/rose/violet), Title (text), Status (warm StatusBadge: "Active" green-ish, "Inactive" muted), Created (relative date). Active task per domain should be visually prominent (e.g., slightly bolder or with an accent left-border).
- **Slide-in panel for create/edit:** Max-width 640px, opens from right on row click (edit) or "Create Micro-Task" button (create). Single-column form. Labels above fields (never floating). Focus ring with `brand.accent` color. Auto-grow textareas for description and expected deliverable.
- **Confirmation dialog for activation/deactivation:** Centered modal, 16px radius, calm tone. "Activate this micro-task? The current active task for [Domain] will be deactivated." / "Deactivate this micro-task? Applicants will no longer see it." Never "Are you sure?"
- **Domain select:** Styled to match existing form inputs. Warm focus ring. Include all four domains: Technology, Fintech, Impact, Governance.
- **Success/error feedback:** Success = brief toast (auto-dismiss 4s, factual: "Micro-task created"). Error = inline, persistent below the field. No harsh colors.
- **Empty states:** Informative and dignified. "No micro-tasks exist for [Domain]. Create one to enable applicant demonstrations."
- **Loading states:** Skeleton screens matching table layout. No spinners.
- **Mobile:** Show simplified cards (domain + active task title only). No data tables on mobile. Full CRUD operations require desktop.

### Project Structure Notes

**Backend — extend existing files:**

- `apps/api/prisma/schema.prisma` — modify `MicroTask` model
- `apps/api/prisma/seed.ts` — update seed logic for new schema
- `apps/api/src/modules/admission/admission.service.ts` — add micro-task admin methods
- `apps/api/src/modules/admission/admission.controller.ts` — add admin endpoints

**Backend — new files:**

- `apps/api/src/modules/admission/dto/create-micro-task.dto.ts`
- `apps/api/src/modules/admission/dto/update-micro-task.dto.ts`
- `apps/api/src/modules/admission/dto/list-micro-tasks-query.dto.ts`

**Frontend — new files:**

- `apps/web/app/(admin)/micro-tasks/page.tsx`
- `apps/web/app/(admin)/micro-tasks/loading.tsx`
- `apps/web/components/features/admission/admin/micro-task-list.tsx`
- `apps/web/components/features/admission/admin/micro-task-form-panel.tsx`
- `apps/web/components/features/admission/admin/micro-task-status-toggle.tsx`
- `apps/web/components/features/admission/admin/micro-task-list.test.tsx`
- `apps/web/components/features/admission/admin/micro-task-form-panel.test.tsx`
- `apps/web/hooks/use-micro-task-admin.ts`

**Shared — extend existing files:**

- `packages/shared/src/schemas/admission.schema.ts` — add micro-task admin schemas
- `packages/shared/src/types/admission.types.ts` — add inferred types
- `packages/shared/src/constants/error-codes.ts` — add micro-task error codes

### Critical Anti-Patterns (DO NOT)

- **DO NOT** create a separate NestJS module for micro-task admin — extend `admission.module.ts`
- **DO NOT** use a full rich-text editor (BlockEditor, TipTap, etc.) for description — use Markdown input with preview
- **DO NOT** physically delete micro-tasks — only soft-deactivate (set `isActive=false`, `deactivatedAt=now()`)
- **DO NOT** navigate to a new page for micro-task detail/edit — use a slide-in panel from the list page
- **DO NOT** allow two active micro-tasks for the same domain — enforce in service layer via transaction and DB partial unique index
- **DO NOT** use spinners for loading — use skeleton screens
- **DO NOT** use zebra striping in data tables — use warm borders and generous spacing
- **DO NOT** use floating labels — always labels above fields
- **DO NOT** throw raw `HttpException` — use `DomainException` subclasses with proper error codes
- **DO NOT** skip audit logging — EVERY admin action MUST be audited
- **DO NOT** log PII at info level — use IDs only
- **DO NOT** create `__tests__/` directories — co-locate tests with source files (`*.test.tsx`, `*.spec.ts`)
- **DO NOT** define Zod validation inline — use shared schemas from `packages/shared`
- **DO NOT** add sort controls to the table — always show active first, then by createdAt DESC
- **DO NOT** use badge counts or "X items need attention" — use calm status indicators
- **DO NOT** create new admin utility components when `packages/ui` or existing admission admin components can be reused (DomainBadge, StatusBadge, data table patterns, slide-in panel, confirmation dialog)

### Previous Story Intelligence (from Story 3-2)

**Key learnings to apply:**

- Use `generateMetadata()` function (not static `metadata` export) on the admin page — Story 3-2 had to fix this
- Use cursor-based pagination with `useInfiniteQuery` or `useQuery` (if total count is small enough, simple query is fine for micro-tasks — there will only be ~4-20 total)
- Confirmation dialogs use Radix AlertDialog pattern from `admission-action-dialog.tsx`
- Slide-in panel uses Radix Dialog from `application-detail-panel.tsx` — reuse same pattern
- DomainBadge component already exists and applies domain accent colors (teal/amber/rose/violet)
- StatusBadge component already exists for status display
- `createSuccessResponse()` helper is at `apps/api/src/common/types/api-response.type.ts`
- `DomainException` is at `apps/api/src/common/exceptions/domain.exception.ts`
- `JwtAuthGuard` at `apps/api/src/common/guards/jwt-auth.guard.ts`
- `AbilityGuard` at `apps/api/src/common/guards/ability.guard.ts`
- `CheckAbility` decorator at `apps/api/src/common/decorators/check-ability.decorator.ts`
- `CurrentUser` decorator at `apps/api/src/common/decorators/current-user.decorator.ts`
- `Action` enum at `apps/api/src/modules/auth/casl/action.enum.ts`
- `apiClient` at `apps/web/lib/api-client.ts`
- `ToastProvider` at `apps/web/components/ui/toast.tsx`
- Story 3-2 review found that null-safe handling for `ApplicationReview.recommendation`/`feedback` was needed when records are created at assignment time (nullable) and filled at submission. Apply same care: don't assume fields are populated before user action.
- Story 3-2 had 242 API tests and 169 web tests passing — maintain this baseline, do not break existing tests.

### Git Intelligence

Recent commits show consistent patterns:

- `ec3b87a feat: implement application review and admission queue (Story 3-2)` — most recent, extends admission module
- `68edd65 feat: implement contributor application with domain micro-task (Story 3-1)` — created initial MicroTask model
- Commit messages use `feat:` prefix for stories
- All admission code is in `apps/api/src/modules/admission/` and `apps/web/components/features/admission/`

### Technical Stack Reference

| Component       | Version    | Notes                                        |
| --------------- | ---------- | -------------------------------------------- |
| TypeScript      | end-to-end | Shared between frontend and backend          |
| Next.js         | 16.x       | App Router, `generateMetadata()` for pages   |
| NestJS          | 11.x       | Module/Controller/Service pattern            |
| Prisma          | 7.4.2      | PostgreSQL adapter, domain-separated schemas |
| PostgreSQL      | 16+        | `core` schema for micro-tasks                |
| React Hook Form | latest     | With `@hookform/resolvers/zod`               |
| TanStack Query  | v5         | `useQuery`, `useMutation`, `useQueryClient`  |
| Zod             | latest     | Shared validation schemas                    |
| Radix UI        | latest     | Dialog, AlertDialog, Select primitives       |
| Vitest          | latest     | Unit + integration testing                   |
| CASL            | latest     | `@casl/ability` with NestJS guards           |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.3 lines 787-810]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data Architecture, API Patterns, RBAC, Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Admin Dashboard, Form Patterns, Data Display, Confirmation Dialog]
- [Source: _bmad-output/implementation-artifacts/3-2-application-review-and-admission-queue.md — Dev Notes, File List, Completion Notes]
- [Source: apps/api/prisma/schema.prisma — MicroTask model lines 124-138]
- [Source: apps/api/src/modules/admission/admission.service.ts — getActiveMicroTaskByDomain lines 139-161]
- [Source: apps/api/src/modules/admission/admission.controller.ts — existing endpoint patterns]
- [Source: packages/shared/src/schemas/admission.schema.ts — existing Zod schemas]
- [Source: packages/shared/src/types/admission.types.ts — MicroTask interface]
- [Source: packages/shared/src/constants/error-codes.ts — existing error codes]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma migrate dev failed due to database drift from previous manually-modified migration. Resolved by creating migration SQL file manually.
- Route conflict between `GET micro-tasks/:domain` (public) and `GET micro-tasks/:id` (admin) — NestJS cannot distinguish parameterized routes. Resolved by removing the admin GET detail endpoint; list endpoint returns all data (small dataset ~4-20 tasks).

### Completion Notes List

- **One-active-per-domain**: Enforced via Prisma transactions in service layer and DB partial unique index (`micro_tasks_one_active_per_domain`) for concurrency safety.
- **Seed script**: Changed from `upsert` (relied on domain unique) to `findFirst` + conditional `create`.
- **`useMicroTaskDetail`**: Reuses list data instead of making a separate API call — dataset is small enough that separate detail queries are unnecessary.
- **Mobile view**: Simplified cards showing domain badge + active task title only. Full CRUD requires desktop, per UX spec.
- **Pre-existing TypeScript errors**: `ability.factory.spec.ts`, `contributor.service.spec.ts`, `prisma.service.spec.ts`, `review-list.tsx`, `governance.test.tsx` — none introduced by this story.
- **Code review remediation applied**: added markdown-based rich text support for description rendering, replaced nested button rows with accessible `div[role="button"]`, made mobile layout read-only (desktop required for CRUD), and added DB-level active-domain integrity guard.

### File List

**Modified files:**

- `apps/api/prisma/schema.prisma` — Removed @unique from domain, added deactivatedAt field
- `apps/api/prisma/seed.ts` — Changed upsert to findFirst + conditional create
- `packages/shared/src/schemas/admission.schema.ts` — Added createMicroTaskSchema, updateMicroTaskSchema, listMicroTasksQuerySchema
- `packages/shared/src/constants/error-codes.ts` — Added MICRO_TASK_NOT_FOUND, MICRO_TASK_DOMAIN_ACTIVE_EXISTS
- `packages/shared/src/types/admission.types.ts` — Added deactivatedAt to MicroTask, new type exports
- `packages/shared/src/index.ts` — Added new schema/type exports
- `apps/api/src/modules/admission/admission.service.ts` — Added 5 admin micro-task methods
- `apps/api/src/modules/admission/admission.controller.ts` — Added 4 admin endpoints
- `apps/api/src/modules/admission/admission.service.spec.ts` — Added 12 tests for new service methods
- `apps/api/src/modules/admission/admission.controller.spec.ts` — Added 5 tests for new endpoints
- `apps/web/components/features/admission/admission.test.tsx` — Added deactivatedAt to mockTask

**New files:**

- `apps/api/prisma/migrations/20260304200000_remove_microtask_domain_unique_add_deactivated_at/migration.sql`
- `apps/api/src/modules/admission/dto/create-micro-task.dto.ts`
- `apps/api/src/modules/admission/dto/update-micro-task.dto.ts`
- `apps/api/src/modules/admission/dto/list-micro-tasks-query.dto.ts`
- `apps/web/app/(admin)/micro-tasks/page.tsx`
- `apps/web/app/(admin)/micro-tasks/loading.tsx`
- `apps/web/components/features/admission/admin/micro-task-list.tsx`
- `apps/web/components/features/admission/admin/micro-task-form-panel.tsx`
- `apps/web/components/features/admission/admin/micro-task-status-toggle.tsx`
- `apps/web/components/features/admission/admin/micro-task-list.test.tsx`
- `apps/web/components/features/admission/admin/micro-task-form-panel.test.tsx`
- `apps/web/hooks/use-micro-task-admin.ts`

**Additional review remediation files:**

- `apps/web/lib/rich-text.ts` — Added safe markdown-to-HTML formatter for rich description rendering
- `apps/web/components/features/admission/micro-task-display.tsx` — Rendered rich text description safely
- `apps/web/components/features/admission/admission.test.tsx` — Added markdown rendering test

**Workflow artifact updates:**

- `_bmad-output/implementation-artifacts/3-3-admin-micro-task-configuration.md` — Updated review notes/status/file list
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Synced `3-3-admin-micro-task-configuration` to `done`

## Senior Developer Review (AI)

- Outcome: **Changes Requested → Fixed in this review pass**
- Fixed HIGH: rich-text description support now implemented via Markdown input + safe rendering
- Fixed HIGH: one-active-per-domain now has DB-level concurrency guard (partial unique index) and service conflict handling
- Fixed HIGH: mobile view is now read-only; CRUD interactions are desktop-only
- Fixed MEDIUM: removed nested interactive button structure in table rows (a11y-safe)
- Fixed MEDIUM: story documentation updated with additional changed files and remediation notes

## Change Log

- 2026-03-04: Code review remediation pass — fixed high/medium review findings; updated status to `done`
