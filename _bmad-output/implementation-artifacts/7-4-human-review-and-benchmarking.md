# Story 7.4: Human Review & Benchmarking

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want to flag an evaluation I believe is incorrect,
So that a human can review and correct potential AI errors, maintaining trust in the system.

## Acceptance Criteria (BDD)

### AC1: Contributor Flags Evaluation for Human Review

**Given** I am an authenticated contributor viewing an evaluation of my own contribution
**When** I click the "Request Human Review" action on the evaluation detail page
**Then** a dialog appears asking me to provide a brief reason for the flag (minimum 50 characters, to ensure substantive input)
**And** on submission, a POST /api/v1/evaluations/:id/flag creates a human review request with status PENDING
**And** a domain event `evaluation.review.flagged` is emitted
**And** the evaluation display shows a discreet "Human review requested" status indicator
**And** the flag action is recorded in the audit log (NFR-S6)

### AC2: Admin Review Queue

**Given** I am an admin
**When** I navigate to /admin/evaluations/review-queue
**Then** I see all flagged evaluations with: contributor name, contribution title, domain, original AI score, flag reason, and time since flagged
**And** the queue is sortable by date flagged and filterable by domain
**And** the queue uses cursor-based pagination

### AC3: Admin Reviews and Resolves Flagged Evaluation

**Given** I am an admin reviewing a flagged evaluation
**When** I select a flagged item
**Then** I see the full evaluation narrative, dimension scores, the contributor's flag reason, and the original contribution artifacts side-by-side
**And** I can either: confirm the AI evaluation (marking the flag as RESOLVED with reason), or override the evaluation with adjusted scores and an updated narrative explanation
**And** if I override, the new scores replace the original with a full audit trail: original scores, override scores, admin ID, reason, timestamp
**And** a domain event `evaluation.review.resolved` is emitted
**And** the contributor receives a notification that their review request has been processed

### AC4: AI-Human Benchmarking Metrics

**Given** the system benchmarks AI evaluations against human assessments (FR24)
**When** human review overrides accumulate
**Then** the system tracks the AI-human agreement rate (percentage of AI evaluations confirmed vs. overridden by humans)
**And** this agreement rate is calculated per model version and per domain
**And** the benchmarking data is available on the admin evaluation dashboard for model quality monitoring
**And** the agreement rate is also exposed for the public showcase (Epic 7, Story 7.5)

## Tasks / Subtasks

