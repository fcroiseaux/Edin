# Story zh-6.1: Planning Context in Evaluation Prompts

Status: done

## Story

As a project lead,
I want AI evaluation to consider planning context (story points, sprint velocity, estimation accuracy) alongside contribution quality,
so that evaluations reflect not just what was built but whether it was planned, committed, and delivered reliably.

## Acceptance Criteria (BDD)

### AC1: Evaluation Prompt Enrichment with Sprint Context

**Given** a contribution is being evaluated by the AI engine
**When** sprint context is available (via `ContributionSprintContext`)
**Then** the code evaluation prompt's user message is enriched with: story points, sprint velocity at time of delivery, estimation accuracy, and commitment ratio
**And** the enrichment is additive — existing evaluation dimensions (complexity, maintainability, testCoverage, standardsAdherence) are unchanged
**And** the enrichment data is recorded in the `Evaluation.rawInputs` JSON for provenance

### AC2: Graceful Degradation When No Sprint Context

**Given** a contribution is being evaluated
**When** Zenhub data is temporarily unavailable or the contribution has no sprint context
**Then** the evaluation proceeds without planning context (graceful degradation)
**And** the evaluation result metadata is flagged as `planningContextIncluded: false` for transparency

### AC3: Feature Flag Control

**Given** the planning context enrichment feature
**When** it is first deployed
**Then** it is behind a platform setting `evaluation.planning_context_enabled` (default: `false`)
**And** evaluation continues to function identically when the setting is off
**And** the setting can be toggled via the existing `SettingsService` / admin config endpoint without code changes

### AC4: Prompt Version Update

**Given** the code evaluation prompt is enriched with planning context
**When** a new evaluation is created
**Then** the prompt version stored in `rawInputs.modelPromptVersion` reflects the enriched prompt version (`code-eval-v2`)
**And** evaluations without planning context continue to use `code-eval-v1`

## Tasks / Subtasks

### Task 1: Add Shared Types & Constants (AC: #1, #3)

- [x] 1.1 Add `PlanningContextEnrichment` interface to `packages/shared/src/types/evaluation.types.ts`:
  - `storyPoints: number | null`
  - `sprintVelocity: number | null`
  - `estimationAccuracy: number | null`
  - `commitmentRatio: number | null`
  - `sprintId: string`
- [x] 1.2 Export `PlanningContextEnrichment` from `packages/shared/src/index.ts`

### Task 2: Add Feature Flag Setting Key (AC: #3)

- [x] 2.1 Add `PLANNING_CONTEXT_ENABLED` key to `ZenhubConfigService` (key: `evaluation.planning_context_enabled`, default: `false`)
- [x] 2.2 Add `resolvePlanningContextEnabled()` method returning `boolean`
- [x] 2.3 Expose the setting in `getConfig()` response and `updateConfig()` updates

### Task 3: Extend CodeEvaluationInput & Provider Interface (AC: #1, #4)

- [x] 3.1 Add optional `planningContext?: PlanningContextEnrichment` field to `CodeEvaluationInput` interface
- [x] 3.2 Update `AnthropicEvaluationProvider.buildUserPrompt()` to append planning context section when present
- [x] 3.3 Add `CODE_PROMPT_VERSION_V2 = 'code-eval-v2'` constant; `codePromptVersion` getter must return v2 when planning context is provided — accomplished by making `evaluateCode` accept the flag and selecting the version dynamically
- [x] 3.4 Record the effective prompt version in the return, and ensure the caller can distinguish v1/v2

### Task 4: Fetch Planning Context in CodeEvaluationProcessor (AC: #1, #2, #3)

- [x] 4.1 Inject `SprintEnrichmentService` and `ZenhubConfigService` into `CodeEvaluationProcessor` (update module imports)
- [x] 4.2 After fetching the contribution, query `SprintEnrichmentService.getContributionSprintContexts(contributionId)` for sprint context
- [x] 4.3 If sprint context exists and feature flag is enabled, query `SprintMetric` for sprint velocity and `ContributorSprintEstimation` for estimation accuracy + commitment ratio
- [x] 4.4 Build `PlanningContextEnrichment` object and attach to `CodeEvaluationInput.planningContext`
- [x] 4.5 If no sprint context or feature flag disabled, proceed without enrichment (AC2 graceful degradation)
- [x] 4.6 Store `planningContextIncluded: boolean` and planning context data in `Evaluation.rawInputs`

### Task 5: Update EvaluationModule Imports (AC: #1)

- [x] 5.1 Import `SprintModule` and `ZenhubModule` in `EvaluationModule` so `SprintEnrichmentService` and `ZenhubConfigService` are injectable

### Task 6: Unit Tests (AC: #1, #2, #3, #4)

- [x] 6.1 Test `AnthropicEvaluationProvider` — prompt includes planning context section when provided
- [x] 6.2 Test `AnthropicEvaluationProvider` — prompt does NOT include planning context section when absent
- [x] 6.3 Test `CodeEvaluationProcessor` — enriches input with planning context when available and flag enabled
- [x] 6.4 Test `CodeEvaluationProcessor` — proceeds without planning context when flag disabled
- [x] 6.5 Test `CodeEvaluationProcessor` — proceeds without planning context when no sprint context exists (graceful degradation)
- [x] 6.6 Test `CodeEvaluationProcessor` — stores `planningContextIncluded: true/false` in rawInputs
- [x] 6.7 Test `ZenhubConfigService` — `resolvePlanningContextEnabled()` returns false by default

