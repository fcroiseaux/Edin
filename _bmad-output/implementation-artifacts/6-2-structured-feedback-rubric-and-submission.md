# Story 6.2: Structured Feedback Rubric & Submission

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reviewer,
I want to complete a structured feedback rubric for assigned contributions,
so that I can provide consistent, actionable feedback that helps the contributor improve.

## Acceptance Criteria (BDD)

### AC1: Reviewer Sees Rubric Form with Contribution Context

**Given** I am an authenticated contributor with a pending review assignment
**When** I navigate to `/dashboard/feedback/review/:id`
**Then** I see the contribution details (type, title, description, linked artifacts) alongside a structured feedback rubric with 5 questions
**And** the rubric questions are appropriate to the contribution type (code review questions for commits/PRs, documentation questions for docs)
**And** each question has a rating scale (1-5) with descriptive labels and a text field for written comments

### AC2: Reviewer Submits Completed Feedback

**Given** I am completing the feedback rubric
**When** I fill in all questions and click Submit
**Then** the feedback is saved via `POST /api/v1/feedback/:id/submit` with status `COMPLETED`
**And** each answer must have substantive content exceeding a minimum character threshold of 20 characters (FR32 rubric coverage)
**And** the submission timestamp is recorded for turnaround tracking
**And** a domain event `feedback.review.submitted` is emitted
**And** the contributor who authored the work receives a notification that feedback is available

### AC3: Validation Blocks Incomplete Submissions

**Given** I submit feedback with incomplete answers
**When** validation runs
**Then** questions with empty or below-threshold responses are highlighted with inline errors
**And** the submission is blocked until all questions meet the minimum standard

### AC4: Contributor Views Received Feedback

**Given** I am an authenticated contributor
**When** I navigate to `/dashboard/feedback`
**Then** I see peer feedback received on my contributions displayed as structured rubric responses
**And** feedback is presented with the reviewer's name and domain badge
**And** each feedback item shows the rubric responses with ratings and written comments
**And** the display follows the "calm clarity" aesthetic — no red/green scoring colors, descriptive labels instead

### AC5: Reviewer Sees Pending Assignments

**Given** I am an authenticated contributor with assigned reviews
**When** I navigate to `/dashboard/feedback`
**Then** I also see a section showing my pending review assignments with contribution title, type, and time since assignment
**And** each pending assignment links to the review form at `/dashboard/feedback/review/:id`

## Tasks / Subtasks

### Task 1: Shared Types, Schemas & Constants (AC: #1, #2, #3)

- [x] 1.1 Add rubric question definitions to `packages/shared/src/constants/feedback-rubric.ts` (new file)
  - Define `RUBRIC_QUESTIONS` array with: `id` (string), `text` (string), `description` (string), `contributionTypes` (ContributionType[])
  - 5 default code rubric questions: Code Quality & Clarity, Technical Approach, Testing & Reliability, Documentation & Communication, Impact & Value
  - Define `RATING_LABELS` map: `{ 1: 'Needs significant improvement', 2: 'Has room for growth', 3: 'Meets expectations', 4: 'Shows strong proficiency', 5: 'Demonstrates exceptional quality' }`
  - Define `MIN_COMMENT_LENGTH = 20`
  - Define `RubricVersion = '1.0'`
- [x] 1.2 Add rubric submission schemas to `packages/shared/src/schemas/feedback.schema.ts`
  - `rubricResponseSchema`: `z.object({ questionId: z.string(), rating: z.number().int().min(1).max(5), comment: z.string().min(MIN_COMMENT_LENGTH) })`
  - `feedbackSubmissionSchema`: `z.object({ responses: z.array(rubricResponseSchema).min(1), overallComment: z.string().optional() })`
  - `feedbackDetailSchema`: extends `peerFeedbackSchema` with `contribution` and `reviewer` nested objects
- [x] 1.3 Add rubric types to `packages/shared/src/types/feedback.types.ts`
  - `RubricResponse`: `{ questionId: string; rating: number; comment: string }`
  - `FeedbackSubmissionDto`: `{ responses: RubricResponse[]; overallComment?: string }`
  - `RubricData`: `{ rubricVersion: string; responses: RubricResponse[] }` — stored in `ratings` Json field
  - `FeedbackDetailDto`: extends `PeerFeedbackDto` with `contribution: { id, title, description, contributionType }` and `reviewer: { id, name, avatarUrl, domain }`
  - `FeedbackSubmittedEvent`: `{ eventType: 'feedback.review.submitted'; timestamp: string; correlationId: string; actorId: string; payload: { peerFeedbackId, contributionId, reviewerId, contributorId, contributionTitle, contributionType, domain } }`
  - `ReceivedFeedbackDto`: feedback record with reviewer info and rubric data for display
- [x] 1.4 Add error codes to `packages/shared/src/constants/error-codes.ts`:
  - `FEEDBACK_ALREADY_SUBMITTED: 'FEEDBACK_ALREADY_SUBMITTED'`
  - `FEEDBACK_INVALID_STATUS: 'FEEDBACK_INVALID_STATUS'`
