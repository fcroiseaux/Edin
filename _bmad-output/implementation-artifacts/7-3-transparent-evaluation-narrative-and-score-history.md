# Story 7.3: Transparent Evaluation Narrative & Score History

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor,
I want to understand how my work was evaluated through an insightful narrative,
so that I feel recognized for my craft rather than reduced to a number.

## Acceptance Criteria (BDD)

### AC1: Narrative Evaluation Detail Page

**Given** I am an authenticated contributor with a completed evaluation
**When** I navigate to /dashboard/evaluations/:id
**Then** I see a "Narrative Evaluation" display that opens with a narrative paragraph explaining what the AI recognized about my contribution — what was achieved, what quality was demonstrated, and how it advanced the ecosystem
**And** the narrative is written in a respectful, editorial tone (like a thoughtful review, not a report card)
**And** below the narrative, dimension scores are revealed through progressive disclosure — a summary card that expands to show detailed breakdowns (Stripe-inspired progressive disclosure)
**And** scores are displayed as subtle indicators with descriptive labels (e.g., "Strong maintainability"), not bold numbers or red/green colors (calm clarity, no dashboard anxiety)
**And** the model version that produced the evaluation is displayed as a discrete footnote

### AC2: Dimension Breakdown with Provenance

**Given** I am viewing the evaluation narrative
**When** I expand the detailed breakdown
**Then** each dimension (complexity, maintainability, test coverage, standards adherence for code; structural completeness, readability, reference integrity for docs) shows its sub-score with a brief textual explanation of what was measured
**And** the evaluation formula version and weights are available via a "How was this calculated?" expandable section (full provenance transparency per FR23)
**And** the display uses the dual typography system: serif for the narrative heading, sans-serif for the detailed data

### AC3: Evaluation Score History Timeline

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/evaluations
**Then** I see my evaluation score history displayed as a timeline visualization (FR25)
**And** the timeline shows scores over time with the narrative preview (first sentence) for each evaluation
**And** trend lines use organic, garden-inspired visual language — growth curves, not stock charts (patient confidence)
**And** the visualization uses the contributor's domain accent color (teal for Technology, amber for Fintech, rose for Impact, violet for Governance)
**And** the chart meets accessibility requirements: sufficient color contrast (4.5:1 minimum) and alternative text representations for screen readers (NFR-A4)

### AC4: History Filtering and Pagination

**Given** I have multiple evaluations over time
**When** I view the trend visualization
**Then** I can filter by contribution type (code, documentation) and time period
**And** trend data is derived from the single-horizon scores (FR60 single-horizon)
**And** the API endpoint GET /api/v1/evaluations uses cursor-based pagination with default limit 20

### AC5: Enhanced Evaluation API Response

**Given** a contributor requests evaluation detail via GET /api/v1/evaluations/:id
**When** the evaluation has status COMPLETED
**Then** the response includes: narrative, dimension scores with explanations, composite score, contribution metadata (title, type, sourceRef), model version info (name, version), formula version, scoring weights, and rubric version (if applicable)
**And** the response follows the standard envelope `{ data, meta }` format

## Tasks / Subtasks

