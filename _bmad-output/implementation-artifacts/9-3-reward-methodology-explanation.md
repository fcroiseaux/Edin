# Story 9.3: Reward Methodology Explanation

Status: done

## Story

As a contributor or visitor,
I want to understand how the scaling-law reward methodology works,
so that I have full transparency into how contributions are valued and rewarded.

## Acceptance Criteria

1. **Interactive Methodology Page (Dashboard)** — Route: `/dashboard/rewards/methodology`. Displays an interactive explanation of the scaling-law reward methodology (FR59) with: a plain-language overview of how scores translate to rewards, visual representations of the compounding mechanism via progressive-disclosure diagrams, worked examples showing how sample contribution patterns produce different reward trajectories, an interactive calculator where users input hypothetical contribution patterns and see projected outcomes, and a glossary of key terms (domain normalization, complexity multiplier, temporal aggregation). Designed to achieve >80% comprehension target (per PRD Success Criteria). Language is accessible, jargon defined inline, visual representations reinforce textual explanations.

2. **Public Methodology Page** — Route: `/rewards/methodology` (public, unauthenticated). Same reward methodology explanation as authenticated contributors. Server-side rendered for SEO. FCP <1.5s (NFR-P1). Uses the public portal's editorial design language — serif headings, generous whitespace, quiet authority of institutional communication.

3. **Progressive Disclosure** — Concise summary at the top ("How Edin rewards sustained contribution"), expandable sections for each component of the formula, interactive calculator for hypothetical contribution patterns with projected outcomes. Garden-inspired metaphor consistently: contributions as seeds, sustained engagement as cultivation, compounding rewards as harvest.

4. **Accessibility** — All visual representations have equivalent text descriptions (NFR-A4). Interactive calculator is fully keyboard-navigable (NFR-A3). Page meets WCAG 2.1 Level AA compliance (NFR-A1). Screen reader compatible with proper ARIA labels and roles.

## Tasks / Subtasks