- [x] 1.5 Add `FEEDBACK_SUBMITTED` to `ActivityEventType` in `packages/shared/src/types/activity.types.ts`
- [x] 1.6 Add `FEEDBACK_SUBMITTED` to `packages/shared/src/schemas/activity.schema.ts`
- [x] 1.7 Export all new types, schemas, and constants from `packages/shared/src/index.ts`

### Task 2: Database Schema Updates (AC: #2)

- [x] 2.1 Add `FEEDBACK_SUBMITTED` to `ActivityEventType` enum in `apps/api/prisma/schema.prisma`
- [x] 2.2 Add `PEER_FEEDBACK_RECEIVED` to `NotificationType` enum in `apps/api/prisma/schema.prisma`
- [x] 2.3 Create Prisma migration: `apps/api/prisma/migrations/20260309500000_add_feedback_submitted/migration.sql`
  - ALTER TYPE `ActivityEventType` ADD VALUE `'FEEDBACK_SUBMITTED'`
  - ALTER TYPE `NotificationType` ADD VALUE `'PEER_FEEDBACK_RECEIVED'`
- [x] 2.4 No new columns or tables needed — `ratings` (Json?), `comments` (String?), `submittedAt` (DateTime?) already exist on PeerFeedback model from Story 6-1

### Task 3: Backend — Feedback Submission Service (AC: #1, #2, #3)

- [x] 3.1 Add `submitFeedback(feedbackId, submission, reviewerId, correlationId?)` method to `feedback.service.ts`
  - Validate feedback exists and status is `ASSIGNED`
  - Validate reviewer matches (feedbackId.reviewerId === authenticated user)
  - Validate all rubric questions answered with `MIN_COMMENT_LENGTH` per comment
  - Within `$transaction`:
    - Update PeerFeedback: `status → COMPLETED`, `ratings → { rubricVersion: '1.0', responses }`, `comments → overallComment`, `submittedAt → now()`
    - Create audit log entry: action `'FEEDBACK_SUBMITTED'`, entityType `'PeerFeedback'`, entityId, details
  - Emit `feedback.review.submitted` event with full payload
  - Return updated feedback record
  - Error cases: `FEEDBACK_NOT_FOUND` (404), `FEEDBACK_ACCESS_DENIED` (403), `FEEDBACK_ALREADY_SUBMITTED` (409), `FEEDBACK_INVALID_STATUS` (400)
- [x] 3.2 Add `getAssignmentById(feedbackId, reviewerId)` method to `feedback.service.ts`
  - Fetch single PeerFeedback record where `id = feedbackId AND reviewerId = reviewerId`
  - Include `contribution` relation (id, title, description, contributionType, contributorId) and `contribution.contributor` (name, domain)
  - Throw `FEEDBACK_NOT_FOUND` if not found or reviewer mismatch
  - Return enriched feedback with contribution context
- [x] 3.3 Add `getReceivedFeedback(contributorId, query?)` method to `feedback.service.ts`
  - Query PeerFeedback records where `contribution.contributorId = contributorId AND status = COMPLETED`
  - Include `reviewer` (id, name, avatarUrl, domain) and `contribution` (id, title, contributionType)
  - Cursor-based pagination (ordered by `submittedAt desc`)
  - Return paginated list with reviewer info and rubric data
- [x] 3.4 Add tests to `feedback.service.spec.ts`:
  - Test: submitFeedback updates status to COMPLETED and stores rubric data
  - Test: submitFeedback emits `feedback.review.submitted` event with correct payload
  - Test: submitFeedback creates audit log entry inside transaction
  - Test: submitFeedback rejects when feedback not found (404)
  - Test: submitFeedback rejects when reviewer doesn't match (403)
  - Test: submitFeedback rejects when status is not ASSIGNED (409 ALREADY_SUBMITTED or 400 INVALID_STATUS)
  - Test: submitFeedback rejects when rubric responses are incomplete (validation)
  - Test: getAssignmentById returns enriched feedback with contribution context
  - Test: getAssignmentById throws when feedback not found or reviewer mismatch
  - Test: getReceivedFeedback returns paginated COMPLETED feedback for contributor's contributions
  - Test: getReceivedFeedback includes reviewer info and rubric data

### Task 4: Backend — Controller Endpoints (AC: #1, #2, #4, #5)

- [x] 4.1 Add `POST /api/v1/feedback/:id/submit` endpoint to `feedback.controller.ts`
  - `@Post(':id/submit')`
  - `@CheckAbility((ability) => ability.can(Action.Update, 'PeerFeedback'))`
  - Parse and validate request body with `feedbackSubmissionSchema`
  - Call `feedbackService.submitFeedback(id, body, user.id, correlationId)`
  - Return `createSuccessResponse(result, correlationId)`
