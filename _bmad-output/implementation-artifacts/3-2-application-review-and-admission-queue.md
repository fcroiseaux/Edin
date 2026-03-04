# Story 3.2: Application Review & Admission Queue

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an existing contributor or admin,
I want to review admission applications and manage the admission queue,
so that we maintain community quality through curated admission.

## Acceptance Criteria

1. **Given** I am an authenticated contributor **When** I am assigned as a reviewer for an application **Then** I can view the applicant's profile, statement of interest, and micro-task submission **And** I can submit a review with a recommendation (approve, request more info, decline) and written feedback

2. **Given** I am an authenticated admin **When** I navigate to /admin/admission **Then** I see the admission queue showing all pending applications with: applicant name, domain, submission date, assigned reviewers, and review status **And** applications are sorted by submission date (oldest first) **And** I can filter by domain and review status

3. **Given** I am an admin viewing the admission queue **When** I select an application **Then** I can: assign reviewers from the contributor pool, view reviewer feedback, approve the application, request additional information from the applicant, or decline with a reason **And** each action is recorded in the audit log

4. **Given** an admin approves an application **When** the approval is saved **Then** the applicant's role is updated from APPLICANT to CONTRIBUTOR **And** the 72-Hour Ignition timer begins (FR14) **And** an audit log entry records the admission decision with admin ID, applicant ID, and reason

5. **Given** an admin declines an application **When** the decline is saved **Then** the application status is updated to DECLINED with a reason **And** the applicant sees a graceful decline message with the provided reason **And** an audit log entry records the decision

## Tasks / Subtasks

