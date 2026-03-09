# Story 7.2: Documentation Evaluation & Model Versioning

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a contributor who submits documentation,
I want my documentation to be evaluated with appropriate criteria,
so that I receive feedback specific to the quality dimensions that matter for written work.

## Acceptance Criteria (BDD)

### AC1: Documentation Evaluation Processing

**Given** a normalized contribution of type DOCUMENTATION exists in the system
**When** a documentation evaluation job is dequeued by the `doc-evaluation` processor
**Then** it evaluates three dimensions using a configurable rubric: structural completeness (required sections present for the document type), readability (Flesch-Kincaid grade level within target range per document type, as specified in FR22), and reference integrity (valid links and citations — no broken URLs, no orphaned references)
**And** each dimension produces a sub-score on a 0-100 scale
**And** the composite score follows the same formula as code evaluation (FR58) with documentation-specific weights
**And** processing completes within 15 minutes for documentation evaluations (NFR-P6)

### AC2: Configurable Documentation Rubric

**Given** the documentation evaluation rubric is configurable
**When** an admin updates rubric parameters (target Flesch-Kincaid range, required sections per document type)
**Then** the updated rubric is versioned and applied to subsequent evaluations
**And** existing evaluations retain the rubric version that was active when they were scored

### AC3: Model Version Tracking

**Given** the evaluation engine uses AI models
**When** any evaluation (code or documentation) is performed
**Then** the evaluation record includes the model version identifier that produced the score (FR26)
**And** the model version is stored in a versioning registry with: versionId, modelType, deployedAt, configurationHash, and status (active/deprecated/retired)

### AC4: Admin Model Registry View

**Given** an admin views the evaluation model registry
**When** they navigate to /admin/evaluations/models
**Then** they see all model versions with deployment dates, evaluation counts, and status
**And** they can compare performance metrics between model versions (average scores, variance, human agreement rate)

### AC5: Model Version Deployment

**Given** a new model version is deployed
**When** it replaces or supplements an existing version
**Then** the registry records the transition with a timestamp
**And** all subsequent evaluations reference the new model version
**And** previous evaluations retain their original model version reference — scores are never retroactively changed

### AC6: Dispatch Routing for Documentation

**Given** a contribution of type DOCUMENTATION is ingested
**When** the evaluation dispatch processor routes the job
**Then** it enqueues to the `doc-evaluation` queue (not the `code-evaluation` queue)
**And** the job payload includes the same fields as code evaluation (contributionId, contributionType, contributorId, normalized artifact data, correlationId)

## Tasks / Subtasks