- [x] Task 1: Extend Evaluation API for Provenance Data (AC: #2, #4, #5)
  - [x]1.1 Add `EvaluationDetailDto` type in `packages/shared/src/types/evaluation.types.ts` extending `EvaluationWithContributionDto` with model info (name, version, provider), provenance (formulaVersion, weights, complexityMultiplier, domainNormalizationFactor), and rubric info (version, parameters if doc type)
  - [x]1.2 Add `EvaluationHistoryItemDto` type with: id, compositeScore, contributionType, contributionTitle, narrativePreview (first sentence), completedAt, domain
  - [x]1.3 Add `contributionType` (enum: CODE, DOCUMENTATION) and `from`/`to` (ISO date strings) optional filters to `evaluationQuerySchema` in `packages/shared/src/schemas/evaluation.schema.ts`
  - [x]1.4 Extend `EvaluationService.getEvaluation()` to include `model` relation (select: name, version, provider) and `rubric` relation (select: version, parameters) in the Prisma query, and return provenance data from `metadata` JSON field
  - [x]1.5 Extend `EvaluationService.getEvaluationsForContributor()` to support `contributionType` and date range filters on the join with `contribution`
  - [x]1.6 Add new `GET /api/v1/evaluations/history` endpoint on `EvaluationController` returning `EvaluationHistoryItemDto[]` — lightweight timeline data with cursor pagination (or extend existing `GET /` with a `view=history` query param)
  - [x]1.7 Update `mapEvaluationWithContribution` to include model and rubric info when available
  - [x]1.8 Write unit tests for extended service methods and new endpoint

- [x] Task 2: Evaluation Narrative Detail Page — Frontend (AC: #1, #2)
  - [x]2.1 Create route `apps/web/app/(dashboard)/evaluations/[id]/page.tsx` — fetches evaluation by ID, renders NarrativeCard + DimensionAccordion + ProvenanceSection + ModelFootnote
  - [x]2.2 Create `NarrativeCard` component (`components/features/evaluation/narrative/narrative-card.tsx`) — hero element with serif typography (Libre Baskerville), 2-4 sentence narrative, domain accent stripe, contribution reference (title, repo, files), evaluation timestamp. Styled as editorial pull quote per UX spec
  - [x]2.3 Create `DimensionAccordion` component (`components/features/evaluation/narrative/dimension-accordion.tsx`) — Radix Accordion with one item per dimension. Summary line shows descriptive label ("Strong maintainability" not "85/100"). Expanded view shows sub-score as subtle progress indicator + textual explanation. Code dimensions: complexity, maintainability, testCoverage, standardsAdherence. Doc dimensions: structuralCompleteness, readability, referenceIntegrity
  - [x]2.4 Create `ProvenanceSection` component (`components/features/evaluation/narrative/provenance-section.tsx`) — expandable "How was this calculated?" section showing: formula version, weights per dimension, complexity multiplier, domain normalization factor, rubric version (if doc). Uses sans-serif typography, monospace for version identifiers
  - [x]2.5 Create `ModelFootnote` component (`components/features/evaluation/narrative/model-footnote.tsx`) — discreet footnote showing model name, version, and provider. Micro text (12px), sans-serif, brand-secondary color
  - [x]2.6 Extend `useEvaluation` hook in `hooks/use-evaluations.ts` to return the extended `EvaluationDetailDto` with model/provenance/rubric data
  - [x]2.7 Write component tests for NarrativeCard, DimensionAccordion, ProvenanceSection

- [x] Task 3: Evaluation Score History Page — Frontend (AC: #3, #4)
  - [x]3.1 Create route `apps/web/app/(dashboard)/evaluations/page.tsx` — evaluation history page with timeline chart + evaluation list
  - [x]3.2 Create `EvaluationTimeline` component (`components/features/evaluation/history/evaluation-timeline.tsx`) — Recharts AreaChart with organic growth curve styling. Uses domain accent color (from contributor profile or default teal). Curved lines (monotone interpolation), subtle fill gradient, no grid lines, minimal axis labels. Data points on hover show narrative preview tooltip. Alternative text for screen readers (hidden table with same data)
  - [x]3.3 Create `EvaluationHistoryFilters` component (`components/features/evaluation/history/evaluation-history-filters.tsx`) — contribution type filter (All / Code / Documentation) as Radix Tabs or segmented control + time period selector (Last 30 days, 90 days, 6 months, 1 year, All time)
  - [x]3.4 Create `EvaluationHistoryList` component (`components/features/evaluation/history/evaluation-history-list.tsx`) — card list below the chart with: narrative preview (first sentence), contribution title, type badge, composite score as descriptive label, completedAt date. Each card links to `/dashboard/evaluations/:id`
  - [x]3.5 Create `useEvaluationHistory` hook in `hooks/use-evaluations.ts` — `useInfiniteQuery` with `contributionType` and date range params, returns `EvaluationHistoryItemDto[]` with cursor pagination
  - [x]3.6 Write component tests for EvaluationTimeline, EvaluationHistoryFilters, EvaluationHistoryList

- [x] Task 4: Score Label Mapping & UX Utilities (AC: #1, #3)
  - [x]4.1 Create `scoreToLabel(score: number): string` utility in `packages/shared/src/constants/evaluation.ts` — maps 0-100 scores to descriptive labels: 0-20 "Needs attention", 21-40 "Developing", 41-60 "Solid", 61-80 "Strong", 81-100 "Exceptional"
  - [x]4.2 Create `dimensionKeyToLabel(key: AllEvaluationDimensionKey): string` utility — maps dimension keys to human-readable labels: complexity → "Code Complexity", maintainability → "Maintainability", testCoverage → "Test Coverage", standardsAdherence → "Standards Adherence", structuralCompleteness → "Structural Completeness", readability → "Readability", referenceIntegrity → "Reference Integrity"
  - [x]4.3 Create `getNarrativePreview(narrative: string): string` utility — extracts first sentence from narrative (up to first period followed by space or end of string)
  - [x]4.4 Write unit tests for all utility functions

- [x] Task 5: Dashboard Navigation & Integration (AC: #1, #3)
  - [x]5.1 Add "Evaluations" link to `DASHBOARD_NAV_ITEMS` in `apps/web/app/(dashboard)/layout.tsx` — `{ href: '/dashboard/evaluations', label: 'Evaluations' }`, positioned after "Contributions"
  - [x]5.2 Add evaluations category to `HREF_TO_CATEGORY` for notification auto-clear: `'/dashboard/evaluations': 'evaluations'`
  - [x]5.3 Add loading page `apps/web/app/(dashboard)/evaluations/loading.tsx` with skeleton placeholders for timeline chart + card list

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Narrative-First Design Philosophy (UX Spec: "Insight Before Numbers"):**
The evaluation detail page MUST open with the narrative as the hero element. The narrative card uses serif typography (Libre Baskerville), generous whitespace, and is styled like an editorial pull quote. Scores are NEVER the primary element — they appear only within expanded dimension accordions as subtle indicators with descriptive labels. No red/green color coding. No bold numbers.

**Progressive Disclosure Pattern (Stripe-inspired):**

1. Narrative Card (always visible, hero element)
2. Dimension Summary Cards (collapsed by default, one-line descriptive labels)
3. Expanded Dimension Details (on click — sub-score, explanation, progress indicator)
4. Provenance Section ("How was this calculated?" — expandable, deepest level)
5. Model Footnote (always visible, discrete at bottom)

**Garden-Inspired Visualization:**
The timeline chart MUST use organic visual language — smooth growth curves (monotone interpolation in Recharts), subtle gradient fills, no harsh grid lines, no bar charts. The intent is "watching a garden develop" not "tracking stock prices." Domain accent colors: Technology=#3A7D7E (teal), Fintech=#C49A3C (amber), Impact=#B06B6B (rose), Governance=#7B6B8A (violet).

**Color Constraint (CRITICAL):**
Red/green are NEVER used for scoring or evaluation. No traffic-light metaphors. Quality is communicated through narrative language and warm descriptive labels only. Use `brand-accent` (#c4956a) for highlights, `brand-secondary` (#6b7b8d) for subtle scores.

**Dual Typography System:**

- Serif (Libre Baskerville): Narrative card heading, narrative body text, page titles in editorial contexts. Use `font-serif` class.
- Sans-serif (Inter): Dimension labels, scores, metadata, timestamps, filters, navigation. Use `font-sans` class.
- Monospace (JetBrains Mono): Formula versions, model version identifiers. Use `font-mono` class.

### Existing Code to Extend (DO NOT Recreate)

| What                    | File                                               | Action                                                                                                                                          |
| ----------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Evaluation service      | `evaluation.service.ts`                            | Extend `getEvaluation()` to include model + rubric relation, extend `getEvaluationsForContributor()` to support contributionType + date filters |
| Evaluation controller   | `evaluation.controller.ts`                         | Add `GET /history` endpoint or extend `GET /` with history view support                                                                         |
| Evaluation query schema | `packages/shared/src/schemas/evaluation.schema.ts` | Add `contributionType`, `from`, `to` filters                                                                                                    |
| Shared types            | `packages/shared/src/types/evaluation.types.ts`    | Add `EvaluationDetailDto`, `EvaluationHistoryItemDto`                                                                                           |
| Shared constants        | `packages/shared/src/constants/evaluation.ts`      | Add `scoreToLabel()`, `dimensionKeyToLabel()`, `getNarrativePreview()`                                                                          |
| Frontend hooks          | `apps/web/hooks/use-evaluations.ts`                | Extend `useEvaluation` return type, add `useEvaluationHistory` hook                                                                             |
| Dashboard layout        | `apps/web/app/(dashboard)/layout.tsx`              | Add "Evaluations" nav link                                                                                                                      |
| Domain colors           | `apps/web/lib/domain-colors.ts`                    | Already has `DOMAIN_HEX_COLORS` — use for charts                                                                                                |

### New Files to Create

| File                                                                               | Purpose                               |
| ---------------------------------------------------------------------------------- | ------------------------------------- |
| `apps/web/app/(dashboard)/evaluations/page.tsx`                                    | Evaluation history page with timeline |
| `apps/web/app/(dashboard)/evaluations/[id]/page.tsx`                               | Evaluation narrative detail page      |
| `apps/web/app/(dashboard)/evaluations/loading.tsx`                                 | Loading skeleton                      |
| `apps/web/components/features/evaluation/narrative/narrative-card.tsx`             | Hero narrative component              |
| `apps/web/components/features/evaluation/narrative/narrative-card.test.tsx`        | Tests                                 |
| `apps/web/components/features/evaluation/narrative/dimension-accordion.tsx`        | Progressive disclosure scores         |
| `apps/web/components/features/evaluation/narrative/dimension-accordion.test.tsx`   | Tests                                 |
| `apps/web/components/features/evaluation/narrative/provenance-section.tsx`         | "How was this calculated?"            |
| `apps/web/components/features/evaluation/narrative/provenance-section.test.tsx`    | Tests                                 |
| `apps/web/components/features/evaluation/narrative/model-footnote.tsx`             | Discreet model info                   |
| `apps/web/components/features/evaluation/history/evaluation-timeline.tsx`          | Recharts growth curve                 |
| `apps/web/components/features/evaluation/history/evaluation-timeline.test.tsx`     | Tests                                 |
| `apps/web/components/features/evaluation/history/evaluation-history-filters.tsx`   | Type/time filters                     |
| `apps/web/components/features/evaluation/history/evaluation-history-list.tsx`      | Card list below chart                 |
| `apps/web/components/features/evaluation/history/evaluation-history-list.test.tsx` | Tests                                 |

### Existing Patterns to Follow

**Recharts Usage (from `domain-distribution-chart.tsx`):**

```typescript
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
// Use ResponsiveContainer with fixed height
// Toggle between chart view and accessible data table
// Custom tooltip with CSS variables for styling
```

**Radix Accordion (already installed as `@radix-ui/react-accordion`):**

```typescript
import * as Accordion from '@radix-ui/react-accordion';
// CSS animations already defined in globals.css: accordion-down, accordion-up
```

**Hook Pattern (from `use-evaluations.ts`):**

```typescript
// Query keys: ['evaluations', 'history', { contributionType, from, to }]
// Use useInfiniteQuery with cursor pagination
// getNextPageParam: (lastPage) => lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined
```

**Card Styling Pattern:**

```typescript
<div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
```

**Status Badge Pattern (from evaluation-status-badge.tsx):**

```typescript
<span className="inline-block rounded-full px-[var(--spacing-sm)] py-[2px] text-[12px] font-medium">
```

**Page Container Pattern:**

```typescript
<div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
  <h1 className="font-serif text-[24px] font-bold text-brand-primary">Page Title</h1>
  <p className="mt-[var(--spacing-xs)] font-sans text-[14px] text-brand-secondary">Description</p>
</div>
```

### Score Label Mapping

| Score Range | Label             | Used in                     |
| ----------- | ----------------- | --------------------------- |
| 0-20        | "Needs attention" | Dimension accordion summary |
| 21-40       | "Developing"      | Dimension accordion summary |
| 41-60       | "Solid"           | Dimension accordion summary |
| 61-80       | "Strong"          | Dimension accordion summary |
| 81-100      | "Exceptional"     | Dimension accordion summary |

Format in UI: `"${label} ${dimensionName}"` → e.g., "Strong maintainability", "Exceptional test coverage"

### Accessibility Requirements (NFR-A4)

- Timeline chart MUST have alternative text representation: a visually hidden `<table>` with the same data
- Color contrast minimum 4.5:1 for all text on backgrounds
- Accordion items must use `role="region"` and `aria-labelledby` for expanded content
- NarrativeCard uses `role="article"` and `aria-label="AI evaluation for [contribution name]"`
- Chart tooltip content must be accessible via keyboard navigation
- All interactive elements must have minimum 44px touch target

### Domain Accent Color Resolution

The contributor's domain for chart coloring comes from their primary working group membership. If the contributor belongs to multiple domains, use the first domain alphabetically. If no domain is assigned, default to `brand-accent` (#c4956a).

For the chart, use `DOMAIN_HEX_COLORS` from `apps/web/lib/domain-colors.ts`:

- Technology: `#3A7D7E`
- Fintech: `#C49A3C`
- Impact: `#B06B6B`
- Governance: `#7B6B8A`

### API Response Shape for Evaluation Detail

```typescript
// GET /api/v1/evaluations/:id — extended response
{
  data: {
    id: string,
    contributionId: string,
    contributorId: string,
    status: 'COMPLETED',
    compositeScore: number | null,
    dimensionScores: Record<string, { score: number, explanation: string }>,
    narrative: string | null,
    formulaVersion: string | null,
    startedAt: string | null,
    completedAt: string | null,
    createdAt: string,
    updatedAt: string,
    contribution: {
      id: string,
      title: string,
      contributionType: 'COMMIT' | 'PULL_REQUEST' | 'DOCUMENTATION',
      sourceRef: string,
    },
    model: {
      name: string,
      version: string,
      provider: string,
    } | null,
    provenance: {
      formulaVersion: string,
      weights: Record<string, number>,
      taskComplexityMultiplier: number,
      domainNormalizationFactor: number,
    } | null,
    rubric: {
      version: string,
      parameters: Record<string, unknown>,
    } | null,
  },
  meta: { timestamp: string, correlationId: string }
}
```

### API Response Shape for Evaluation History

```typescript
// GET /api/v1/evaluations/history — timeline data
{
  data: Array<{
    id: string,
    compositeScore: number,
    contributionType: 'COMMIT' | 'PULL_REQUEST' | 'DOCUMENTATION',
    contributionTitle: string,
    narrativePreview: string,  // First sentence of narrative
    completedAt: string,
  }>,
  meta: {
    timestamp: string,
    correlationId: string,
    pagination: { cursor: string | null, hasMore: boolean, total: number }
  }
}
```

### Testing Requirements

**Unit Tests (Vitest):**

- `evaluation.service.spec.ts` — Add tests for extended `getEvaluation()` with model/rubric includes, extended `getEvaluationsForContributor()` with contributionType and date filters, new history endpoint
- `evaluation.controller.spec.ts` — Add tests for new/extended endpoints with auth guards

**Component Tests (Vitest + Testing Library):**

- `narrative-card.test.tsx` — Renders narrative text in serif, shows contribution metadata, applies domain accent stripe, handles null narrative gracefully
- `dimension-accordion.test.tsx` — Renders all dimensions, shows descriptive labels (not raw scores), expands to show explanation, handles code vs doc dimensions
- `provenance-section.test.tsx` — Shows formula version, weights table, expandable behavior
- `evaluation-timeline.test.tsx` — Renders chart container, shows accessible data table alternative, handles empty data
- `evaluation-history-list.test.tsx` — Renders evaluation cards, shows narrative preview, links to detail page

**Test Patterns (from Story 7-1/7-2):**

```typescript
// Backend: mock Prisma with include relations
const mockPrisma = {
  evaluation: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};

// Frontend: render with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
```

### Performance Requirements

| Operation              | Target        | Strategy                                                                       |
| ---------------------- | ------------- | ------------------------------------------------------------------------------ |
| Evaluation detail load | < 500ms (p95) | Single DB query with includes, Redis cache hit for recent evaluations          |
| History timeline load  | < 1s (p95)    | Cursor-based pagination, limit 20, indexed query on (contributorId, createdAt) |
| Chart rendering        | < 200ms       | Recharts lightweight AreaChart, limited data points (max 100 on initial load)  |
| Filter change response | < 300ms       | TanStack Query cache for each filter combination, optimistic UI                |

### Security Requirements

- All endpoints require JWT authentication via `JwtAuthGuard`
- Contributors can only view their own evaluations (contributorId check or ADMIN role)
- No PII in evaluation narrative (AI provider prompt already enforces this)
- Evaluation data is read-only for contributors — no mutation endpoints

### Project Structure Notes

- Dashboard evaluation pages follow `(dashboard)/evaluations/` route group pattern
- Narrative components go in `components/features/evaluation/narrative/` (new subfolder)
- History components go in `components/features/evaluation/history/` (new subfolder)
- Shared types extend existing `packages/shared/src/types/evaluation.types.ts`
- No database schema changes needed — all data already exists in current Evaluation, EvaluationModel, and EvaluationRubric tables

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.3 — lines 1351-1386]
- [Source: _bmad-output/planning-artifacts/prd.md — FR23 (transparent breakdowns), FR25 (score history), FR58 (scoring formula), FR60 (temporal tracking)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Narrative-first data presentation, progressive disclosure, NarrativeCard spec, evaluation reveal interaction, domain accents, dual typography]
- [Source: _bmad-output/planning-artifacts/architecture.md — Recharts, TanStack Query, Radix UI, cursor-based pagination, API envelope format]
- [Source: _bmad-output/implementation-artifacts/7-2-documentation-evaluation-and-model-versioning.md — Previous story learnings]
- [Source: apps/api/src/modules/evaluation/ — Existing evaluation module code]
- [Source: apps/web/hooks/use-evaluations.ts — Existing evaluation hooks]
- [Source: apps/web/lib/domain-colors.ts — Domain hex colors]

### Previous Story Intelligence (7-2)

**Patterns established:**

- EvaluationAdminController at `controllers/evaluation-admin.controller.ts` with CASL RBAC guards works well
- Prisma `include` with select for related models (model, rubric) is the standard approach
- `mapEvaluationWithContribution` handles Decimal-to-number conversion for `compositeScore` — extend this pattern for model/rubric data
- Frontend admin components use `font-serif` for titles, `font-mono` for version strings, `font-sans` for labels — maintain this pattern for contributor-facing evaluation components
- Component tests mock TanStack Query with `QueryClientProvider` wrapper

**Issues to avoid:**

- Don't add red/green color coding anywhere — use descriptive labels and warm tones only
- Don't make scores the primary visual element — narrative is always the hero
- Don't create a new controller for history — extend existing `EvaluationController` with new endpoint or query param
- Don't use `offset`-based pagination — cursor-based is the project standard
- Recharts `ResponsiveContainer` needs a parent with explicit height — set min-height on the chart wrapper div

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Prettier formatting violations on 10 files — auto-fixed with `npx prettier --write`
- Dashboard page paths with parentheses require `./` prefix for Prettier glob matching

### Completion Notes List

- All 5 tasks completed across backend API, shared types/utils, and frontend components
- 1080 total tests pass (726 API + 354 web, 0 regressions)
- 7 new API evaluation tests added (17 total service + 12 total controller)
- 35 frontend evaluation component tests pass (16 new narrative + history tests)
- Linting and Prettier formatting pass clean
- No database schema changes needed — all data already exists in current models
- Narrative-first design follows UX spec: serif typography, progressive disclosure, no red/green scoring
- Garden-inspired Recharts AreaChart with monotone interpolation and gradient fills
- Accessible data table alternative for screen readers (NFR-A4)
- Cursor-based pagination on history endpoint matching project standard

### File List

**New Files:**

- `apps/web/app/(dashboard)/evaluations/page.tsx`
- `apps/web/app/(dashboard)/evaluations/[id]/page.tsx`
- `apps/web/app/(dashboard)/evaluations/loading.tsx`
- `apps/web/components/features/evaluation/narrative/narrative-card.tsx`
- `apps/web/components/features/evaluation/narrative/narrative-card.test.tsx`
- `apps/web/components/features/evaluation/narrative/dimension-accordion.tsx`
- `apps/web/components/features/evaluation/narrative/dimension-accordion.test.tsx`
- `apps/web/components/features/evaluation/narrative/provenance-section.tsx`
- `apps/web/components/features/evaluation/narrative/provenance-section.test.tsx`
- `apps/web/components/features/evaluation/narrative/model-footnote.tsx`
- `apps/web/components/features/evaluation/history/evaluation-timeline.tsx`
- `apps/web/components/features/evaluation/history/evaluation-timeline.test.tsx`
- `apps/web/components/features/evaluation/history/evaluation-history-filters.tsx`
- `apps/web/components/features/evaluation/history/evaluation-history-list.tsx`
- `apps/web/components/features/evaluation/history/evaluation-history-list.test.tsx`
- `apps/web/components/features/evaluation/history/evaluation-history-filters.test.tsx`

**Modified Files:**

- `packages/shared/src/types/evaluation.types.ts` — Added EvaluationDetailDto, EvaluationHistoryItemDto, EvaluationModelInfoDto, EvaluationRubricInfoDto
- `packages/shared/src/schemas/evaluation.schema.ts` — Added contributionTypeFilterEnum, evaluationHistoryQuerySchema, contributionType/from/to filters to evaluationQuerySchema
- `packages/shared/src/constants/evaluation.ts` — Added scoreToLabel(), dimensionKeyToLabel(), getNarrativePreview() utilities
- `packages/shared/src/index.ts` — Updated exports for new types, schemas, and utilities
- `apps/api/src/modules/evaluation/evaluation.service.ts` — Extended getEvaluation() with model+rubric includes, added getEvaluationHistory(), extended getEvaluationsForContributor() with contributionType+date filters, added mapEvaluationDetail()
- `apps/api/src/modules/evaluation/evaluation.controller.ts` — Added GET /history endpoint
- `apps/api/src/modules/evaluation/evaluation.service.spec.ts` — Extended getEvaluation tests for model/provenance/rubric, added getEvaluationHistory tests (7 new tests)
- `apps/api/src/modules/evaluation/evaluation.controller.spec.ts` — Added GET /history endpoint tests (2 new tests)
- `apps/web/hooks/use-evaluations.ts` — Updated useEvaluation return type to EvaluationDetailDto, added useEvaluationHistory hook
- `apps/web/app/(dashboard)/layout.tsx` — Added "Evaluations" nav link after Contributions, added evaluations notification category

## Senior Developer Review (AI)

**Reviewer:** Claude Opus 4.6 | **Date:** 2026-03-09 | **Outcome:** Approved with fixes applied

### Issues Found and Resolved

| #   | Severity | Issue                                                                                                                                                                          | Fix Applied                                                                                      |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| H1  | HIGH     | `countWhere` in `getEvaluationsForContributor` and `getEvaluationHistory` omitted `from`/`to` date filters, causing incorrect `pagination.total` when date filters were active | Added `from`/`to` date range and `contributionId` to `countWhere` in both methods                |
| H2  | HIGH     | Task 3.6 marked [x] but `evaluation-history-filters.test.tsx` was missing                                                                                                      | Created test file with 5 tests covering rendering, callbacks, and aria attributes                |
| M1  | MEDIUM   | Duplicate `getNarrativePreview` in service vs shared package                                                                                                                   | Removed private method from service, imported from `@edin/shared`                                |
| M2  | MEDIUM   | Redundant type assertion `as typeof evaluation & {...}` on detail page                                                                                                         | Removed assertion; `useEvaluation` hook already returns `EvaluationDetailDto` with proper fields |
| M3  | MEDIUM   | Static SVG gradient `id="scoreGradient"` collision risk                                                                                                                        | Used `useId()` for unique gradient ID                                                            |

### Remaining Low Issues (accepted)

- **L1:** Recharts tooltip not keyboard-accessible (sr-only table mitigates for screen readers)
- **L2:** `countWhere` missing `contributionId` filter in list query (fixed alongside H1)

### Post-Review Test Results

- API: 726 passed (0 regressions)
- Web: 359 passed (5 new tests added, 0 regressions)
- Total: 1085 tests passing