- [x] Task 1: Extend Prisma schema for review workflow (AC: #1, #3)
  - [x] 1.1 Add `ReviewRecommendation` enum (APPROVE, REQUEST_MORE_INFO, DECLINE) to `core` schema
  - [x] 1.2 Add `ApplicationReview` model with fields: id, applicationId (FK), reviewerId (FK to Contributor), recommendation (ReviewRecommendation), feedback (text), createdAt — in `core` schema
  - [x] 1.3 Add fields to `Application` model: reviewedBy (nullable FK to Contributor), reviewedAt (nullable DateTime), declineReason (nullable String), ignitionStartedAt (nullable DateTime)
  - [x] 1.4 Add relation from Application to ApplicationReview (one-to-many) and to Contributor for reviewedBy
  - [x] 1.5 Run `npx prisma migrate dev --name add-application-review` and verify migration
  - [x] 1.6 Rebuild Prisma client: `pnpm --filter api prisma:generate`

- [x] Task 2: Create shared Zod schemas and types for review workflow (AC: #1, #3)
  - [x] 2.1 Add `ReviewRecommendation` type and `ApplicationReview` interface to `packages/shared/src/types/admission.types.ts`
  - [x] 2.2 Add `submitReviewSchema` to `packages/shared/src/schemas/admission.schema.ts` with: recommendation (ReviewRecommendation enum), feedback (string min 10 max 2000)
  - [x] 2.3 Add `updateApplicationStatusSchema` with: status (APPROVED | DECLINED), reason (string, required if DECLINED)
  - [x] 2.4 Add `assignReviewerSchema` with: contributorId (UUID string)
  - [x] 2.5 Add `listApplicationsQuerySchema` with: domain (optional), status (optional), cursor (optional), limit (optional, default 20, max 100)
  - [x] 2.6 Add review error codes to `packages/shared/src/constants/error-codes.ts`: REVIEWER_ALREADY_ASSIGNED, APPLICATION_ALREADY_REVIEWED, INVALID_STATUS_TRANSITION, REVIEWER_NOT_FOUND, APPLICATION_NOT_REVIEWABLE
  - [x] 2.7 Export all new types, schemas, and constants from `packages/shared/src/index.ts`
  - [x] 2.8 Rebuild shared package: `pnpm --filter shared build`

- [x] Task 3: Extend admission backend with review endpoints (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Extend `admission.service.ts` with methods:
    - `listApplications(filters, pagination, correlationId)` — cursor-based pagination, filterable by domain/status, sorted oldest first
    - `getApplicationFull(applicationId, correlationId)` — returns full application with reviews and micro-task details
    - `assignReviewer(applicationId, contributorId, adminId, correlationId)` — assign contributor as reviewer, update status to UNDER_REVIEW if first reviewer, create audit log
    - `submitReview(applicationId, reviewerId, dto, correlationId)` — create ApplicationReview record, create audit log, emit event
    - `approveApplication(applicationId, adminId, reason, correlationId)` — update status to APPROVED, update reviewedBy/reviewedAt, set ignitionStartedAt, create audit log, emit event
    - `declineApplication(applicationId, adminId, reason, correlationId)` — update status to DECLINED, set declineReason, update reviewedBy/reviewedAt, create audit log, emit event
    - `listAvailableReviewers(domain, correlationId)` — list active contributors eligible for review (CONTRIBUTOR role or higher, same domain preferred)
    - `getMyReviews(reviewerId, correlationId)` — reviews assigned to a specific reviewer
  - [x] 3.2 Extend `admission.controller.ts` with endpoints:
    - `GET /api/v1/admission/applications` (auth: ADMIN) — paginated list with cursor, filter by domain/status
    - `GET /api/v1/admission/applications/:id/full` (auth: ADMIN or assigned reviewer) — full application detail
    - `POST /api/v1/admission/applications/:id/reviewers` (auth: ADMIN) — assign reviewer
    - `POST /api/v1/admission/applications/:id/reviews` (auth: assigned CONTRIBUTOR) — submit review
    - `PATCH /api/v1/admission/applications/:id/status` (auth: ADMIN) — approve or decline
    - `GET /api/v1/admission/reviewers` (auth: ADMIN) — list available reviewers
    - `GET /api/v1/admission/my-reviews` (auth: CONTRIBUTOR) — reviewer's assigned reviews
  - [x] 3.3 Create DTOs: `submit-review.dto.ts`, `update-application-status.dto.ts`, `assign-reviewer.dto.ts`, `list-applications-query.dto.ts`
  - [x] 3.4 Add CASL abilities: ADMIN can Manage Application; CONTRIBUTOR (as assigned reviewer) can Read assigned Application + Create ApplicationReview
  - [x] 3.5 Emit domain events: `admission.reviewer.assigned`, `admission.review.submitted`, `admission.application.approved`, `admission.application.declined`
  - [x] 3.6 Handle role promotion on approval: update Contributor record role from APPLICANT to CONTRIBUTOR, using the existing Contributor service

- [x] Task 4: Create admin admission queue page — frontend (AC: #2, #3)
  - [x] 4.1 Create `apps/web/app/(admin)/admission/page.tsx` as Server Component with `generateMetadata()` for SEO
  - [x] 4.2 Create `apps/web/app/(admin)/admission/loading.tsx` with skeleton loader
  - [x] 4.3 Create `apps/web/components/features/admission/admin/admission-queue.tsx` — Client Component displaying application data table with columns: applicant name, domain (DomainBadge), submission date, reviewers, review status (StatusBadge). Sorted oldest first by default. Cursor-based pagination.
  - [x] 4.4 Create `apps/web/components/features/admission/admin/admission-filters.tsx` — domain filter (Select), status filter (Select: all, pending, under review, approved, declined)
  - [x] 4.5 Create `apps/web/components/features/admission/admin/application-detail-panel.tsx` — slide-in panel (from right) showing full application: applicant info, statement of interest, micro-task response, reviewer assignments, review feedback, and admin action buttons (Approve, Request Info, Decline)
  - [x] 4.6 Create `apps/web/components/features/admission/admin/reviewer-assignment.tsx` — Select component to pick contributor from available reviewers list (fetched from GET /api/v1/admission/reviewers), shows contributor name and domain
  - [x] 4.7 Create `apps/web/components/features/admission/admin/review-feedback-list.tsx` — displays submitted reviews with reviewer name, recommendation badge, and feedback text
  - [x] 4.8 Create `apps/web/components/features/admission/admin/admission-action-dialog.tsx` — Confirmation dialog for approve/decline actions. Approve: "Approve [name]'s application?" with optional reason field. Decline: "Decline [name]'s application?" with required reason textarea.
  - [x] 4.9 Create `apps/web/components/features/admission/admin/admission-queue-skeleton.tsx` — skeleton matching data table layout

- [x] Task 5: Create reviewer experience — frontend (AC: #1)
  - [x] 5.1 Create `apps/web/app/(dashboard)/reviews/page.tsx` — list of assigned reviews for the current contributor
  - [x] 5.2 Create `apps/web/app/(dashboard)/reviews/loading.tsx` — skeleton loader
  - [x] 5.3 Create `apps/web/components/features/admission/reviewer/review-list.tsx` — displays applications assigned to current user for review
  - [x] 5.4 Create `apps/web/components/features/admission/reviewer/review-form.tsx` — React Hook Form with: recommendation radio (Approve, Request More Info, Decline), feedback textarea (min 10 chars). Uses `submitReviewSchema` from shared package
  - [x] 5.5 Create `apps/web/components/features/admission/reviewer/application-detail-view.tsx` — read-only view of applicant's profile, statement, micro-task submission for the reviewer

- [x] Task 6: Create applicant status check enhancement (AC: #5)
  - [x] 6.1 Update existing `GET /api/v1/admission/applications/:id` endpoint to include decline reason in response when status is DECLINED
  - [x] 6.2 Update `apps/web/components/features/admission/application-confirmation.tsx` to show graceful decline message if application was declined, showing the reason in warm-toned, respectful language

- [x] Task 7: Write tests (AC: #1-5)
  - [x] 7.1 Create/extend `admission.service.spec.ts` — unit tests: list applications (pagination, filters), get full application, assign reviewer (success, duplicate, invalid contributor), submit review (success, unauthorized, already reviewed), approve (success, invalid transition, role promotion), decline (success, invalid transition), list reviewers, get my reviews
  - [x] 7.2 Create/extend `admission.controller.spec.ts` — controller tests: GET /applications (query params, invalid params), GET /applications/:id/full, POST /reviewers (valid, invalid UUID), POST /reviews (valid, too short feedback), PATCH /status (approve, decline with reason, decline without reason), GET /reviewers, GET /my-reviews
  - [x] 7.3 Create `apps/web/components/features/admission/admin/admission-queue.test.tsx` — component tests: skeleton loading, renders queue data, domain badges, status badges, empty state, reviewer names, detail panel opens on click, accessible buttons
  - [x] 7.4 Create `apps/web/components/features/admission/reviewer/reviewer.test.tsx` — component tests: ReviewList (loading, empty, cards, pending/completed separation, buttons, domain badges, error), ReviewForm (renders fields, validates min length, submits valid data), ApplicationDetailView (renders info, statement, micro-task, submission URL, no URL case, headings)

## Dev Notes

### Architecture & Patterns

- **Extends Story 3-1 admission module:** This story adds authenticated review endpoints and admin UI to the existing admission module. Do NOT create a new module — extend `admission.service.ts`, `admission.controller.ts`, and `admission.module.ts`.
- **Authentication required for all new endpoints:** Unlike Story 3-1's public endpoints, ALL new endpoints in Story 3-2 require authentication. Use `@UseGuards(JwtAuthGuard, AbilityGuard)` on every new endpoint.
- **CASL ability enforcement:** Admin endpoints use `@CheckAbility({ action: 'manage', subject: 'Application' })`. Reviewer endpoints check that the current user is the assigned reviewer for the specific application.
- **Cursor-based pagination:** Follow the architecture's pagination pattern: `?cursor=...&limit=20` (default 20, max 100). Return `{ data: [...], meta: { pagination: { cursor, hasMore, total }, timestamp, correlationId } }`.
- **Slide-in panel pattern for detail view:** Use a slide-in panel (Radix Dialog or Sheet) from the right for viewing application details — this is the UX spec's "Detail Overlay" pattern (max-width 640px). Do NOT navigate to a new page for application detail. Keep the admin in the queue context.
- **Confirmation dialogs for destructive actions:** Approve and Decline actions MUST use confirmation dialogs (Radix AlertDialog). Decline requires a reason; Approve allows an optional reason.
- **Status transitions are strict:** PENDING -> UNDER_REVIEW (on first reviewer assigned), UNDER_REVIEW -> APPROVED/DECLINED (admin action only). No other transitions allowed. Throw `INVALID_STATUS_TRANSITION` for invalid state changes.
- **Role promotion on approval:** When admin approves, update the linked Contributor record's role from APPLICANT to CONTRIBUTOR. If no linked Contributor exists (applicant didn't auth via GitHub), the role promotion happens when they first authenticate.
- **72-Hour Ignition timer:** Set `ignitionStartedAt = new Date()` on the Application record when approved. Story 3-5 will read this field to track onboarding milestones.
- **Audit logging for every action:** Every admin/reviewer action MUST create an AuditLog entry: `admission.reviewer.assigned`, `admission.review.submitted`, `admission.application.approved`, `admission.application.declined`. Include actorId, entityId, correlationId, and relevant details.
- **API response envelope:** All responses MUST use the standard envelope: `{ data, meta: { timestamp, correlationId, pagination? } }` for success, `{ error: { code, message, status, correlationId, timestamp, details } }` for errors.
- **Domain events:** Emit events after each action for future listeners (notifications, analytics). Follow existing pattern: `this.eventEmitter.emit('admission.application.approved', { applicationId, adminId, correlationId })`.

### UX Design Requirements

- **Admin admission queue:** Desktop-optimized data table. NOT a traditional dense dashboard — follow the editorial design language. Use warm borders, generous row height (48px minimum), no zebra striping. Sans-serif, 15px text.
- **Data table columns:** Applicant name (text), Domain (DomainBadge with accent color), Submitted (relative date, e.g., "3 days ago"), Reviewers (avatar chips or names), Status (warm-toned StatusBadge: "Pending", "Under Review", "Approved", "Declined").
- **Filters:** Domain filter (Select component styled like input fields, warm focus ring) and Status filter. Always include "All" as default/placeholder. No complex filter dropdowns — keep it simple.
- **Sorting:** Default oldest-first. Do NOT add sortable column headers — the queue should always show oldest unresolved applications first to prevent neglect.
- **Detail panel (slide-in):** Opens on row click. Max-width 640px. Shows: applicant name, email (admin only), domain badge, submission date, statement of interest, micro-task response (could be long text — use scroll), reviewer section (assigned reviewers + their feedback), and action buttons at the bottom.
- **Action buttons in detail panel:** Primary button for "Approve" (solid accent), Secondary button for "Request Info" (outline), Destructive button for "Decline" (semantic.error outline). Only one primary button (Approve).
- **Confirmation dialogs:** Centered modal, 16px radius, shadow-modal. Direct and calm tone: "Approve [Name]'s application? They will become a Contributor." / "Decline [Name]'s application? They will receive your reason." — NOT "Are you sure?"
- **Reviewer assignment:** Simple Select/Combobox showing available contributors (name + domain). Admin picks from list. No drag-and-drop or complex assignment UI.
- **Review feedback display:** Timeline-style list of reviews. Each review shows: reviewer name, domain badge, recommendation badge (color-coded: green-ish for Approve, amber for Request Info, muted red for Decline — but never harsh primary colors), and feedback text.
- **Reviewer experience (dashboard):** Simple card list of assigned applications to review. Each card: applicant name, domain, submitted date, "Review" button. Click opens full application view + review form.
- **Review form:** Single-column. Radio group for recommendation (Approve / Request More Info / Decline). Textarea for feedback (min 10 chars). "Submit Review" primary button.
- **Empty states:** "No applications pending review" with informative tone. No primary button in empty state.
- **Loading states:** Skeleton screens matching data table layout. No spinners.
- **Status communication:** Use descriptive text ("Under Review", "Pending Review") — never percentage progress, countdown timers, or "X items need attention" badges.
- **Mobile admin:** Show simplified status cards only (count of pending/under review). No data tables on mobile per UX spec.

### Mobile & Accessibility

- **Admin pages are desktop-optimized.** On mobile, show simplified status cards (pending count, under review count) instead of data tables. Full operations require desktop.
- **Reviewer pages are mobile-friendly.** Card-based list of assigned reviews should work on mobile. Review form is single-column and works on all breakpoints.
- **WCAG 2.1 AA:** Color contrast 4.5:1 for body text, 3:1 for large text. Keyboard navigation for data table, panel, and dialogs. `aria-describedby` on form fields. Focus trapped in modals/panels. Screen reader support for status badges and domain badges (include text labels, never color-only indicators). Focus visible with 2px accent outline.
- **`prefers-reduced-motion`:** Wrap slide-in panel and dialog transitions in motion media query.

### Project Structure Notes

- **Backend extends existing:** `apps/api/src/modules/admission/` — add new methods to existing service/controller. Add new DTOs to `dto/` subdirectory.
- **Admin frontend:** `apps/web/app/(admin)/admission/page.tsx` — new page within existing admin route group
- **Admin components:** `apps/web/components/features/admission/admin/` — new subdirectory for admin-specific admission components
- **Reviewer frontend:** `apps/web/app/(dashboard)/reviews/page.tsx` — new page within dashboard route group
- **Reviewer components:** `apps/web/components/features/admission/reviewer/` — new subdirectory for reviewer-specific components
- **Shared types/schemas:** Update existing `packages/shared/src/types/admission.types.ts` and `packages/shared/src/schemas/admission.schema.ts` — do NOT create new files
- **Shared constants:** Update existing `packages/shared/src/constants/error-codes.ts`
- **Tests co-located:** Frontend tests next to components, backend tests next to service/controller files
- **No new external dependencies needed** — React Hook Form, Zod, @hookform/resolvers, Radix UI primitives, TanStack Query already in the project

### Critical Anti-Patterns (DO NOT)

- **DO NOT** create a separate backend module for review — extend the existing `admission` module
- **DO NOT** use a separate page/route for application detail — use a slide-in panel from the queue page
- **DO NOT** add sorting controls to the data table — always sort oldest first
- **DO NOT** use spinners for loading — use skeleton screens
- **DO NOT** use badge counts or "X items need attention" patterns — use calm status indicators
- **DO NOT** use zebra striping in data tables — use warm borders and generous spacing
- **DO NOT** use harsh red for decline actions — use `semantic.error` (#A85A5A) outline style
- **DO NOT** throw raw `HttpException` — use `DomainException` subclasses with proper error codes
- **DO NOT** skip audit logging — EVERY admin/reviewer action MUST be audited
- **DO NOT** log PII (applicant email, name) at info level — use IDs only
- **DO NOT** create `__tests__/` directories — co-locate tests with source files
- **DO NOT** allow direct status jumps (PENDING -> APPROVED) — enforce the PENDING -> UNDER_REVIEW -> APPROVED/DECLINED flow
- **DO NOT** use percentage progress bars or countdown timers — descriptive status text only
- **DO NOT** use floating labels — always labels above fields
- **DO NOT** use green checkmarks for success — success feedback is a brief toast, factual and calm
- **DO NOT** hardcode reviewer lists — fetch from API backed by database
- **DO NOT** navigate away from the queue page for detail — keep admin in context with panel

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Lines 751-786] Story 3.2 epic definition and acceptance criteria
- [Source: _bmad-output/planning-artifacts/prd.md — Lines 706-707] FR9 contributor review, FR10 admin queue management
- [Source: _bmad-output/planning-artifacts/prd.md — Lines 519-527] RBAC table — Admin: "Full platform access: admission queue"
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 1142] API boundary: `/api/v1/admission/*` Partial auth
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 1163-1172] Data boundaries — `applications` in `core` schema, `consent_records` in `audit` schema
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 1181] FR-to-module mapping — admission module, (admin)/admission/
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 256-275] Authentication — Passport.js, JWT, CASL RBAC, 7 tiers
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 302-307] Error handling — global exception filter, standard error envelope, correlationId
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 596-655] API response envelope and HTTP status codes
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 434-476] Naming conventions — files, classes, schemas, modules
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 480-523] NestJS module organization pattern
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 524-566] Frontend organization pattern — route groups, feature components
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 658-661] Event naming — dot.case convention
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 693-709] Error handling — DomainException, Prisma error mapping
- [Source: _bmad-output/planning-artifacts/architecture.md — Lines 870-881] Admin route group pages
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1302-1306] Data Display Pattern — warm borders, 48px rows, no zebra striping
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1322-1326] Detail Overlay — slide-in panel, max-width 640px
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1314-1321] Confirmation Dialog — centered modal, calm tone
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1180-1203] Button hierarchy — primary, secondary, destructive styles
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1239-1257] Form patterns — input styling, validation, select/dropdown
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1233-1237] Loading states — skeleton screens, pulsing
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1227-1231] Empty states — centered, muted, dignified
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1207-1225] Feedback patterns — success toast, error inline, status descriptive
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1353] Admin Dashboard responsive — desktop-only for full operations, mobile shows simplified status cards
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 313] Admin design language — even Marie deserves calm clarity, editorial design
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1001-1002] Status Communication Pattern — warm-toned, descriptive text, never countdowns
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1005] Domain Identity Pattern — accent color badges, never color-only
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Lines 1007-1008] Human-First Assignment Pattern — show person's photo, name, bio
- [Source: _bmad-output/implementation-artifacts/3-1-contributor-application-with-micro-task.md] Previous story — complete implementation context

