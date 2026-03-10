# Story 10.4: GDPR Compliance and EU AI Act Documentation

Status: done

## Story

As a contributor,
I want to exercise my data rights (export, deletion),
so that the platform respects my privacy in compliance with GDPR.

As an admin,
I want to generate EU AI Act compliance documentation,
so that the platform meets regulatory requirements for AI-based evaluation systems.

## Acceptance Criteria

1. **Privacy Settings Page** — Given I am an authenticated contributor, when I navigate to `/dashboard/settings/privacy`, then I see data rights options: "Export My Data" and "Request Data Deletion".

2. **GDPR Data Export (FR62)** — Given I click "Export My Data", when the export request is submitted via `POST /api/v1/contributors/me/data-export`, then a data export job is enqueued on BullMQ. The export compiles: profile data, contribution history, evaluation scores and narratives, peer feedback received, publication history, reward data, and audit log entries where I am actor or target. The export is generated as JSON packaged in a downloadable ZIP. I receive a notification when the export is ready (target <24 hours, GDPR max 30 days). The export request is recorded in the audit log.

3. **GDPR Data Deletion with Pseudonymization (FR63, FR64)** — Given I click "Request Data Deletion", when the deletion request is submitted via `POST /api/v1/contributors/me/data-deletion`, then a confirmation dialog explains: personal data will be permanently deleted, contribution records will be pseudonymized (contributor_id replaced with stable pseudonym), and the action is irreversible. Upon confirmation, the request enters a 30-day cooling-off period (cancellable). After the cooling-off period, the system: deletes all PII (name, email, bio, GitHub profile), replaces contributor_id references in evaluation/publication/audit records with a pseudonymized identifier, and revokes all active sessions and tokens. The deletion request and execution are recorded in the audit log with the pseudonymized ID.

4. **EU AI Act Compliance Documentation (FR65)** — Given I am an admin, when I navigate to `/admin/compliance/ai-act`, then I can generate EU AI Act compliance documentation including: (a) Model Card per evaluation model version, (b) Evaluation Criteria Specification from scoring formula and rubric definitions, (c) Human Oversight Report from human review queue statistics, (d) Data Processing Record from audit logs and data flow documentation. Documents include generation timestamp, "Legal review pending" watermark until manually approved, version number, and are stored for audit purposes.

## Tasks / Subtasks