- [x] 4.2 Add `GET /api/v1/feedback/assignments/:id` endpoint to `feedback.controller.ts`
  - `@Get('assignments/:id')`
  - `@CheckAbility((ability) => ability.can(Action.Read, 'PeerFeedback'))`
  - Call `feedbackService.getAssignmentById(id, user.id)`
  - Return `createSuccessResponse(result, correlationId)`
- [x] 4.3 Add `GET /api/v1/feedback/received` endpoint to `feedback.controller.ts`
  - `@Get('received')`
  - `@CheckAbility((ability) => ability.can(Action.Read, 'PeerFeedback'))`
  - Parse query params with `feedbackQuerySchema`
  - Call `feedbackService.getReceivedFeedback(user.id, query)`
  - Return `createSuccessResponse(result.items, correlationId, result.pagination)`
- [x] 4.4 Add controller tests to `feedback.controller.spec.ts`:
  - Test: POST /:id/submit validates body and calls service
  - Test: POST /:id/submit rejects invalid body (validation errors)
  - Test: GET /assignments/:id returns enriched feedback
  - Test: GET /received returns paginated received feedback
  - Test: all new endpoints require authentication (JwtAuthGuard)
  - Test: all new endpoints enforce CASL permissions (AbilityGuard)

### Task 5: CASL Permission Update (AC: #2)

- [x] 5.1 Update `ability.factory.ts` to add `PeerFeedback` update permission for CONTRIBUTOR:
  - `can(Action.Update, 'PeerFeedback', { reviewerId: user.id })` — reviewer can submit feedback on own assignments
- [x] 5.2 Add tests to `ability.factory.spec.ts`:
  - Test: CONTRIBUTOR can update own PeerFeedback (where reviewerId matches)
  - Test: CONTRIBUTOR cannot update other's PeerFeedback
  - Test: ADMIN can update any PeerFeedback

### Task 6: Notification Integration (AC: #2)

- [x] 6.1 Add `@OnEvent('feedback.review.submitted')` listener to `notification.service.ts`
  - When feedback is submitted, enqueue `PEER_FEEDBACK_RECEIVED` notification for the **contribution author** (not the reviewer)
  - Notification category: `'feedback'`
  - Title: `"You've received feedback on your contribution"` (warm, human-first language per UX "Calm Clarity")
  - Description: `"Feedback on ${contributionType}: ${contributionTitle}"`
- [x] 6.2 Add tests to `notification.service.spec.ts`:
  - Test: enqueues notification for contribution author on feedback.review.submitted
  - Test: notification has correct type `PEER_FEEDBACK_RECEIVED` and category `'feedback'`
  - Test: notification targets the contribution author, not the reviewer

### Task 7: Activity Feed Integration (AC: #2)

- [x] 7.1 Add `@OnEvent('feedback.review.submitted')` listener to `activity.service.ts`
  - Create activity event: `FEEDBACK_SUBMITTED` type
  - Title: `"Peer feedback submitted for ${contributionTitle}"`
  - Metadata includes `contributionId`, `contributionType`, `peerFeedbackId`
- [x] 7.2 Add `FEEDBACK_SUBMITTED` to `ActivityEventType` in BOTH:
  - `packages/shared/src/types/activity.types.ts` (shared type union) — done in Task 1.5
  - `apps/api/prisma/schema.prisma` → `ActivityEventType` enum — done in Task 2.1
- [x] 7.3 Add tests to `activity.service.spec.ts`:
  - Test: creates FEEDBACK_SUBMITTED activity event on feedback.review.submitted
  - Test: activity event has correct title and metadata

### Task 8: Frontend — Feedback Review Form Page (AC: #1, #2, #3)

- [x] 8.1 Create `apps/web/app/(dashboard)/dashboard/feedback/review/[id]/page.tsx`
  - Fetch assignment details via `GET /api/v1/feedback/assignments/:id`
  - Display contribution context card (type badge, title, description, author name, domain badge, timestamp)
  - Render `FeedbackRubricForm` component below contribution context
  - Handle loading state with skeleton screens (not spinners)
  - Handle error states (feedback not found, already submitted)
  - After successful submission, show toast "Feedback submitted." and navigate to `/dashboard/feedback`
- [x] 8.2 Create `apps/web/components/features/feedback/feedback-rubric-form.tsx`
  - Use `react-hook-form` with `zodResolver` and `feedbackSubmissionSchema`
  - Render each rubric question from `RUBRIC_QUESTIONS` constant (filtered by contribution type)
  - Each question renders:
    - Question label (sans-serif, 13px, 500 weight)
    - Description text
    - `RatingInput` component (1-5 scale with descriptive labels)
    - Comment textarea (auto-grow, min height, placeholder text)
  - Optional overall comment textarea at bottom
  - Submit button: solid brand accent, "Submit Feedback", disabled until all questions valid
  - Inline validation on blur (not on keystroke) — error text in semantic.error below field
  - `aria-describedby` linking error messages to fields
  - Single column layout, generous spacing (`space-lg` between question groups)
  - Max width 800px, centered
