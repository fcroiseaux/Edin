# Story 6.1: Peer Reviewer Assignment

Status: done

## Story

As a platform operator,
I want the system to automatically assign peer reviewers to contributions,
so that every contribution receives timely, structured feedback from a knowledgeable peer.

## Acceptance Criteria (BDD)

### AC1: Trigger on Ingestion

**Given** a new contribution is ingested and not yet covered by AI evaluation
**When** the contribution reaches INGESTED status
**Then** the system dispatches a job to the `feedback-assignment` BullMQ queue to assign a peer reviewer

### AC2: Reviewer Selection Logic

**Given** the feedback assignment processor runs
**When** it selects a reviewer
**Then** the reviewer is chosen based on:

- Matching domain expertise (primary domain match preferred)
- Not the contributor themselves
- Not already assigned to review this contribution
- Lowest current review load (fewest pending reviews)

**And** the assignment is randomized within the eligible pool to prevent collusion patterns (fraud prevention)

### AC3: Assignment Recording

**Given** a reviewer is assigned
**When** the assignment is saved
**Then**:

- A `PeerFeedback` record is created with: contributionId, reviewerId, status ASSIGNED, assignedAt timestamp
- The reviewer receives a notification (via notification system from Story 5-5) that a review is waiting
- A domain event `feedback.review.assigned` is emitted via EventEmitter2

### AC4: Fallback for No Eligible Reviewer

**Given** no eligible reviewer is found
**When** the assignment fails
**Then**:

- The contribution is flagged for manual admin assignment with status UNASSIGNED
- A warning-level log is emitted
- The admin can manually assign a reviewer via the admin panel (fallback per NFR-R5)

### AC5: Success Metrics

**Given** the assignment system operates
**When** assignments are processed
**Then**:

- > 95% of assignments succeed automatically (NFR-R5)
- Admin manual override resolves unassigned reviews within <5 minutes

## Tasks / Subtasks

### Task 1: Database Schema & Shared Types (AC: #1, #3)

- [x] 1.1 Add `FeedbackStatus` enum to Prisma schema in `core` schema
  - Values: `ASSIGNED`, `COMPLETED`, `REASSIGNED`, `UNASSIGNED`
  - Add `@@schema("core")` mapping (all Prisma enums in this project use schema mapping)
- [x] 1.2 Add `PeerFeedback` model to Prisma schema in `core` schema
  - Columns: `id` (UUID PK), `contributionId` (FK → Contribution), `reviewerId` (FK → Contributor), `status` (FeedbackStatus, default ASSIGNED), `ratings` (Json?), `comments` (String?), `assignedBy` (String? — null for automatic, admin contributorId for manual assignment), `assignedAt` (DateTime, default now()), `submittedAt` (DateTime?), `reassignedAt` (DateTime?), `reassignReason` (String?), `createdAt` (DateTime), `updatedAt` (DateTime)
  - Relations: `contribution Contribution @relation("ContributionFeedbacks", ...)`, `reviewer Contributor @relation("ReviewerFeedbacks", ...)` — explicit relation names required to avoid Prisma ambiguity with multiple FKs to same model
  - Indexes: `idx_peer_feedback_reviewer_status` (reviewerId, status), `idx_peer_feedback_contribution` (contributionId), `idx_peer_feedback_status_assigned` (status, assignedAt) for overdue queries
  - Unique constraint: `@@unique([contributionId, reviewerId])` — prevent duplicate assignments
  - @@map("peer_feedbacks")
  - @@schema("core")
- [x] 1.3 Add reverse relation to `Contribution` model: `peerFeedbacks PeerFeedback[] @relation("ContributionFeedbacks")`
- [x] 1.4 Add reverse relation to `Contributor` model: `peerFeedbacksGiven PeerFeedback[] @relation("ReviewerFeedbacks")`
- [x] 1.5 Create Prisma migration: `apps/api/prisma/migrations/20260308400000_add_peer_feedback/migration.sql`
- [x] 1.6 Create `packages/shared/src/schemas/feedback.schema.ts`
  - Schemas: `feedbackStatusEnum`, `peerFeedbackSchema`, `feedbackQuerySchema` (cursor, limit 1-50 default 20, status filter optional), `feedbackAssignmentSchema`
