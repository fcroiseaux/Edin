# BMAD Pipeline Report: Story zh-6-2

**Story:** zh-6-2-planning-reliability-score-and-combined-evaluation
**Epic:** zh-Epic 6 — Evaluation Engine Extension (Phase 2)
**Pipeline:** bmad-cycle (create-story -> dev-story -> code-review)
**Date:** 2026-03-16
**Model:** Claude Opus 4.6 (1M context)

## Pipeline Steps

### Step 1: Create Story

- **Status:** Completed
- **Output:** `_bmad-output/implementation-artifacts/zh-6-2-planning-reliability-score-and-combined-evaluation.md`
- 5 acceptance criteria (BDD), 5 tasks with 23 subtasks
- Covers FR46 (planning reliability score), FR47 (combined evaluation), FR48 (graceful degradation)
- No new Prisma migration needed — all data in existing JSON columns

### Step 2: Dev Story (Implementation)

- **Status:** Completed (no retries needed)
- **Files modified:** 12 (2 new, 10 modified)

**New Files (2):**

- `apps/api/src/modules/evaluation/services/combined-evaluation.service.ts` — Core service: planning reliability score computation, combined score, event listener
- `apps/api/src/modules/evaluation/services/combined-evaluation.service.spec.ts` — 19 tests

**Modified Files (10):**

- `packages/shared/src/types/evaluation.types.ts` — Added PlanningReliabilityScore, CombinedEvaluationResult interfaces, weight constants
- `packages/shared/src/types/zenhub.types.ts` — Added combinedScoreEnabled, qualityWeight, planningWeight to config types
- `packages/shared/src/schemas/zenhub-config.schema.ts` — Added combined score fields to response + update schemas
- `packages/shared/src/index.ts` — Exported new types and constants
- `apps/api/.../evaluation.module.ts` — Registered CombinedEvaluationService
- `apps/api/.../evaluation.service.ts` — Extended mapEvaluationDetail() with combinedEvaluation field
- `apps/api/.../evaluation.controller.ts` — Added GET /:id/combined endpoint
- `apps/api/.../evaluation.controller.spec.ts` — Added CombinedEvaluationService mock
- `apps/api/.../zenhub-config.service.ts` — 3 new config keys, 3 resolvers, updateConfig support
- `apps/api/.../zenhub-config.service.spec.ts` — 6 new tests + updated getConfig assertion

**Tests:** 25 new tests, 1397 total across 104 test files, 0 regressions

### Step 3: Code Review

- **Status:** Completed
- **Findings:** 0 issues — implementation follows all existing patterns correctly
- All 5 acceptance criteria verified
- All 5 tasks (23 subtasks) verified as complete

## Final Status

- **Story status:** done
- **Sprint status:** zh-6-2-planning-reliability-score-and-combined-evaluation -> done
- **Epic status:** zh-epic-6 -> done (2/2 stories complete)

## Auto-Approve Criteria

- [x] Green tests (25 new tests, 1397 across all files, no new regressions)
- [x] Clean shared build (tsc)
- [x] Consistent with existing architecture (extends evaluation pipeline, SettingsService/feature flag pattern)
- [x] Code review: no findings
- [x] No new npm dependencies
- [x] No new Prisma migration needed
- [x] 0 retries needed

## Key Architecture Compliance

- **Additive only**: Existing compositeScore and evaluation dimensions unchanged — combined score stored separately in metadata
- **Feature flags**: `evaluation.combined_score_enabled` defaults to `false` — safe for deployment
- **Configurable weights**: `evaluation.quality_weight` (0.80), `evaluation.planning_weight` (0.20) — adjustable via admin config
- **Sparse data protection**: Confidence factor = min(sprintCount / 3, 1.0) — contributors with 1 sprint get ~6.7% planning weight instead of 20%
- **Graceful degradation**: Event listener catches all errors — quality score remains unaffected if combined computation fails
- **Audit trail**: Full CombinedEvaluationResult stored in metadata JSON — includes weights, effective weights, confidence, and before/after (quality vs combined)
- **No DB schema changes**: All data in existing JSON column (Evaluation.metadata)
- **Module boundaries**: CombinedEvaluationService registered in EvaluationModule — uses ZenhubConfigService for feature flags, PrismaService for data access

## Score Calculation Reference

**Planning Reliability Score (0–100):**

- deliveryRatioScore = avg(deliveryRatio) × 100 (40% weight)
- estimationAccuracyScore = 100 − avg(estimationVariance) (35% weight)
- consistencyScore = 100 − stddev(deliveryRatios) × 100 (25% weight)

**Combined Score:**

- effectivePlanningWeight = configuredPlanningWeight × confidenceFactor
- effectiveQualityWeight = 1 − effectivePlanningWeight
- combinedScore = effectiveQualityWeight × compositeScore + effectivePlanningWeight × planningReliabilityScore