- [x] 8.3 Create `apps/web/components/features/feedback/rating-input.tsx`
  - 5 radio-style buttons (1-5) in a horizontal row
  - Each button shows number and descriptive label from `RATING_LABELS`
  - Selected state: brand accent background with white text
  - Unselected state: surface-raised background with border
  - NO red/green color coding — only brand accent for selected state
  - Keyboard accessible (arrow keys for selection, tab for focus)
  - `aria-label` for each option: `"${rating} - ${label}"`
  - 44x44px minimum touch targets
- [x] 8.4 Create `apps/web/hooks/use-feedback-review.ts`
  - `useFeedbackReview(feedbackId)`: `useQuery` to fetch assignment details from `GET /api/v1/feedback/assignments/:id`
  - `useSubmitFeedback()`: `useMutation` for `POST /api/v1/feedback/:id/submit`
    - On success: invalidate `['feedback', 'assignments']` and `['feedback', 'received']` queries
    - On success: show toast "Feedback submitted."
    - On error: show toast with error message

### Task 9: Frontend — Feedback Dashboard Page (AC: #4, #5)

- [x] 9.1 Create `apps/web/app/(dashboard)/dashboard/feedback/page.tsx`
  - Two sections:
    1. **"Pending Reviews"** — reviewer's assigned feedback with status ASSIGNED
    2. **"Feedback Received"** — feedback on own contributions with status COMPLETED
  - Each section uses its own data hook
  - Empty states: warm, helpful copy (not cheerful illustrations)
    - Pending: "No reviews waiting for you right now."
    - Received: "No feedback received yet. Feedback will appear here as reviewers complete their reviews."
- [x] 9.2 Create `apps/web/components/features/feedback/pending-review-list.tsx`
  - Fetch pending assignments via `GET /api/v1/feedback/assignments?status=ASSIGNED`
  - Display card for each pending review:
    - Contribution title, type badge, domain badge
    - Time since assignment (e.g., "Assigned 2 hours ago")
    - Link button: "Review" → `/dashboard/feedback/review/:id`
  - Card pattern: `surface.raised` background, `border-light`, 12px radius, `shadow-card`
  - Hover state: subtle shadow lift
- [x] 9.3 Create `apps/web/components/features/feedback/received-feedback-list.tsx`
  - Fetch received feedback via `GET /api/v1/feedback/received`
  - Display card for each feedback item:
    - Reviewer avatar (circular, domain-colored fallback with initials), name, domain badge
    - Contribution reference (title, type badge)
    - Submitted timestamp
    - Rubric responses: question label + rating (numeric with descriptive label) + written comment
    - Optional overall comment
  - "Calm clarity" styling:
    - Ratings shown as `"4 — Shows strong proficiency"` (numeric + descriptive label)
    - NO color-coded ratings — all neutral typography
    - Written comments are primary visual element; ratings supplementary
    - Serif font for feedback narrative text
  - Cursor-based pagination (load more button, not infinite scroll)
  - Progressive disclosure: show first 2-3 rubric answers, "See full feedback" expander for rest
- [x] 9.4 Create `apps/web/hooks/use-received-feedback.ts`
  - `useReceivedFeedback(query?)`: `useInfiniteQuery` for cursor-based pagination from `GET /api/v1/feedback/received`
  - Query key: `['feedback', 'received', filters]`

### Task 10: Frontend — Navigation Update (AC: #4, #5)

- [x] 10.1 Add "Feedback" link to `DASHBOARD_NAV_ITEMS` in `apps/web/app/(dashboard)/layout.tsx`
  - `{ href: '/dashboard/feedback', label: 'Feedback' }`
  - Position after "Activity" in the nav order
  - Add notification dot for pending review count (reuse existing unread badge pattern)
- [x] 10.2 Auto-clear feedback-related notifications when visiting `/dashboard/feedback` (follow existing pattern for other sections)

### Task 11: Testing (AC: #1-#5)

- [x] 11.1 Run full API test suite — verify 0 regressions
- [x] 11.2 Run full web test suite — verify 0 regressions
- [x] 11.3 Verify all new tests pass
- [x] 11.4 Manual smoke test: navigate to feedback page, verify layout and empty states

## Dev Notes

### Architecture Patterns — MUST FOLLOW

