# Story zh-6.2: Planning Reliability Score & Combined Evaluation

Status: done

## Story

As a project lead,
I want a planning reliability score generated per contributor and combined with quality evaluation into a holistic assessment,
So that token rewards reflect both contribution quality and planning discipline.

## Acceptance Criteria (BDD)

### AC1: Planning Reliability Score Calculation

**Given** a contributor has sprint history (PlanningReliability records)
**When** the planning reliability score is calculated
**Then** it incorporates delivery ratio, estimation accuracy, and commitment consistency
**And** the score is a normalized value (0–100) available alongside the AI evaluation score

### AC2: Combined Evaluation Score

**Given** both quality evaluation (compositeScore) and planning reliability scores exist
**When** a combined evaluation is generated
**Then** it produces a combined score incorporating both dimensions
**And** the weighting between quality and planning reliability is configurable via platform settings
**And** the combined score is stored in the evaluation's `metadata` JSON for persistence and audit

### AC3: Audit Trail

**Given** sprint data influenced an evaluation score
**When** an audit trail is requested
**Then** the system provides a clear record of: which sprint data was used, how it affected the score, and the before/after comparison (quality-only vs combined)
**And** the audit trail is retained in the evaluation's `metadata` JSON per platform data retention policy

### AC4: Sparse Data Handling