- [x] 1.7 Create `packages/shared/src/types/feedback.types.ts`
  - Types: `FeedbackStatus`, `PeerFeedbackDto`, `FeedbackListResponse`, `FeedbackAssignmentEvent`
- [x] 1.8 Add error codes to `packages/shared/src/constants/error-codes.ts`: `FEEDBACK_NOT_FOUND`, `FEEDBACK_ALREADY_ASSIGNED`, `NO_ELIGIBLE_REVIEWER`, `FEEDBACK_ACCESS_DENIED`
- [x] 1.9 Export from `packages/shared/src/index.ts`

### Task 2: Feedback Module — Backend Service (AC: #1, #2, #3, #4)

- [x] 2.1 Create `apps/api/src/modules/feedback/feedback.module.ts`
  - Imports: PrismaModule, CaslModule, BullModule.registerQueue({ name: 'feedback-assignment' }), BullModule.registerQueue({ name: 'feedback-assignment-dlq' }), RedisModule
  - Providers: FeedbackService, FeedbackAssignmentProcessor
  - Controllers: FeedbackController
  - Exports: FeedbackService
- [x] 2.2 Create `apps/api/src/modules/feedback/feedback.service.ts`
  - `assignReviewer(contributionId, correlationId?)` — selects best reviewer using selection logic (AC2), creates PeerFeedback record inside `$transaction` with audit log entry (action: `'FEEDBACK_AUTO_ASSIGNED'`), emits event, enqueues notification
  - `getAssignmentsForReviewer(reviewerId, query?)` — returns reviewer's assigned reviews with pagination
  - `getAssignmentsForContribution(contributionId)` — returns all feedback assignments for a contribution
  - `adminAssignReviewer(contributionId, reviewerId, adminId, correlationId?)` — manual admin assignment (AC4 fallback), creates PeerFeedback record inside `$transaction` with audit log entry (action: `'FEEDBACK_ADMIN_ASSIGNED'`, actorId: adminId), sets `assignedBy` to adminId
  - `@OnEvent('contribution.commit.ingested')` / `@OnEvent('contribution.pull_request.ingested')` / `@OnEvent('contribution.review.ingested')` → dispatch job to `feedback-assignment` BullMQ queue
    - **IMPORTANT**: The ingestion event payload is `{ contributionId, contributionType, contributorId, repositoryId, correlationId }`. It does NOT include `contributorDomain` or `contributionTitle`. The listener must: (1) skip if `contributorId` is null (unattributed contributions), (2) fetch contribution title and contributor domain from the database before dispatching the BullMQ job with the full `FeedbackAssignmentJobData`.
  - Private `selectReviewer(contributionId, contributorDomain, contributorId)` — reviewer selection algorithm:
    1. Query all contributors with matching domain (or any domain if no match)
    2. Exclude the contribution author
    3. Exclude contributors already assigned to this contribution
    4. Count pending reviews per candidate (`status = ASSIGNED`)
    5. Sort by lowest review load
    6. Among tied candidates, select randomly (collusion prevention)
    7. Return null if no eligible reviewer found
- [x] 2.3 Create `apps/api/src/modules/feedback/feedback.service.spec.ts`
  - Test: assignReviewer selects reviewer with matching domain and lowest load
  - Test: assignReviewer excludes contribution author from candidates
  - Test: assignReviewer excludes already-assigned reviewers
  - Test: assignReviewer randomizes among tied candidates
  - Test: assignReviewer returns null and logs warning when no eligible reviewer
  - Test: assignReviewer creates PeerFeedback record with ASSIGNED status
  - Test: assignReviewer emits `feedback.review.assigned` event
  - Test: event listeners dispatch job to feedback-assignment queue
  - Test: event listeners skip when contributorId is null
  - Test: event listeners fetch contribution title and contributor domain from DB
  - Test: assignReviewer creates audit log entry for automatic assignment
  - Test: adminAssignReviewer creates record for specified reviewer
  - Test: adminAssignReviewer creates audit log entry with admin actor
  - Test: getAssignmentsForReviewer returns paginated assignments

### Task 3: Feedback Assignment Processor (AC: #1, #3, #4)