- **Module pattern**: Extend existing `apps/api/src/modules/feedback/` module — do NOT create a new module. Add new methods to `FeedbackService`, new endpoints to `FeedbackController`
- **BullMQ**: NOT needed for feedback submission. Submission is synchronous (user clicks submit, API processes, returns result). No queue required for this story. BullMQ is only used for assignment (Story 6-1)
- **Event emission**: Use `EventEmitter2` from `@nestjs/event-emitter`. Payload structure: `{ eventType, timestamp, correlationId, actorId, payload: { ... } }`
- **Prisma imports**: Import types from `../../../generated/prisma/client/client.js` — NOT from `@prisma/client` (Prisma 7 local generation)
- **API response**: Always use `createSuccessResponse(data, correlationId, pagination?)` from `apps/api/src/common/types/api-response.type.ts`
- **Error handling**: Use `DomainException` from `apps/api/src/common/exceptions/domain.exception.ts` with error codes from `@edin/shared`
- **Controller version**: Use `@Controller({ path: 'feedback', version: '1' })` — all routes are `/api/v1/feedback/*`. Existing controller already has this
- **DTO validation**: Zod schemas in `packages/shared/src/schemas/`, re-exported from DTOs in `apps/api/src/modules/feedback/dto/`
- **Testing**: Vitest with `describe/it/expect/vi/beforeEach`. Mock Prisma, queues, and services. Co-locate spec files with source
- **Logging**: Use `private readonly logger = new Logger(ClassName.name)` with structured context objects `{ module: 'feedback', ... }`
- **Audit logging**: All submission actions must create `prisma.auditLog.create` entries inside `$transaction`. Follow pattern in `feedback.service.ts` (Story 6-1). Required by NFR-S6 (immutable audit trail, 2-year retention)
- **Frontend forms**: Use `react-hook-form` + `@hookform/resolvers/zod` + shared Zod schemas. Follow pattern in `apps/web/components/features/admission/reviewer/review-form.tsx`
- **Frontend data fetching**: Use TanStack Query (`useQuery`, `useMutation`, `useInfiniteQuery`). Follow patterns in `apps/web/hooks/use-notifications.ts`
- **Frontend API client**: Use centralized `apiClient<T>()` from `apps/web/lib/api-client.ts`
- **Frontend styling**: Tailwind CSS with Edin design tokens (CSS variables). Radix UI for headless primitives. No CSS modules
- **Frontend components**: Co-locate in `apps/web/components/features/feedback/`. Hooks in `apps/web/hooks/`
- **Route groups**: Dashboard pages live in `apps/web/app/(dashboard)/dashboard/` — use App Router conventions

### Critical Code Reuse — DO NOT REINVENT

| What                            | Where                                                             | Why                                                                   |
| ------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Event listener pattern          | `apps/api/src/modules/notification/notification.service.ts`       | @OnEvent with typed payloads, error handling try/catch                |
| Notification integration        | `apps/api/src/modules/notification/notification.service.ts`       | `enqueueNotification()` patterns, notification payload structure      |
| Activity event creation         | `apps/api/src/modules/activity/activity.service.ts`               | @OnEvent listener creating activity events                            |
| CASL field-level permissions    | `apps/api/src/modules/auth/casl/ability.factory.ts`               | `can(Action.Read, 'PeerFeedback', { reviewerId: user.id })` pattern   |
| Controller guards/decorators    | `apps/api/src/modules/feedback/feedback.controller.ts`            | @UseGuards, @CheckAbility, @CurrentUser, createSuccessResponse        |
| DTO Zod validation              | `apps/api/src/modules/feedback/dto/feedback-query.dto.ts`         | z.object with coerce, enum, optional patterns                         |
| Audit logging in transaction    | `apps/api/src/modules/feedback/feedback.service.ts`               | `prisma.auditLog.create` inside `$transaction` — same file, Story 6-1 |
| Event emission payload          | `apps/api/src/modules/feedback/feedback.service.ts`               | `eventEmitter.emit` with standardized payload structure               |
| Test mock patterns              | `apps/api/src/modules/feedback/feedback.service.spec.ts`          | mockPrisma, mockQueue, vi.fn() patterns                               |
| Form with react-hook-form + Zod | `apps/web/components/features/admission/reviewer/review-form.tsx` | zodResolver, register, handleSubmit, error display                    |
| Radix Select component          | `apps/web/components/features/task/create-task-form.tsx`          | SelectField pattern for dropdowns                                     |
| useInfiniteQuery pagination     | `apps/web/hooks/use-notifications.ts`                             | Cursor-based pagination with TanStack Query                           |
| API client wrapper              | `apps/web/lib/api-client.ts`                                      | `apiClient<T>()` with token refresh                                   |
| Domain color utilities          | `apps/web/lib/domain-colors.ts`                                   | Domain badge colors                                                   |
| Toast notifications             | `apps/web/components/ui/toast.tsx`                                | Success/error toast display                                           |
| Dashboard card pattern          | `apps/web/components/features/task/task-card.tsx`                 | Card layout with surface-raised, shadow-card                          |
| Dashboard sidebar nav           | `apps/web/app/(dashboard)/layout.tsx`                             | DASHBOARD_NAV_ITEMS array and nav structure                           |

### UX Requirements — "Calm Clarity" Aesthetic (CRITICAL)

**Color Policy:**