- [x] Task 1: Prisma Schema — New Models (AC: #2, #3, #4)
  - [x]1.1 Add `DataExportRequest` model to `audit` schema in `apps/api/prisma/schema.prisma`: id, contributorId, status (PENDING/PROCESSING/READY/EXPIRED/FAILED), requestedAt, completedAt, expiresAt, downloadUrl, fileName, correlationId, errorMessage. Add indexes on [contributorId, requestedAt], [status].
  - [x]1.2 Add `DataDeletionRequest` model to `audit` schema: id, contributorId, status (PENDING/CONFIRMED/COMPLETED/CANCELLED), requestedAt, coolingOffEndsAt, confirmedAt, completedAt, pseudonymId, correlationId, cancelledAt, cancelReason. Add indexes on [contributorId, requestedAt], [status, coolingOffEndsAt].
  - [x]1.3 Add `ComplianceDocument` model to `audit` schema: id, documentType (MODEL_CARD/EVALUATION_CRITERIA/HUMAN_OVERSIGHT_REPORT/DATA_PROCESSING_RECORD), version, content (Text), format, generatedAt, legalReviewedAt, legalReviewedBy (Uuid), reviewNotes (Text), retiredAt, relatedModelId, correlationId. Add indexes on [documentType, version], [generatedAt].
  - [x]1.4 Add relations: DataExportRequest → Contributor, DataDeletionRequest → Contributor, ComplianceDocument → Contributor (reviewer). Add corresponding relation fields on Contributor model.
  - [x]1.5 Run `npx prisma migrate dev --name add-gdpr-compliance-models` and `npx prisma generate`

- [x] Task 2: Shared Types & Constants (AC: #2, #3, #4)
  - [x]2.1 Add GDPR types to `packages/shared/src/types/admin.types.ts`: `DataExportRequestStatus`, `DataDeletionRequestStatus`, `DataExportRequest`, `DataDeletionRequest`, `ComplianceDocumentType`, `ComplianceDocument`, `ComplianceDocumentListResponse`, `ComplianceDocumentReviewPayload`
  - [x]2.2 Add audit event types to `AUDIT_EVENT_TYPES`: `data.export.completed`, `data.deletion.confirmed`, `data.deletion.completed`, `data.deletion.cancelled`, `compliance.document.generated`, `compliance.document.reviewed`
  - [x]2.3 Add error codes: `DATA_EXPORT_ALREADY_PENDING`, `DATA_EXPORT_NOT_FOUND`, `DATA_DELETION_ALREADY_PENDING`, `DATA_DELETION_NOT_FOUND`, `DATA_DELETION_COOLING_OFF_ACTIVE`, `DATA_DELETION_ALREADY_COMPLETED`, `COMPLIANCE_DOCUMENT_NOT_FOUND`
  - [x]2.4 Export new types from `packages/shared/src/index.ts`

- [x] Task 3: GDPR Compliance Service (AC: #2, #3)
  - [x]3.1 Create `apps/api/src/modules/compliance/gdpr/gdpr.service.ts` — requestExport (create DataExportRequest, enqueue BullMQ job, audit log), getExportStatus, requestDeletion (create DataDeletionRequest with 30-day cooling-off, audit log), confirmDeletion (validate cooling-off expired, generate pseudonymId, enqueue BullMQ job), cancelDeletion (validate still PENDING, update status, audit log)
  - [x]3.2 Create `apps/api/src/modules/compliance/gdpr/gdpr.service.spec.ts` — tests for: export request creation, duplicate export prevention, deletion request creation, cooling-off period validation, deletion confirmation after cooling-off, deletion cancellation, pseudonym generation consistency

- [x] Task 4: Data Export Processor (AC: #2)
  - [x]4.1 Create `apps/api/src/modules/compliance/gdpr/data-export.processor.ts` — BullMQ processor: collect profile data (name, email, bio, domain, roles), contributions, evaluations with scores/narratives, peer feedback, publications with versions, reward data (ContributionScores, TemporalScoreAggregates), audit log entries where actorId or entityId matches. Compile to structured JSON, create ZIP, store with signed download URL (30-day expiry), update DataExportRequest status to READY, send notification, audit log `data.export.completed`.
  - [x]4.2 Create `apps/api/src/modules/compliance/gdpr/data-export.processor.spec.ts` — tests for: data collection from all sources, ZIP creation, status update, notification dispatch, audit logging, error handling

- [x] Task 5: Data Deletion Processor (AC: #3)
  - [x]5.1 Create `apps/api/src/modules/compliance/gdpr/data-deletion.processor.ts` — BullMQ processor (transactional): delete PII from core.contributors (name → null, email → null, bio → null, githubUsername → null, avatarUrl → null), replace contributorId with pseudonymId in evaluation tables (Evaluation, ContributionScore, TemporalScoreAggregate), publication tables (Article authorId/editorId, EditorialFeedback, ArticleVersion), audit.audit_logs (actorId), revoke all sessions, update DataDeletionRequest status to COMPLETED, send final notification, audit log `data.deletion.completed` with pseudonymized actor.
  - [x]5.2 Create `apps/api/src/modules/compliance/gdpr/data-deletion.processor.spec.ts` — tests for: PII deletion, pseudonymization across all tables, session revocation, transaction atomicity, audit logging with pseudonym

- [x] Task 6: EU AI Act Service (AC: #4)
  - [x]6.1 Create `apps/api/src/modules/compliance/eu-ai-act/eu-ai-act.service.ts` — generateModelCard (from EvaluationModel: name, version, provider, config, performance metrics, limitations, human oversight), generateEvaluationCriteria (from EvaluationRubric + ScoringFormulaVersion: rubric questions, scoring weights, domain normalization), generateHumanOversightReport (from EvaluationReview stats: override rate, flag volume, resolution times, decision distribution), generateDataProcessingRecord (from architecture docs: data sources, processing purposes, categories, retention, transfers, subprocessors). Each generates a ComplianceDocument with version, "legal review pending" watermark.
  - [x]6.2 Create `apps/api/src/modules/compliance/eu-ai-act/eu-ai-act.service.spec.ts` — tests for: each document type generation, versioning, watermark inclusion, legal review approval workflow

- [x] Task 7: GDPR Controller — Contributor Endpoints (AC: #1, #2, #3)
  - [x]7.1 Create `apps/api/src/modules/compliance/gdpr/gdpr.controller.ts` — `POST /api/v1/contributors/me/data-export` (JwtAuthGuard, current user), `GET /api/v1/contributors/me/data-export/:requestId` (check ownership), `POST /api/v1/contributors/me/data-deletion` (JwtAuthGuard), `POST /api/v1/contributors/me/data-deletion/:requestId/confirm`, `POST /api/v1/contributors/me/data-deletion/:requestId/cancel`
  - [x]7.2 Create `apps/api/src/modules/compliance/gdpr/gdpr.controller.spec.ts` — tests for: auth guard enforcement, request creation, status retrieval, ownership validation, deletion confirm/cancel flows

- [x] Task 8: EU AI Act Controller — Admin Endpoints (AC: #4)
  - [x]8.1 Create `apps/api/src/modules/compliance/eu-ai-act/eu-ai-act.controller.ts` — `GET /api/v1/admin/compliance/ai-act` (list compliance documents, JwtAuthGuard + AbilityGuard Admin), `POST /api/v1/admin/compliance/ai-act/generate` (generate document by type), `POST /api/v1/admin/compliance/ai-act/:docId/review` (mark as legally reviewed)
  - [x]8.2 Create `apps/api/src/modules/compliance/eu-ai-act/eu-ai-act.controller.spec.ts` — tests for: admin-only access, document listing, generation, review workflow

- [x] Task 9: Update ComplianceModule Registration (AC: #2, #3, #4)
  - [x]9.1 Update `apps/api/src/modules/compliance/compliance.module.ts` — register BullMQ queues (data-export, data-deletion), add GdprService, GdprController, DataExportProcessor, DataDeletionProcessor, EuAiActService, EuAiActController as providers/controllers
  - [x]9.2 Verify ComplianceModule is already globally registered in `apps/api/src/app.module.ts`

- [x] Task 10: Frontend — Privacy Settings Page (AC: #1, #2, #3)
  - [x]10.1 Create `apps/web/hooks/use-gdpr.ts` — TanStack Query hooks: useDataExportRequest (mutation), useDataExportStatus (query), useDataDeletionRequest (mutation), useDataDeletionConfirm (mutation), useDataDeletionCancel (mutation)
  - [x]10.2 Create `apps/web/components/features/privacy/data-export-section.tsx` — "Export My Data" button, export status display, download link when ready
  - [x]10.3 Create `apps/web/components/features/privacy/data-deletion-section.tsx` — "Request Data Deletion" button, confirmation dialog with consequence explanation, cooling-off countdown timer, confirm/cancel buttons
  - [x]10.4 Create `apps/web/app/(dashboard)/dashboard/settings/privacy/page.tsx` — compose privacy settings page with DataExportSection and DataDeletionSection
  - [x]10.5 Create `apps/web/app/(dashboard)/dashboard/settings/privacy/loading.tsx` — skeleton loader

- [x] Task 11: Frontend — Admin Compliance Dashboard (AC: #4)
  - [x]11.1 Create `apps/web/hooks/use-compliance-documents.ts` — TanStack Query hooks: useComplianceDocuments (list query), useGenerateComplianceDocument (mutation), useReviewComplianceDocument (mutation)
  - [x]11.2 Create `apps/web/components/features/admin/compliance/compliance-document-table.tsx` — table with columns: document type, version, generated date, review status (badge: "Legal review pending" / "Reviewed"), actions (view, review)
  - [x]11.3 Create `apps/web/components/features/admin/compliance/compliance-document-generator.tsx` — form to select document type and generate, with progress indicator
  - [x]11.4 Create `apps/web/components/features/admin/compliance/compliance-document-viewer.tsx` — modal/page to view generated document content with watermark display
  - [x]11.5 Create `apps/web/app/(admin)/admin/compliance/page.tsx` — compose compliance dashboard page
  - [x]11.6 Create `apps/web/app/(admin)/admin/compliance/loading.tsx` — skeleton loader

- [x] Task 12: Admin Layout Update (AC: #4)
  - [x]12.1 Update `apps/web/app/(admin)/layout.tsx` — add "Compliance" nav item to `ADMIN_NAV_ITEMS` pointing to `/admin/compliance`

- [x] Task 13: Backend Tests — All Services (AC: #1–#4)
  - [x]13.1 Verify all service/controller spec files pass with `npx vitest run --reporter=verbose` in `apps/api`
  - [x]13.2 Verify no regressions in existing audit/compliance tests
  - [x]13.3 Ensure test coverage for all new services, processors, and controllers

## Dev Notes

### Architecture & Module Structure

**EXTEND existing module**: `apps/api/src/modules/compliance/` — already has `compliance.module.ts` and `audit/` directory from Story 10-3. Add GDPR and EU AI Act sub-modules.

```
apps/api/src/modules/compliance/
├── compliance.module.ts                      # MODIFY — add GDPR + EU AI Act services/controllers/processors
├── audit/
│   ├── audit.service.ts                      # EXISTS — centralized audit logging (from 10-3)
│   └── audit.service.spec.ts                 # EXISTS
├── gdpr/
│   ├── gdpr.controller.ts                    # NEW — contributor data export/deletion endpoints
│   ├── gdpr.controller.spec.ts               # NEW
│   ├── gdpr.service.ts                       # NEW — GDPR orchestration (export/deletion requests)
│   ├── gdpr.service.spec.ts                  # NEW
│   ├── data-export.processor.ts              # NEW — BullMQ job for data export ZIP generation
│   ├── data-export.processor.spec.ts         # NEW
│   ├── data-deletion.processor.ts            # NEW — BullMQ job for PII deletion + pseudonymization
│   └── data-deletion.processor.spec.ts       # NEW
├── eu-ai-act/
│   ├── eu-ai-act.controller.ts               # NEW — admin compliance document endpoints
│   ├── eu-ai-act.controller.spec.ts          # NEW
│   ├── eu-ai-act.service.ts                  # NEW — compliance document generation
│   └── eu-ai-act.service.spec.ts             # NEW
```

### Key Patterns to Follow (from Story 10-3 and existing codebase)

**Controller Pattern:**

```typescript
@Controller({ path: 'contributors/me', version: '1' })
@UseGuards(JwtAuthGuard)
// For admin endpoints:
@Controller({ path: 'admin/compliance/ai-act', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
```

**Response Envelope:**

```typescript
return createSuccessResponse(data, req?.correlationId ?? '', pagination);
```

**Audit Logging:**

```typescript
await this.auditService.log({
  actorId: contributorId,
  action: 'data.export.requested',
  entityType: 'DataExportRequest',
  entityId: exportRequestId,
  reason: 'Contributor initiated GDPR data export',
  correlationId,
});
```

**BullMQ Queue Registration:**

```typescript
BullModule.registerQueue({ name: 'data-export' }, { name: 'data-deletion' });
```

**BullMQ Processor Pattern (follow existing patterns in webhook.processor.ts, reports.processor.ts):**

```typescript
@Processor('data-export')
export class DataExportProcessor extends WorkerHost {
  async process(job: Job<DataExportJobPayload>): Promise<void> { ... }
}
```

**Notification Pattern:**

```typescript
await this.notificationQueue.add('send', {
  contributorId,
  type: 'DATA_EXPORT_READY',
  title: 'Your data export is ready',
  description: 'Download your personal data export.',
  actionUrl: `/dashboard/settings/privacy`,
  category: 'account',
  correlationId,
});
```

### Pseudonymization Strategy

Generate a deterministic pseudonym using SHA-256 hash of contributor UUID + platform salt:

```typescript
const pseudonymId = createHash('sha256')
  .update(`${contributorId}:${PLATFORM_PSEUDONYM_SALT}`)
  .digest('hex')
  .substring(0, 32);
```

Store `PLATFORM_PSEUDONYM_SALT` as environment variable. The pseudonym must be:

- Deterministic (same contributor always gets same pseudonym)
- Irreversible (cannot derive contributor ID from pseudonym)
- Collision-resistant (SHA-256 truncated to 32 hex chars = 128 bits)

### Data Deletion — Transaction Scope

The deletion processor MUST execute all operations within a single Prisma interactive transaction to ensure atomicity:

1. Delete PII from `core.contributors` (set name, email, bio, githubUsername, avatarUrl to null)
2. Update contributor status/role to indicate deleted account
3. Replace contributorId with pseudonymId in all referencing tables
4. Update DataDeletionRequest status to COMPLETED
5. Create audit log entry with pseudonymized actor

If any step fails, the entire transaction rolls back.

### Data Export — Data Sources

The export processor must query across all schemas:

- **core schema**: Contributor profile, Application (admission), Contributions, WorkingGroupMember
- **evaluation schema**: Evaluations, ContributionScores, TemporalScoreAggregates, PeerFeedback (where reviewerId = contributor), EvaluationReview
- **publication schema**: Articles (where authorId = contributor), ArticleVersions, EditorialFeedback
- **audit schema**: AuditLogs (where actorId = contributor OR entityId = contributor)

### EU AI Act — Document Data Sources

- **Model Card**: Query `EvaluationModel` table (from Epic 7) for model metadata, version history, config
- **Evaluation Criteria**: Query `EvaluationRubric` table for rubric questions, `ScoringFormulaVersion` for weights
- **Human Oversight Report**: Aggregate from `EvaluationReview` table — count overrides, calculate resolution times, flag volumes
- **Data Processing Record**: Static template populated with system configuration data

### Frontend Patterns

**Hook Pattern (TanStack Query):**

```typescript
export function useDataExportRequest() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/contributors/me/data-export', { method: 'POST' });
      if (!response.ok) throw new Error('Export request failed');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dataExport'] }),
  });
}
```

**Page Structure:**

```
apps/web/app/(dashboard)/dashboard/settings/privacy/
├── page.tsx          # Privacy settings with export + deletion sections
└── loading.tsx       # Skeleton

apps/web/app/(admin)/admin/compliance/
├── page.tsx          # Compliance document dashboard
└── loading.tsx       # Skeleton
```

### Project Structure Notes

- All new backend files go under `apps/api/src/modules/compliance/` (gdpr/ and eu-ai-act/ subdirectories)
- All new shared types go in `packages/shared/src/types/admin.types.ts` (extend existing file)
- All new error codes go in `packages/shared/src/constants/error-codes.ts` (extend existing file)
- Frontend privacy page goes under dashboard settings (contributor-facing)
- Frontend compliance dashboard goes under admin (admin-facing)
- Follow existing `@@map("snake_case")` and `@@schema("audit")` patterns for new Prisma models

### Cross-Module Dependencies

- **ComplianceModule** (this story extends it) — already globally registered
- **NotificationModule** — for sending export-ready / deletion-completed notifications
- **AuthModule** — for session revocation on data deletion
- **EvaluationModule** — read-only access for export data and AI Act document generation
- **PublicationModule** — read-only access for export data
- **AdminModule** — compliance admin endpoints may be placed here or in compliance module

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 10, Story 10-4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Compliance Module, Data Governance sections]
- [Source: _bmad-output/planning-artifacts/prd.md — FR62, FR63, FR64, FR65, NFR-S6, NFR-S7, NFR-S8]
- [Source: _bmad-output/implementation-artifacts/10-3-immutable-audit-logs.md — Previous story learnings]
- [Source: apps/api/src/modules/compliance/ — Existing compliance module structure]
- [Source: apps/api/src/modules/admin/ — Existing admin module patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed Prisma generate failure: required inline `DATABASE_URL` env var
- Fixed EU AI Act controller: replaced `randomUUID()` with `req?.correlationId` pattern
- Fixed job data field mismatch: service sends `requestId`, processors originally expected `exportRequestId`/`deletionRequestId` — unified to `requestId`
- Fixed processor spec files: updated test job data to use `requestId` field name

### Completion Notes List

- All 42 compliance module tests pass (gdpr.service: 10, gdpr.controller: 5, data-export.processor: 3, data-deletion.processor: 3, eu-ai-act.service: 9, eu-ai-act.controller: 4, audit.service: 8)
- Full regression: 1069/1069 tests pass (1 skipped integration test)
- Prisma schema extended with 3 new models in audit schema + 3 Contributor relations
- BullMQ queues registered: gdpr-export (3 retries, exponential backoff), gdpr-deletion (same)
- SHA-256 pseudonymization with PLATFORM_PSEUDONYM_SALT env var
- 30-day cooling-off period for deletion requests
- EU AI Act: 4 document types with auto-versioning and legal review workflow
- Frontend: privacy settings page (contributor-facing) + compliance dashboard (admin-facing)
- Admin layout updated with "Compliance" nav item

### File List

**New Files (Backend):**

- `apps/api/src/modules/compliance/gdpr/gdpr.service.ts`
- `apps/api/src/modules/compliance/gdpr/gdpr.service.spec.ts`
- `apps/api/src/modules/compliance/gdpr/gdpr.controller.ts`
- `apps/api/src/modules/compliance/gdpr/gdpr.controller.spec.ts`
- `apps/api/src/modules/compliance/gdpr/data-export.processor.ts`
- `apps/api/src/modules/compliance/gdpr/data-export.processor.spec.ts`
- `apps/api/src/modules/compliance/gdpr/data-deletion.processor.ts`
- `apps/api/src/modules/compliance/gdpr/data-deletion.processor.spec.ts`
- `apps/api/src/modules/compliance/eu-ai-act/eu-ai-act.service.ts`
- `apps/api/src/modules/compliance/eu-ai-act/eu-ai-act.service.spec.ts`
- `apps/api/src/modules/compliance/eu-ai-act/eu-ai-act.controller.ts`
- `apps/api/src/modules/compliance/eu-ai-act/eu-ai-act.controller.spec.ts`

**New Files (Frontend):**

- `apps/web/hooks/use-gdpr.ts`
- `apps/web/hooks/use-compliance-documents.ts`
- `apps/web/components/features/privacy/data-export-section.tsx`
- `apps/web/components/features/privacy/data-deletion-section.tsx`
- `apps/web/components/features/admin/compliance/compliance-document-table.tsx`
- `apps/web/components/features/admin/compliance/compliance-document-generator.tsx`
- `apps/web/app/(dashboard)/dashboard/settings/privacy/page.tsx`
- `apps/web/app/(dashboard)/dashboard/settings/privacy/loading.tsx`
- `apps/web/app/(admin)/admin/compliance/page.tsx`
- `apps/web/app/(admin)/admin/compliance/loading.tsx`

**Modified Files:**

- `apps/api/prisma/schema.prisma` — Added DataExportRequest, DataDeletionRequest, ComplianceDocument models + Contributor relations
- `apps/api/src/modules/compliance/compliance.module.ts` — Registered BullMQ queues, GDPR + EU AI Act controllers/providers
- `packages/shared/src/types/admin.types.ts` — Added GDPR + compliance types and audit event types
- `packages/shared/src/constants/error-codes.ts` — Added 7 GDPR/compliance error codes
- `packages/shared/src/index.ts` — Added exports for new types
- `apps/web/app/(admin)/layout.tsx` — Added "Compliance" nav item