- [x] 3.1 Create `apps/api/src/modules/feedback/feedback-assignment.processor.ts`
  - `@Processor('feedback-assignment')` extends `WorkerHost`
  - Constructor: PrismaService, FeedbackService, @InjectQueue('feedback-assignment-dlq')
  - `async process(job: Job<FeedbackAssignmentJobData>)`:
    1. Call `feedbackService.assignReviewer(job.data.contributionId, job.data.correlationId)`
    2. If assignment succeeds → log success
    3. If no eligible reviewer → create UNASSIGNED record, log warning
    4. On max retries failure → move to DLQ
- [x] 3.2 Create `apps/api/src/modules/feedback/feedback-assignment.processor.spec.ts`
  - Test: processor calls feedbackService.assignReviewer
  - Test: processor logs warning on no eligible reviewer
  - Test: processor moves failed job to DLQ on max retries
  - Test: processor creates UNASSIGNED record when no reviewer found

### Task 4: Notification Integration (AC: #3)

- [x] 4.1 Add `@OnEvent('feedback.review.assigned')` listener to `NotificationService`
  - When a reviewer is assigned, enqueue PEER_FEEDBACK_AVAILABLE notification for the reviewer
  - Notification category: `'feedback'`
  - Title: `"You've been asked to review a contribution"` (warm, human-first language per UX "Calm Clarity" pattern — no impersonal assignment language)
  - Description: `"Review ${contributionType}: ${contributionTitle}"`
- [x] 4.2 Add tests to `notification.service.spec.ts` for the new event listener
  - Test: enqueues notification for reviewer on feedback.review.assigned
  - Test: notification has correct type PEER_FEEDBACK_AVAILABLE and category 'feedback'

### Task 5: CASL Permissions & Controller (AC: #3, #4)

- [x] 5.1 Update `ability.factory.ts` to add PeerFeedback permissions:
  - CONTRIBUTOR: `can(Action.Read, 'PeerFeedback', { reviewerId: user.id })` — read own assignments
  - ADMIN: already has `Manage all`
- [x] 5.2 Add `ability.factory.spec.ts` tests:
  - Test: CONTRIBUTOR can read own PeerFeedback
  - Test: CONTRIBUTOR cannot read other's PeerFeedback
  - Test: ADMIN can manage PeerFeedback
- [x] 5.3 Create `apps/api/src/modules/feedback/feedback.controller.ts`
  - `GET /api/v1/feedback/assignments` — reviewer's assigned reviews (authenticated contributor)
  - `GET /api/v1/feedback/contributions/:id` — feedback for a specific contribution
  - `POST /api/v1/admin/feedback/assign` — admin manual assignment (admin only)
  - All endpoints use `@UseGuards(JwtAuthGuard, AbilityGuard)` and `@CheckAbility()`
- [x] 5.4 Create `apps/api/src/modules/feedback/feedback.controller.spec.ts`
  - Test: GET /assignments returns reviewer's assignments
  - Test: GET /contributions/:id returns feedback for contribution
  - Test: POST /admin/assign creates assignment (admin only)
  - Test: guard verification at class level
- [x] 5.5 Register FeedbackModule in `app.module.ts`

### Task 6: Activity Feed Integration (AC: #3)

- [x] 6.1 Add `@OnEvent('feedback.review.assigned')` listener to `ActivityService`
  - Create activity event: `FEEDBACK_ASSIGNED` type
  - Title: `"Peer review assigned for ${contributionTitle}"`
- [x] 6.2 Add `FEEDBACK_ASSIGNED` to `ActivityEventType` in BOTH:
  - `packages/shared/src/types/activity.types.ts` (shared type union)
  - `apps/api/prisma/schema.prisma` → `ActivityEventType` enum (Prisma enum must stay in sync with shared type)
- [x] 6.3 Add tests to `activity.service.spec.ts` for the new event listener

### Task 7: Testing (AC: #1-#5)

- [x] 7.1 Run full API test suite — verify 0 regressions
- [x] 7.2 Run full web test suite — verify 0 regressions
- [x] 7.3 Verify all new tests pass

## Dev Notes

### Architecture Patterns — MUST FOLLOW