### Previous Story Intelligence (from Story 3-1)

- **Extends existing admission module:** Story 3-1 created the full NestJS admission module with service, controller, DTOs, and specs. Story 3-2 MUST extend these files, not create new ones.
- **ApplicationStatus enum already has all needed values:** PENDING, UNDER_REVIEW, APPROVED, DECLINED are already defined in the Prisma schema. No new enum values needed for status.
- **Existing service methods to preserve:** `createApplication()`, `getApplicationById()`, `getActiveMicroTaskByDomain()` — do NOT modify these. Add new methods alongside them.
- **Existing controller endpoints to preserve:** POST /applications (public), GET /applications/:id (public), GET /micro-tasks/:domain (public) — do NOT add auth guards to these.
- **Event pattern established:** `admission.application.submitted` is already emitted. Follow same EventEmitter2 pattern for new events.
- **Audit logging pattern established:** Uses `AuditLog` model in `audit` schema with `action`, `entityType`, `entityId`, `actorId`, `correlationId`, `details`. Follow exactly.
- **Duplicate email handling (409):** Already implemented. If a reviewer or admin tries to interact with a non-existent application, return 404 with `APPLICATION_NOT_FOUND`.
- **Shared package exports:** All admission types, schemas, and error codes exported from `packages/shared/src/index.ts`. Add new exports to the same file.
- **Testing patterns:** Vitest for both backend and frontend. Backend tests co-located as `*.spec.ts`. Frontend tests co-located as `*.test.tsx`. Use `@testing-library/user-event` for form interactions.
- **Prettier:** Run `npx prettier --write` on all new files before committing.
- **Git convention:** Commit as `feat: implement [feature description] (Story 3-2)`.
- **Admin layout exists:** `apps/web/app/(admin)/layout.tsx` checks for ADMIN role and redirects non-admins. The admission page will be protected by this layout.
- **Public navigation updated:** Story 3-1 added PublicNav. No changes needed for Story 3-2.