## Dev Notes

### Architecture Patterns

- **Feature flag pattern**: Follow the existing `SettingsService` pattern used by `ZenhubConfigService` (e.g., `TASK_SYNC_ENABLED` key). The `resolvePlanningContextEnabled()` method follows the same async DB → default pattern.
- **Prompt enrichment pattern**: Follow the `buildDocSystemPromptWithRubric()` pattern where additional context is appended to the user prompt conditionally. For code evaluations, planning context goes in the **user prompt** (not system prompt) since it's contribution-specific data.
- **Provider interface**: `CodeEvaluationInput` already supports optional fields (`commitMessage?`, `pullRequestTitle?`). Adding `planningContext?` follows this pattern.
- **Prompt versioning**: The current `CODE_PROMPT_VERSION = 'code-eval-v1'` is a module-level constant. The v2 version tracks that planning context was included. The system prompt itself does NOT change — only the user prompt is enriched with additional context.
- **Module boundaries**: `CodeEvaluationProcessor` needs `SprintEnrichmentService` from the sprint module. The cleanest approach is to export it from `SprintModule` and import `SprintModule` in `EvaluationModule`.

### Source Tree Components

- `packages/shared/src/types/evaluation.types.ts` — add `PlanningContextEnrichment` interface
- `packages/shared/src/index.ts` — export the new type
- `apps/api/src/modules/evaluation/providers/evaluation-provider.interface.ts` — add `planningContext?` to `CodeEvaluationInput`
- `apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.ts` — extend `buildUserPrompt()`, add v2 prompt version
- `apps/api/src/modules/evaluation/processors/code-evaluation.processor.ts` — inject sprint services, fetch context, build enrichment
- `apps/api/src/modules/evaluation/evaluation.module.ts` — import SprintModule
- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — add planning context feature flag
- `apps/api/src/modules/sprint/sprint.module.ts` — verify exports include SprintEnrichmentService

### Testing Standards

- Vitest with NestJS `Test.createTestingModule()`
- Mock all Prisma methods with `vi.fn()`
- Mock external services (SprintEnrichmentService, ZenhubConfigService) with `vi.fn()`
- Follow existing patterns in `code-evaluation.processor.spec.ts` and `anthropic-evaluation.provider.spec.ts`
- `vi.clearAllMocks()` in `beforeEach`

### Key Constraints

- **ADDITIVE ONLY**: Existing evaluation dimensions MUST NOT change. The planning context is informational context for the AI, not a new scoring dimension.
- **NO NEW DB MIGRATIONS**: All data stored in existing JSON columns (`rawInputs`, `metadata`). No schema changes needed.
- **BACKWARD COMPATIBLE**: All new fields are optional. Existing evaluations without planning context continue to work identically.

### References

- [Source: _bmad-output/planning-artifacts/epics-zenhub-integration.md#Epic 6, Story 6.1]
- [Source: apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.ts — current prompt structure]
- [Source: apps/api/src/modules/evaluation/processors/code-evaluation.processor.ts — evaluation pipeline]
- [Source: apps/api/src/modules/sprint/sprint-enrichment.service.ts — sprint context lookup]
- [Source: apps/api/src/modules/zenhub/zenhub-config.service.ts — feature flag pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 6 tasks completed — shared types, feature flag, provider interface, processor enrichment, module wiring, unit tests
- 132 tests pass across 12 test files (evaluation + zenhub-config), 0 regressions introduced
- 6 pre-existing failures in sprint-planning-reliability and zenhub-alerts/sync-log (unrelated to this story)
- Planning context is additive only — existing 4 evaluation dimensions unchanged
- No DB schema changes required — all data in existing JSON columns (rawInputs)
- Feature flag defaults to `false` — safe for deployment

### File List

- packages/shared/src/types/evaluation.types.ts (modified — added PlanningContextEnrichment)
- packages/shared/src/types/zenhub.types.ts (modified — added planningContextEnabled to config types)
- packages/shared/src/index.ts (modified — export PlanningContextEnrichment)
- apps/api/src/modules/evaluation/providers/evaluation-provider.interface.ts (modified — planningContext? field)
- apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.ts (modified — v2 prompt, buildUserPrompt enrichment)
- apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.spec.ts (modified — 5 new tests)
- apps/api/src/modules/evaluation/processors/code-evaluation.processor.ts (modified — fetchPlanningContext, DI)
- apps/api/src/modules/evaluation/processors/code-evaluation.processor.spec.ts (modified — 7 new tests)
- apps/api/src/modules/evaluation/evaluation.module.ts (modified — import SprintModule, ZenhubModule)
- apps/api/src/modules/zenhub/zenhub-config.service.ts (modified — PLANNING_CONTEXT_ENABLED key, resolve method)
- apps/api/src/modules/zenhub/zenhub-config.service.spec.ts (modified — 3 new tests + updated existing)

### Change Log

- 2026-03-16: Story zh-6.1 implementation complete — planning context enrichment for evaluation prompts