- [x] Task 1: Database Schema — EvaluationReview Table & Migration (AC: #1, #2, #3, #4)
  - [x]1.1 Add `EvaluationReview` model to `apps/api/prisma/schema.prisma` in the `evaluation` schema with fields: id (UUID PK), evaluationId (FK to Evaluation, unique), contributorId (FK to Contributor), reviewerId (FK to Contributor, nullable — the admin), status (enum: PENDING, CONFIRMED, OVERRIDDEN), flagReason (text, min 50 chars), reviewReason (text, nullable), originalScores (JSON — snapshot of compositeScore + dimensionScores at flag time), overrideScores (JSON, nullable — new compositeScore + dimensionScores if overridden), overrideNarrative (text, nullable), flaggedAt (DateTime, default now), resolvedAt (DateTime, nullable), createdAt, updatedAt
  - [x]1.2 Add `EvaluationReviewStatus` enum: `PENDING`, `CONFIRMED`, `OVERRIDDEN` in `evaluation` schema
  - [x]1.3 Add `reviews` relation on `Evaluation` model (one-to-one: an evaluation can only be flagged once)
  - [x]1.4 Add index on `[status, flaggedAt]` for review queue queries
  - [x]1.5 Create Prisma migration: `npx prisma migrate dev --name add-evaluation-review`
  - [x]1.6 Regenerate Prisma client

- [x] Task 2: Shared Types, Schemas & Constants (AC: #1, #2, #3, #4)
  - [x]2.1 Add `EvaluationReviewStatus` type to `packages/shared/src/types/evaluation.types.ts`: `'PENDING' | 'CONFIRMED' | 'OVERRIDDEN'`
  - [x]2.2 Add `EvaluationReviewDto` interface: id, evaluationId, contributorId, reviewerId, status, flagReason, reviewReason, originalScores, overrideScores, overrideNarrative, flaggedAt, resolvedAt
  - [x]2.3 Add `EvaluationReviewFlaggedEvent` and `EvaluationReviewResolvedEvent` interfaces following `EvaluationCompletedEvent` pattern
  - [x]2.4 Add `EvaluationReviewQueueItemDto` interface: id, evaluationId, contributorName, contributionTitle, domain, originalScore, flagReason, flaggedAt, status
  - [x]2.5 Add `AgreementRateDto` interface: modelId, modelVersion, domain, totalReviewed, confirmed, overridden, agreementRate (number 0-100)
  - [x]2.6 Add Zod schemas in `packages/shared/src/schemas/evaluation.schema.ts`: `flagEvaluationSchema` (flagReason: string min 50), `resolveReviewSchema` (action: 'confirm' | 'override', reviewReason: string min 10, overrideScores?: Record, overrideNarrative?: string), `reviewQueueQuerySchema` (cursor, limit, domain?, status?)
  - [x]2.7 Add error codes in `packages/shared/src/constants/error-codes.ts`: `EVALUATION_REVIEW_NOT_FOUND`, `EVALUATION_ALREADY_FLAGGED`, `EVALUATION_NOT_COMPLETED`, `EVALUATION_REVIEW_ALREADY_RESOLVED`
  - [x]2.8 Update `packages/shared/src/index.ts` exports

- [x] Task 3: Backend — EvaluationReview Service (AC: #1, #2, #3, #4)
  - [x]3.1 Create `apps/api/src/modules/evaluation/services/evaluation-review.service.ts` with methods:
    - `flagEvaluation(evaluationId, contributorId, flagReason, correlationId)` — validates evaluation exists, is COMPLETED, belongs to contributor, not already flagged; creates EvaluationReview (PENDING) with snapshot of original scores; creates audit log `EVALUATION_REVIEW_FLAGGED`; emits `evaluation.review.flagged` event
    - `getReviewQueue(query: { cursor, limit, domain?, status? })` — returns flagged reviews with contributor name, contribution title, domain, scores, sorted by flaggedAt desc with cursor pagination
    - `getReviewDetail(reviewId)` — returns full review with evaluation narrative, dimension scores, flag reason, contribution artifacts
    - `resolveReview(reviewId, adminId, action, reviewReason, overrideScores?, overrideNarrative?)` — if confirm: update review status to CONFIRMED with reviewReason; if override: update review to OVERRIDDEN, update evaluation compositeScore + dimensionScores + narrative with override values, snapshot original in review record; creates audit log `EVALUATION_REVIEW_RESOLVED`; emits `evaluation.review.resolved` event
    - `getAgreementRates(modelId?)` — calculates AI-human agreement rate per model version and per domain from resolved reviews
  - [x]3.2 Write unit tests `evaluation-review.service.spec.ts` covering: flag creation happy path, flag on non-completed evaluation (error), flag on already-flagged evaluation (error), flag on someone else's evaluation (error), confirm review, override review with score replacement, agreement rate calculation, review queue pagination

- [x] Task 4: Backend — API Endpoints (AC: #1, #2, #3, #4)
  - [x]4.1 Add `POST /api/v1/evaluations/:id/flag` to `EvaluationController` — contributor-only, validates flagReason with Zod schema, calls `evaluationReviewService.flagEvaluation()`, returns review DTO
  - [x]4.2 Add admin endpoints to `EvaluationAdminController`:
    - `GET /api/v1/admin/evaluations/reviews` — review queue with pagination + domain filter
    - `GET /api/v1/admin/evaluations/reviews/:id` — review detail
    - `POST /api/v1/admin/evaluations/reviews/:id/resolve` — confirm or override
    - `GET /api/v1/admin/evaluations/agreement-rates` — benchmarking metrics (optional modelId filter)
  - [x]4.3 Extend existing `GET /api/v1/admin/evaluations/models/:id/metrics` to include `humanAgreementRate` from resolved reviews (currently returns `null`)
  - [x]4.4 Write controller tests `evaluation-review.controller.spec.ts` covering: flag endpoint auth, flag validation, admin queue endpoint auth, resolve endpoint with confirm/override, agreement rates endpoint

- [x] Task 5: Backend — Notifications & Event Listeners (AC: #1, #3)
  - [x]5.1 Add `evaluation.review.flagged` event listener in `NotificationService` — sends notification to admins (type: `EVALUATION_REVIEW_FLAGGED`, category: `evaluation`)
  - [x]5.2 Add `evaluation.review.resolved` event listener in `NotificationService` — sends notification to the contributor who flagged (type: `EVALUATION_REVIEW_RESOLVED`, title: "Your evaluation review has been processed", description includes confirm/override outcome)
  - [x]5.3 Register `EvaluationReviewService` in `evaluation.module.ts`

- [x] Task 6: Frontend — Flag Evaluation Dialog (AC: #1)
  - [x]6.1 Create `apps/web/components/features/evaluation/review/flag-evaluation-dialog.tsx` — Radix Dialog with textarea for flag reason (min 50 chars), character counter, submit/cancel buttons. Uses calm styling: no alarming colors, descriptive copy ("Help us improve — tell us what you think was missed"). Disabled submit until 50 chars reached
  - [x]6.2 Create `apps/web/hooks/use-evaluation-review.ts` — `useFlagEvaluation` mutation hook (POST /evaluations/:id/flag), `useReviewStatus` query to check if evaluation is already flagged
  - [x]6.3 Add "Request Human Review" button to evaluation detail page (`apps/web/app/(dashboard)/evaluations/[id]/page.tsx`) — shown only for COMPLETED evaluations, disabled if already flagged, shows "Human review requested" indicator when flagged
  - [x]6.4 Write component test `flag-evaluation-dialog.test.tsx` — renders dialog, validates min 50 chars, submit calls mutation, disabled when already flagged

- [x] Task 7: Frontend — Admin Review Queue Page (AC: #2, #3)
  - [x]7.1 Create `apps/web/app/(admin)/evaluations/review-queue/page.tsx` — admin page listing flagged evaluations with table: contributor, contribution, domain, AI score, flag reason (truncated), time since flagged, status badge. Domain filter dropdown. Cursor-based pagination
  - [x]7.2 Create `apps/web/app/(admin)/evaluations/review-queue/[id]/page.tsx` — review detail page with side-by-side layout: left panel shows evaluation narrative + dimension scores + provenance, right panel shows contributor's flag reason + action form. Action form: radio (Confirm AI / Override), textarea for admin reason, conditional override fields (dimension score inputs, narrative textarea). Submit button
  - [x]7.3 Create `apps/web/components/features/evaluation/review/review-queue-table.tsx` — reusable table component for the queue
  - [x]7.4 Create `apps/web/components/features/evaluation/review/review-resolve-form.tsx` — form component for confirm/override actions with validation
  - [x]7.5 Extend `apps/web/hooks/use-evaluation-review.ts` — add `useReviewQueue` (infinite query), `useReviewDetail`, `useResolveReview` mutation hooks
  - [x]7.6 Add "Review Queue" link to admin evaluation navigation (in admin layout or sidebar)
  - [x]7.7 Write component tests: `review-queue-table.test.tsx` (renders rows, domain filter, pagination), `review-resolve-form.test.tsx` (confirm/override radio, validation, submit)

- [x] Task 8: Frontend — Agreement Rate Dashboard Widget (AC: #4)
  - [x]8.1 Create `apps/web/components/features/evaluation/admin/agreement-rate-card.tsx` — card displaying AI-human agreement rate percentage per model, with domain breakdown. Uses warm tones (no red/green), descriptive label ("AI-human alignment: 78%"). Mini bar chart per domain using Recharts
  - [x]8.2 Extend `apps/web/hooks/use-evaluation-review.ts` — add `useAgreementRates` query hook
  - [x]8.3 Add agreement rate card to admin model metrics page (extend existing `/admin/evaluations/models` page or model detail if exists)
  - [x]8.4 Write component test `agreement-rate-card.test.tsx` — renders percentages, domain breakdown, handles no data gracefully

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**One-to-One Review per Evaluation:**
An evaluation can only be flagged once. The `evaluationId` on `EvaluationReview` is unique. If a contributor wants to re-flag after a confirmed review, they cannot — the system design assumes one review cycle per evaluation. This is intentional to prevent abuse.

**Score Override is Destructive (with Audit Trail):**
When an admin overrides, the evaluation's `compositeScore`, `dimensionScores`, and `narrative` are REPLACED with the override values. The original values are preserved in the `EvaluationReview.originalScores` JSON field. The Redis cache for the evaluation must be invalidated after override. This design was chosen because downstream consumers (dashboard, history, public showcase) should see the corrected scores, not the AI's original mistakes.

**Agreement Rate Calculation:**

```
agreementRate = (confirmed / totalResolved) * 100
```

Where `totalResolved = confirmed + overridden`. PENDING reviews are excluded. Calculate per `modelId` (from the evaluation's model relation) and per domain (from the contribution's working group). The >70% agreement threshold from the PRD is a monitoring target, not an enforced constraint.

**Event-Driven Notification Pattern (existing):**

```typescript
// Emit event in service
this.eventEmitter.emit('evaluation.review.flagged', event);
// NotificationService listens with @OnEvent decorator
@OnEvent('evaluation.review.flagged')
async handleReviewFlagged(event: EvaluationReviewFlaggedEvent): Promise<void> { ... }
```

**Admin Notifications:**
For `evaluation.review.flagged`, notify ALL admins. Use `this.prisma.contributor.findMany({ where: { role: 'ADMIN' } })` to get admin IDs, then `addBulk` to the notification queue.

### Existing Code to Extend (DO NOT Recreate)

| What                   | File                                                 | Action                                                |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Evaluation controller  | `evaluation.controller.ts`                           | Add `POST /:id/flag` endpoint                         |
| Admin controller       | `controllers/evaluation-admin.controller.ts`         | Add review queue + resolve + agreement rate endpoints |
| Evaluation module      | `evaluation.module.ts`                               | Register EvaluationReviewService as provider          |
| Shared types           | `packages/shared/src/types/evaluation.types.ts`      | Add review types, event types, agreement rate DTO     |
| Shared schemas         | `packages/shared/src/schemas/evaluation.schema.ts`   | Add flag, resolve, review queue query schemas         |
| Error codes            | `packages/shared/src/constants/error-codes.ts`       | Add review-specific error codes                       |
| Notification service   | `notification.service.ts`                            | Add event listeners for flagged + resolved events     |
| Prisma schema          | `apps/api/prisma/schema.prisma`                      | Add EvaluationReview model + enum + relation          |
| Frontend eval hooks    | `apps/web/hooks/use-evaluations.ts`                  | No changes needed (detail already works)              |
| Evaluation detail page | `apps/web/app/(dashboard)/evaluations/[id]/page.tsx` | Add flag button + review status indicator             |
| Admin eval models page | If exists, add agreement rate widget                 |                                                       |

### New Files to Create

| File                                                                             | Purpose                                      |
| -------------------------------------------------------------------------------- | -------------------------------------------- |
| `apps/api/src/modules/evaluation/services/evaluation-review.service.ts`          | Review flagging, resolution, agreement rates |
| `apps/api/src/modules/evaluation/services/evaluation-review.service.spec.ts`     | Unit tests                                   |
| `apps/web/hooks/use-evaluation-review.ts`                                        | TanStack Query hooks for review operations   |
| `apps/web/components/features/evaluation/review/flag-evaluation-dialog.tsx`      | Flag dialog component                        |
| `apps/web/components/features/evaluation/review/flag-evaluation-dialog.test.tsx` | Tests                                        |
| `apps/web/components/features/evaluation/review/review-queue-table.tsx`          | Admin review queue table                     |
| `apps/web/components/features/evaluation/review/review-queue-table.test.tsx`     | Tests                                        |
| `apps/web/components/features/evaluation/review/review-resolve-form.tsx`         | Admin resolve form                           |
| `apps/web/components/features/evaluation/review/review-resolve-form.test.tsx`    | Tests                                        |
| `apps/web/components/features/evaluation/admin/agreement-rate-card.tsx`          | Agreement rate widget                        |
| `apps/web/components/features/evaluation/admin/agreement-rate-card.test.tsx`     | Tests                                        |
| `apps/web/app/(admin)/evaluations/review-queue/page.tsx`                         | Admin review queue page                      |
| `apps/web/app/(admin)/evaluations/review-queue/[id]/page.tsx`                    | Admin review detail page                     |

### Prisma Schema Addition

```prisma
enum EvaluationReviewStatus {
  PENDING
  CONFIRMED
  OVERRIDDEN
  @@schema("evaluation")
}

model EvaluationReview {
  id                String                  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  evaluationId      String                  @unique @map("evaluation_id") @db.Uuid
  contributorId     String                  @map("contributor_id") @db.Uuid
  reviewerId        String?                 @map("reviewer_id") @db.Uuid
  status            EvaluationReviewStatus  @default(PENDING)
  flagReason        String                  @map("flag_reason") @db.Text
  reviewReason      String?                 @map("review_reason") @db.Text
  originalScores    Json                    @map("original_scores")
  overrideScores    Json?                   @map("override_scores")
  overrideNarrative String?                 @map("override_narrative") @db.Text
  flaggedAt         DateTime                @default(now()) @map("flagged_at")
  resolvedAt        DateTime?               @map("resolved_at")
  createdAt         DateTime                @default(now()) @map("created_at")
  updatedAt         DateTime                @updatedAt @map("updated_at")

  evaluation        Evaluation              @relation(fields: [evaluationId], references: [id])
  contributor       Contributor             @relation("EvaluationReviewContributor", fields: [contributorId], references: [id])
  reviewer          Contributor?            @relation("EvaluationReviewReviewer", fields: [reviewerId], references: [id])

  @@index([status, flaggedAt], map: "idx_evaluation_reviews_status_flagged")
  @@map("evaluation_reviews")
  @@schema("evaluation")
}
```

Add to `Evaluation` model:

```prisma
  review          EvaluationReview?
```

Add to `Contributor` model:

```prisma
  evaluationReviewsAsContributor EvaluationReview[] @relation("EvaluationReviewContributor")
  evaluationReviewsAsReviewer    EvaluationReview[] @relation("EvaluationReviewReviewer")
```

### API Response Shapes

```typescript
// POST /api/v1/evaluations/:id/flag
// Request: { flagReason: string }
// Response:
{
  data: {
    id: string,
    evaluationId: string,
    status: 'PENDING',
    flagReason: string,
    flaggedAt: string,
  },
  meta: { timestamp: string, correlationId: string }
}

// GET /api/v1/admin/evaluations/reviews
{
  data: Array<{
    id: string,
    evaluationId: string,
    contributorName: string,
    contributionTitle: string,
    domain: string | null,
    originalScore: number,
    flagReason: string,
    flaggedAt: string,
    status: 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN',
  }>,
  meta: {
    timestamp: string,
    correlationId: string,
    pagination: { cursor: string | null, hasMore: boolean, total: number }
  }
}

// GET /api/v1/admin/evaluations/reviews/:id
{
  data: {
    id: string,
    evaluationId: string,
    contributorId: string,
    contributorName: string,
    reviewerId: string | null,
    status: string,
    flagReason: string,
    reviewReason: string | null,
    originalScores: { compositeScore: number, dimensionScores: Record<string, { score: number, explanation: string }> },
    overrideScores: { ... } | null,
    overrideNarrative: string | null,
    flaggedAt: string,
    resolvedAt: string | null,
    evaluation: {
      id: string,
      narrative: string,
      dimensionScores: Record<...>,
      compositeScore: number,
      model: { name: string, version: string, provider: string } | null,
      contribution: { id: string, title: string, contributionType: string, sourceRef: string },
    },
  },
  meta: { timestamp: string, correlationId: string }
}

// POST /api/v1/admin/evaluations/reviews/:id/resolve
// Request: { action: 'confirm' | 'override', reviewReason: string, overrideScores?: { compositeScore: number, dimensionScores: Record<...> }, overrideNarrative?: string }
// Response:
{
  data: {
    id: string,
    status: 'CONFIRMED' | 'OVERRIDDEN',
    reviewReason: string,
    resolvedAt: string,
  },
  meta: { timestamp: string, correlationId: string }
}

// GET /api/v1/admin/evaluations/agreement-rates?modelId=xxx
{
  data: {
    overall: { totalReviewed: number, confirmed: number, overridden: number, agreementRate: number },
    byModel: Array<{ modelId: string, modelVersion: string, totalReviewed: number, confirmed: number, overridden: number, agreementRate: number }>,
    byDomain: Array<{ domain: string, totalReviewed: number, confirmed: number, overridden: number, agreementRate: number }>,
  },
  meta: { timestamp: string, correlationId: string }
}
```

### Existing Patterns to Follow

**Cursor Pagination (from evaluation.service.ts):**

```typescript
// Format: `${date.toISOString()}|${id}`
// Query: createdAt < date OR (createdAt = date AND id < id)
```

**Admin RBAC Guard Pattern (from evaluation-admin.controller.ts):**

```typescript
@Controller({ path: 'admin/evaluations', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
// Per method:
@CheckAbility((ability) => ability.can(Action.Manage, 'all'))
```

**Audit Log Pattern:**

```typescript
await tx.auditLog.create({
  data: {
    actorId: contributorId, // or adminId
    action: 'EVALUATION_REVIEW_FLAGGED',
    entityType: 'EvaluationReview',
    entityId: reviewId,
    correlationId,
    details: { evaluationId, flagReason },
  },
});
```

**Notification Enqueue Pattern (from notification.service.ts):**

```typescript
await this.enqueueNotification({
  contributorId: targetId,
  type: 'EVALUATION_REVIEW_RESOLVED',
  title: 'Your evaluation review has been processed',
  description: `Your review request for "${contributionTitle}" has been ${action === 'confirm' ? 'confirmed' : 'updated with revised scores'}`,
  entityId: reviewId,
  category: 'evaluation',
  correlationId,
});
```

**Card Styling Pattern:**

```typescript
<div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
```

**Dialog Pattern (Radix):**

```typescript
import * as Dialog from '@radix-ui/react-dialog';
// Use Dialog.Root, Dialog.Trigger, Dialog.Portal, Dialog.Overlay, Dialog.Content
```

### UX Guidelines

**Flag Dialog:**

- Tone: supportive, not confrontational. "Help us improve" not "Report an error"
- Minimum 50 characters enforced with a character counter
- No alarming colors. Use brand-secondary for the submit button
- After flagging: show a calm "Human review requested" badge on the evaluation, not an error state

**Admin Review Queue:**

- Editorial table design, not generic dashboard
- Time since flagged shown as relative time ("2h ago", "3 days ago")
- Status badges: PENDING (warm amber), CONFIRMED (calm teal), OVERRIDDEN (soft violet)
- No urgency indicators or red highlights

**Review Detail Page:**

- Side-by-side layout: evaluation on left, contributor's concern on right
- Override form reveals conditionally when "Override" is selected
- Score inputs as subtle number inputs with descriptive labels
- Admin reason textarea required for both confirm and override

**Agreement Rate Card:**

- Warm, non-judgmental display. "78% alignment" not "22% error rate"
- Mini horizontal bar chart per domain using Recharts
- No red/green. Use brand-accent for the rate, brand-secondary for baseline

### Testing Requirements

**Unit Tests (Vitest):**

- `evaluation-review.service.spec.ts` — Flag creation (happy path, already flagged, not completed, not owner), resolve as confirm, resolve as override (scores updated), agreement rate calculation (per model, per domain, overall), review queue pagination
- `evaluation-review.controller.spec.ts` — Flag endpoint (auth, validation, 404, 409), admin queue endpoint, resolve endpoint (auth, confirm, override), agreement rates endpoint

**Component Tests (Vitest + Testing Library):**

- `flag-evaluation-dialog.test.tsx` — Renders textarea, enforces 50 char min, shows counter, calls mutation on submit, disabled when already flagged
- `review-queue-table.test.tsx` — Renders table rows, domain filter works, pagination controls, relative time display
- `review-resolve-form.test.tsx` — Confirm/override radio toggle, conditional override fields, required reason textarea, submit calls correct mutation
- `agreement-rate-card.test.tsx` — Renders percentage, domain breakdown bars, handles 0 reviews gracefully

### Performance Requirements

| Operation          | Target        | Strategy                                                                              |
| ------------------ | ------------- | ------------------------------------------------------------------------------------- |
| Flag evaluation    | < 500ms (p95) | Single transaction (create review + audit log)                                        |
| Review queue list  | < 500ms (p95) | Cursor pagination, indexed on (status, flaggedAt)                                     |
| Review detail load | < 500ms (p95) | Single query with includes                                                            |
| Resolve review     | < 1s (p95)    | Transaction (update review + update evaluation + audit log), Redis cache invalidation |
| Agreement rates    | < 2s          | Aggregate query, consider caching for frequent access                                 |

### Security Requirements

- Flag endpoint: contributor can only flag their own evaluations (contributorId check)
- Flag endpoint: evaluation must be COMPLETED (cannot flag PENDING/IN_PROGRESS/FAILED)
- All admin review endpoints: require ADMIN role via `@CheckAbility()`
- Override updates evaluation in a transaction with full audit trail
- No PII in agreement rate responses (only aggregate statistics)

### Project Structure Notes

- Review service goes in `services/evaluation-review.service.ts` alongside `evaluation-rubric.service.ts`
- Review frontend components go in `components/features/evaluation/review/` (new subfolder)
- Admin review pages follow `(admin)/evaluations/review-queue/` route group pattern
- Agreement rate card goes in `components/features/evaluation/admin/` alongside existing admin components

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.4 — lines 1387-1423]
- [Source: _bmad-output/planning-artifacts/prd.md — FR24 (benchmarking), FR27 (flag for human review), FR47 (public evaluation data)]
- [Source: _bmad-output/planning-artifacts/prd.md — EU AI Act: human oversight mechanisms, >70% agreement threshold]
- [Source: _bmad-output/planning-artifacts/architecture.md — NestJS, Prisma, EventEmitter2, BullMQ, CASL]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — NarrativeCard, calm UX, no red/green]
- [Source: _bmad-output/implementation-artifacts/7-3-transparent-evaluation-narrative-and-score-history.md — Previous story patterns]
- [Source: apps/api/src/modules/evaluation/ — Existing evaluation module code]
- [Source: apps/api/src/modules/notification/notification.service.ts — Event listener + notification patterns]

---

## Dev Agent Record

### Completion Date: 2026-03-09

### Test Results

- API: 738 passed, 0 failed, 1 skipped
- Web: 384 passed, 0 failed
- Prettier: clean

### Files Created

| File                                                                             | Purpose                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/api/prisma/migrations/20260309700000_add_evaluation_review/migration.sql`  | SQL migration for EvaluationReview table, enum, indexes |
| `apps/api/src/modules/evaluation/services/evaluation-review.service.ts`          | Core service: flag, resolve, queue, agreement rates     |
| `apps/api/src/modules/evaluation/services/evaluation-review.service.spec.ts`     | 10 unit tests for review service                        |
| `apps/web/hooks/use-evaluation-review.ts`                                        | TanStack Query hooks (6 hooks)                          |
| `apps/web/components/features/evaluation/review/flag-evaluation-dialog.tsx`      | Radix Dialog flag component                             |
| `apps/web/components/features/evaluation/review/flag-evaluation-dialog.test.tsx` | 5 component tests                                       |
| `apps/web/components/features/evaluation/review/review-queue-table.tsx`          | Admin queue table with status badges                    |
| `apps/web/components/features/evaluation/review/review-queue-table.test.tsx`     | 6 component tests                                       |
| `apps/web/components/features/evaluation/review/review-resolve-form.tsx`         | Confirm/override form with validation                   |
| `apps/web/components/features/evaluation/review/review-resolve-form.test.tsx`    | 8 component tests                                       |
| `apps/web/components/features/evaluation/admin/agreement-rate-card.tsx`          | AI-human alignment card                                 |
| `apps/web/components/features/evaluation/admin/agreement-rate-card.test.tsx`     | 6 component tests                                       |
| `apps/web/app/(admin)/evaluations/review-queue/page.tsx`                         | Admin review queue page                                 |
| `apps/web/app/(admin)/evaluations/review-queue/[id]/page.tsx`                    | Admin review detail page                                |

### Files Modified

| File                                                                              | Changes                                                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/prisma/schema.prisma`                                                   | Added EvaluationReviewStatus enum, EvaluationReview model, relations on Evaluation and Contributor, NotificationType additions |
| `packages/shared/src/types/evaluation.types.ts`                                   | Added review types, event types, agreement rate DTOs                                                                           |
| `packages/shared/src/schemas/evaluation.schema.ts`                                | Added flag, resolve, queue query Zod schemas                                                                                   |
| `packages/shared/src/constants/error-codes.ts`                                    | Added 4 review-specific error codes                                                                                            |
| `packages/shared/src/index.ts`                                                    | Added exports for new schemas and types                                                                                        |
| `apps/api/src/modules/evaluation/evaluation.controller.ts`                        | Added POST :id/flag, GET :id/review-status endpoints                                                                           |
| `apps/api/src/modules/evaluation/controllers/evaluation-admin.controller.ts`      | Added review queue, detail, resolve, agreement-rates endpoints; fixed humanAgreementRate computation                           |
| `apps/api/src/modules/evaluation/evaluation.module.ts`                            | Registered EvaluationReviewService                                                                                             |
| `apps/api/src/modules/notification/notification.service.ts`                       | Added flagged/resolved event listeners with bulk notification                                                                  |
| `apps/web/app/(dashboard)/evaluations/[id]/page.tsx`                              | Added flag button + review status indicator                                                                                    |
| `apps/web/app/(admin)/evaluations/models/page.tsx`                                | Integrated AgreementRateCard                                                                                                   |
| `apps/web/app/(admin)/layout.tsx`                                                 | Added Review Queue nav link                                                                                                    |
| `apps/api/src/modules/evaluation/evaluation.controller.spec.ts`                   | Added EvaluationReviewService mock                                                                                             |
| `apps/api/src/modules/evaluation/controllers/evaluation-admin.controller.spec.ts` | Added review service mock, fixed getModelMetrics tests                                                                         |

### Code Review Findings (Applied)

| Severity  | Issue                                                                     | Fix                                                                                               |
| --------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| CRITICAL  | Silent zero composite score when override field left blank                | Added validation guard: empty/invalid composite score disables submit and early-returns on submit |
| IMPORTANT | Missing `removeOnComplete` opts on notification addBulk for flagged event | Added `opts: { removeOnComplete: true, removeOnFail: false }` to addBulk jobs                     |
| IMPORTANT | `overall` agreement rates scoped by modelId but named as global           | Added clarifying comment in service                                                               |
| LOW       | `window.location.reload()` on resolve success                             | Replaced with `router.push('/admin/evaluations/review-queue')`                                    |

### Notes

- Migration is hand-written SQL (Prisma migrate not usable without DATABASE_URL in CI). Run manually: `psql < apps/api/prisma/migrations/20260309700000_add_evaluation_review/migration.sql`
- Shared package must be built (`pnpm --filter @edin/shared build`) before API can import new types
- Prisma JSON fields use `as unknown as Prisma.InputJsonValue` cast pattern (existing codebase convention)