- [x] Task 1: Documentation Evaluation Processor (AC: #1, #6)
  - [x] 1.1 Register `doc-evaluation` BullMQ queue in EvaluationModule with 3 retries, 10s exponential backoff
  - [x] 1.2 Create `DocEvaluationProcessor` (`processors/doc-evaluation.processor.ts`) extending WorkerHost
  - [x] 1.3 Implement doc evaluation input builder — extract document content, metadata, type from contribution
  - [x] 1.4 Implement composite score calculation with doc-specific weights (DEFAULT_DOC_WEIGHTS)
  - [x] 1.5 Update `EvaluationDispatchProcessor` to route DOCUMENTATION contributions to `doc-evaluation` queue
  - [x] 1.6 Emit `evaluation.score.completed` event on success, set FAILED status on error
  - [x] 1.7 Cache results in Redis with same TTL pattern as code evaluation
  - [x] 1.8 Write unit tests for DocEvaluationProcessor

- [x] Task 2: Documentation Evaluation Provider (AC: #1)
  - [x] 2.1 Add `evaluateDocumentation(input)` method to EvaluationProvider interface
  - [x] 2.2 Define `DocEvaluationInput` and `DocEvaluationOutput` types in provider interface
  - [x] 2.3 Implement `evaluateDocumentation()` in AnthropicEvaluationProvider with doc-specific prompt
  - [x] 2.4 Prompt must evaluate 3 dimensions: structuralCompleteness, readability, referenceIntegrity
  - [x] 2.5 Write unit tests for the provider with mocked Anthropic SDK

- [x] Task 3: Shared Types & Constants (AC: #1, #2)
  - [x] 3.1 Add `DocEvaluationDimensionKey` type: 'structuralCompleteness' | 'readability' | 'referenceIntegrity'
  - [x] 3.2 Add `DEFAULT_DOC_WEIGHTS` constant: { structuralCompleteness: 0.35, readability: 0.35, referenceIntegrity: 0.30 }
  - [x] 3.3 Add `EvaluationRubricDto` type for configurable rubric parameters
  - [x] 3.4 Add `EvaluationModelVersionDto` type for admin model registry
  - [x] 3.5 Update `EvaluationDimensionKey` to be a union of code + doc dimensions (or keep separate)

- [x] Task 4: Configurable Rubric System (AC: #2)
  - [x] 4.1 Add `evaluation_rubrics` table in Prisma schema (evaluation schema) with: id, evaluationType, parameters (JSON), version, createdAt, isActive
  - [x] 4.2 Create `EvaluationRubricService` to manage rubric CRUD and versioning
  - [x] 4.3 Create admin endpoint `PATCH /api/v1/admin/evaluations/rubrics` to update rubric parameters
  - [x] 4.4 Create admin endpoint `GET /api/v1/admin/evaluations/rubrics` to list rubric versions
  - [x] 4.5 Ensure DocEvaluationProcessor reads active rubric and passes parameters to provider
  - [x] 4.6 Store rubric version ID on evaluation record (add `rubricId` field to Evaluation model)
  - [x] 4.7 Run Prisma migration
  - [x] 4.8 Write unit tests for rubric service

- [x] Task 5: Enhanced Model Registry & Admin API (AC: #3, #4, #5)
  - [x] 5.1 Add `configurationHash` and `deployedAt` columns to `evaluation_models` table
  - [x] 5.2 Create `EvaluationAdminController` with route prefix `admin/evaluations`
  - [x] 5.3 Implement `GET /api/v1/admin/evaluations/models` — list all model versions with evaluation counts
  - [x] 5.4 Implement `GET /api/v1/admin/evaluations/models/:id/metrics` — performance metrics (avg score, variance, count)
  - [x] 5.5 Implement `POST /api/v1/admin/evaluations/models` — register new model version
  - [x] 5.6 Implement `PATCH /api/v1/admin/evaluations/models/:id` — update model status (deprecate/retire)
  - [x] 5.7 Add model transition logging (record when new version replaces old)
  - [x] 5.8 Add ADMIN role guard on all admin endpoints
  - [x] 5.9 Run Prisma migration
  - [x] 5.10 Write unit tests for admin controller and service methods

- [x] Task 6: Admin Frontend — Model Registry (AC: #4)
  - [x] 6.1 Create route `apps/web/app/(admin)/evaluations/models/page.tsx`
  - [x] 6.2 Create `ModelRegistryList` component showing all model versions with deployment dates, counts, status badges
  - [x] 6.3 Create `ModelMetricsComparison` component for side-by-side metrics
  - [x] 6.4 Create `useEvaluationModels` hook with TanStack Query
  - [x] 6.5 Add navigation link in admin sidebar
  - [x] 6.6 Write component tests

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Two-Stage Queue Pattern (established in Story 7-1):**

1. `evaluation-dispatch` queue receives all evaluation jobs
2. `EvaluationDispatchProcessor` routes to type-specific queue (`code-evaluation` or `doc-evaluation`)
3. Type-specific processor handles evaluation logic

**Provider Interface Pattern:**

- `EvaluationProvider` interface defines contract — extend with `evaluateDocumentation()` method
- `AnthropicEvaluationProvider` is the concrete implementation — add doc evaluation alongside code
- DI token: `EVALUATION_PROVIDER` (already registered)

**Composite Score Formula (reuse from Story 7-1):**

```
compositeScore = min(100, round(
  Σ(dimensionWeight × dimensionScore) ×
  taskComplexityMultiplier ×
  domainNormalizationFactor
))
```

- Complexity multiplier for docs: based on document length/sections instead of file count
- Domain normalization: 1.0 (same as code, for now)

**Event Pattern:**

- Emit `evaluation.score.completed` on success (same event as code evaluation)
- Event payload includes `contributionType` field so consumers distinguish code vs doc

### Existing Code to Extend (DO NOT Recreate)

| What                | File                                            | Action                                                       |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| Dispatch routing    | `processors/evaluation-dispatch.processor.ts`   | Add `DOCUMENTATION` → `doc-evaluation` queue routing         |
| Provider interface  | `providers/evaluation-provider.interface.ts`    | Add `evaluateDocumentation()` method signature + types       |
| Anthropic provider  | `providers/anthropic-evaluation.provider.ts`    | Implement `evaluateDocumentation()` with doc-specific prompt |
| Model registry      | `models/evaluation-model.registry.ts`           | Already supports `type: 'documentation'` prefix lookup       |
| Module registration | `evaluation.module.ts`                          | Register `doc-evaluation` queue + processor                  |
| Shared types        | `packages/shared/src/types/evaluation.types.ts` | Add doc dimension types, rubric types, model admin types     |
| Shared constants    | `packages/shared/src/constants/evaluation.ts`   | Add `DEFAULT_DOC_WEIGHTS`, `DOC_FORMULA_VERSION`             |
| Evaluation service  | `evaluation.service.ts`                         | No changes needed — dispatch already handles all types       |
| Controller          | `evaluation.controller.ts`                      | No changes needed — endpoints are type-agnostic              |

### New Files to Create

| File                                                                         | Purpose                                |
| ---------------------------------------------------------------------------- | -------------------------------------- |
| `processors/doc-evaluation.processor.ts`                                     | Documentation evaluation job processor |
| `processors/doc-evaluation.processor.spec.ts`                                | Unit tests                             |
| `services/evaluation-rubric.service.ts`                                      | Rubric CRUD and versioning             |
| `services/evaluation-rubric.service.spec.ts`                                 | Unit tests                             |
| `controllers/evaluation-admin.controller.ts`                                 | Admin API endpoints (models + rubrics) |
| `controllers/evaluation-admin.controller.spec.ts`                            | Unit tests                             |
| `dto/create-model-version.dto.ts`                                            | DTO for registering new model          |
| `dto/update-model-status.dto.ts`                                             | DTO for deprecating/retiring model     |
| `dto/update-rubric.dto.ts`                                                   | DTO for updating rubric parameters     |
| `apps/web/app/(admin)/evaluations/models/page.tsx`                           | Admin model registry page              |
| `apps/web/components/features/evaluation/admin/model-registry-list.tsx`      | Model list component                   |
| `apps/web/components/features/evaluation/admin/model-metrics-comparison.tsx` | Metrics comparison                     |
| `apps/web/hooks/use-evaluation-models.ts`                                    | TanStack Query hook                    |

### Documentation Evaluation Prompt Design

The doc evaluation prompt must instruct the AI to evaluate three dimensions:

1. **Structural Completeness (35%)** — Are required sections present for the document type? Evaluates: table of contents, introduction, main sections, conclusion, references section. Score 0-100.

2. **Readability (35%)** — Is the document written at an appropriate reading level? Evaluates: Flesch-Kincaid grade level relative to target range, sentence length variation, paragraph structure, jargon density. Score 0-100.

3. **Reference Integrity (30%)** — Are links and citations valid? Evaluates: URL validity (no broken links), citation completeness, internal cross-reference accuracy, no orphaned references. Score 0-100.

The prompt should output structured JSON matching `DocEvaluationOutput` format with scores, explanations, and narrative — same pattern as code evaluation.

### Rubric Parameters Schema (JSON stored in evaluation_rubrics table)

```json
{
  "documentType": "README",
  "targetFleschKincaidRange": { "min": 30, "max": 60 },
  "requiredSections": ["Introduction", "Installation", "Usage", "API", "Contributing"],
  "maxSentenceLength": 35,
  "maxParagraphLength": 200
}
```

### Database Changes

**New table: `evaluation_rubrics`**

```prisma
model EvaluationRubric {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  evaluationType String   @map("evaluation_type")  // 'DOCUMENTATION'
  documentType   String?  @map("document_type")    // 'README', 'API_DOC', 'GUIDE', null=default
  parameters     Json                               // Rubric config JSON
  version        String                             // Semver like 'v1.0.0'
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")

  evaluations    Evaluation[]

  @@index([evaluationType, isActive], map: "idx_rubrics_type_active")
  @@map("evaluation_rubrics")
  @@schema("evaluation")
}
```

**Modified table: `evaluation_models`** — add columns:

```prisma
  configHash   String?   @map("config_hash")     // SHA-256 of model config JSON
  deployedAt   DateTime? @map("deployed_at")      // When model was activated
  retiredAt    DateTime? @map("retired_at")       // When model was retired
```

**Modified table: `evaluations`** — add column:

```prisma
  rubricId     String?   @map("rubric_id") @db.Uuid
  rubric       EvaluationRubric? @relation(fields: [rubricId], references: [id])
```

### Testing Requirements

**Unit Tests (Vitest):**

- `doc-evaluation.processor.spec.ts` — Mock Prisma, provider, Redis; test evaluation flow, error handling, score computation
- `evaluation-rubric.service.spec.ts` — Mock Prisma; test CRUD, versioning, active rubric retrieval
- `evaluation-admin.controller.spec.ts` — Mock service; test all admin endpoints, authorization guards
- `anthropic-evaluation.provider.spec.ts` — Add tests for `evaluateDocumentation()` method

**Test Patterns (from Story 7-1):**

```typescript
const mockPrisma = {
  evaluation: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  evaluationModel: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  evaluationRubric: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
};
```

### Performance Requirements

| Operation                 | Target        | Strategy                              |
| ------------------------- | ------------- | ------------------------------------- |
| Doc evaluation end-to-end | < 15 minutes  | Async BullMQ, Anthropic API call      |
| Model registry list       | < 500ms (p95) | Indexed query + response caching      |
| Rubric lookup             | < 100ms       | Indexed by (evaluationType, isActive) |
| Admin metrics computation | < 2s          | Aggregate query with model_id filter  |

### Security Requirements

- All admin endpoints require ADMIN role via `@CheckAbility()` decorator
- Model version changes logged to audit trail
- Rubric changes logged to audit trail
- Evaluation scores are immutable once COMPLETED — no retroactive changes

### Project Structure Notes

- All new files follow existing module structure under `apps/api/src/modules/evaluation/`
- Admin controller goes in `controllers/` subfolder (new pattern — or at module root with admin prefix)
- Frontend admin pages follow `(admin)/` route group pattern established in earlier epics
- Shared types added to existing `packages/shared/src/types/evaluation.types.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2 — lines 1315-1350]
- [Source: _bmad-output/planning-artifacts/architecture.md — Evaluation schema, BullMQ patterns, API patterns]
- [Source: _bmad-output/implementation-artifacts/7-1-evaluation-pipeline-and-code-evaluation.md — Full Story 7-1 context]
- [Source: apps/api/src/modules/evaluation/ — Existing evaluation module code]
- [Source: packages/shared/src/constants/evaluation.ts — Scoring weights and constants]
- [Source: packages/shared/src/types/evaluation.types.ts — Shared type definitions]

### Previous Story Intelligence (7-1)

**Patterns established:**

- Two-stage queue dispatch pattern works well — replicate for docs
- AnthropicEvaluationProvider with structured JSON output parsing is reliable
- Complexity multiplier logic should be adapted for document size (word count, section count) instead of file count/lines
- Redis caching with `evaluation:{contributionId}` key pattern — reuse as-is
- Event emission via `EventEmitter2` — same event name, type-discriminated payload
- Audit log pattern: create audit entry in same transaction as evaluation update

**Issues to avoid:**

- Model registry `getActiveModel()` already handles 'documentation' type via `doc-evaluator` prefix — verify seed data includes doc-evaluator model
- Ensure Prisma migration handles cross-schema relations correctly (evaluation schema → evaluation schema for rubric FK)
- When extending `EvaluationProvider` interface, keep backward compatibility — `evaluateDocumentation()` is a new method, not a change to `evaluateCode()`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Prisma migration P3006 shadow database issue — resolved with manual migration SQL + `migrate deploy`
- CaslAbilityFactory missing in admin controller test — resolved by adding mock provider
- Provider `promptVersion` getter renamed to `codePromptVersion` — test updated accordingly
- Prettier formatting violations on 4 files — auto-fixed with `npx prettier --write`

### Completion Notes List

- All 6 tasks completed across backend, shared types, database, and frontend
- 1044 total tests pass (717 API + 327 web, 0 regressions)
- Linting and Prettier formatting pass clean
- Manual Prisma migration created and deployed successfully
- Two-stage queue dispatch pattern extended for DOCUMENTATION contributions
- Rubric system designed as optional (null rubric handled gracefully)
- Admin endpoints fully guarded with CASL RBAC + audit logging

### Code Review Fixes Applied

- Added 5 `evaluateDocumentation()` unit tests in provider spec (C1 — missing test coverage)
- Added 8 frontend component tests: model-registry-list (4) + model-metrics-comparison (4) (C2 — missing tests)
- Moved audit log creation inside rubric service transaction (M1 — transaction consistency)
- Removed redundant content truncation from provider (M2 — double truncation)
- DocEvaluationProcessor now passes documentType to rubric lookup (M3 — correct rubric selection)
- Added `@CurrentUser()` to `getModelMetrics` for audit logging consistency (L1)
- Fixed rubric lookup to explicitly filter `documentType: null` when not provided (L2 — ambiguous filter)

### File List

**New Files:**

- `apps/api/src/modules/evaluation/processors/doc-evaluation.processor.ts`
- `apps/api/src/modules/evaluation/processors/doc-evaluation.processor.spec.ts`
- `apps/api/src/modules/evaluation/services/evaluation-rubric.service.ts`
- `apps/api/src/modules/evaluation/services/evaluation-rubric.service.spec.ts`
- `apps/api/src/modules/evaluation/controllers/evaluation-admin.controller.ts`
- `apps/api/src/modules/evaluation/controllers/evaluation-admin.controller.spec.ts`
- `apps/api/prisma/migrations/20260309600000_add_doc_evaluation_rubrics_model_versioning/migration.sql`
- `apps/web/app/(admin)/evaluations/models/page.tsx`
- `apps/web/components/features/evaluation/admin/model-registry-list.tsx`
- `apps/web/components/features/evaluation/admin/model-metrics-comparison.tsx`
- `apps/web/hooks/use-evaluation-models.ts`
- `apps/web/components/features/evaluation/admin/model-registry-list.test.tsx`
- `apps/web/components/features/evaluation/admin/model-metrics-comparison.test.tsx`

**Modified Files:**

- `packages/shared/src/types/evaluation.types.ts` — Added DocEvaluationDimensionKey, AllEvaluationDimensionKey, EvaluationRubricDto, EvaluationRubricParameters, EvaluationModelVersionDto, EvaluationModelMetricsDto
- `packages/shared/src/constants/evaluation.ts` — Added DEFAULT_DOC_WEIGHTS, DOC_FORMULA_VERSION, MAX_DOC_CONTENT_LENGTH
- `packages/shared/src/constants/error-codes.ts` — Added EVALUATION_MODEL_NOT_FOUND, EVALUATION_RUBRIC_NOT_FOUND
- `packages/shared/src/index.ts` — Updated exports
- `apps/api/src/modules/evaluation/providers/evaluation-provider.interface.ts` — Added DocEvaluationInput, DocEvaluationOutput, evaluateDocumentation()
- `apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.ts` — Implemented evaluateDocumentation(), doc-specific prompt, renamed promptVersion → codePromptVersion
- `apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.spec.ts` — Updated promptVersion tests, added docPromptVersion test
- `apps/api/src/modules/evaluation/processors/evaluation-dispatch.processor.ts` — Added DOCUMENTATION → doc-evaluation routing
- `apps/api/src/modules/evaluation/processors/evaluation-dispatch.processor.spec.ts` — Updated routing tests
- `apps/api/src/modules/evaluation/evaluation.service.ts` — Added contribution.documentation.ingested event handler
- `apps/api/src/modules/evaluation/evaluation.module.ts` — Registered doc-evaluation queue, processor, rubric service, admin controller
- `apps/api/prisma/schema.prisma` — Added DOCUMENTATION enum, EvaluationRubric model, EvaluationModel columns, rubricId FK
- `apps/web/app/(admin)/layout.tsx` — Added Evaluations nav link
