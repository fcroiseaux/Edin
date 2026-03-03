# Story 1.5: Founding Contributor Designation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an admin,
I want to designate contributors as Founding Contributors,
so that early members receive permanent recognition with governance weight bonus and early feature access.

## Acceptance Criteria

### AC1: Founding Status Designation Endpoint

**Given** I am authenticated as an admin
**When** I access the admin API endpoint `PATCH /api/v1/admin/contributors/:contributorId/founding-status`
**Then** I can set a contributor's role to `FOUNDING_CONTRIBUTOR` with a designation reason
**And** the endpoint is protected by `@UseGuards(JwtAuthGuard, AbilityGuard)` with `@CheckAbility` requiring `Action.Manage` on `'all'` (ADMIN only)
**And** the request body is validated with Zod schema requiring `{ reason: string }` where reason is non-empty (min 10 characters)

### AC2: Permanent Founding Status with Audit Trail

**Given** a contributor is designated as Founding Contributor
**When** the designation is saved
**Then** the contributor's role is set to `FOUNDING_CONTRIBUTOR` in the database
**And** the designation is recorded in the audit log with action `FOUNDING_DESIGNATED`, the admin's ID (`actorId`), the contributor's ID (`entityId`), the reason, the previous role, and a correlation ID
**And** the endpoint returns the updated contributor in the standard `{ data, meta }` envelope

### AC3: Founding Status Permanence Protection

**Given** a contributor has `FOUNDING_CONTRIBUTOR` role
**When** any admin attempts to change their role via the existing `PATCH /api/v1/admin/contributors/:contributorId/role` endpoint
**Then** the system prevents the role change and returns a `422 Unprocessable Entity` with error code `FOUNDING_STATUS_PERMANENT`
**And** the error message explains that Founding Contributor status is permanent and cannot be changed
**And** no changes are made to the contributor's role

### AC4: Pre-designation Validation

**Given** an admin calls the founding-status endpoint
**When** the target contributor already has `FOUNDING_CONTRIBUTOR` role
**Then** the system returns a `409 Conflict` with error code `CONTRIBUTOR_ALREADY_EXISTS` (reuse existing code) and message "Contributor is already a Founding Contributor"
**And** no duplicate audit log entry is created

**Given** an admin calls the founding-status endpoint
**When** the target contributor does not exist
**Then** the system returns a `404 Not Found` with error code `CONTRIBUTOR_NOT_FOUND`

### AC5: Automated Test Coverage

**Given** the founding designation system is in place
**When** automated tests run
**Then** the founding-status endpoint is tested for: successful designation, permanence protection (422), already-founding (409), not-found (404), non-admin rejection (403), and audit log creation
**And** the existing `updateRole` service is tested to verify it blocks role changes for `FOUNDING_CONTRIBUTOR` role holders
**And** all existing 119 tests continue to pass alongside new tests

## Tasks / Subtasks

- [x] Task 1: Add founding designation error code (AC: 4)
  - [x] 1.1: Verify `FOUNDING_STATUS_PERMANENT` already exists in `packages/shared/src/constants/error-codes.ts` (it does -- no changes needed)

- [x] Task 2: Create founding status DTO (AC: 1)
  - [x] 2.1: Create `apps/api/src/modules/contributor/dto/designate-founding.dto.ts` -- Zod schema validating `{ reason: string }` with minimum 10 characters

- [x] Task 3: Add founding designation method to ContributorService (AC: 1, 2, 4)
  - [x] 3.1: Add `designateFoundingContributor(contributorId: string, reason: string, actorId: string, correlationId?: string)` method
  - [x] 3.2: Validate contributor exists (throw `CONTRIBUTOR_NOT_FOUND` / 404 if not)
  - [x] 3.3: Validate contributor is not already `FOUNDING_CONTRIBUTOR` (throw `CONTRIBUTOR_ALREADY_EXISTS` / 409 if already founding)
  - [x] 3.4: Store the previous role before updating
  - [x] 3.5: Update contributor role to `FOUNDING_CONTRIBUTOR` via `prisma.contributor.update()`
  - [x] 3.6: Create audit log entry: `{ action: 'FOUNDING_DESIGNATED', entityType: 'contributor', entityId, details: { previousRole, reason, actorId }, correlationId }`
  - [x] 3.7: Log at `info` level: `{ contributorId, previousRole, actorId, correlationId }`