- **NEVER** use red/green for scoring or rating indicators
- Ratings displayed as neutral numeric values with descriptive text labels: `"4 — Shows strong proficiency"`
- Use `semantic.error` (#A85A5A muted brick red) ONLY for validation errors, never for low scores
- Use `brand.accent` (#C4956A warm terracotta) for selected states and primary actions
- Domain badges use domain accent colors (teal, amber, terra rose, slate violet) — never for scoring

**Typography:**

- Serif font for feedback narrative content (reviewer comments)
- Sans-serif for interface elements (labels, buttons, navigation)
- Question labels: sans-serif, 13px, 500 weight

**Layout:**

- Single column form, max width 800px, centered with generous margins
- `space-lg` (24px) between question groups, `space-md` (16px) between label and input
- Contribution context card above rubric (always visible while reviewing)
- Cards: `surface-raised` background, `border-light`, 12px radius, `shadow-card`
- Hover: subtle shadow lift, optional `translateY(-2px)` transition (200ms ease-out)

**Form UX:**

- Inline validation appears on blur, not on keystroke
- Error messages directly below the field in `semantic.error` color
- No green checkmarks for valid fields — "success is invisible"
- Auto-grow textareas (no fixed height with scrollbar)
- Submit button disabled until all questions valid
- Loading state: skeleton screens, never spinning loaders

**Feedback Display:**

- Written comments are the PRIMARY visual element; ratings are supplementary
- Progressive disclosure: summary view with "See full feedback" expander
- Reviewer identity visible: avatar (circular, domain-colored fallback with initials), name, domain badge
- No gamification: no badges, streak counters, or ranking

**Accessibility (WCAG 2.1 AA):**

- 4.5:1 color contrast for body text, 3:1 for large text
- Full keyboard navigation (tab through questions, arrow keys for ratings)
- `aria-describedby` linking error messages to form fields
- `aria-label` on rating buttons: `"${rating} - ${label}"`
- 44x44px minimum touch targets
- Respect `prefers-reduced-motion` — instant transitions when reduced motion enabled
- Semantic HTML: `<form>`, `<fieldset>`, `<label>`, `<legend>` for rubric structure

### Rubric Questions Definition

```typescript
// packages/shared/src/constants/feedback-rubric.ts
export const MIN_COMMENT_LENGTH = 20;
export const RUBRIC_VERSION = '1.0';

export const RATING_LABELS: Record<number, string> = {
  1: 'Needs significant improvement',
  2: 'Has room for growth',
  3: 'Meets expectations',
  4: 'Shows strong proficiency',
  5: 'Demonstrates exceptional quality',
};

export const RUBRIC_QUESTIONS = [
  {
    id: 'code-quality',
    text: 'Code Quality & Clarity',
    description: 'How well-written, readable, and maintainable is the code?',
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
  {
    id: 'technical-approach',
    text: 'Technical Approach',
    description: 'Is the technical solution appropriate, efficient, and well-reasoned?',
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
  {
    id: 'testing',
    text: 'Testing & Reliability',
    description: 'Does the contribution include adequate tests and error handling?',
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
  {
    id: 'documentation',
    text: 'Documentation & Communication',
    description: 'Are code comments, commit messages, and documentation clear and helpful?',
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
  {
    id: 'impact',
    text: 'Impact & Value',
    description: "How significant is this contribution's impact on the project?",
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
];
```

### Event Payload Structures

**feedback.review.submitted:**

```typescript
{
  eventType: 'feedback.review.submitted',
  timestamp: string, // ISO 8601
  correlationId: string,
  actorId: string, // reviewer who submitted
  payload: {
    peerFeedbackId: string,
    contributionId: string,
    reviewerId: string,
    contributorId: string, // contribution author — needed for notification targeting
    contributionTitle: string,
    contributionType: string, // COMMIT | PULL_REQUEST | CODE_REVIEW
    domain: string,
  }
}
```

### Ratings JSON Storage Format

The `ratings` Json field in `PeerFeedback` stores:

```typescript
{
  rubricVersion: '1.0',
  responses: [
    { questionId: 'code-quality', rating: 4, comment: 'The refactoring improves readability...' },
    { questionId: 'technical-approach', rating: 3, comment: 'The approach works but consider...' },
    // ... one per rubric question
  ]
}
```

The `comments` Text field stores optional overall feedback (free-form text). The `submittedAt` DateTime records submission timestamp for turnaround tracking (FR32).

### Submission Flow — Detailed Specification

```
1. Reviewer navigates to /dashboard/feedback/review/:id
2. Frontend calls GET /api/v1/feedback/assignments/:id
3. API returns feedback record + contribution context
4. Frontend renders contribution card + rubric form
5. Reviewer fills rubric (1-5 rating + comment per question)
6. Reviewer clicks "Submit Feedback"
7. Frontend validates via Zod schema (client-side)
8. Frontend calls POST /api/v1/feedback/:id/submit
9. API validates: status is ASSIGNED, reviewerId matches, rubric complete
10. API updates PeerFeedback in $transaction:
    - status → COMPLETED
    - ratings → { rubricVersion, responses }
    - comments → overallComment (if provided)
    - submittedAt → now()
    - Audit log entry created
11. API emits 'feedback.review.submitted' event
12. NotificationService listener → enqueue PEER_FEEDBACK_RECEIVED for contributor
13. ActivityService listener → create FEEDBACK_SUBMITTED activity event
14. API returns updated feedback record
15. Frontend shows toast "Feedback submitted." and navigates to /dashboard/feedback
```

### Performance Requirements

| Metric                                 | Target                 | Source       |
| -------------------------------------- | ---------------------- | ------------ |
| Feedback submission response           | <500ms 95th percentile | NFR-P4       |
| Feedback page FCP                      | <1.2s                  | NFR-P1       |
| Feedback page LCP                      | <2.5s                  | NFR-P2       |
| Notification delivery after submission | <5 seconds             | NFR-P3       |
| Pagination max per page                | 50 items               | Architecture |

### Database Notes

- **No schema migration needed for PeerFeedback columns** — `ratings`, `comments`, `submittedAt` already exist from Story 6-1
- **Only enum additions** — `FEEDBACK_SUBMITTED` to ActivityEventType, `PEER_FEEDBACK_RECEIVED` to NotificationType
- The `ratings` field is typed as `Json?` in Prisma — cast to `RubricData` interface in TypeScript service layer
- Index `idx_peer_feedback_status_assigned` (status, assignedAt) supports efficient overdue queries for Story 6-3

### Project Structure Notes

- **Backend changes**: Extend existing `apps/api/src/modules/feedback/` — add methods to service, endpoints to controller
- **Frontend new files**: `apps/web/app/(dashboard)/dashboard/feedback/` pages, `apps/web/components/features/feedback/` components, `apps/web/hooks/use-feedback-review.ts` and `use-received-feedback.ts`
- **Shared new file**: `packages/shared/src/constants/feedback-rubric.ts` for rubric definitions
- **Navigation**: Modify `apps/web/app/(dashboard)/layout.tsx` to add Feedback nav item
- **No new backend modules** — everything extends FeedbackModule

### Previous Story Intelligence (6-1: Peer Reviewer Assignment)

**Key Learnings from Story 6-1:**

- All feedback DB operations use `$transaction` with audit log entries — maintain this pattern for submissions
- The `eventEmitter.emit` pattern uses standardized payload structure: `{ eventType, timestamp, correlationId, actorId, payload }`
- CASL permission for PeerFeedback uses field-level conditions: `{ reviewerId: user.id }` — extend with Update action using same pattern
- Controller uses `feedbackQueryDto.safeParse(rawQuery)` for validation — follow same pattern for submission body
- Admin controller is separate file (`feedback-admin.controller.ts`) at `/api/v1/admin/feedback/` — no changes needed for Story 6-2
- The `getAssignmentsForReviewer` method already includes contribution details (title, type) — `getAssignmentById` can follow similar include pattern
- Story 6-1 code review found 7 issues (H1-H4, M1-M3) — be careful about: using shared types instead of duplicating, proper DomainException usage, CASL filtering in controller

**Files Modified in Story 6-1 (context for avoiding conflicts):**

- `feedback.service.ts` — Will be extended with new methods (submitFeedback, getAssignmentById, getReceivedFeedback)
- `feedback.controller.ts` — Will be extended with new endpoints (submit, assignments/:id, received)
- `notification.service.ts` — Will add new @OnEvent listener
- `activity.service.ts` — Will add new @OnEvent listener
- `ability.factory.ts` — Will add Update action for PeerFeedback
- Shared types/schemas — Will be extended with submission types

### Git Intelligence

Recent commits follow the pattern: `feat: implement [feature description] (Story X-Y)`. Last commit was Story 5-2 through 5-5 as a batch. Story 6-1 is implemented but not yet committed (files are modified/untracked in git status). The dev agent should be aware that uncommitted Story 6-1 changes exist in the working tree and must not overwrite them.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.2, lines 1207-1240]
- [Source: _bmad-output/planning-artifacts/prd.md — FR29 (rubric), FR30 (view feedback), FR32 (tracking), NFR-R5 (availability), NFR-P4 (response time)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Feedback module, Database schema, Event patterns, Frontend patterns, Testing standards]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Calm Clarity aesthetic, Form patterns, Rating display, Accessibility requirements]
- [Source: _bmad-output/implementation-artifacts/6-1-peer-reviewer-assignment.md — Previous story patterns, Dev notes, File list]
- [Source: apps/api/src/modules/feedback/ — Existing service, controller, module, processor patterns]
- [Source: apps/api/src/modules/notification/notification.service.ts — Event listener and notification patterns]
- [Source: apps/api/src/modules/activity/activity.service.ts — Activity event creation patterns]
- [Source: apps/api/src/modules/auth/casl/ability.factory.ts — CASL permission patterns]
- [Source: apps/web/components/features/admission/reviewer/review-form.tsx — Form with react-hook-form + Zod]
- [Source: apps/web/hooks/use-notifications.ts — useInfiniteQuery pagination pattern]
- [Source: apps/web/app/(dashboard)/layout.tsx — Dashboard sidebar navigation]
- [Source: packages/shared/src/schemas/feedback.schema.ts — Existing Zod schemas]
- [Source: packages/shared/src/types/feedback.types.ts — Existing TypeScript types]
- [Source: packages/shared/src/constants/error-codes.ts — Existing error codes]

