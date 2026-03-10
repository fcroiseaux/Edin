# Story 10.3: Immutable Audit Logs

Status: done

## Story

As an admin,
I want an immutable audit trail of all security-relevant actions,
so that I can maintain regulatory compliance and contributor trust through full transparency.

## Acceptance Criteria

1. **Immutable Audit Log Entries** — When a security-relevant action occurs (admission decision, evaluation output, role change, governance action, content moderation, platform settings change, data access request), an immutable audit log entry is created in the `audit` schema (FR52) with: eventType, actorId, actorRole, targetId, targetType, action, previousState, newState, reason, correlationId, and timestamp. Audit log entries are append-only — no update or delete operations are permitted. 100% of security-relevant events are covered (NFR-S6).

2. **PII Separation** — Contributor PII (name, email, GitHub profile) stays in the `core` schema. Evaluation and publication schemas contain no directly identifiable data beyond contributor_id. Audit log entries reference contributor_id, not PII fields directly (FR64).

3. **Admin Audit Log Viewer** — Route: `/admin/audit-logs` (NEW page). Displays audit log entries with: timestamp, event type, actor, action summary, and target. Searchable by: event type, actor, target, date range, and correlationId. Search results return within 10 seconds (NFR-S6). Uses cursor-based pagination.

4. **Retention Policy** — Audit logs are retained for a minimum of 2 years (NFR-S6). Logs older than the retention period are archived (not deleted). For MVP, retention enforcement is documented but not automated (no cold storage migration yet).

5. **Centralized Audit Service** — A dedicated `AuditService` in the compliance module provides a single entry point for creating audit entries. All existing `prisma.auditLog.create()` calls across the codebase are migrated to use this service, ensuring consistent field population and immutability enforcement.

## Tasks / Subtasks