- [x] Task 4: Add permanence guard to existing updateRole method (AC: 3)
  - [x] 4.1: In `ContributorService.updateRole()`, after fetching the contributor, check if `contributor.role === 'FOUNDING_CONTRIBUTOR'`
  - [x] 4.2: If founding, throw `DomainException(ERROR_CODES.FOUNDING_STATUS_PERMANENT, 'Founding Contributor status is permanent and cannot be changed', HttpStatus.UNPROCESSABLE_ENTITY)`
  - [x] 4.3: This check must occur BEFORE the same-role check to provide the correct error

- [x] Task 5: Add founding-status endpoint to ContributorController (AC: 1, 2)
  - [x] 5.1: Add `@Patch(':contributorId/founding-status')` method to existing `ContributorController`
  - [x] 5.2: Protected by `@UseGuards(JwtAuthGuard, AbilityGuard)` and `@CheckAbility((ability) => ability.can(Action.Manage, 'all'))`
  - [x] 5.3: Validate request body with `designateFoundingSchema.safeParse(body)` -- throw `DomainException(VALIDATION_ERROR, ...)` on failure
  - [x] 5.4: Call `contributorService.designateFoundingContributor(contributorId, parsed.data.reason, actorId, req.correlationId)`
  - [x] 5.5: Return updated contributor (will be wrapped by ResponseWrapperInterceptor)

- [x] Task 6: Unit tests for ContributorService (AC: 1, 2, 3, 4, 5)
  - [x] 6.1: Update `apps/api/src/modules/contributor/contributor.service.spec.ts` -- add tests for `designateFoundingContributor()`:
    - Successful designation: verifies role update, audit log creation, correct audit action/details
    - Already founding: throws `CONTRIBUTOR_ALREADY_EXISTS` with 409
    - Contributor not found: throws `CONTRIBUTOR_NOT_FOUND` with 404
  - [x] 6.2: Add tests for `updateRole()` permanence protection:
    - Founding contributor role change attempt: throws `FOUNDING_STATUS_PERMANENT` with 422
    - Non-founding contributor role change: still works as before (existing tests cover this)

- [x] Task 7: Unit tests for ContributorController (AC: 1, 5)
  - [x] 7.1: Update `apps/api/src/modules/contributor/contributor.controller.spec.ts` -- add tests for founding-status endpoint:
    - Successful designation: returns updated contributor
    - Validation error (missing/short reason): throws VALIDATION_ERROR with 400
    - Non-admin access: returns 403 AUTHORIZATION_DENIED

- [x] Task 8: Build and test verification (AC: 5)
  - [x] 8.1: `pnpm build` passes without errors
  - [x] 8.2: `pnpm lint` passes (0 errors)
  - [x] 8.3: `pnpm test` passes (all existing 119 tests + new founding designation tests)

## Dev Notes

### Architecture Compliance

- **Endpoint pattern:** `PATCH /api/v1/admin/contributors/:contributorId/founding-status` -- follows the existing admin controller path prefix `admin/contributors` with NestJS versioning `version: '1'` [Source: architecture.md -- RBAC section]
- **Authorization:** Same `@CheckAbility((ability) => ability.can(Action.Manage, 'all'))` pattern as existing role change endpoint (ADMIN only) [Source: 1-4 story]
- **Guard stacking:** `@UseGuards(JwtAuthGuard, AbilityGuard)` -- authentication FIRST, then authorization. Exact same pattern as existing `updateRole` endpoint
- **Error responses:** Use `DomainException` with error codes from `@edin/shared` -- NEVER throw raw HttpException or ForbiddenException
- **API envelope:** All responses through `ResponseWrapperInterceptor` `{ data, meta }` format -- no manual wrapping needed
- **Audit logging:** All founding designations logged to `audit.audit_logs` table with actor, previous role, reason, correlation ID
- **Permanence rule:** FR7b specifies "Founding Contributor status is permanent" -- this is enforced at the service layer, not CASL level