- [x] Task 1: Shared Types & Constants (AC: #1, #2)
  - [x] 1.1 Add `WorkedExample` type to `packages/shared/src/types/metrics.types.ts` and calculator types to `scoring.types.ts`
  - [x] 1.2 Add `CalculatorInput`, `CalculatorResult`, `CalculatorProjectedPoint`, `CalculatorResultSummary` types to scoring.types.ts
  - [x] 1.3 Add `workedExamples` array to `REWARD_METHODOLOGY` constant in `reward-methodology.ts` with 3 sample personas
  - [x] 1.4 Export new types and constants from `packages/shared/src/index.ts`

- [x] Task 2: Methodology Calculator API (AC: #1, #2)
  - [x] 2.1 Create `apps/api/src/modules/reward/methodology.controller.ts` — `POST /api/v1/rewards/methodology/calculate` (unauthenticated, public endpoint with rate limiting)
  - [x] 2.2 Implement calculation logic in `apps/api/src/modules/reward/methodology.service.ts` — takes hypothetical inputs, returns projected trajectory using `REWARD_METHODOLOGY.scalingCurve` interpolation
  - [x] 2.3 Register MethodologyController and MethodologyService in `reward.module.ts` (controller first for static routes)
  - [x] 2.4 Add inline validation in controller with DomainException error handling

- [x] Task 3: Backend Tests (AC: #1, #2)
  - [x] 3.1 Create `methodology.service.spec.ts` — 15 tests: calculation accuracy, edge cases, interpolation at exact and between points, zero quality, max duration
  - [x] 3.2 Create `methodology.controller.spec.ts` — 6 tests: valid input, optional domain, invalid contributions/quality/months/domain

- [x] Task 4: Shared Interactive Components (AC: #1, #2, #3, #4)
  - [x] 4.1 Create `methodology-calculator.tsx` — interactive form with range sliders, domain radio group, debounced API calls, Recharts AreaChart output, summary stats, sr-only data table
  - [x] 4.2 Create `worked-examples.tsx` — 3 personas with mini Recharts AreaChart per card, computed trajectories, reward summaries
  - [x] 4.3 Create `methodology-overview.tsx` — progressive disclosure with expandable formula components using `<details>/<summary>`, garden metaphor
  - [x] 4.4 Create `use-methodology-calculator.ts` — TanStack Query useMutation hook for calculator API (no auth)

- [x] Task 5: Public Methodology Page (AC: #2, #3, #4)
  - [x] 5.1 Create `apps/web/app/(public)/rewards/methodology/page.tsx` — SSR page with SEO metadata composing all methodology components
  - [x] 5.2 Create `apps/web/app/(public)/rewards/methodology/loading.tsx` — skeleton loader

- [x] Task 6: Dashboard Methodology Page (AC: #1, #3, #4)
  - [x] 6.1 Create `apps/web/app/(dashboard)/dashboard/rewards/methodology/page.tsx` — client component reusing same components
  - [x] 6.2 Create `apps/web/app/(dashboard)/dashboard/rewards/methodology/loading.tsx` — skeleton loader

- [x] Task 7: Unit Tests (AC: #1, #2, #3, #4)
  - [x] 7.1 `methodology.service.spec.ts` — 15 tests covering calculation accuracy, edge cases, scaling curve interpolation
  - [x] 7.2 `methodology.controller.spec.ts` — 6 tests covering validation, response format, public access

## Dev Notes

### Architecture & Module Structure

**Extends existing module**: `apps/api/src/modules/reward/` — add methodology controller and service alongside existing scoring and trajectory services.

```
apps/api/src/modules/reward/
├── reward.module.ts                  # MODIFY — register MethodologyController + MethodologyService
├── methodology.controller.ts         # NEW — public calculator endpoint
├── methodology.controller.spec.ts    # NEW
├── methodology.service.ts            # NEW — calculation logic
├── methodology.service.spec.ts       # NEW
├── scoring-formula.service.ts        # EXISTING — do not modify
├── temporal-aggregation.service.ts   # EXISTING — do not modify
├── trajectory.service.ts             # EXISTING — do not modify
├── trajectory.controller.ts          # EXISTING — do not modify
├── score.controller.ts               # EXISTING — do not modify
├── scoring-admin.controller.ts       # EXISTING — do not modify
└── ...existing files
```

**Frontend new components** (in existing `rewards/` directory):

```
apps/web/components/features/rewards/
├── rewards-hero.tsx                   # EXISTING — do not modify
├── scaling-law-explainer.tsx          # EXISTING — do not modify
├── growth-curve-chart.tsx             # EXISTING — do not modify
├── formula-breakdown.tsx              # EXISTING — do not modify
├── glossary-section.tsx               # EXISTING — do not modify
├── rewards-skeleton.tsx               # EXISTING — do not modify
├── methodology-calculator.tsx         # NEW — interactive calculator
├── worked-examples.tsx                # NEW — sample persona trajectories
└── methodology-overview.tsx           # NEW — progressive disclosure overview
```

**New pages**:

```
apps/web/app/(public)/rewards/methodology/
├── page.tsx                           # NEW — SSR public methodology page
└── loading.tsx                        # NEW — skeleton

apps/web/app/(dashboard)/dashboard/rewards/methodology/
├── page.tsx                           # NEW — dashboard methodology page
└── loading.tsx                        # NEW — skeleton
```

**New hook**:

```
apps/web/hooks/
├── use-methodology-calculator.ts      # NEW — calculator API mutation
├── use-scores.ts                      # EXISTING — do not modify
└── use-trajectory.ts                  # EXISTING — do not modify
```

### Calculator API Design

The calculator endpoint is **PUBLIC** (no auth required) — it takes hypothetical inputs and returns projected outcomes. This is intentional per FR59 ("Visitors can access the reward methodology explanation on public pages").

```
POST /api/v1/rewards/methodology/calculate

Request body (Zod-validated):
{
  monthlyContributions: number  // 1-50, contributions per month
  avgQualityScore: number       // 0-100, average quality score
  months: number                // 1-36, engagement duration in months
  domain?: string               // optional: 'technology' | 'fintech' | 'impact' | 'governance'
}

Response:
{
  data: {
    projectedPoints: Array<{
      month: number,
      rawScore: number,
      compoundingMultiplier: number,
      compoundedScore: number,
      cumulativeRewardUnits: number
    }>,
    summary: {
      totalContributions: number,
      finalMultiplier: number,
      totalRewardUnits: number,
      compoundingEffect: string   // e.g., "3.2x more than linear"
    }
  },
  meta: { timestamp, correlationId }
}
```

**Calculation logic** (in MethodologyService):

1. For each month 1..N: compute rawScore = avgQualityScore \* monthlyContributions / MAX_MONTHLY (normalized)
2. Interpolate compounding multiplier from `REWARD_METHODOLOGY.scalingCurve` linearly between defined points
3. compoundedScore = rawScore \* multiplier
4. Accumulate cumulative reward units
5. Return projected trajectory and summary

**CRITICAL**: Reuse the **same interpolation logic** from `trajectory.service.ts` — extract the `interpolateMultiplier()` method and share it, or import from trajectory service. Do NOT duplicate the interpolation logic.

### Existing Public Pattern — IMPORTANT

The existing `/rewards` page at `apps/web/app/(public)/rewards/page.tsx` already has:

- `RewardsHero` — hero section with garden metaphor
- `ScalingLawExplainer` — plain-language overview paragraphs
- `GrowthCurveChart` — Recharts AreaChart with scaling curve data, chart/table toggle
- `FormulaBreakdown` — 4 formula components in expandable cards
- `GlossarySection` — expandable `<details>` terms

**DO NOT** modify or duplicate these existing components. The new `/rewards/methodology` page should **compose** these existing components alongside new ones (calculator, worked examples, progressive-disclosure overview). The public `/rewards` page remains as-is.

### Existing Showcase API Pattern

The showcase controller already serves `GET /api/v1/showcase/reward-methodology` returning the `REWARD_METHODOLOGY` constants. The new calculator endpoint is separate — it's a `POST` that performs computation. Register it in the **reward module**, not the showcase module.

**IMPORTANT**: The calculator endpoint must NOT require auth. Use **no guards** on the controller/endpoint. Follow the pattern from `PublicArticleController` in the publication module which has public endpoints without JwtAuthGuard.

### Worked Examples Design

Three sample personas showcasing different contribution patterns:

1. **"The Steady Gardener"** — 5 contributions/month, 72 avg quality, 12 months. Shows steady compounding growth.
2. **"The Intensive Sprint"** — 20 contributions/month, 65 avg quality, 3 months. Shows high volume but lower compounding.
3. **"The Quality Cultivator"** — 3 contributions/month, 92 avg quality, 24 months. Shows quality + tenure maximizes rewards.

Each example includes a mini trajectory chart (small Recharts `AreaChart`) and a summary sentence explaining the outcome. Store these as `WORKED_EXAMPLES` constant in `reward-methodology.ts`.

### Progressive Disclosure Pattern

The methodology-overview component should implement:

1. **Top-level summary** (always visible): 2-3 sentence plain-language overview
2. **Expandable sections** (click to reveal): One section per formula component, each with:
   - Component name and qualitative weight badge
   - Description paragraph
   - Visual representation (icon + text)
3. **"How it all comes together"** (expandable): Brief explanation of how components combine
4. Use `<details>/<summary>` native HTML for progressive disclosure — same pattern as existing `GlossarySection`

### Interactive Calculator UX

The calculator component should have:

- **Input section**: Sliders with numeric labels (not just range inputs)
  - Monthly contributions: slider 1-50, default 5
  - Average quality score: slider 0-100, default 70
  - Duration: slider 1-36 months, default 12
  - Domain: radio group (Technology/Fintech/Impact/Governance), default Technology
- **Output section**: Mini Recharts AreaChart showing projected trajectory + summary stats
- **Debounced API calls**: Use 500ms debounce on slider changes to avoid API spam
- **Keyboard accessible**: All inputs navigable via Tab, adjustable via arrow keys
- **Loading state**: Skeleton overlay while calculating
- **Error state**: Graceful fallback message

### SSR Pattern for Public Page

Follow the existing showcase page pattern exactly:

```typescript
// page.tsx — Server Component (no 'use client')
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> { ... }

export default function MethodologyPage() {
  // Static content — REWARD_METHODOLOGY imported directly from @edin/shared
  // Interactive calculator is a client component within the server page
  return (
    <main className="min-h-screen bg-surface-base">
      <RewardsHero />
      <MethodologyOverview />
      <GrowthCurveChart data={REWARD_METHODOLOGY.scalingCurve} />
      <WorkedExamples />
      <MethodologyCalculator />  {/* 'use client' component */}
      <FormulaBreakdown components={REWARD_METHODOLOGY.formulaComponents} />
      <GlossarySection terms={REWARD_METHODOLOGY.glossary} />
    </main>
  );
}
```

The page itself is a Server Component for SSR/SEO. Interactive components (calculator, charts) use `'use client'` directive. Static content (hero, overview text, glossary) renders server-side.

### Dashboard vs Public Page Differences

Both pages compose the **same components**. Differences:

| Aspect  | Public `/rewards/methodology` | Dashboard `/dashboard/rewards/methodology` |
| ------- | ----------------------------- | ------------------------------------------ |
| Auth    | None                          | JwtAuthGuard (via layout)                  |
| Layout  | `PublicNav` (public layout)   | Dashboard sidebar layout                   |
| SSR     | Full SSR with SEO metadata    | Client-side (dashboard pattern)            |
| Content | Identical components          | Identical components                       |
| Loading | `loading.tsx` skeleton        | `loading.tsx` skeleton                     |

### Recharts Pattern Reference (for Calculator & Worked Examples)

All Edin charts follow these conventions (from story 9-2):

- `ResponsiveContainer` with percentage width and fixed height (200-300px for full, 120-150px for mini)
- Gradient via `<defs><linearGradient>` with `#C4956A` brand accent at top, transparent at bottom
- Axis styling: `tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}`, `axisLine={false}`, `tickLine={false}`
- Custom tooltip: `background: 'var(--color-surface-raised)'`, `border: '1px solid var(--color-surface-border)'`
- `'use client'` directive required for all Recharts components
- Use `useId()` for gradient IDs to avoid SSR hydration mismatches

### Existing Code to Reuse (DO NOT Reinvent)

- **REWARD_METHODOLOGY constants**: Import from `@edin/shared/constants/reward-methodology` — all overview text, scaling curve data, formula components, glossary terms
- **Existing reward components**: `RewardsHero`, `ScalingLawExplainer`, `GrowthCurveChart`, `FormulaBreakdown`, `GlossarySection` — reuse as-is in composition
- **Scaling curve interpolation**: `trajectory.service.ts` has `interpolateMultiplier()` logic — share it or extract to a utility
- **API response format**: `createSuccessResponse(data, req.correlationId)` from `apps/api/src/common/types/api-response.type.ts`
- **TanStack Query pattern**: Follow `apps/web/hooks/use-scores.ts` for queries and mutations
- **SSR page pattern**: Follow `apps/web/app/(public)/page.tsx` for server-side fetch + metadata
- **Skeleton pattern**: Follow `apps/web/app/(public)/rewards/loading.tsx` for loading states
- **Error handling**: `DomainException` with `ERROR_CODES` from `@edin/shared`

### Critical Patterns to Follow

1. **No auth on methodology calculator**: Public endpoint — do NOT add JwtAuthGuard
2. **Rate limiting**: Apply `@nestjs/throttler` on calculator endpoint to prevent abuse (10 requests/minute)
3. **Static routes first**: Register `methodology.controller.ts` BEFORE any dynamic routes in reward module
4. **Prisma decimals**: Pass plain numbers, NOT `Decimal` imports (lesson from 8-5, 9-1, 9-2)
5. **No new DB models**: Calculator is purely computational — no database reads/writes needed
6. **Frontend `'use client'`**: Required for Recharts and interactive form elements
7. **Screen reader**: `role="img"` and `aria-label` on charts, `aria-describedby` on form inputs
8. **Keyboard navigation**: All calculator inputs must be Tab-navigable and arrow-key adjustable
9. **Debounce**: 500ms debounce on calculator input changes before API call
10. **Zod validation**: Validate calculator input with shared Zod schema (reuse frontend/backend)

### Testing Standards

- **Vitest** with NestJS Test module
- Mock PrismaService even if not directly used (module dependency)
- Test calculator with known inputs → expected outputs (verify math precisely)
- Test scaling curve interpolation at exact points (1mo, 3mo, 6mo, 12mo, 24mo) and between points (2mo, 9mo, 18mo)
- Test edge cases: 0 contributions, 100 quality score, 36 months, domain variations
- Test rate limiting behavior
- Test input validation (Zod schema rejects invalid inputs)
- Test controller returns proper response envelope
- Target: 10-12 service tests, 4-5 controller tests

### Project Structure Notes

- New methodology components in existing `components/features/rewards/` — NOT in a new directory (unlike trajectory which has its own `reward-trajectory/` dir because it's dashboard-specific)
- Public methodology page at `(public)/rewards/methodology/` — new subroute under existing rewards
- Dashboard methodology page at `(dashboard)/dashboard/rewards/methodology/` — new subroute
- Hook in `hooks/use-methodology-calculator.ts` — new file
- Shared types extend existing `scoring.types.ts` — no new type file needed
- Shared constants extend existing `reward-methodology.ts` — no new constants file needed

### Previous Story (9-2) Learnings

- TrajectoryController registered BEFORE ScoreController in module (static routes first pattern) — do same for MethodologyController
- Recharts components require `'use client'` directive — all new chart components need it
- `useId()` for gradient IDs prevents SSR hydration mismatch — use in calculator chart
- Chart/table toggle with sr-only accessible table pattern works well — consider for worked examples mini charts
- REWARD_METHODOLOGY constants from `@edin/shared` used successfully — extend with WORKED_EXAMPLES
- Full test suite: 930/930 passing after 9-2 — maintain zero regressions
- Prisma decimals: pass plain numbers, NOT Decimal class
- mockPrisma type: use `any` to resolve Mock type assignability

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9, Story 9.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR59 — methodology explanation with visual representations, >80% comprehension target]
- [Source: _bmad-output/planning-artifacts/prd.md#Success Criteria — Reward comprehension rate >80%]
- [Source: _bmad-output/planning-artifacts/architecture.md#Public routes in (public) group, /rewards/page.tsx]
- [Source: _bmad-output/planning-artifacts/architecture.md#Showcase module — public endpoint pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Progressive disclosure pattern, garden-inspired metaphor]
- [Source: packages/shared/src/constants/reward-methodology.ts — REWARD_METHODOLOGY constants, scaling curve, formula components, glossary]
- [Source: apps/web/app/(public)/rewards/page.tsx — existing public rewards page to compose alongside]
- [Source: apps/web/components/features/rewards/*.tsx — existing reward components to reuse]
- [Source: apps/api/src/modules/showcase/showcase.controller.ts — public API endpoint pattern (no auth)]
- [Source: apps/api/src/modules/reward/trajectory.service.ts — interpolateMultiplier() logic to reuse]
- [Source: apps/web/hooks/use-scores.ts — TanStack Query hook pattern]
- [Source: _bmad-output/implementation-artifacts/9-2-reward-trajectory-visualization.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed pre-existing Recharts `formatter` type error in `score-distribution-chart.tsx` (value param needs `number | undefined`)
- Fixed pre-existing type error in `flagged-articles-table.tsx` (UNPUBLISH action not in mutationMap — used `Record<string, ...>` type)
- Shared package rebuild required for new type exports

### Completion Notes List

- All 7 tasks implemented with 21 new backend tests (15 service + 6 controller)
- Full test suite: 953/953 passing, 0 regressions
- Web app builds successfully with both routes registered
- No new database models — calculator is purely computational using REWARD_METHODOLOGY constants
- MethodologyController registered FIRST in reward module (static routes pattern)
- Calculator endpoint is public (no JwtAuthGuard) with @Throttle rate limiting (10 req/min)
- Same interpolateMultiplier logic as TrajectoryService for consistency
- Progressive disclosure via native `<details>/<summary>` HTML elements
- Interactive calculator with debounced API calls (500ms), range sliders, domain radio group
- Worked examples with mini Recharts AreaCharts computed client-side from REWARD_METHODOLOGY constants
- Accessibility: sr-only data tables, aria-labels on all charts, aria-valuemin/max/now on sliders, keyboard-navigable inputs
- Garden-inspired UX: "Explore Your Potential", "Patterns in the Garden", organic growth language
- Public page is SSR Server Component with SEO metadata; dashboard page is client component
- Fixed 2 pre-existing TypeScript errors in unrelated components to get clean build

### File List

**New files:**

- `apps/api/src/modules/reward/methodology.service.ts`
- `apps/api/src/modules/reward/methodology.service.spec.ts`
- `apps/api/src/modules/reward/methodology.controller.ts`
- `apps/api/src/modules/reward/methodology.controller.spec.ts`
- `apps/web/components/features/rewards/methodology-calculator.tsx`
- `apps/web/components/features/rewards/worked-examples.tsx`
- `apps/web/components/features/rewards/methodology-overview.tsx`
- `apps/web/hooks/use-methodology-calculator.ts`
- `apps/web/app/(public)/rewards/methodology/page.tsx`
- `apps/web/app/(public)/rewards/methodology/loading.tsx`
- `apps/web/app/(dashboard)/dashboard/rewards/methodology/page.tsx`
- `apps/web/app/(dashboard)/dashboard/rewards/methodology/loading.tsx`

**Modified files:**

- `packages/shared/src/types/scoring.types.ts` — added CalculatorInput, CalculatorResult, CalculatorProjectedPoint, CalculatorResultSummary, WorkedExampleInput types
- `packages/shared/src/types/metrics.types.ts` — added WorkedExample type, extended RewardMethodology interface
- `packages/shared/src/constants/reward-methodology.ts` — added workedExamples array with 3 personas
- `packages/shared/src/constants/error-codes.ts` — added METHODOLOGY_CALCULATION_FAILED
- `packages/shared/src/index.ts` — exported new types (WorkedExample, CalculatorInput, CalculatorResult, etc.)
- `apps/api/src/modules/reward/reward.module.ts` — registered MethodologyController and MethodologyService
- `apps/web/components/features/evaluation/public/score-distribution-chart.tsx` — fixed pre-existing Recharts formatter type
- `apps/web/components/features/publication/admin/flagged-articles-table.tsx` — fixed pre-existing type error in mutationMap
