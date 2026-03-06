# Story 4.3: Contribution Attribution & Dashboard Display

Status: done

## Story

As a contributor,
I want to see my ingested contributions on my dashboard with proper attribution,
so that I can verify my work is captured and track my contribution status.

## Acceptance Criteria

1. **Attribution Matching**
   Given a contribution has been ingested from GitHub,
   When the attribution step runs,
   Then the system matches the Git author email or GitHub username to a registered contributor record,
   And the contribution is linked to the contributor via contributor_id,
   And unmatched contributions are flagged for admin review with status UNATTRIBUTED.

2. **Dashboard Contributions List**
   Given I am an authenticated contributor,
   When I navigate to /dashboard/contributions,
   Then I see a chronological list of my ingested contributions showing:
   - contribution type icon (commit, PR, review)
   - title
   - repository name
   - ingestion timestamp
   - status (ingested, evaluation pending, evaluated)
     And each contribution displays with equal visual prominence regardless of type (no type hierarchy),
     And the list uses cursor-based pagination.

3. **Real-Time Updates via SSE**
   Given I view my contributions list,
   When a new contribution is ingested,
   Then the list updates within <5 seconds via SSE
   (preparing for Epic 5 Activity Feed, using the same real-time infrastructure).

4. **Contribution Detail View**
   Given a contribution has status INGESTED,
   When I view its detail,
   Then I see the full normalized contribution data:
   - source
   - type
   - title
   - description
   - timestamp
     And a status indicator shows "Awaiting evaluation" in a calm, non-urgent style (not a countdown or warning).

## Tasks / Subtasks

### Backend