### Git Intelligence

Recent commits follow pattern: `feat: implement [feature description] (Story X-Y)`.

Key infrastructure from previous stories that this story builds on:

- **Prisma + PostgreSQL** with domain-separated schemas (core, evaluation, publication, audit) — Story 1.2
- **GitHub OAuth + JWT auth** with Passport.js — Story 1.3
- **CASL RBAC** with ability guards, `APPLICANT`, `CONTRIBUTOR`, `ADMIN` roles in enum — Story 1.4
- **AuditLog model** already exists in audit schema — Story 1.2
- **Contributor model** with `role` field — Story 1.2
- **Application model, MicroTask model, ConsentRecord model** — Story 3.1
- **ApplicationStatus enum** (PENDING, UNDER_REVIEW, APPROVED, DECLINED) — Story 3.1
- **Admission NestJS module** with service, controller, DTOs — Story 3.1
- **Shared Zod schemas** for admission (createApplicationSchema) — Story 3.1
- **Error codes** for admission (APPLICATION_NOT_FOUND, APPLICATION_ALREADY_EXISTS, DOMAIN_MICRO_TASK_NOT_FOUND, GDPR_CONSENT_REQUIRED) — Story 3.1
- **EventEmitter2** configured globally in AppModule — Story 3.1
- **Public route group** `apps/web/app/(public)/` — Epic 2
- **Admin route group** `apps/web/app/(admin)/` with layout.tsx — Story 1.4
- **Rate limiting** via @nestjs/throttler — Story 3.1

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Controller spec initially failed: AbilityGuard dependency resolution — fixed by adding CaslAbilityFactory, Reflector, AbilityGuard providers to test module (matching contributor.controller.spec.ts pattern)
- Frontend admission-queue.test.tsx: "Pending" text appeared in both filter display and status badge — fixed by using `getAllByText` instead of `getByText`
- Prisma migration required database reset due to drift from previous migration modifications
- Prisma AI safety check required explicit user consent env var for destructive operations