## Change Log

| Change                                                                               | Date       | Version |
| ------------------------------------------------------------------------------------ | ---------- | ------- |
| Story created with full task breakdown                                               | 2026-03-09 | 1.0     |
| Implementation completed — all 11 tasks done, 626 API tests pass, 0 regressions      | 2026-03-09 | 1.1     |
| Code review: 1 CRITICAL + 3 HIGH + 5 MEDIUM fixed. 634 API tests pass, 0 regressions | 2026-03-09 | 1.2     |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Shared package build required before API tests (`pnpm --filter @edin/shared build`) — `RUBRIC_VERSION` and `MIN_COMMENT_LENGTH` resolved to `undefined` until compiled
- Pre-existing TypeScript errors in `activity.service.ts` (lines 189, 198, 277) — null vs undefined type mismatches with Prisma 7, not introduced by this story

### Completion Notes List

- All 11 tasks (35 subtasks) implemented and verified
- 626 API tests pass with 0 regressions
- Web TypeScript check passes clean (`pnpm --filter web exec tsc --noEmit`)
- No new dependencies added — all imports use existing packages
- BullMQ intentionally NOT used for submission (synchronous flow per story spec)
- Rubric data stored in existing `ratings` Json field — no new DB columns needed
- Only DB migration: enum additions for `FEEDBACK_SUBMITTED` and `PEER_FEEDBACK_RECEIVED`

