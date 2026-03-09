# Story 7.5: Public AI Evaluation Data

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor (unauthenticated),
I want to view aggregate AI evaluation data on public pages,
So that I can assess the quality and rigor of Edin's evaluation system.

## Acceptance Criteria (BDD)

### AC1: Public Showcase Metrics Section

**Given** I am a visitor on the public showcase page (/showcase)
**When** I view the AI evaluation metrics section
**Then** I see aggregate evaluation data including: evaluation scores by domain (average score per domain displayed as domain-colored indicators), score distributions (visual histogram showing the spread of scores), AI-human agreement rate (percentage derived from Story 7.4 benchmarking), and total evaluations completed (FR47)
**And** the data is presented with the "quiet authority" aesthetic — authoritative numbers with editorial context, not raw data dumps
**And** the metrics refresh periodically (cached in Redis, maximum 5-minute data lag)
**And** the page loads with FCP <1.5s on a 4G connection (NFR-P1)

### AC2: Individual Score Visibility on Public Profile

**Given** I am a visitor viewing a contributor's public profile (/contributors/:id)
**When** the contributor has granted consent for individual score visibility
**Then** I see their evaluation scores displayed alongside their contributions
**And** scores are presented in the narrative style — a brief summary of the contributor's evaluation quality, not a number in isolation

### AC3: Individual Score Absence

**Given** the contributor has not granted consent for individual score visibility
**When** I view their public profile
**Then** no individual evaluation scores are displayed
**And** their contributions are shown without score data — the absence is invisible (no "scores hidden" label)

### AC4: Public Aggregation Endpoint

**Given** the public evaluation data endpoint GET /api/v1/public/evaluations/aggregate
**When** it is called without authentication
**Then** it returns only aggregate statistics — never individual contributor scores or evaluation details
**And** the response follows the standard API envelope format with proper caching headers
**And** the endpoint responds within the 95th percentile <500ms target (NFR-P4)

## Tasks / Subtasks