**Given** planning reliability data is sparse (contributor's first 1–2 sprints)
**When** the combined score is generated
**Then** planning reliability weight is reduced proportionally via a confidence factor
**And** the evaluation does not penalize contributors with limited sprint history

### AC5: Feature Flag Control

**Given** the combined evaluation feature
**When** it is first deployed
**Then** it is behind a platform setting `evaluation.combined_score_enabled` (default: `false`)
**And** evaluation continues to function identically when the setting is off

## Tasks / Subtasks

### Task 1: Add Shared Types & Constants (AC: #1, #2, #3)

- [x] 1.1 Add `PlanningReliabilityScore` interface to `packages/shared/src/types/evaluation.types.ts`:
  - `score: number` (0–100 aggregate)
  - `deliveryRatioScore: number` (0–100)
  - `estimationAccuracyScore: number` (0–100)
  - `consistencyScore: number` (0–100)
  - `sprintCount: number`
  - `confidenceFactor: number` (0–1)
- [x] 1.2 Add `CombinedEvaluationResult` interface:
  - `qualityScore: number`
  - `planningReliabilityScore: number`
  - `combinedScore: number`
  - `weights: { quality: number; planning: number }`
  - `effectiveWeights: { quality: number; planning: number }`
  - `sprintCount: number`
  - `confidenceFactor: number`
  - `planningReliabilityIncluded: boolean`
- [x] 1.3 Add default weight constants: `DEFAULT_QUALITY_WEIGHT = 0.80`, `DEFAULT_PLANNING_WEIGHT = 0.20`, `CONFIDENCE_SPRINT_THRESHOLD = 3`
- [x] 1.4 Export new types and constants from `packages/shared/src/index.ts`

### Task 2: Add Feature Flag & Config Settings (AC: #5, #2)

- [x] 2.1 Add `COMBINED_SCORE_ENABLED` key to `ZenhubConfigService` (key: `evaluation.combined_score_enabled`, default: `false`)
- [x] 2.2 Add `resolveCombinedScoreEnabled()` method returning `boolean`
- [x] 2.3 Add `QUALITY_WEIGHT` and `PLANNING_WEIGHT` keys (key: `evaluation.quality_weight`, `evaluation.planning_weight`)
- [x] 2.4 Add `resolveQualityWeight()` and `resolvePlanningWeight()` methods returning `number`
- [x] 2.5 Expose settings in `getConfig()` and `updateConfig()` flows
- [x] 2.6 Add fields to shared types (`ZenhubConfigResponse`, `UpdateZenhubConfigInput`) and Zod schemas

### Task 3: Create CombinedEvaluationService (AC: #1, #2, #3, #4)

- [x] 3.1 Create `apps/api/src/modules/evaluation/services/combined-evaluation.service.ts`
- [x] 3.2 Implement `computePlanningReliabilityScore(contributorId): PlanningReliabilityScore`
  - Fetch PlanningReliability records for contributor
  - Calculate deliveryRatioScore: avg(deliveryRatio) × 100, clamped 0–100
  - Calculate estimationAccuracyScore: 100 − avg(estimationVariance), clamped 0–100
  - Calculate consistencyScore: based on stddev of delivery ratios (lower = better)
  - Aggregate: weighted average (40% delivery, 35% estimation, 25% consistency)
  - Confidence factor: min(sprintCount / CONFIDENCE_SPRINT_THRESHOLD, 1.0)
- [x] 3.3 Implement `computeCombinedScore(evaluationId): CombinedEvaluationResult`
  - Check feature flag via `ZenhubConfigService.resolveCombinedScoreEnabled()`
  - Fetch evaluation's compositeScore
  - Fetch contributor's planning reliability score
  - Apply confidence-adjusted weights
  - Return combined result with full audit data
- [x] 3.4 Implement event listener `@OnEvent('evaluation.score.completed')` to auto-compute combined score
  - If feature flag disabled, skip (AC5)
  - If no planning reliability data, skip gracefully
  - Store combined result in `Evaluation.metadata` JSON
- [x] 3.5 Implement `getCombinedEvaluation(evaluationId): CombinedEvaluationResult | null` for retrieval

### Task 4: Wire Module & Extend Responses (AC: #1, #2, #3)

- [x] 4.1 Register `CombinedEvaluationService` in `EvaluationModule` providers
- [x] 4.2 Extend `EvaluationService.mapEvaluationDetail()` to include `combinedEvaluation` field from metadata
- [x] 4.3 Add `GET /api/v1/evaluations/:id/combined` endpoint to `EvaluationController` for explicit combined score retrieval

### Task 5: Unit Tests (AC: #1, #2, #3, #4, #5)

- [x] 5.1 Test `CombinedEvaluationService.computePlanningReliabilityScore` — correct score from multi-sprint data
- [x] 5.2 Test `CombinedEvaluationService.computePlanningReliabilityScore` — sparse data returns reduced confidence
- [x] 5.3 Test `CombinedEvaluationService.computePlanningReliabilityScore` — no data returns null
- [x] 5.4 Test `CombinedEvaluationService.computeCombinedScore` — applies configurable weights
- [x] 5.5 Test `CombinedEvaluationService.computeCombinedScore` — sparse data reduces planning weight
- [x] 5.6 Test `CombinedEvaluationService.computeCombinedScore` — returns null when feature flag disabled
- [x] 5.7 Test event listener — stores combined data in metadata when evaluation completes
- [x] 5.8 Test event listener — skips when feature flag disabled
- [x] 5.9 Test event listener — skips gracefully when no planning data
- [x] 5.10 Test `ZenhubConfigService` — new config methods return correct defaults

## Dev Notes

### Architecture Patterns

- **Feature flag pattern**: Follow existing `resolvePlanningContextEnabled()` pattern in `ZenhubConfigService` — async DB → default value.
- **Event-driven computation**: Follow the `CodeEvaluationProcessor` pattern where evaluation completion triggers downstream processing. `CombinedEvaluationService` listens to `evaluation.score.completed` and enriches the evaluation's `metadata`.
- **No new DB migrations**: All combined score data stored in existing `Evaluation.metadata` JSON column. No schema changes needed.
- **Sparse data handling**: Confidence factor = `min(sprintCount / 3, 1.0)`. Effective planning weight = configured weight × confidence. Effective quality weight = 1 − effective planning weight. This ensures contributors with 1 sprint get ~6.7% planning weight (vs 20% at full confidence).

### Score Calculation

Planning Reliability Score (0–100):

- `deliveryRatioScore = clamp(avg(deliveryRatio) × 100, 0, 100)` — higher delivery = better
- `estimationAccuracyScore = clamp(100 − avg(estimationVariance), 0, 100)` — lower variance = better
- `consistencyScore = clamp(100 − (stddev(deliveryRatios) × 100), 0, 100)` — lower variance = more consistent
- `planningReliabilityScore = 0.40 × deliveryRatioScore + 0.35 × estimationAccuracyScore + 0.25 × consistencyScore`

Combined Score:

- `confidenceFactor = min(sprintCount / 3, 1.0)`
- `effectivePlanningWeight = configuredPlanningWeight × confidenceFactor`
- `effectiveQualityWeight = 1 − effectivePlanningWeight`
- `combinedScore = effectiveQualityWeight × qualityScore + effectivePlanningWeight × planningReliabilityScore`

### Source Tree Components

- `packages/shared/src/types/evaluation.types.ts` — add new interfaces and constants
- `packages/shared/src/index.ts` — export new types/constants
- `packages/shared/src/types/zenhub.types.ts` — add combined score config fields
- `packages/shared/src/schemas/zenhub-config.schema.ts` — add combined score schema fields
- `apps/api/src/modules/evaluation/services/combined-evaluation.service.ts` — NEW
- `apps/api/src/modules/evaluation/services/combined-evaluation.service.spec.ts` — NEW
- `apps/api/src/modules/evaluation/evaluation.module.ts` — register service
- `apps/api/src/modules/evaluation/evaluation.service.ts` — extend detail mapping
- `apps/api/src/modules/evaluation/evaluation.controller.ts` — add combined endpoint
- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — add new config keys/resolvers
- `apps/api/src/modules/zenhub/zenhub-config.service.spec.ts` — test new config methods

### Testing Standards

- Vitest with NestJS `Test.createTestingModule()`
- Mock all Prisma methods with `vi.fn()`
- Mock external services (SprintPlanningReliabilityService, ZenhubConfigService) with `vi.fn()`
- Follow existing patterns in `code-evaluation.processor.spec.ts`
- `vi.clearAllMocks()` in `beforeEach`

### Key Constraints

- **ADDITIVE ONLY**: Existing evaluation dimensions and compositeScore MUST NOT change
- **NO NEW DB MIGRATIONS**: All data stored in existing JSON columns (`metadata`). No schema changes needed
- **BACKWARD COMPATIBLE**: All new fields are optional. Existing evaluations without combined scores continue to work identically
- **AUDIT TRAIL**: Combined score metadata must include: input planning reliability records, weights used, confidence factor, quality-only vs combined comparison

### References

- [Source: _bmad-output/planning-artifacts/epics-zenhub-integration.md#Epic 6, Story 6.2]
- [Source: apps/api/src/modules/evaluation/processors/code-evaluation.processor.ts — evaluation pipeline]
- [Source: apps/api/src/modules/sprint/sprint-planning-reliability.service.ts — reliability data]
- [Source: apps/api/src/modules/zenhub/zenhub-config.service.ts — feature flag pattern]
- [Source: _bmad-output/implementation-artifacts/zh-6-1-planning-context-in-evaluation-prompts.md — predecessor story]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 5 tasks completed — shared types, feature flags, CombinedEvaluationService, module wiring, unit tests
- 1397 tests pass across 104 test files, 0 regressions introduced
- 19 new tests in combined-evaluation.service.spec.ts, 6 new tests in zenhub-config.service.spec.ts
- 17 pre-existing failures unchanged (redis, sprint-planning-reliability, zenhub-alerts/sync-log, CASL)
- Combined score is additive only — existing compositeScore and evaluation dimensions unchanged
- No DB schema changes required — all data in existing JSON column (metadata)
- Feature flag `evaluation.combined_score_enabled` defaults to `false` — safe for deployment
- Configurable weights: `evaluation.quality_weight` (default 0.80), `evaluation.planning_weight` (default 0.20)
- Sparse data protection: confidence factor = min(sprintCount / 3, 1.0) reduces planning weight proportionally

### File List

- packages/shared/src/types/evaluation.types.ts (modified — added PlanningReliabilityScore, CombinedEvaluationResult, constants)
- packages/shared/src/types/zenhub.types.ts (modified — added combinedScoreEnabled, qualityWeight, planningWeight to config types)
- packages/shared/src/index.ts (modified — export new types and constants)
- packages/shared/src/schemas/zenhub-config.schema.ts (modified — added combined score schema fields)
- apps/api/src/modules/evaluation/services/combined-evaluation.service.ts (NEW — core service)
- apps/api/src/modules/evaluation/services/combined-evaluation.service.spec.ts (NEW — 19 tests)
- apps/api/src/modules/evaluation/evaluation.module.ts (modified — register CombinedEvaluationService)
- apps/api/src/modules/evaluation/evaluation.service.ts (modified — include combinedEvaluation in detail response)
- apps/api/src/modules/evaluation/evaluation.controller.ts (modified — added GET /:id/combined endpoint)
- apps/api/src/modules/evaluation/evaluation.controller.spec.ts (modified — added CombinedEvaluationService mock)
- apps/api/src/modules/zenhub/zenhub-config.service.ts (modified — 3 new keys, 3 new resolvers, updateConfig support)
- apps/api/src/modules/zenhub/zenhub-config.service.spec.ts (modified — 6 new tests + updated existing)

### Change Log

- 2026-03-16: Story zh-6.2 implementation complete — planning reliability score and combined evaluation