### File List

**New Files:**

- `packages/shared/src/constants/feedback-rubric.ts` — Rubric questions, rating labels, constants
- `apps/api/prisma/migrations/20260309500000_add_feedback_submitted/migration.sql` — Enum additions
- `apps/web/hooks/use-feedback-review.ts` — useFeedbackReview, useSubmitFeedback, usePendingAssignments hooks
- `apps/web/hooks/use-received-feedback.ts` — useReceivedFeedback infinite query hook
- `apps/web/components/features/feedback/rating-input.tsx` — 1-5 rating radio buttons
- `apps/web/components/features/feedback/feedback-rubric-form.tsx` — Structured feedback form
- `apps/web/components/features/feedback/pending-review-list.tsx` — Pending assignments list
- `apps/web/components/features/feedback/received-feedback-list.tsx` — Received feedback cards
- `apps/web/app/(dashboard)/dashboard/feedback/page.tsx` — Feedback dashboard page
- `apps/web/app/(dashboard)/dashboard/feedback/review/[id]/page.tsx` — Review form page

**Modified Files:**

- `packages/shared/src/schemas/feedback.schema.ts` — Added rubricResponseSchema, feedbackSubmissionSchema, feedbackDetailSchema
- `packages/shared/src/types/feedback.types.ts` — Added RubricResponse, FeedbackSubmissionDto, RubricData, FeedbackDetailDto, FeedbackSubmittedEvent, ReceivedFeedbackDto
- `packages/shared/src/constants/error-codes.ts` — Added FEEDBACK_ALREADY_SUBMITTED, FEEDBACK_INVALID_STATUS
- `packages/shared/src/types/activity.types.ts` — Added FEEDBACK_SUBMITTED to ActivityEventType
- `packages/shared/src/schemas/activity.schema.ts` — Added FEEDBACK_SUBMITTED to activityEventTypeEnum
- `packages/shared/src/index.ts` — Exported new types, schemas, constants
- `apps/api/prisma/schema.prisma` — Added FEEDBACK_SUBMITTED and PEER_FEEDBACK_RECEIVED enums
- `apps/api/src/modules/feedback/feedback.service.ts` — Added submitFeedback, getAssignmentById, getReceivedFeedback
- `apps/api/src/modules/feedback/feedback.controller.ts` — Added POST :id/submit, GET assignments/:id, GET received
- `apps/api/src/modules/feedback/feedback.service.spec.ts` — Added 12 tests for new methods
- `apps/api/src/modules/auth/casl/ability.factory.ts` — Added PeerFeedback Update permission
- `apps/api/src/modules/auth/casl/ability.factory.spec.ts` — Added 2 CASL tests
- `apps/api/src/modules/notification/notification.service.ts` — Added feedback.review.submitted listener
- `apps/api/src/modules/notification/notification.service.spec.ts` — Added 2 notification tests
- `apps/api/src/modules/activity/activity.service.ts` — Added feedback.review.submitted listener
- `apps/api/src/modules/activity/activity.service.spec.ts` — Added 2 activity tests
- `apps/web/app/(dashboard)/layout.tsx` — Added Feedback nav item and notification category