- [ ] Task 1: Database Schema — Add showEvaluationScores to Contributor (AC: #2, #3)
  - [ ] 1.1 Add `showEvaluationScores Boolean @default(false) @map("show_evaluation_scores")` to Contributor model in `apps/api/prisma/schema.prisma`
  - [ ] 1.2 Create migration `20260309800000_add_show_evaluation_scores`
  - [ ] 1.3 Regenerate Prisma client

- [ ] Task 2: Shared Types & Schemas (AC: #1, #2, #4)
  - [ ] 2.1 Add `PublicEvaluationAggregateDto` interface to `packages/shared/src/types/evaluation.types.ts`
  - [ ] 2.2 Add `ContributorEvaluationSummaryDto` interface for individual public scores
  - [ ] 2.3 Add `showEvaluationScores` field to `contributorProfileSchema` in `packages/shared/src/schemas/contributor.schema.ts`
  - [ ] 2.4 Update `packages/shared/src/index.ts` exports

- [ ] Task 3: Backend — Public Evaluation Service Methods (AC: #1, #2, #4)
  - [ ] 3.1 Add `getPublicEvaluationAggregate()` method to `evaluation.service.ts` — queries COMPLETED evaluations, computes: total count, average score by domain, score distribution (histogram buckets), uses EvaluationReviewService.getAgreementRates() for AI-human agreement. Cached in Redis with 5-minute TTL.
  - [ ] 3.2 Add `getContributorPublicScores(contributorId)` method to `evaluation.service.ts` — returns evaluation summary for a contributor (average score, count, recent scores) only if contributor has `showEvaluationScores = true`

- [ ] Task 4: Backend — Public Evaluation Controller (AC: #1, #2, #4)
  - [ ] 4.1 Create `apps/api/src/modules/evaluation/controllers/evaluation-public.controller.ts` — no auth guards, path: `public/evaluations`
  - [ ] 4.2 `GET /api/v1/public/evaluations/aggregate` endpoint — calls service.getPublicEvaluationAggregate(), sets Cache-Control headers
  - [ ] 4.3 `GET /api/v1/public/evaluations/contributor/:id` endpoint — calls service.getContributorPublicScores(), returns 200 with null data if no consent (invisible absence)
  - [ ] 4.4 Register controller in `evaluation.module.ts`
  - [ ] 4.5 Write controller tests

- [ ] Task 5: Backend — Contributor Profile Updates (AC: #2, #3)
  - [ ] 5.1 Update `contributor.service.ts` updateProfile to handle `showEvaluationScores` field
  - [ ] 5.2 Add `showEvaluationScores` to `publicProfileSelect` in contributor.service.ts

- [ ] Task 6: Frontend — Public Evaluation Metrics Hook (AC: #1)
  - [ ] 6.1 Create `apps/web/hooks/use-public-evaluation-metrics.ts` — TanStack Query hook fetching GET /api/v1/public/evaluations/aggregate, 5-minute stale time

- [ ] Task 7: Frontend — Showcase Evaluation Section (AC: #1)
  - [ ] 7.1 Create `apps/web/components/features/evaluation/public/evaluation-metrics-section.tsx` — displays aggregate evaluation data in "quiet authority" style: total evaluations, average scores by domain with colored indicators, AI-human agreement rate, score distribution chart
  - [ ] 7.2 Create `apps/web/components/features/evaluation/public/score-distribution-chart.tsx` — Recharts histogram showing score spread
  - [ ] 7.3 Update `apps/web/components/features/showcase/showcase-content.tsx` to include EvaluationMetricsSection
  - [ ] 7.4 Write component tests

- [ ] Task 8: Frontend — Public Profile Evaluation Display (AC: #2, #3)
  - [ ] 8.1 Create `apps/web/hooks/use-contributor-public-scores.ts` — fetches contributor's public evaluation summary
  - [ ] 8.2 Create `apps/web/components/features/evaluation/public/contributor-score-summary.tsx` — narrative-style evaluation summary card
  - [ ] 8.3 Update `apps/web/components/features/contributor-profile/public-profile-view.tsx` to conditionally render evaluation summary
  - [ ] 8.4 Write component tests

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Public Endpoint Pattern (no authentication):**
Follow the ShowcaseController pattern — no `@UseGuards(JwtAuthGuard)`. The controller is intentionally public.

**Redis Caching (5-minute TTL per story AC):**

```typescript
const AGGREGATE_CACHE_KEY = 'public:evaluation-aggregate';
const AGGREGATE_CACHE_TTL = 300; // 5 minutes
```

**Score Distribution Histogram:**
Bucket scores into ranges: 0-20, 21-40, 41-60, 61-80, 81-100. Count evaluations per bucket. This gives a clean histogram without exposing individual scores.

**Consent-Based Individual Scores:**
The `showEvaluationScores` field on Contributor gates individual score visibility. The public endpoint returns `null` for contributors without consent — no "hidden" indicator, just absence. The frontend should not render anything when null (invisible absence).

**Agreement Rate Reuse:**
Reuse `EvaluationReviewService.getAgreementRates()` from Story 7-4. The overall agreement rate is the key metric for public display.

### Existing Code to Extend (DO NOT Recreate)

| What                | File                                                | Action                                           |
| ------------------- | --------------------------------------------------- | ------------------------------------------------ |
| Evaluation service  | `evaluation.service.ts`                             | Add aggregate + contributor public score methods |
| Evaluation module   | `evaluation.module.ts`                              | Register PublicEvaluationController              |
| Shared types        | `packages/shared/src/types/evaluation.types.ts`     | Add public aggregate types                       |
| Shared schemas      | `packages/shared/src/schemas/contributor.schema.ts` | Add showEvaluationScores to update schema        |
| Shared index        | `packages/shared/src/index.ts`                      | Export new types                                 |
| Contributor service | `contributor.service.ts`                            | Handle showEvaluationScores in updateProfile     |
| Showcase content    | `showcase-content.tsx`                              | Add EvaluationMetricsSection                     |
| Public profile view | `public-profile-view.tsx`                           | Add evaluation scores when consented             |
| Prisma schema       | `apps/api/prisma/schema.prisma`                     | Add showEvaluationScores to Contributor          |

### New Files to Create

| File                                                                                 | Purpose                                         |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `apps/api/src/modules/evaluation/controllers/evaluation-public.controller.ts`        | Public aggregate + contributor scores endpoints |
| `apps/api/src/modules/evaluation/controllers/evaluation-public.controller.spec.ts`   | Controller tests                                |
| `apps/api/prisma/migrations/20260309800000_add_show_evaluation_scores/migration.sql` | Migration                                       |
| `apps/web/hooks/use-public-evaluation-metrics.ts`                                    | TanStack Query hook for aggregate data          |
| `apps/web/hooks/use-contributor-public-scores.ts`                                    | TanStack Query hook for individual scores       |
| `apps/web/components/features/evaluation/public/evaluation-metrics-section.tsx`      | Showcase metrics section                        |
| `apps/web/components/features/evaluation/public/evaluation-metrics-section.test.tsx` | Tests                                           |
| `apps/web/components/features/evaluation/public/score-distribution-chart.tsx`        | Score histogram                                 |
| `apps/web/components/features/evaluation/public/contributor-score-summary.tsx`       | Profile score summary                           |
| `apps/web/components/features/evaluation/public/contributor-score-summary.test.tsx`  | Tests                                           |

### API Response Shapes

```typescript
// GET /api/v1/public/evaluations/aggregate
{
  data: {
    totalEvaluations: number,
    averageScore: number,
    byDomain: Array<{
      domain: string,
      averageScore: number,
      count: number,
    }>,
    scoreDistribution: Array<{
      range: string,
      min: number,
      max: number,
      count: number,
    }>,
    agreementRate: {
      overall: number,
      totalReviewed: number,
    },
  },
  meta: { timestamp: string, correlationId: string }
}

// GET /api/v1/public/evaluations/contributor/:id
// When consented:
{
  data: {
    contributorId: string,
    averageScore: number,
    evaluationCount: number,
    narrative: string,
    recentScores: Array<{
      score: number,
      contributionType: string,
      completedAt: string,
    }>,
  },
  meta: { timestamp: string, correlationId: string }
}
// When NOT consented:
{
  data: null,
  meta: { timestamp: string, correlationId: string }
}
```

### UX Guidelines

**Showcase Evaluation Section:**

- "Quiet authority" aesthetic — editorial tone, not dashboard tone
- Use StatCard pattern for key numbers: Total Evaluations, Average Score, AI-Human Agreement
- Domain scores with domain-colored left borders (existing pattern)
- Score histogram using Recharts BarChart with warm earth tones
- Section heading: "Evaluation Intelligence" (not "AI Metrics")
- Descriptive context under each number (e.g., "contributions evaluated by AI" not just "evaluations")

**Profile Evaluation Summary:**

- Narrative style: "This contributor's work has been evaluated N times with an average quality score of X, placing them in the [label] range."
- Use `scoreToLabel()` from shared constants for human-readable score categories
- No red/green indicators. Use brand-accent for scores.
- If no consent → render nothing (not even a section heading)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.5 — lines 1424-1454]
- [Source: _bmad-output/planning-artifacts/prd.md — FR47]
- [Source: Story 7-4 — agreement rate calculation in evaluation-review.service.ts]
- [Source: showcase.service.ts — Redis caching pattern]

---

## Dev Agent Record

### Completion Date: 2026-03-09

### Test Results

- API: 742 passed, 0 failed, 1 skipped
- Web: 392 passed, 0 failed
- Prettier: clean

### Files Created

| File                                                                                 | Purpose                                                   |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `apps/api/src/modules/evaluation/controllers/evaluation-public.controller.ts`        | Public aggregate + contributor scores endpoints (no auth) |
| `apps/api/src/modules/evaluation/controllers/evaluation-public.controller.spec.ts`   | 4 controller tests                                        |
| `apps/api/prisma/migrations/20260309800000_add_show_evaluation_scores/migration.sql` | Add showEvaluationScores column to contributors           |
| `apps/web/hooks/use-public-evaluation-metrics.ts`                                    | TanStack Query hook for public aggregate data             |
| `apps/web/hooks/use-contributor-public-scores.ts`                                    | TanStack Query hook for individual contributor scores     |
| `apps/web/components/features/evaluation/public/evaluation-metrics-section.tsx`      | Showcase page evaluation metrics section                  |
| `apps/web/components/features/evaluation/public/evaluation-metrics-section.test.tsx` | 5 component tests                                         |
| `apps/web/components/features/evaluation/public/score-distribution-chart.tsx`        | Recharts histogram for score distribution                 |
| `apps/web/components/features/evaluation/public/contributor-score-summary.tsx`       | Narrative-style evaluation summary card                   |
| `apps/web/components/features/evaluation/public/contributor-score-summary.test.tsx`  | 3 component tests                                         |

### Files Modified

| File                                                                            | Changes                                                                                                                                 |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma`                                                 | Added `showEvaluationScores Boolean @default(false)` to Contributor model                                                               |
| `apps/api/src/modules/evaluation/evaluation.service.ts`                         | Added `getPublicEvaluationAggregate()` and `getContributorPublicScores()` methods; injected EvaluationReviewService for agreement rates |
| `apps/api/src/modules/evaluation/evaluation.module.ts`                          | Registered EvaluationPublicController                                                                                                   |
| `apps/api/src/modules/evaluation/evaluation.service.spec.ts`                    | Added EvaluationReviewService mock to test providers                                                                                    |
| `apps/api/src/modules/contributor/contributor.service.ts`                       | Added `showEvaluationScores` to publicProfileSelect and updateProfile handler                                                           |
| `apps/api/src/modules/contributor/contributor.service.spec.ts`                  | Updated publicProfileSelect in test assertions                                                                                          |
| `packages/shared/src/types/evaluation.types.ts`                                 | Added PublicEvaluationAggregateDto, ContributorEvaluationSummaryDto, DomainScoreDto, ScoreDistributionBucketDto                         |
| `packages/shared/src/types/contributor.types.ts`                                | Added showEvaluationScores to PublicContributorProfile                                                                                  |
| `packages/shared/src/schemas/contributor.schema.ts`                             | Added showEvaluationScores to updateContributorSchema                                                                                   |
| `packages/shared/src/index.ts`                                                  | Added exports for new evaluation types                                                                                                  |
| `apps/web/components/features/showcase/showcase-content.tsx`                    | Added EvaluationMetricsSection rendering                                                                                                |
| `apps/web/app/(public)/page.tsx`                                                | Added server-side fetch for evaluation metrics with Promise.all                                                                         |
| `apps/web/components/features/contributor-profile/public-profile-view.tsx`      | Added ContributorScoreSummary rendering (invisible absence pattern)                                                                     |
| `apps/web/components/features/contributor-profile/public-profile-view.test.tsx` | Added showEvaluationScores to mock, mocked ContributorScoreSummary, wrapped renders in QueryClientProvider                              |

### Code Review Findings (Applied)

| Severity  | Issue                                                         | Fix                                                                                           |
| --------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| CRITICAL  | Silent error swallowing in use-contributor-public-scores hook | Added proper error throw on non-ok responses, differentiating server errors from null-consent |
| IMPORTANT | Average score computed from last 10 instead of all-time       | Replaced in-memory avg with Prisma aggregate query + parallel Promise.all for count           |
| LOW       | Array index as React key in ScoreDistributionChart            | Changed to use `entry.range` as stable key                                                    |
| LOW       | Test data uses invalid `CODE` contribution type               | Changed to `COMMIT` per schema enum                                                           |

### Notes

- Migration is hand-written SQL (Prisma migrate not usable without DATABASE_URL in CI). Run manually: `psql < apps/api/prisma/migrations/20260309800000_add_show_evaluation_scores/migration.sql`
- Shared package must be built (`pnpm --filter @edin/shared build`) before API can import new types
- Public aggregate endpoint uses 5-minute Redis cache TTL (per story requirement: "maximum 5-minute data lag")
- The aggregate query loads all COMPLETED evaluations into memory for histogram bucketing. At significant scale (>50k evaluations), should be refactored to use database-level aggregation. The 5-minute cache mitigates frequency.