### Completion Notes List

- All 7 tasks completed successfully
- API tests: 242 tests across 16 files — all pass
- Web tests: 169 tests across 12 files — all pass
- Prettier formatted on all new/modified files
- Review follow-up fixes applied: request-more-info action, assigned-reviewer authorization check for full application view, admin queue cursor pagination UX, same-domain reviewer preference, null-safe reviewer assignment records

### File List

#### Modified Files

- `apps/api/prisma/schema.prisma` — Added ReviewRecommendation enum, ApplicationReview model, new Application fields, named Contributor relations
- `apps/api/prisma/migrations/20260304173330_add_application_review/migration.sql` — Migration for review workflow schema
- `apps/api/src/modules/admission/admission.service.ts` — Added and refined review workflow methods (including request-more-info action, assigned-reviewer authorization for full detail, null-safe review assignment records, reviewer domain-preference ordering)
- `apps/api/src/modules/admission/admission.controller.ts` — Added authenticated admin/reviewer endpoints and extended status update flow with REQUEST_MORE_INFO
- `apps/api/src/modules/admission/admission.service.spec.ts` — Extended with review workflow tests including request-more-info behavior
- `apps/api/src/modules/admission/admission.controller.spec.ts` — Extended with controller coverage for REQUEST_MORE_INFO and updated full-detail call expectations
- `apps/api/src/modules/auth/casl/subjects.ts` — Added ApplicationReview to CASL subjects
- `apps/api/src/modules/auth/casl/ability.factory.ts` — Added CONTRIBUTOR ability to create ApplicationReview
- `packages/shared/src/types/admission.types.ts` — Added ReviewRecommendation, ApplicationReview, Application field extensions
- `packages/shared/src/schemas/admission.schema.ts` — Added submitReviewSchema, updateApplicationStatusSchema, assignReviewerSchema, listApplicationsQuerySchema
- `packages/shared/src/constants/error-codes.ts` — Added 5 review error codes
- `packages/shared/src/index.ts` — Exported all new schemas, types, constants
- `apps/web/components/features/admission/application-confirmation.tsx` — Added DECLINED/APPROVED status handling