- **Module pattern**: Follow `apps/api/src/modules/notification/` exactly — module.ts with BullModule.registerQueue, service.ts with @OnEvent listeners, processor.ts extending WorkerHost
- **BullMQ**: `BullModule.forRootAsync()` is already in `app.module.ts` — do NOT add it again. Only use `BullModule.registerQueue()` in the feedback module
- **Event emission**: Use `EventEmitter2` from `@nestjs/event-emitter`. Payload structure: `{ eventType, timestamp, correlationId, actorId, payload: { ... } }`
- **CASL subjects**: `PeerFeedback` already exists in `apps/api/src/modules/auth/casl/subjects.ts` — no need to add
- **Prisma imports**: Import types from `../../../generated/prisma/client/client.js` — NOT from `@prisma/client` (Prisma 7 local generation)
- **API response**: Always use `createSuccessResponse(data, correlationId, pagination?)` from `apps/api/src/common/types/api-response.type.ts`
- **Error handling**: Use `DomainException` from `apps/api/src/common/exceptions/domain.exception.ts` with error codes from `@edin/shared`
- **Controller version**: Use `@Controller({ path: 'feedback', version: '1' })` — all routes are `/api/v1/feedback/*`
- **DTO validation**: Zod schemas in `packages/shared/src/schemas/`, re-exported from `apps/api/src/modules/feedback/dto/`
- **Testing**: Vitest with `describe/it/expect/vi/beforeEach`. Mock Prisma, queues, and services. Co-locate spec files with source.
- **Logging**: Use `private readonly logger = new Logger(ClassName.name)` with structured context objects `{ module: 'feedback', ... }`
- **Audit logging**: All assignment actions (automatic + manual) must create `prisma.auditLog.create` entries inside `$transaction`. Follow pattern in `working-group.service.ts`. Required by NFR-S6 (immutable audit trail, 2-year retention).
- **Ingestion event payload caveat**: The `contribution.*.ingested` events only carry `{ contributionId, contributionType, contributorId, repositoryId, correlationId }`. They do NOT include `contributorDomain` or `contributionTitle`. Event listeners must fetch these from the DB before dispatching to the BullMQ queue. Also skip if `contributorId` is null (unattributed contributions).

### Critical Code Reuse — DO NOT REINVENT

| What                         | Where                                                             | Why                                                                    |
| ---------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| BullMQ processor pattern     | `apps/api/src/modules/notification/notification.processor.ts`     | WorkerHost, @Processor, DLQ handling, retry/backoff                    |
| BullMQ queue registration    | `apps/api/src/modules/notification/notification.module.ts`        | registerQueue pattern with defaultJobOptions                           |
| Event listener pattern       | `apps/api/src/modules/notification/notification.service.ts`       | @OnEvent with typed payloads, error handling try/catch                 |
| Notification integration     | `apps/api/src/modules/notification/notification.service.ts`       | `enqueueNotification()` and `addBulk()` patterns                       |
| CASL field-level permissions | `apps/api/src/modules/auth/casl/ability.factory.ts`               | `can(Action.Read, 'Notification', { contributorId: user.id })` pattern |
| Controller guards/decorators | `apps/api/src/modules/notification/notification.controller.ts`    | @UseGuards, @CheckAbility, @CurrentUser, createSuccessResponse         |
| DTO Zod validation           | `apps/api/src/modules/notification/dto/notification-query.dto.ts` | z.object with coerce, enum, optional patterns                          |
| Audit logging                | `apps/api/src/modules/working-group/working-group.service.ts`     | `prisma.auditLog.create` inside $transaction                           |
| Event emission with payload  | `apps/api/src/modules/working-group/working-group.service.ts`     | eventEmitter.emit with standardized payload structure                  |
| Test mock patterns           | `apps/api/src/modules/notification/notification.service.spec.ts`  | mockPrisma, mockQueue (add/addBulk), vi.fn() patterns                  |

### UX Requirements — NOT APPLICABLE TO THIS STORY

Story 6-1 is purely backend — no frontend components. Frontend for feedback (rubric display, reviewer experience) comes in Story 6-2. The only frontend effect is that the notification system (already built in Story 5-5) will show a warm dot when a reviewer receives a notification of type `PEER_FEEDBACK_AVAILABLE` in category `'feedback'`. This works automatically — no frontend changes needed.

### Reviewer Selection Algorithm — DETAILED SPECIFICATION