- [x] Task 1: Enhance AuditLog Prisma Model (AC: #1, #2)
  - [x] 1.1 Add columns to `AuditLog` model in `apps/api/prisma/schema.prisma`: `actorRole` (String?), `previousState` (Json?), `newState` (Json?), `reason` (String?)
  - [x] 1.2 Add `@@index([createdAt])` and `@@index([action])` and `@@index([entityId])` for query performance (NFR-S6: <10s search)
  - [x] 1.3 Run `npx prisma migrate dev --name add-audit-log-enhanced-fields` to generate migration
  - [x] 1.4 Run `npx prisma generate` to update the Prisma client

- [x] Task 2: Shared Types & Constants (AC: #1, #3)
  - [x] 2.1 Add `AuditLogEntry`, `AuditLogFilters`, `AuditLogListResponse`, `AuditEventType` types to `packages/shared/src/types/admin.types.ts`
  - [x] 2.2 Add `AUDIT_EVENT_TYPES` constant with all tracked event types to `packages/shared/src/types/admin.types.ts`
  - [x] 2.3 Add `ADMIN_AUDIT_LOG_NOT_FOUND`, `ADMIN_AUDIT_QUERY_TIMEOUT` error codes to `packages/shared/src/constants/error-codes.ts`
  - [x] 2.4 Export new types from `packages/shared/src/index.ts`

- [x] Task 3: Compliance Module & Audit Service (AC: #1, #5)
  - [x] 3.1 Create `apps/api/src/modules/compliance/compliance.module.ts` — register AuditService, export for use by other modules
  - [x] 3.2 Create `apps/api/src/modules/compliance/audit/audit.service.ts` — centralized audit entry creation with field validation, immutability enforcement (blocks update/delete), and structured event types
  - [x] 3.3 Register `ComplianceModule` in `apps/api/src/app.module.ts` as a global module
  - [x] 3.4 Create `apps/api/src/modules/compliance/audit/audit.service.spec.ts` — tests for entry creation, field validation, immutability blocking

- [x] Task 4: Audit Log Query API (AC: #3, #4)
  - [x] 4.1 Create `apps/api/src/modules/admin/audit-logs.controller.ts` — `GET /api/v1/admin/audit-logs` with query params: eventType, actorId, targetId, startDate, endDate, correlationId, cursor, limit
  - [x] 4.2 Create `apps/api/src/modules/admin/audit-logs.service.ts` — Prisma query with dynamic WHERE, cursor-based pagination, date range filtering, 10-second query timeout
  - [x] 4.3 Register controller and service in `apps/api/src/modules/admin/admin.module.ts`

- [x] Task 5: Migrate Existing Audit Log Calls (AC: #5)
  - [x] 5.1 Update `apps/api/src/modules/contributor/contributor.service.ts` — replace `prisma.auditLog.create()` calls with `auditService.log()`, inject AuditService
  - [x] 5.2 Update `apps/api/src/modules/admission/admission.service.ts` — replace direct audit calls with AuditService
  - [x] 5.3 Update `apps/api/src/modules/settings/settings.service.ts` — replace direct audit calls with AuditService
  - [x] 5.4 Update `apps/api/src/modules/evaluation/evaluation.service.ts` — replace direct audit calls
  - [x] 5.5 Update `apps/api/src/modules/evaluation/services/evaluation-review.service.ts` — replace direct audit calls
  - [x] 5.6 Update `apps/api/src/modules/publication/moderation.service.ts` — replace direct audit calls
  - [x] 5.7 Update `apps/api/src/modules/working-group/working-group.service.ts` — replace direct audit calls
  - [x] 5.8 Update `apps/api/src/modules/ingestion/ingestion.service.ts` — replace direct audit calls
  - [x] 5.9 Update `apps/api/src/modules/ingestion/services/collaboration-detection.service.ts` — replace direct audit calls
  - [x] 5.10 Update `apps/api/src/modules/feedback/feedback.service.ts` — replace direct audit calls
  - [x] 5.11 Update `apps/api/src/modules/auth/auth.service.ts` — replace direct audit calls
  - [x] 5.12 Update `apps/api/src/modules/reward/scoring-formula.service.ts` — replace direct audit calls
  - [x] 5.13 Update all corresponding `.spec.ts` files to mock `AuditService` instead of `prisma.auditLog`

- [x] Task 6: Backend Tests (AC: #1, #3, #4, #5)
  - [x] 6.1 Create `apps/api/src/modules/compliance/audit/audit.service.spec.ts` — 8 tests: entry creation with all fields, actorRole population, previousState/newState, immutability (update blocked, delete blocked), correlationId, null actor for system events
  - [x] 6.2 Create `apps/api/src/modules/admin/audit-logs.controller.spec.ts` — 5 tests: auth guard, ability guard, query params, response format, pagination
  - [x] 6.3 Create `apps/api/src/modules/admin/audit-logs.service.spec.ts` — 12 tests: filter by eventType, filter by actorId, date range, correlationId search, cursor pagination, empty results, limit cap, combined filters

- [x] Task 7: Frontend — Audit Log Viewer (AC: #3)
  - [x] 7.1 Create `apps/web/components/features/admin/audit-logs/audit-log-table.tsx` — table with columns: timestamp, event type (badge), actor name, action, target, details expandable
  - [x] 7.2 Create `apps/web/components/features/admin/audit-logs/audit-log-filters.tsx` — filter bar with: event type dropdown, date range inputs, actor search, correlationId input
  - [x] 7.3 Create `apps/web/hooks/use-audit-logs.ts` — TanStack Query hook for audit log list with filters and cursor pagination
  - [x] 7.4 Create `apps/web/app/(admin)/admin/audit-logs/page.tsx` — compose audit log viewer page
  - [x] 7.5 Create `apps/web/app/(admin)/admin/audit-logs/loading.tsx` — skeleton loader

- [x] Task 8: Admin Layout Update (AC: #3)
  - [x] 8.1 Update `apps/web/app/(admin)/layout.tsx` — add "Audit Logs" nav item to `ADMIN_NAV_ITEMS`

## Dev Notes

### Architecture & Module Structure

**NEW module**: `apps/api/src/modules/compliance/` — the compliance module does NOT exist yet. Create it from scratch. Per architecture spec, this module owns the `audit` schema tables.

```
apps/api/src/modules/compliance/
├── compliance.module.ts                  # NEW — register AuditService, export globally
└── audit/
    ├── audit.service.ts                  # NEW — centralized audit logging service
    └── audit.service.spec.ts             # NEW
```

**EXTEND existing module**: `apps/api/src/modules/admin/` — add audit log query controller and service.

```
apps/api/src/modules/admin/
├── admin.module.ts                       # MODIFY — add audit-logs controller/service, import ComplianceModule
├── audit-logs.controller.ts              # NEW — GET /api/v1/admin/audit-logs
├── audit-logs.controller.spec.ts         # NEW
├── audit-logs.service.ts                 # NEW — query service with filters/pagination
├── audit-logs.service.spec.ts            # NEW
├── health-metrics.controller.ts          # EXISTS
├── health-metrics.service.ts             # EXISTS
├── alerts.service.ts                     # EXISTS
├── reports.controller.ts                 # EXISTS
├── reports.service.ts                    # EXISTS
├── reports.processor.ts                  # EXISTS
├── contributors.controller.ts            # EXISTS
├── contributors.service.ts               # EXISTS
├── settings.controller.ts                # EXISTS
└── settings-admin.service.ts             # EXISTS
```

**Frontend new components**:

```
apps/web/components/features/admin/
└── audit-logs/
    ├── audit-log-table.tsx               # NEW — audit log data table
    └── audit-log-filters.tsx             # NEW — filter bar (event type, date range, actor, correlation)
```

**Pages**:

```
apps/web/app/(admin)/
├── admin/
│   ├── audit-logs/
│   │   ├── page.tsx                      # NEW — audit log viewer
│   │   └── loading.tsx                   # NEW — skeleton loader
│   └── layout.tsx                        # MODIFY — add Audit Logs nav item
```

**New hooks**:

```
apps/web/hooks/
└── use-audit-logs.ts                     # NEW — TanStack Query hook for audit log queries
```

**MODIFY existing services** (Task 5 — migration to centralized AuditService):

```
apps/api/src/modules/contributor/contributor.service.ts      # MODIFY — inject AuditService
apps/api/src/modules/admission/admission.service.ts          # MODIFY — inject AuditService
apps/api/src/modules/settings/settings.service.ts            # MODIFY — inject AuditService
apps/api/src/modules/evaluation/evaluation.service.ts        # MODIFY — inject AuditService
apps/api/src/modules/evaluation/services/evaluation-review.service.ts  # MODIFY
apps/api/src/modules/publication/moderation.service.ts       # MODIFY — inject AuditService
apps/api/src/modules/working-group/working-group.service.ts  # MODIFY — inject AuditService
apps/api/src/modules/ingestion/ingestion.service.ts          # MODIFY — inject AuditService
apps/api/src/modules/ingestion/services/collaboration-detection.service.ts  # MODIFY
apps/api/src/modules/feedback/feedback.service.ts            # MODIFY — inject AuditService
apps/api/src/modules/auth/auth.service.ts                    # MODIFY — inject AuditService
apps/api/src/modules/reward/scoring-formula.service.ts       # MODIFY — inject AuditService
```

### Prisma Schema Enhancement — CRITICAL

The current `AuditLog` model is missing fields required by FR52. Enhance it:

```prisma
model AuditLog {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  actorId       String?  @map("actor_id") @db.Uuid
  actorRole     String?  @map("actor_role")          // NEW — actor's role at time of action
  action        String                                 // eventType (e.g., "ROLE_CHANGED", "admission.approved")
  entityType    String   @map("entity_type")           // targetType
  entityId      String   @map("entity_id")             // targetId
  details       Json?                                  // backward compat — existing usage
  previousState Json?    @map("previous_state")        // NEW — state before action
  newState      Json?    @map("new_state")             // NEW — state after action
  reason        String?                                // NEW — human-readable reason
  correlationId String?  @map("correlation_id")
  createdAt     DateTime @default(now()) @map("created_at")

  actor         Contributor? @relation(fields: [actorId], references: [id])

  @@index([createdAt])                                 // NEW — for date range queries
  @@index([action])                                    // NEW — for event type filtering
  @@index([entityId])                                  // NEW — for target lookups
  @@index([actorId])                                   // NEW — for actor filtering
  @@index([correlationId])                             // NEW — for correlation lookups
  @@map("audit_logs")
  @@schema("audit")
}
```

**IMPORTANT**: The `details` column remains for backward compatibility. Existing entries have structured data in `details`. New entries will populate `previousState`, `newState`, `reason` as separate columns AND optionally still populate `details` for any additional context.

**Migration approach**: Additive only — new nullable columns. No data migration needed. Old entries retain their data in `details`. New entries use the new columns.

### Centralized AuditService — Core Design

The `AuditService` is the **single entry point** for all audit logging. It guarantees:

1. All required fields are populated consistently
2. `actorRole` is automatically resolved from the actor's current role
3. Immutability is enforced — no update/delete exposed
4. Structured event types for queryability

```typescript
// apps/api/src/modules/compliance/audit/audit.service.ts
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorId: string | null;
    actorRole?: string; // If not provided, resolve from DB
    action: string;
    entityType: string;
    entityId: string;
    previousState?: unknown;
    newState?: unknown;
    reason?: string;
    details?: unknown; // Legacy compat — extra context
    correlationId?: string;
  }): Promise<void> {
    // Resolve actorRole if not provided and actorId exists
    let actorRole = params.actorRole;
    if (!actorRole && params.actorId) {
      const actor = await this.prisma.contributor.findUnique({
        where: { id: params.actorId },
        select: { role: true },
      });
      actorRole = actor?.role ?? null;
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: actorRole ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        previousState: params.previousState ?? undefined,
        newState: params.newState ?? undefined,
        reason: params.reason ?? null,
        details: params.details ?? null,
        correlationId: params.correlationId ?? null,
      },
    });

    this.logger.debug('Audit entry created', {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      actorId: params.actorId,
      correlationId: params.correlationId,
    });
  }
}
```

**Immutability enforcement**: The `AuditService` only exposes `log()` (create) and query methods. No update or delete methods. At the DB level, consider adding a Prisma middleware or comment noting that `auditLog.update` and `auditLog.delete` must never be called outside of this service.

### ComplianceModule — Global Module Pattern

```typescript
// apps/api/src/modules/compliance/compliance.module.ts
@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class ComplianceModule {}
```

Mark `@Global()` so all modules can inject `AuditService` without explicitly importing `ComplianceModule`. Register in `app.module.ts` imports.

### Admin Audit Logs Query API

```typescript
@Controller({ path: 'admin/audit-logs', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class AuditLogsController {
  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listAuditLogs(@Query() query: AuditLogQueryDto, @Req() req: RequestWithUser) {
    const result = await this.auditLogsService.list(query);
    return createSuccessResponse(result.data, req.correlationId, result.pagination);
  }
}
```

**Query params**: `eventType` (string), `actorId` (UUID), `targetId` (string), `startDate` (ISO), `endDate` (ISO), `correlationId` (string), `cursor` (string), `limit` (number, default 50, max 200).

### Audit Log Query Service — Performance Design

```typescript
@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: AuditLogFilters) {
    const limit = Math.min(params.limit || 50, 200);
    const where: Prisma.AuditLogWhereInput = {};

    if (params.eventType) where.action = params.eventType;
    if (params.actorId) where.actorId = params.actorId;
    if (params.targetId) where.entityId = params.targetId;
    if (params.correlationId) where.correlationId = params.correlationId;
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: limit + 1,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      skip: params.cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
        previousState: true,
        newState: true,
        reason: true,
        details: true,
        correlationId: true,
        createdAt: true,
        actor: { select: { name: true } }, // Join for display name
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return {
      data: items,
      pagination: { nextCursor, hasMore, limit },
    };
  }
}
```

**Performance**: The `@@index` additions on `createdAt`, `action`, `entityId`, `actorId`, and `correlationId` ensure <10s query times even with 2 years of data. Use raw cursor (UUID) — no encoding needed since audit log IDs are not sensitive.

### Migration Strategy for Existing Audit Calls — CRITICAL

There are **~40 files** referencing `prisma.auditLog`. The migration approach:

1. **Create `AuditService`** first and register as global module
2. **For each service that currently calls `prisma.auditLog.create()`**:
   - Add `AuditService` to constructor injection
   - Replace `this.prisma.auditLog.create({ data: {...} })` with `this.auditService.log({...})`
   - Map existing fields: `action` stays, `entityType`/`entityId` stay, move `details` content to `previousState`/`newState`/`reason` where applicable
3. **For `settings.service.ts`**: Special case — audit log is created inside `$transaction`. Extract audit logging OUTSIDE the transaction or use the AuditService within the transaction callback.
4. **Update ALL corresponding spec files**: Replace `prisma.auditLog.create.mockResolvedValue({})` with `auditService.log.mockResolvedValue(undefined)`

**Files with `prisma.auditLog.create` (non-test):**

| File                                                    | Approximate call count          |
| ------------------------------------------------------- | ------------------------------- |
| `contributor/contributor.service.ts`                    | 2 (profile update, role change) |
| `admission/admission.service.ts`                        | ~10 (various admission actions) |
| `settings/settings.service.ts`                          | 1 (inside transaction)          |
| `evaluation/evaluation.service.ts`                      | 2+ (evaluation actions)         |
| `evaluation/services/evaluation-review.service.ts`      | 2+ (review actions)             |
| `publication/moderation.service.ts`                     | 3+ (moderation actions)         |
| `working-group/working-group.service.ts`                | 3+ (join, leave, lead actions)  |
| `ingestion/ingestion.service.ts`                        | 2+ (repo add/remove)            |
| `ingestion/services/collaboration-detection.service.ts` | 1+                              |
| `feedback/feedback.service.ts`                          | 2+ (assignment, submission)     |
| `auth/auth.service.ts`                                  | 1 (account creation)            |
| `reward/scoring-formula.service.ts`                     | 1+ (formula updates)            |

**Transaction handling for settings.service.ts**: The current code creates audit log inside a Prisma `$transaction`. Options:

- **Option A (recommended)**: Keep audit inside transaction but use `this.prisma` directly in `SettingsService`, then also call `auditService.log()` after the transaction for the enhanced fields. This maintains atomicity for the setting + basic audit, while the enhanced audit entry captures the extra fields.
- **Option B**: Pass `tx` to AuditService (add optional `tx` parameter to `log()`). This is cleaner but requires AuditService to accept a transaction client.

Choose **Option B** — add an optional `tx?: Prisma.TransactionClient` parameter to `AuditService.log()`.

### Security-Relevant Event Types — Full Coverage

All events that MUST be audited (NFR-S6 100% coverage):

| Category               | Event Types                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**     | `auth.account.created`, `auth.login.success`, `auth.login.failure`                                                                                                           |
| **Role Management**    | `ROLE_CHANGED`, `FOUNDING_STATUS_DESIGNATED`                                                                                                                                 |
| **Admission**          | `admission.application.submitted`, `admission.application.approved`, `admission.application.rejected`, `admission.application.info.requested`, `admission.reviewer.assigned` |
| **Evaluation**         | `evaluation.completed`, `evaluation.overridden`, `evaluation.flagged`, `evaluation.review.resolved`                                                                          |
| **Content Moderation** | `article.published`, `article.unpublished`, `article.flagged`, `article.flag.resolved`, `moderation.action`                                                                  |
| **Settings**           | `SETTING_UPDATED`                                                                                                                                                            |
| **Working Groups**     | `working-group.joined`, `working-group.left`, `working-group.lead.assigned`                                                                                                  |
| **Contributions**      | `contribution.ingested`, `collaboration.attribution.overridden`                                                                                                              |
| **Feedback**           | `feedback.assigned`, `feedback.submitted`, `feedback.reassigned`                                                                                                             |
| **Data Access**        | `data.export.requested`, `data.deletion.requested` (Story 10.4)                                                                                                              |
| **Scoring**            | `scoring.formula.updated`                                                                                                                                                    |

### Admin Layout Navigation Update

Add "Audit Logs" nav item to `ADMIN_NAV_ITEMS` in `apps/web/app/(admin)/layout.tsx`:

```typescript
const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/admission', label: 'Admission' },
  { href: '/admin/contributors', label: 'Contributors' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/evaluations/models', label: 'Evaluations' },
  { href: '/admin/evaluations/review-queue', label: 'Review Queue' },
  { href: '/admin/publication/moderation', label: 'Moderation' },
  { href: '/admin/audit-logs', label: 'Audit Logs' }, // NEW
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/settings', label: 'Settings' },
];
```

### TanStack Query Hook Pattern

Follow existing hook patterns (e.g., `use-reports.ts`, `use-admin-contributors.ts`):

```typescript
// use-audit-logs.ts
export function useAuditLogs(params: {
  eventType?: string;
  actorId?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  cursor?: string;
}) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
      });
      return apiClient(`/api/v1/admin/audit-logs?${searchParams}`);
    },
    staleTime: 30_000, // 30 seconds — audit logs don't change frequently
  });
}
```

### Frontend Component Patterns

**Audit Log Table**: Use the same table pattern as contributor list. Columns:

- Timestamp (formatted relative + absolute tooltip)
- Event Type (color-coded badge based on category)
- Actor (name or "System" for null actors)
- Action (human-readable summary derived from action + entityType)
- Target (entityType + entityId, link to entity if applicable)
- Details (expandable row using `<details>` element showing previousState/newState JSON)

**Filter Bar**: Follow the existing settings section card pattern. Filters:

- Event type: `<select>` dropdown with all AUDIT_EVENT_TYPES
- Date range: two `<input type="date">` fields
- Actor: text input for search
- Correlation ID: text input

Both components need `'use client'` directive.

### Existing Code to Reuse (DO NOT Reinvent)

- **Guard pattern**: `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility` from all admin controllers
- **Response wrapper**: `createSuccessResponse(data, correlationId, pagination?)` from `common/types/api-response.type.ts`
- **Cursor pagination**: UUID-based cursor pattern from `AdminContributorsService`
- **Admin layout**: Existing `(admin)/layout.tsx` with `ADMIN_NAV_ITEMS` array
- **apiClient**: `apps/web/lib/api-client.ts` for authenticated requests
- **Error handling**: `DomainException` with `ERROR_CODES` from `@edin/shared`
- **CASL subjects**: `AuditLog` already exists in `apps/api/src/modules/auth/casl/subjects.ts`
- **PrismaModule**: Already imported in admin module
- **EventEmitter2**: Not needed for this story — audit is synchronous write

### Critical Patterns to Follow

1. **Auth on ALL endpoints**: `@UseGuards(JwtAuthGuard, AbilityGuard)` — this is admin-only
2. **Ability check**: `@CheckAbility((ability) => ability.can(Action.Manage, 'all'))` on every method
3. **No update/delete on AuditLog**: Immutability is a hard requirement — AuditService must NOT expose update or delete methods
4. **Global module**: ComplianceModule must be `@Global()` so all modules can inject AuditService
5. **Transaction support**: AuditService.log() must accept optional `tx` parameter for transactional audit (settings service uses this)
6. **Controller ordering**: Register `AuditLogsController` in admin module BEFORE parameterized route controllers
7. **Frontend `'use client'`**: Required for interactive components (filters, table interactions)
8. **Prisma decimals**: Pass plain numbers, NOT `Decimal` class (lesson from previous stories)
9. **Mock PrismaService**: In tests, mock with `{ provide: PrismaService, useValue: mockPrisma }` using `any` type
10. **Mock AuditService**: In migrated tests, mock with `{ provide: AuditService, useValue: { log: vi.fn() } }`
11. **Backward compatibility**: Keep `details` column populated for existing callers that read from it
12. **PII in logs**: NEVER store name, email, or GitHub profile in audit entries — only contributor_id
13. **Date handling**: Store and query with UTC timestamps. Frontend converts to local timezone for display.

### Retention Policy — Documentation for MVP

For MVP, document the 2-year retention requirement. Automated archival/cold storage is deferred:

- Add a comment in the AuditService: `// NFR-S6: 2-year retention. Automated archival to cold storage is a Phase 2 enhancement.`
- The current PostgreSQL storage is sufficient for MVP scale (<1000 contributors).
- Index on `createdAt` supports future `WHERE createdAt < retention_cutoff` archival queries.

### Testing Standards

- **Vitest** with NestJS Test module
- Mock PrismaService for all service tests
- Test AuditService: entry creation, field population, actorRole resolution, transaction support, no update/delete
- Test AuditLogsService: all filter combinations, pagination, empty results, date range
- Test AuditLogsController: auth guard, ability guard, query params, response format
- Test migrated services: ensure AuditService.log is called with correct params (spot-check 2-3 key services)
- Target: ~25 new backend tests (8 audit service, 8 query service, 5 controller, 4 migration verification)
- Ensure ALL existing tests still pass after migration (zero regressions)

### Previous Story (10-2) Learnings

- Admin module already well-structured — extend, don't recreate
- Static routes first pattern in admin module — register AuditLogsController early
- SettingsService audit logging is inside `$transaction` — handle with tx parameter
- EventEmitter2 already globally registered — not needed for audit (synchronous)
- CASL `AuditLog` subject already exists in subjects.ts
- `PrismaService` mock pattern: use `any` type for mock assignability
- Contributor list uses cursor pagination with Base64url encoding — audit logs can use raw UUID cursor (simpler, audit log IDs are not sensitive)
- NotificationType enum pattern: no new enum values needed for this story

### Project Structure Notes

- New compliance module at `apps/api/src/modules/compliance/` — per architecture spec
- AuditService is global — injected across ALL modules that audit
- Admin audit-logs page at `apps/web/app/(admin)/admin/audit-logs/`
- Frontend components in `apps/web/components/features/admin/audit-logs/`
- Hook in `apps/web/hooks/use-audit-logs.ts`
- Shared types extend `packages/shared/src/types/admin.types.ts`
- Prisma schema enhanced with new columns + indexes — requires migration
- No new Prisma models needed — only enhancing existing `AuditLog`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 10, Story 10.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR52 — immutable audit logs]
- [Source: _bmad-output/planning-artifacts/prd.md#FR64 — PII separation]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-S6 — audit logs, 100% coverage, 2-year retention, <10s query]
- [Source: _bmad-output/planning-artifacts/architecture.md#audit schema — immutable logs, governance actions]
- [Source: _bmad-output/planning-artifacts/architecture.md#modules/compliance/ — audit.service.ts, audit.interceptor.ts]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries — audit schema owned by compliance module]
- [Source: apps/api/prisma/schema.prisma#AuditLog — existing model at line 620]
- [Source: apps/api/src/modules/admin/admin.module.ts — existing admin module to extend]
- [Source: apps/api/src/modules/auth/casl/subjects.ts — AuditLog subject exists]
- [Source: apps/api/src/modules/contributor/contributor.service.ts — existing audit call pattern at line 300]
- [Source: apps/api/src/modules/settings/settings.service.ts — audit inside $transaction at line 48]
- [Source: apps/web/app/(admin)/layout.tsx — admin layout with nav items]
- [Source: _bmad-output/implementation-artifacts/10-2-role-management-and-platform-settings.md — previous story patterns]
- [Source: _bmad-output/implementation-artifacts/10-1-admin-health-metrics-dashboard.md — admin module structure]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A

### Completion Notes List

- Enhanced AuditLog Prisma model with 4 new columns (actorRole, previousState, newState, reason) and 5 indexes
- Created ComplianceModule as @Global() with centralized AuditService supporting optional transaction client
- Created admin audit-logs query API with cursor pagination and dynamic filtering
- Migrated ~30+ prisma.auditLog.create() calls across 18 service files to use centralized AuditService
- Updated all corresponding spec files to mock AuditService instead of prisma.auditLog
- Built frontend audit log viewer with filter bar, color-coded event badges, expandable detail rows
- All 1035 tests passing, 0 failures
- Zero remaining prisma.auditLog.create calls outside AuditService (verified with grep)

### Change Log

- 2026-03-10: All tasks completed. Full implementation of immutable audit logs with centralized service, admin viewer, and codebase migration.

### File List

**New Files:**

- `apps/api/src/modules/compliance/compliance.module.ts`
- `apps/api/src/modules/compliance/audit/audit.service.ts`
- `apps/api/src/modules/compliance/audit/audit.service.spec.ts`
- `apps/api/src/modules/admin/audit-logs.controller.ts`
- `apps/api/src/modules/admin/audit-logs.controller.spec.ts`
- `apps/api/src/modules/admin/audit-logs.service.ts`
- `apps/api/src/modules/admin/audit-logs.service.spec.ts`
- `apps/web/components/features/admin/audit-logs/audit-log-table.tsx`
- `apps/web/components/features/admin/audit-logs/audit-log-filters.tsx`
- `apps/web/hooks/use-audit-logs.ts`
- `apps/web/app/(admin)/admin/audit-logs/page.tsx`
- `apps/web/app/(admin)/admin/audit-logs/loading.tsx`

**Modified Files:**

- `apps/api/prisma/schema.prisma` — AuditLog model enhanced
- `apps/api/src/app.module.ts` — ComplianceModule import
- `apps/api/src/modules/admin/admin.module.ts` — AuditLogsController/Service
- `packages/shared/src/types/admin.types.ts` — Audit log types + AUDIT_EVENT_TYPES
- `packages/shared/src/constants/error-codes.ts` — Audit error codes
- `packages/shared/src/index.ts` — New exports
- `apps/web/app/(admin)/layout.tsx` — Audit Logs nav item
- `apps/api/src/modules/contributor/contributor.service.ts` — AuditService migration
- `apps/api/src/modules/admission/admission.service.ts` — AuditService migration
- `apps/api/src/modules/settings/settings.service.ts` — AuditService migration (tx support)
- `apps/api/src/modules/evaluation/evaluation.service.ts` — AuditService migration
- `apps/api/src/modules/evaluation/services/evaluation-review.service.ts` — AuditService migration
- `apps/api/src/modules/publication/moderation.service.ts` — AuditService migration
- `apps/api/src/modules/working-group/working-group.service.ts` — AuditService migration
- `apps/api/src/modules/ingestion/ingestion.service.ts` — AuditService migration
- `apps/api/src/modules/ingestion/services/collaboration-detection.service.ts` — AuditService migration
- `apps/api/src/modules/ingestion/admin-contribution.controller.ts` — AuditService migration
- `apps/api/src/modules/ingestion/collaboration.controller.ts` — AuditService migration
- `apps/api/src/modules/ingestion/processors/webhook.processor.ts` — AuditService migration
- `apps/api/src/modules/feedback/feedback.service.ts` — AuditService migration
- `apps/api/src/modules/auth/auth.service.ts` — AuditService migration
- `apps/api/src/modules/evaluation/controllers/evaluation-admin.controller.ts` — AuditService migration
- `apps/api/src/modules/evaluation/processors/code-evaluation.processor.ts` — AuditService migration
- `apps/api/src/modules/evaluation/processors/doc-evaluation.processor.ts` — AuditService migration
- `apps/api/src/modules/evaluation/services/evaluation-rubric.service.ts` — AuditService migration
- All corresponding `.spec.ts` files for migrated services