- [x] **Task 1: Database migration - Add UNATTRIBUTED status** (AC: #1)
  - [x] 1.1 Add `UNATTRIBUTED` to `ContributionStatus` enum in `apps/api/prisma/schema.prisma`
  - [x] 1.2 Create Prisma migration and run `pnpm prisma generate`
  - [x] 1.3 Update `contributionStatusEnum` Zod schema in `packages/shared/src/schemas/ingestion.schema.ts` to include `UNATTRIBUTED`
  - [x] 1.4 Update `ContributionStatus` type in `packages/shared/src/types/ingestion.types.ts`

- [x] **Task 2: Attribution service** (AC: #1)
  - [x] 2.1 Create `ContributionAttributionService` in `apps/api/src/modules/ingestion/services/contribution-attribution.service.ts`
  - [x] 2.2 Implement matching logic: try GitHub ID first (Contributor.githubId), then GitHub email (if available in rawData.extracted.authorEmail)
  - [x] 2.3 On match: set `contributorId` and update `status` to `ATTRIBUTED`
  - [x] 2.4 On no match: set `status` to `UNATTRIBUTED` (contributorId remains null)
  - [x] 2.5 Register EventEmitter2 listener for `contribution.*.ingested` events to trigger attribution automatically after ingestion
  - [x] 2.6 Emit `contribution.attributed` event after successful attribution (for SSE push)
  - [x] 2.7 Add unit tests in `contribution-attribution.service.spec.ts`

- [x] **Task 3: Contribution query endpoints** (AC: #2, #4)
  - [x] 3.1 Create `ContributionController` in `apps/api/src/modules/ingestion/contribution.controller.ts`
  - [x] 3.2 `GET /api/v1/contributors/me/contributions` - list authenticated contributor's contributions with cursor-based pagination
    - Query params: `cursor` (string), `limit` (default 20, max 100), optional `type` filter (COMMIT, PULL_REQUEST, CODE_REVIEW)
    - Order by `createdAt DESC` (newest first)
    - Include repository name via Prisma relation
    - Response wrapped in standard `{ data, meta: { pagination: { cursor, hasMore, total } } }` envelope
  - [x] 3.3 `GET /api/v1/contributors/me/contributions/:id` - single contribution detail
    - Include full normalized data (source, type, title, description, timestamp)
    - Include repository name
    - Return 404 if contribution belongs to different contributor
  - [x] 3.4 Add Zod schemas for request validation and response serialization in `packages/shared/src/schemas/ingestion.schema.ts`:
    - `contributionListQuerySchema` (cursor, limit, type filter)
    - `contributionDetailResponseSchema`
  - [x] 3.5 Apply `@JwtAuthGuard()` and `@CheckAbility()` decorators for RBAC
  - [x] 3.6 Add Swagger decorators for API documentation
  - [x] 3.7 Add unit tests in `contribution.controller.spec.ts`

- [x] **Task 4: SSE infrastructure for real-time updates** (AC: #3)
  - [x] 4.1 Create `ContributionSseController` in `apps/api/src/modules/ingestion/contribution-sse.controller.ts`
    - `GET /api/v1/contributors/me/contributions/stream` using NestJS `@Sse()` decorator
    - Returns `Observable<MessageEvent>` with contribution update events
    - Requires JWT authentication
  - [x] 4.2 Create `ContributionSseService` for managing SSE connections
    - Subscribe to Redis pub/sub channel `contributions:contributor:{contributorId}`
    - Convert Redis messages to SSE MessageEvent objects
    - Clean up subscriptions on client disconnect
  - [x] 4.3 Publish to Redis pub/sub when a contribution is attributed to a contributor
    - In attribution service: after successful attribution, publish `{ type: 'contribution.new', contributionId, contributionType }` to `contributions:contributor:{contributorId}`
  - [x] 4.4 Add unit tests for SSE controller and service

- [x] **Task 5: Register new components in IngestionModule** (AC: all)
  - [x] 5.1 Register `ContributionAttributionService`, `ContributionController`, `ContributionSseController`, `ContributionSseService` in `apps/api/src/modules/ingestion/ingestion.module.ts`

### Frontend

- [x] **Task 6: Contributions data hook** (AC: #2, #3)
  - [x] 6.1 Create `apps/web/hooks/use-contributions.ts`
    - `useContributions()` hook using TanStack Query with `queryKey: ['contributions', 'me']`
    - Cursor-based pagination support (fetchNextPage via `useInfiniteQuery`)
    - Return `{ contributions, isLoading, error, fetchNextPage, hasNextPage }`
  - [x] 6.2 Create `apps/web/hooks/use-contribution-detail.ts`
    - `useContributionDetail(id)` hook with `queryKey: ['contributions', 'me', id]`
  - [x] 6.3 Create `apps/web/hooks/use-contribution-sse.ts`
    - EventSource connection to `/api/v1/contributors/me/contributions/stream`
    - On message: invalidate `['contributions', 'me']` query to trigger refetch
    - Auto-reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
    - Show "Reconnecting..." indicator after 5s disconnect (per architecture spec)

- [x] **Task 7: Contributions list page** (AC: #2)
  - [x] 7.1 Create `apps/web/app/(dashboard)/dashboard/contributions/page.tsx`
    - Page title: "My Contributions"
    - Uses `useContributions()` for data fetching
    - Uses `useContributionSse()` for real-time updates
  - [x] 7.2 Create `apps/web/components/features/contributions/contribution-list.tsx`
    - Renders chronological list of contributions
    - Each item shows: type icon, title, repository name, timestamp (relative), status badge
    - Equal visual prominence for all types (no hierarchy) - use same card/row style
    - "Load more" button for pagination (or infinite scroll)
    - Skeleton loader for initial loading state (not spinner)
    - Empty state: "No contributions yet" message
  - [x] 7.3 Create `apps/web/components/features/contributions/contribution-list-item.tsx`
    - Type icons: use distinct but equally sized icons for commit, PR, review
    - Status display mapping:
      - INGESTED / ATTRIBUTED -> "Awaiting evaluation" (neutral badge, not warning)
      - EVALUATED -> "Evaluated" (positive badge)
      - UNATTRIBUTED -> should not appear (these have no contributorId)
    - Repository name displayed as context
    - Timestamp using relative format (e.g., "2 hours ago")
  - [x] 7.4 Verify WCAG 2.1 AA compliance: keyboard navigation, screen reader labels, 4.5:1 contrast

- [x] **Task 8: Contribution detail view** (AC: #4)
  - [x] 8.1 Create `apps/web/components/features/contributions/contribution-detail.tsx`
    - Display: source, type, title, description, timestamp, repository name
    - Status indicator: "Awaiting evaluation" in calm style (per UX spec: no countdown, no warning color)
    - For commits: show file changes summary from rawData.extracted
    - For PRs: show PR number, branch info, merge status
    - For reviews: show review state (approved, changes requested, commented)
  - [x] 8.2 Implement as expandable row or slide-over panel (consistent with dashboard patterns)
  - [x] 8.3 Use `useContributionDetail(id)` hook for data fetching

- [x] **Task 9: Dashboard navigation update** (AC: #2)
  - [x] 9.1 Add "Contributions" link to dashboard navigation in `apps/web/app/(dashboard)/layout.tsx` or sidebar component
  - [x] 9.2 Update dashboard page placeholder: replace "Contribution History" placeholder section with link to `/dashboard/contributions`

- [x] **Task 10: Tests** (AC: all)
  - [x] 10.1 Backend unit tests: attribution service (match by githubId, no match, email fallback)
  - [x] 10.2 Backend unit tests: contribution controller (list with pagination, detail, 404 for wrong contributor)
  - [x] 10.3 Backend unit tests: SSE controller (stream creation, auth requirement)
  - [x] 10.4 Frontend component tests: contribution list rendering, pagination, empty state, loading state
  - [x] 10.5 Frontend hook tests: SSE connection, reconnection, query invalidation

## Dev Notes

### Architecture Patterns & Constraints

**Tech Stack (MUST follow):**

- Backend: NestJS 11.x with TypeScript strict mode
- Frontend: Next.js 16.x (App Router) with TypeScript
- ORM: Prisma 7.x
- Database: PostgreSQL 16+
- Cache/PubSub: Redis 7.x
- Styling: Tailwind CSS 4.x
- State: TanStack Query (server state), Zustand (UI state only)
- Testing: Vitest (unit/integration), Playwright (E2E)
- Logging: Pino via nestjs-pino (structured JSON with correlationId)

**API Conventions (MUST follow):**

- RESTful with URI versioning: `/api/v1/...`
- Endpoints: kebab-case plural nouns
- Route params: camelCase (`:contributorId`)
- Request/response body: camelCase
- Cursor-based pagination: `?cursor=...&limit=20` (default 20, max 100)
- Success envelope: `{ data, meta: { timestamp, correlationId, pagination } }`
- Error envelope: `{ error: { code, message, status, correlationId, timestamp } }`
- Error codes: UPPER_SNAKE_CASE domain-prefixed
- HTTP status: 200 GET/PATCH, 201 POST, 204 DELETE, 400 validation, 401 unauth, 403 forbidden, 404 not found

**Database Conventions:**

- Tables: snake_case plural (`contributions`)
- Columns: snake_case (`contributor_id`, `created_at`)
- Prisma models: PascalCase singular with `@@map` to table names
- FKs: `{referenced_table_singular}_id`
- Indexes: `idx_{table}_{columns}`
- Enums: PascalCase (`ContributionStatus`)
- Schema ownership: `core` schema for contributions and contributors

**Module Pattern:**

- One module per domain in `apps/api/src/modules/`
- Tests co-located as `*.spec.ts` next to source files
- DTOs in `dto/` subdirectory
- Controllers: `@JwtAuthGuard()`, `@CheckAbility()`, `@CurrentUser()`, Swagger decorators
- Services: PrismaService injection, EventEmitter2 for domain events, Pino logger
- Responses wrapped via `createSuccessResponse()`

**Frontend Pattern:**

- Route groups: `(public)/`, `(dashboard)/`, `(admin)/`
- Components: `components/features/{domain}/` for feature components, `packages/ui/` for shared primitives
- Hooks: `hooks/use-{name}.ts` using TanStack Query
- Files: kebab-case, components PascalCase, hooks camelCase with `use` prefix
- Skeleton loaders for initial loads (not spinners)
- Error Boundaries at route group level
- Toast notifications for non-blocking errors

**Event System:**

- Naming: `{domain}.{entity}.{action}` in dot.case
- Payload: `{ eventType, timestamp, correlationId, actorId, payload }`
- Existing events from 4-2: `contribution.commit.ingested`, `contribution.pull_request.ingested`, `contribution.review.ingested`
- New event for 4-3: `contribution.attributed`

**SSE Architecture:**

- NestJS `@Sse()` decorator returns `Observable<MessageEvent>`
- Redis pub/sub for multi-instance broadcasting (required for horizontal scaling)
- SSE clients receive events via EventSource browser API
- Auto-reconnection with exponential backoff
- Show "Reconnecting..." indicator after 5s disconnect

**UX Design Requirements (MUST follow):**

- "Calm clarity" aesthetic: no countdown timers, urgency signals, or warning colors for status
- Equal visual prominence for all contribution types (commit, PR, review)
- "Awaiting evaluation" styled as neutral, calm indicator (not alert/warning)
- Sans-serif for data display, 15px text
- Warm borders (`border-surface-border`), `surface-raised` backgrounds, generous padding
- Domain color accents: Technology (teal), Fintech (amber), Impact (rose), Governance (violet)
- New SSE items announced via `aria-live="polite"` for screen readers
- 44x44px minimum touch targets, keyboard navigation, 4.5:1 contrast ratio

### Previous Story Intelligence (Story 4-2)

**Critical learnings to apply:**

1. **Contribution data model already exists** in Prisma schema. The `Contribution` model has: id, contributorId (nullable), repositoryId, source, sourceRef, contributionType, title, description, rawData (JSON), normalizedAt, status, createdAt, updatedAt. DO NOT recreate or modify existing fields.

2. **ContributionStatus enum currently has**: INGESTED, ATTRIBUTED, EVALUATED. Story 4-3 needs to ADD `UNATTRIBUTED` (do NOT remove existing values).

3. **Contributor resolution is partial**: Story 4-2's webhook processor matches by `githubId` only. If no Contributor found, `contributorId` is set to null and contribution is saved with status INGESTED. Story 4-3's attribution service should extend this with email matching.

4. **Existing domain events**: The processor emits `contribution.commit.ingested`, `contribution.pull_request.ingested`, `contribution.review.ingested` with payload `{ contributionType, contributorId, repositoryId, correlationId }`. The attribution service should listen to these.

5. **rawData structure**: Contains original GitHub payload + `extracted` object with structured metadata. For commits: `{ sha, authorGithubId, authorEmail, timestamp, filesChanged: { added, removed, modified }, additions, deletions }`.

6. **Existing indexes**: `contributions_contributor_created_idx` on `(contributorId, createdAt DESC)` is already optimized for the dashboard query (contributor's contributions sorted by date).

7. **Test count**: Story 4-2 left 594 passing tests (357 API + 237 web). Ensure no regressions.

8. **Naming patterns**: Files kebab-case, enums UPPER_CASE, interfaces PascalCase, events dot.case, schemas camelCase.

9. **Transaction pattern**: Use `prisma.$transaction()` for multi-step writes. Story 4-2 established this pattern for contribution persistence + audit logging.

10. **BullMQ has separate Redis connection** from RedisService. SSE should use RedisService's connection for pub/sub, NOT the BullMQ connection.

**Files from Story 4-2 that are relevant:**

- `apps/api/prisma/schema.prisma` - Contribution and WebhookDelivery models
- `apps/api/src/modules/ingestion/processors/webhook.processor.ts` - Event extraction and normalization
- `apps/api/src/modules/ingestion/ingestion.module.ts` - Module registration (extend this)
- `apps/api/src/modules/ingestion/ingestion.service.ts` - Existing service methods
- `packages/shared/src/types/ingestion.types.ts` - TypeScript types
- `packages/shared/src/schemas/ingestion.schema.ts` - Zod schemas
- `packages/shared/src/constants/error-codes.ts` - Error codes

**Files from earlier stories with patterns to follow:**

- `apps/web/hooks/use-profile.ts` - TanStack Query hook pattern (useQuery, useMutation, optimistic updates)
- `apps/web/hooks/use-contributor-roster.ts` - Paginated list query pattern
- `apps/web/hooks/use-repositories.ts` - Admin list query pattern
- `apps/web/app/(dashboard)/dashboard/page.tsx` - Dashboard page (has placeholder sections for contributions)
- `apps/web/app/(dashboard)/layout.tsx` - Dashboard layout wrapper
- `apps/api/src/modules/contributor/contributor.service.ts` - Service pattern with pagination
- `apps/api/src/modules/contributor/contributor.controller.ts` - Controller pattern with guards and decorators

### Project Structure Notes

**Backend file locations:**

```
apps/api/src/modules/ingestion/
  ingestion.module.ts              # Extend: register new services/controllers
  ingestion.controller.ts          # Existing: webhook endpoint (DO NOT modify)
  ingestion.service.ts             # Existing: webhook dispatch (DO NOT modify)
  processors/
    webhook.processor.ts           # Existing: ingestion pipeline (DO NOT modify)
  services/
    contribution-attribution.service.ts      # NEW: attribution matching logic
    contribution-attribution.service.spec.ts # NEW: unit tests
  contribution.controller.ts       # NEW: GET list/detail endpoints
  contribution.controller.spec.ts  # NEW: unit tests
  contribution-sse.controller.ts   # NEW: SSE streaming endpoint
  contribution-sse.service.ts      # NEW: Redis pub/sub → SSE bridge
  dto/
    contribution-list-query.dto.ts # NEW: query params validation
```

**Frontend file locations:**

```
apps/web/
  app/(dashboard)/dashboard/
    contributions/
      page.tsx                     # NEW: contributions list page
  components/features/
    contributions/
      contribution-list.tsx        # NEW: list component
      contribution-list-item.tsx   # NEW: list item component
      contribution-detail.tsx      # NEW: detail view component
  hooks/
    use-contributions.ts           # NEW: TanStack Query hook for list
    use-contribution-detail.ts     # NEW: TanStack Query hook for detail
    use-contribution-sse.ts        # NEW: SSE EventSource hook
```

**Shared package updates:**

```
packages/shared/src/
  schemas/ingestion.schema.ts      # MODIFY: add list/detail response schemas
  types/ingestion.types.ts         # MODIFY: add UNATTRIBUTED status, SSE event types
```

### Anti-Pattern Prevention

- **DO NOT create a separate `contribution` module** - keep all contribution logic in `modules/ingestion/` per architecture's requirement mapping (FR15-FR20 -> ingestion module)
- **DO NOT use offset-based pagination** - MUST use cursor-based pagination per architecture spec
- **DO NOT use WebSocket** for real-time - MUST use SSE per architecture decision (simpler, unidirectional)
- **DO NOT add urgency styling** to "Awaiting evaluation" status - UX spec explicitly requires calm, non-urgent style
- **DO NOT create visual hierarchy** between contribution types - UX spec requires equal prominence
- **DO NOT duplicate contributor matching logic** - extend the existing pattern from webhook.processor.ts
- **DO NOT use spinners** for loading states - use skeleton loaders per architecture spec
- **DO NOT omit null fields** from API responses - include with `null` value per API conventions
- **DO NOT forget to rebuild shared package** after modifying types/schemas: `pnpm build` in packages/shared

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4-3 (lines 947-974)]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns (lines 448-459)]
- [Source: _bmad-output/planning-artifacts/architecture.md#SSE Decision (lines 309-313)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Visualization - Recharts (lines 357-361)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Event Naming Convention (lines 658-672)]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Response Envelope (lines 600-638)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Component Patterns (lines 524-566)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Standards (lines 168-170)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Module Communication (lines 1157-1161)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Calm Clarity Aesthetic]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Design (lines 1340-1376)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Strategy (lines 1380-1408)]
- [Source: _bmad-output/implementation-artifacts/4-2-contribution-ingestion-pipeline.md]
- [Source: apps/api/prisma/schema.prisma#Contribution model]
- [Source: packages/shared/src/schemas/ingestion.schema.ts]
- [Source: packages/shared/src/types/ingestion.types.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing Prisma shadow DB migration ordering issue (20260305120000 references monitored_repositories table created in 20260305200000). Worked around by creating manual migration and applying directly.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- All 10 tasks implemented: UNATTRIBUTED enum, attribution service with GitHub ID + GitHub username + email matching, contribution query endpoints with cursor-based pagination, SSE infrastructure via Redis pub/sub, frontend hooks with TanStack Query infinite query, contributions list page with skeleton loaders and equal visual prominence, contribution detail view with type-specific metadata, dashboard navigation update
- Added `publish` and `createSubscriber` methods to RedisService for SSE pub/sub support
- Added `Contribution` to CASL subjects and granted read permission to CONTRIBUTOR role
- Follow-up review fixes applied: SSE query-token authentication, Swagger decorators, persisted contribution IDs in ingestion events, exact-attribution processing, ingestion timestamp display, and missing SSE tests
- Verification results: API build passes, API tests 378 passed / 1 skipped, Web tests 249 passed, 0 regressions in exercised suites

### Change Log

- 2026-03-06: Implemented contribution attribution and dashboard display (Story 4-3)
- 2026-03-06: Applied post-review fixes for username attribution, SSE auth/tests, Swagger docs, ingestion timestamp rendering, and TypeScript build cleanup

### File List

**New files:**

- `apps/api/prisma/migrations/20260306100000_add_unattributed_contribution_status/migration.sql`
- `apps/api/prisma/migrations/20260306153000_add_contributor_github_username/migration.sql`
- `apps/api/src/modules/ingestion/services/contribution-attribution.service.ts`
- `apps/api/src/modules/ingestion/services/contribution-attribution.service.spec.ts`
- `apps/api/src/modules/ingestion/contribution.controller.ts`
- `apps/api/src/modules/ingestion/contribution.controller.spec.ts`
- `apps/api/src/modules/ingestion/contribution-sse.controller.ts`
- `apps/api/src/modules/ingestion/contribution-sse.service.ts`
- `apps/api/src/modules/ingestion/contribution-sse.controller.spec.ts`
- `apps/api/src/modules/ingestion/contribution-sse.service.spec.ts`
- `apps/api/src/modules/ingestion/dto/contribution-list-query.dto.ts`
- `apps/web/hooks/use-contributions.ts`
- `apps/web/hooks/use-contribution-detail.ts`
- `apps/web/hooks/use-contribution-sse.ts`
- `apps/web/app/(dashboard)/dashboard/contributions/page.tsx`
- `apps/web/components/features/contributions/contribution-list.tsx`
- `apps/web/components/features/contributions/contribution-list-item.tsx`
- `apps/web/components/features/contributions/contribution-detail.tsx`
- `apps/web/components/features/contributions/contributions.test.tsx`

**Modified files:**

- `apps/api/prisma/schema.prisma` (added UNATTRIBUTED status and contributor GitHub username field)
- `apps/api/src/modules/ingestion/ingestion.module.ts` (registered new services/controllers)
- `apps/api/src/modules/auth/casl/subjects.ts` (added Contribution subject)
- `apps/api/src/modules/auth/casl/ability.factory.ts` (added Contribution read permission for contributors)
- `apps/api/src/common/redis/redis.service.ts` (added publish and createSubscriber methods)
- `apps/api/src/modules/auth/strategies/github.strategy.ts` (added GitHub username to auth profile mapping)
- `apps/api/src/modules/auth/auth.service.ts` (persisted contributor GitHub usernames)
- `apps/api/src/modules/auth/auth.controller.ts` (aligned GitHub callback typing with auth profile)
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` (added SSE query-token JWT extractor)
- `packages/shared/src/schemas/ingestion.schema.ts` (added UNATTRIBUTED, list/detail schemas)
- `packages/shared/src/types/ingestion.types.ts` (added UNATTRIBUTED, new types)
- `packages/shared/src/index.ts` (exported new schemas/types)
- `apps/api/src/modules/ingestion/processors/webhook.processor.ts` (emitted persisted contribution IDs and GitHub usernames)
- `apps/api/src/modules/ingestion/processors/webhook.processor.spec.ts` (updated event assertions for persisted contribution IDs)
- `apps/api/src/modules/ingestion/processors/webhook.processor.integration.spec.ts` (updated ingestion event assertions)
- `apps/api/src/modules/ingestion/contribution.controller.ts` (added Swagger decorators)
- `apps/api/src/modules/ingestion/ingestion.controller.ts` (fixed type-only RawBodyRequest import for build)
- `apps/api/src/modules/admission/admission.service.ts` (fixed nullable effort comparison for build)
- `apps/web/app/(dashboard)/dashboard/page.tsx` (replaced placeholder with contributions link)
- `apps/web/app/(dashboard)/dashboard/page.test.tsx` (updated test for new placeholder text)
- `apps/web/components/features/contributions/contribution-list-item.tsx` (switched relative timestamp to ingestion time)
- `apps/web/components/features/contributions/contribution-detail.tsx` (switched detail timestamp to ingestion time)