```
FUNCTION selectReviewer(contributionId, contributorDomain, contributorId):
  1. candidates = SELECT contributors WHERE:
     - role IN ('CONTRIBUTOR', 'FOUNDING_CONTRIBUTOR', 'WORKING_GROUP_LEAD', 'EDITOR')
     - isActive = true
     - id != contributorId (not the author)
     - id NOT IN (SELECT reviewerId FROM peer_feedbacks WHERE contributionId = this contribution)

  2. IF contributorDomain is not null:
     domainCandidates = candidates.filter(c => c.domain == contributorDomain)
     IF domainCandidates.length > 0:
       candidates = domainCandidates

  3. FOR each candidate:
     pendingCount = COUNT peer_feedbacks WHERE reviewerId = candidate.id AND status = 'ASSIGNED'

  4. minLoad = MIN(pendingCount across all candidates)
     tiedCandidates = candidates.filter(c => c.pendingCount == minLoad)

  5. RETURN random(tiedCandidates) OR null if no candidates
```

### Event Payload Structures

**feedback.review.assigned:**

```typescript
{
  eventType: 'feedback.review.assigned',
  timestamp: string, // ISO 8601
  correlationId: string,
  actorId: string, // system or admin who triggered
  payload: {
    peerFeedbackId: string,
    contributionId: string,
    reviewerId: string,
    contributionTitle: string,
    contributionType: string, // COMMIT | PULL_REQUEST | CODE_REVIEW
    domain: string, // contributor domain
  }
}
```

**FeedbackAssignmentJobData (BullMQ job):**

```typescript
{
  contributionId: string,
  contributorId: string, // contribution author (to exclude)
  contributorDomain: string | null,
  contributionTitle: string,
  contributionType: string,
  correlationId: string,
}
```

### Performance Requirements

| Metric                  | Target                                | Source       |
| ----------------------- | ------------------------------------- | ------------ |
| Assignment success rate | >95% automated                        | NFR-R5       |
| API response time       | <500ms 95th percentile                | NFR-P4       |
| Queue processing        | Non-blocking, async                   | Architecture |
| Retry strategy          | 3 attempts, exponential (1s, 4s, 16s) | Architecture |
| Notification delivery   | <5 seconds from event                 | NFR-P3       |

### Database Design Notes

- Place `PeerFeedback` in `core` schema (not `evaluation`) — it relates directly to `Contribution` and `Contributor` which are in `core`. Note: architecture doc groups it under `evaluation` but `core` is correct since both FK targets live in `core`
- The `ratings` JSON field stores rubric responses (populated in Story 6-2 when reviewer submits)
- `comments` text field stores free-text feedback (also Story 6-2)
- `assignedBy` nullable field: null = automatic assignment, contributorId = admin who manually assigned. Enables admin monitoring in Story 6-3 without future migration
- For Story 6-1, only `status`, `assignedAt`, `assignedBy`, `contributionId`, `reviewerId` are populated on creation
- The `@@unique([contributionId, reviewerId])` constraint prevents the same reviewer being assigned twice to the same contribution
- Use explicit `@relation` names on both FK fields (`"ContributionFeedbacks"`, `"ReviewerFeedbacks"`) — Prisma requires this when a model has multiple relations to the same target model

### Project Structure Notes