### CASL Integration Notes

**FOUNDING_CONTRIBUTOR has the same CASL abilities as CONTRIBUTOR.** The founding status is differentiated by business logic (governance weight, feature flags), NOT by permission rules. The existing `CaslAbilityFactory.addFoundingContributorPermissions()` correctly delegates to `addContributorPermissions()` with no additional rules. This story does NOT modify CASL rules.

The designation endpoint uses the same `Action.Manage, 'all'` ADMIN-level check as the role change endpoint. No new CASL subjects or actions are needed.

### Implementation Pattern: Service Method

```typescript
// ContributorService.designateFoundingContributor()
// 1. Find contributor or throw 404
// 2. Check if already FOUNDING_CONTRIBUTOR -> throw 409
// 3. Store previousRole
// 4. Update role to FOUNDING_CONTRIBUTOR
// 5. Create audit log with action 'FOUNDING_DESIGNATED'
// 6. Log and return updated contributor
```

### Implementation Pattern: Permanence Guard in updateRole()

```typescript
// Add BEFORE the same-role check in updateRole():
if (contributor.role === 'FOUNDING_CONTRIBUTOR') {
  throw new DomainException(
    ERROR_CODES.FOUNDING_STATUS_PERMANENT,
    'Founding Contributor status is permanent and cannot be changed',
    HttpStatus.UNPROCESSABLE_ENTITY, // 422
  );
}
```

**CRITICAL ordering:** The permanence check MUST come before the existing `contributor.role === dto.role` check. If the admin tries to "change" a founding contributor to FOUNDING_CONTRIBUTOR via updateRole, they should get the 422 permanence error, not the 400 same-role error. The dedicated `/founding-status` endpoint handles the 409 already-founding case.

### Prisma Schema Notes

The Contributor model already has the `role` field with `FOUNDING_CONTRIBUTOR` enum value. No schema changes or migrations are needed for this story. The AuditLog model supports the required fields (actorId, action, entityType, entityId, details JSONB, correlationId).

### Prisma 7 Critical Gotchas (from Story 1.2 & 1.3 & 1.4 learnings)

- **PrismaClient constructor:** Requires config object with PrismaPg adapter -- do NOT use zero-argument constructor
- **Import path:** Import PrismaClient from `../../generated/prisma/client/` (generated output path), NOT from `@prisma/client`
- **PrismaService** is already available and injected into ContributorService -- reuse it, do NOT create a new one
- **Multi-schema:** Contributor model is in `@@schema("core")`, AuditLog in `@@schema("audit")` -- both accessed via single PrismaClient instance

### NestJS 11 Patterns

- **Express v5 is default in NestJS 11:** Route patterns use `/users/*path` not `/users/*`
- **Controller path prefix:** `@Controller({ path: 'admin/contributors', version: '1' })` -- already configured in existing controller
- **Adding a new endpoint:** Just add a new method with `@Patch(':contributorId/founding-status')` to the EXISTING `ContributorController` -- do NOT create a new controller
- **DTO validation:** Use Zod schema with `.safeParse()` and throw `DomainException` on failure -- same pattern as existing `updateRole` endpoint

### Existing Infrastructure (Do NOT recreate -- REUSE)