## Senior Developer Review (AI)

### Reviewer

Fabrice

### Date

2026-03-04

### Outcome

Approved

### Findings Addressed

- Fixed missing admin "Request Info" capability end-to-end (validation, controller routing, service audit/event, UI action dialog/button)
- Fixed authorization gap on full application detail by enforcing assigned-reviewer-or-admin access in service layer
- Aligned task claim for `generateMetadata()` by replacing static `metadata` export with `generateMetadata` function on admin admission page
- Implemented cursor-based queue pagination UX with incremental loading in admin admission hook/component
- Improved reviewer selection to prefer same-domain contributors while preserving deterministic ordering
- Removed placeholder review content on reviewer assignment by making `ApplicationReview` recommendation/feedback nullable and filling them only at submission time
- Updated and re-ran backend/frontend tests for admission workflows after fixes

## Change Log

- 2026-03-04: Applied AI review fixes for Story 3.2 (request-more-info action, authorization hardening, cursor pagination UX, reviewer preference logic, null-safe assignment records, and corresponding test updates)

#### New Files

- `apps/api/src/modules/admission/dto/submit-review.dto.ts`
- `apps/api/src/modules/admission/dto/update-application-status.dto.ts`
- `apps/api/src/modules/admission/dto/assign-reviewer.dto.ts`
- `apps/api/src/modules/admission/dto/list-applications-query.dto.ts`
- `apps/web/hooks/use-admission-admin.ts`
- `apps/web/hooks/use-admission-reviewer.ts`
- `apps/web/app/(admin)/admission/page.tsx`
- `apps/web/app/(admin)/admission/loading.tsx`
- `apps/web/components/features/admission/admin/admission-queue.tsx`
- `apps/web/components/features/admission/admin/admission-queue-skeleton.tsx`
- `apps/web/components/features/admission/admin/admission-filters.tsx`
- `apps/web/components/features/admission/admin/application-detail-panel.tsx`
- `apps/web/components/features/admission/admin/reviewer-assignment.tsx`
- `apps/web/components/features/admission/admin/review-feedback-list.tsx`
- `apps/web/components/features/admission/admin/admission-action-dialog.tsx`
- `apps/web/components/features/admission/admin/admission-queue.test.tsx`
- `apps/web/app/(dashboard)/reviews/page.tsx`
- `apps/web/app/(dashboard)/reviews/loading.tsx`
- `apps/web/components/features/admission/reviewer/review-list.tsx`
- `apps/web/components/features/admission/reviewer/review-form.tsx`
- `apps/web/components/features/admission/reviewer/application-detail-view.tsx`
- `apps/web/components/features/admission/reviewer/reviewer.test.tsx`