- New module at `apps/api/src/modules/feedback/` — follows standard NestJS module structure
- Shared types at `packages/shared/src/types/feedback.types.ts` and schemas at `packages/shared/src/schemas/feedback.schema.ts`
- No frontend routes/components needed for this story
- Register `FeedbackModule` in `apps/api/src/app.module.ts` imports array

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Feedback module, Database schema, Event patterns]
- [Source: _bmad-output/planning-artifacts/prd.md — FR28, NFR-R5, NFR-P4, Fraud prevention]
- [Source: apps/api/src/modules/notification/ — BullMQ processor, service, event listener patterns]
- [Source: apps/api/src/modules/auth/casl/ — CASL subject and ability patterns]
- [Source: apps/api/src/modules/working-group/ — Event emission and audit log patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- No blocking issues encountered during implementation

### Completion Notes List

- Implemented FeedbackStatus enum (ASSIGNED, COMPLETED, REASSIGNED, UNASSIGNED) and PeerFeedback model in Prisma schema with all required columns, indexes, unique constraints, and explicit relation names
- Created SQL migration for peer_feedbacks table and FEEDBACK_ASSIGNED activity event type
- Built FeedbackService with full reviewer selection algorithm: domain matching, author exclusion, duplicate prevention, load balancing, randomized tie-breaking (collusion prevention)
- Implemented automatic assignment via @OnEvent listeners on contribution.\*.ingested events, dispatching to BullMQ feedback-assignment queue
- Built FeedbackAssignmentProcessor (WorkerHost) with DLQ handling and UNASSIGNED fallback
- Integrated with NotificationService: PEER_FEEDBACK_AVAILABLE notifications with warm human-first language
- Integrated with ActivityService: FEEDBACK_ASSIGNED activity events for the feed
- Updated CASL ability factory: field-level PeerFeedback read permission (reviewerId: user.id)
- Built FeedbackController with GET /assignments, GET /contributions/:id, POST /admin/assign endpoints
- Admin manual assignment with audit logging (FEEDBACK_ADMIN_ASSIGNED with actorId)
- All assignment operations use $transaction with audit log entries
- Added shared types, schemas, and error codes to @edin/shared package
- All 604 API tests pass (0 regressions), all 318 web tests pass (0 regressions)
- Lint clean across all new files

### File List

- `apps/api/prisma/schema.prisma` (modified — added FeedbackStatus enum, PeerFeedback model, FEEDBACK_ASSIGNED to ActivityEventType, reverse relations)
- `apps/api/prisma/migrations/20260308400000_add_peer_feedback/migration.sql` (new)
- `apps/api/src/app.module.ts` (modified — registered FeedbackModule)
- `apps/api/src/modules/feedback/feedback.module.ts` (new)
- `apps/api/src/modules/feedback/feedback.service.ts` (new)
- `apps/api/src/modules/feedback/feedback.service.spec.ts` (new)
- `apps/api/src/modules/feedback/feedback-assignment.processor.ts` (new)
- `apps/api/src/modules/feedback/feedback-assignment.processor.spec.ts` (new)
- `apps/api/src/modules/feedback/feedback.controller.ts` (new)
- `apps/api/src/modules/feedback/feedback.controller.spec.ts` (new)
- `apps/api/src/modules/feedback/feedback-admin.controller.ts` (new — admin endpoint at /api/v1/admin/feedback/assign)
- `apps/api/src/modules/feedback/feedback-admin.controller.spec.ts` (new)
- `apps/api/src/modules/feedback/dto/feedback-query.dto.ts` (new)
- `apps/api/src/modules/notification/notification.service.ts` (modified — added feedback.review.assigned listener)
- `apps/api/src/modules/notification/notification.service.spec.ts` (modified — added feedback notification tests)
- `apps/api/src/modules/activity/activity.service.ts` (modified — added feedback.review.assigned listener)
- `apps/api/src/modules/activity/activity.service.spec.ts` (modified — added feedback activity test)
- `apps/api/src/modules/auth/casl/ability.factory.ts` (modified — field-level PeerFeedback permission)
- `apps/api/src/modules/auth/casl/ability.factory.spec.ts` (modified — added PeerFeedback CASL tests)
- `packages/shared/src/schemas/feedback.schema.ts` (new)
- `packages/shared/src/types/feedback.types.ts` (new)
- `packages/shared/src/schemas/activity.schema.ts` (modified — added FEEDBACK_ASSIGNED)
- `packages/shared/src/types/activity.types.ts` (modified — added FEEDBACK_ASSIGNED)
- `packages/shared/src/constants/error-codes.ts` (modified — added feedback error codes)
- `packages/shared/src/index.ts` (modified — added feedback exports)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status updates)

## Change Log

- 2026-03-09: Implemented Story 6-1 Peer Reviewer Assignment — full backend: Prisma schema, migration, FeedbackModule (service, processor, controller), notification/activity integration, CASL permissions, shared types/schemas. All 604+318 tests pass.
- 2026-03-09: Code review fixes (7 issues resolved): H1-removed semantically incorrect UNASSIGNED record creation using author as reviewer; H2-replaced plain Error with DomainException for adminAssignReviewer; H3-added field-level CASL filtering in getContributionFeedback endpoint; H4-moved admin endpoint to /api/v1/admin/feedback/assign following project convention; M1-replaced duplicated FeedbackReviewAssignedPayload with shared FeedbackAssignmentEvent type; M2-combined two DB queries into single query in dispatchAssignment; M3-removed silent error swallowing (moot after H1). All 607+318 tests pass.