- **ContributorService** at `apps/api/src/modules/contributor/contributor.service.ts` -- ADD the `designateFoundingContributor()` method here
- **ContributorController** at `apps/api/src/modules/contributor/contributor.controller.ts` -- ADD the founding-status endpoint here
- **ContributorModule** at `apps/api/src/modules/contributor/contributor.module.ts` -- no changes needed, service/controller already registered
- **JwtAuthGuard** at `apps/api/src/common/guards/jwt-auth.guard.ts` -- already handles 401
- **AbilityGuard** at `apps/api/src/common/guards/ability.guard.ts` -- already handles 403 via DomainException
- **CurrentUser decorator** at `apps/api/src/common/decorators/current-user.decorator.ts` -- `@CurrentUser('id')` for actorId
- **DomainException** at `apps/api/src/common/exceptions/domain.exception.ts` -- for all error responses
- **ERROR_CODES** in `@edin/shared` -- `FOUNDING_STATUS_PERMANENT` already defined, `CONTRIBUTOR_NOT_FOUND` already defined
- **ROLES** in `packages/shared/src/constants/roles.ts` -- `ROLES.FOUNDING_CONTRIBUTOR` already available
- **CaslAbilityFactory** -- no changes needed, FOUNDING_CONTRIBUTOR permissions already defined
- **ResponseWrapperInterceptor** -- automatically wraps responses in `{ data, meta }`
- **CorrelationIdInterceptor** -- automatically assigns correlation IDs via `req.correlationId`
- **119 existing tests** passing -- do NOT break them

### Previous Story Intelligence (Story 1.4)

**Key patterns to follow:**

- ContributorService injects `PrismaService` and `Logger` via NestJS DI -- same pattern for new method
- ContributorController uses `@Body() body: unknown` with manual Zod parsing -- NOT NestJS `ValidationPipe`
- Controller uses `@CurrentUser('id') actorId: string` and `@Req() req: Request` for correlation ID
- Audit log entries follow pattern: `{ action: string, entityType: 'contributor', entityId, details: { ...context }, correlationId }`
- Test files use Vitest with `vi.fn()` for mocks and `Test.createTestingModule()` for NestJS testing
- Existing `updateRole` tests mock `prisma.contributor.findUnique`, `prisma.contributor.update`, and `prisma.auditLog.create`

**Known issues from Story 1.4:**

- Pre-existing build error in `vitest.config.ts` (@types/node version conflict) -- not introduced by stories, ignore
- Pre-existing lint errors in `*.spec.ts` files (vitest globals not typed for ESLint) -- same pattern as existing test files

**Files modified in Story 1.4 relevant to this story:**

- `apps/api/src/modules/contributor/contributor.service.ts` -- ADD `designateFoundingContributor()` method, MODIFY `updateRole()` to add permanence check
- `apps/api/src/modules/contributor/contributor.controller.ts` -- ADD founding-status endpoint
- `apps/api/src/modules/contributor/contributor.service.spec.ts` -- ADD designation and permanence tests
- `apps/api/src/modules/contributor/contributor.controller.spec.ts` -- ADD founding-status endpoint tests

### Git Intelligence (Recent Commits)

Last 4 commits implement Stories 1.1 -> 1.2 -> 1.3 -> 1.4 progressively:

- `20d1176 feat: implement role-based access control with CASL authorization (Story 1.4)`
- `da2e772 feat: implement GitHub OAuth authentication with JWT sessions (Story 1.3)`
- `e6bcbd9 feat: implement database schema foundation and Prisma configuration (Story 1.2)`
- `19a4697 feat: scaffold Edin monorepo with NestJS, Next.js, and infrastructure (Story 1.1)`

**Patterns established:**

- Commit messages: `feat: implement [feature description] (Story X.Y)`
- Each story extends existing modules -- Story 1.5 extends ContributorModule
- Dependencies added to workspace-specific `package.json` (no new deps needed for this story)
- Co-located tests as `*.spec.ts` next to source files

### Naming Conventions (from Story 1.2 & 1.3 & 1.4)

| Element        | Convention             | Example                                  |
| -------------- | ---------------------- | ---------------------------------------- |
| Files (NestJS) | kebab-case with suffix | `designate-founding.dto.ts`              |
| Test files     | `.spec.ts` co-located  | `contributor.service.spec.ts` (existing) |
| Classes        | PascalCase             | `ContributorService` (existing)          |
| Zod schemas    | camelCase              | `designateFoundingSchema`                |
| Constants      | UPPER_SNAKE_CASE       | `FOUNDING_STATUS_PERMANENT`              |
| Audit actions  | UPPER_SNAKE_CASE       | `FOUNDING_DESIGNATED`                    |

### Logging Standards

- Log founding designation at `info` level: `{ contributorId, previousRole, actorId, correlationId }`
- Log permanence block at `warn` level: `{ contributorId, role: 'FOUNDING_CONTRIBUTOR', attemptedNewRole, actorId, correlationId }`
- NEVER log tokens, secrets, or PII (email, name) -- use contributor ID only
- Always include `correlationId` from CorrelationIdInterceptor

### Project Structure Notes

- Monorepo uses Turborepo + pnpm workspaces
- Local packages: `"@edin/shared": "workspace:*"`
- New DTO goes under `apps/api/src/modules/contributor/dto/`
- No new modules, controllers, or guards needed -- extend existing ContributorModule
- Build: `pnpm build` (all), `pnpm --filter api build` (API only)
- Test: `pnpm test` (all), `pnpm --filter api test` (API only)

### Cross-Story Dependencies

**This story depends on:**

- Story 1.1 (DONE) -- Monorepo scaffold, Docker Compose, NestJS bootstrap
- Story 1.2 (DONE) -- Contributor model with role enum (FOUNDING_CONTRIBUTOR), AuditLog model, PrismaService
- Story 1.3 (DONE) -- GitHub OAuth, JWT tokens with role in payload, JwtAuthGuard, @CurrentUser decorator
- Story 1.4 (DONE) -- CASL RBAC, @CheckAbility decorator, AbilityGuard, ContributorModule with updateRole endpoint, CaslAbilityFactory

**This story blocks:**

- Story 2.2 (Contributor Profile Views) -- needs founding contributor badge display
- Story 2.3 (Public Project Showcase) -- needs Founding Circle section listing FOUNDING_CONTRIBUTOR members

### Scope Boundaries

**IN scope for this story:**

- `PATCH /api/v1/admin/contributors/:contributorId/founding-status` endpoint with reason field
- Service method `designateFoundingContributor()` with validation and audit logging
- Permanence protection in existing `updateRole()` method (422 on founding contributor role change)
- Audit log entry with `FOUNDING_DESIGNATED` action
- DTO validation for designation reason (min 10 chars)
- Comprehensive unit tests for both service and controller

**NOT in scope (deferred to later stories):**

- Frontend Founding Contributor badge display (Story 2.2)
- Public Founding Circle section on showcase page (Story 2.3)
- Governance weight bonus calculation (Epic 9)
- Early feature access mechanism / feature flags (future story)
- Batch designation of multiple contributors (not in requirements)
- Self-designation by contributors (admin-only by design)

### References

- [Source: _bmad-output/planning-artifacts/epics.md -- Epic 1, Story 1.5]
- [Source: _bmad-output/planning-artifacts/prd.md -- FR7b: Founding Contributor designation]
- [Source: _bmad-output/planning-artifacts/prd.md -- FR5: Role designations display]
- [Source: _bmad-output/planning-artifacts/architecture.md -- RBAC section (7 tiers including Founding Contributor)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md -- DomainBadge component, role designation display]
- [Source: _bmad-output/implementation-artifacts/1-4-role-based-access-control-rbac.md -- ContributorModule, CASL patterns, test patterns, Prisma gotchas]
- [Source: packages/shared/src/constants/error-codes.ts -- FOUNDING_STATUS_PERMANENT already defined]
- [Source: packages/shared/src/constants/roles.ts -- ROLES.FOUNDING_CONTRIBUTOR]
- [Source: apps/api/prisma/schema.prisma -- ContributorRole enum, Contributor model, AuditLog model]

### File Locations

| File                         | Path                                                              | Action                                 |
| ---------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| Designation DTO              | `apps/api/src/modules/contributor/dto/designate-founding.dto.ts`  | CREATE                                 |
| Contributor service          | `apps/api/src/modules/contributor/contributor.service.ts`         | UPDATE (add method + permanence check) |
| Contributor controller       | `apps/api/src/modules/contributor/contributor.controller.ts`      | UPDATE (add endpoint)                  |
| Contributor service tests    | `apps/api/src/modules/contributor/contributor.service.spec.ts`    | UPDATE (add tests)                     |
| Contributor controller tests | `apps/api/src/modules/contributor/contributor.controller.spec.ts` | UPDATE (add tests)                     |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Lint auto-fix applied to `contributor.controller.spec.ts` for prettier formatting (line length and multiline argument formatting)

### Completion Notes List

- Task 1: Verified `FOUNDING_STATUS_PERMANENT` error code already exists at `packages/shared/src/constants/error-codes.ts:24` -- no changes needed
- Task 2: Created `designate-founding.dto.ts` with Zod schema requiring `reason` string with min 10 chars
- Task 3: Added `designateFoundingContributor()` method to `ContributorService` -- validates contributor exists, checks not already founding, updates role, creates audit log with `FOUNDING_DESIGNATED` action, logs at info level
- Task 4: Added permanence guard in `updateRole()` -- checks for `FOUNDING_CONTRIBUTOR` role BEFORE same-role check, throws 422 `FOUNDING_STATUS_PERMANENT`, includes warn-level logging
- Task 5: Added `PATCH :contributorId/founding-status` endpoint with `JwtAuthGuard + AbilityGuard`, `Action.Manage` on `'all'`, Zod body validation, delegates to service
- Task 6: Added 5 new service tests -- 3 for `designateFoundingContributor()` (success, already-founding 409, not-found 404) and 2 for `updateRole()` permanence (422 block, ordering before same-role check)
- Task 7: Added 6 new controller tests -- success case, missing reason validation, short reason validation, non-admin guard rejection, propagated already-founding 409, propagated not-found 404
- Task 8: All quality gates pass -- `pnpm build` (0 errors), `pnpm lint` (0 errors), `pnpm test` (130 tests pass, was 119 + 11 new = 130)
- Code review fixes applied: designation flow now runs in a Prisma transaction to guarantee role update + audit log atomicity; designation reason validation now trims input before min-length validation; controller tests now cover propagated 409 already-founding and 404 not-found cases

### Change Log

- 2026-03-03: Implemented Founding Contributor Designation (Story 1.5) -- admin endpoint, permanence protection, audit logging, comprehensive tests
- 2026-03-03: Code review remediation -- fixed atomicity and validation hardening issues, expanded endpoint error-path tests, updated story/sprint status to done

### Senior Developer Review (AI)

- Reviewer: Fabrice
- Date: 2026-03-03
- Outcome: Approve
- Fixed HIGH issue: made founding designation update + audit log write atomic via `prisma.$transaction` in `ContributorService.designateFoundingContributor()`.
- Fixed HIGH issue: hardened designation reason validation with `.trim().min(10)` to reject whitespace-only reasons.
- Fixed MEDIUM issue: added controller-level tests to cover 409 (`CONTRIBUTOR_ALREADY_EXISTS`) and 404 (`CONTRIBUTOR_NOT_FOUND`) propagation for founding-status endpoint.
- Fixed MEDIUM issue: synced story documentation updates and status tracking.

### File List

| File                                                                            | Action                                                                                       |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/contributor/dto/designate-founding.dto.ts`                | CREATED, UPDATED (code review hardening: trimmed reason validation)                          |
| `apps/api/src/modules/contributor/contributor.service.ts`                       | UPDATED (added `designateFoundingContributor()` method + permanence check in `updateRole()`) |
| `apps/api/src/modules/contributor/contributor.controller.ts`                    | UPDATED (added founding-status endpoint + DTO import)                                        |
| `apps/api/src/modules/contributor/contributor.service.spec.ts`                  | UPDATED (added 5 new tests for designation + permanence)                                     |
| `apps/api/src/modules/contributor/contributor.controller.spec.ts`               | UPDATED (added 6 new tests for founding-status endpoint)                                     |
| `_bmad-output/implementation-artifacts/1-5-founding-contributor-designation.md` | UPDATED (code review findings, remediation notes, status update)                             |
| `_bmad-output/implementation-artifacts/sprint-status.yaml`                      | UPDATED (story status: ready-for-dev -> in-progress -> review -> done)                       |
