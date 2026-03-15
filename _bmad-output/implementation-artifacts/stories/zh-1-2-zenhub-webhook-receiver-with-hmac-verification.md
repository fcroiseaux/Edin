# Story zh-1.2: Zenhub Webhook Receiver with HMAC Verification

Status: done

## Story

As an admin,
I want the system to receive Zenhub webhook events with HMAC signature verification and idempotent processing, logging all events for audit,
So that sprint data flows into Edin securely and reliably.

## Epic

zh-Epic 1: Integration Setup & Data Pipeline

## FRs Covered

FR1, FR2, FR3

## Acceptance Criteria

1. **Given** a valid Zenhub webhook event with correct HMAC-SHA256 signature **When** it is received at `POST /api/v1/webhooks/zenhub` **Then** the endpoint returns HTTP 200 within 500ms **And** the event is logged to `zenhub_syncs` with correlation ID, event type, payload, and timestamp **And** a `zenhub.webhook.received` event is emitted for async processing

2. **Given** a webhook event with invalid or missing HMAC signature **When** it is received at the webhook endpoint **Then** the endpoint returns HTTP 401 **And** the rejection is logged with details

3. **Given** a duplicate webhook event (same event ID already processed) **When** it is received at the webhook endpoint **Then** the endpoint returns HTTP 200 (no error to sender) **And** no duplicate data is created **And** the duplicate is logged as `ZENHUB_WEBHOOK_DUPLICATE_EVENT`

4. **Given** webhook secret rotation is in progress **When** a webhook arrives signed with either the current or previous secret **Then** the signature is accepted during the 24-hour transition window **And** after the window, only the current secret is accepted

5. **Given** a burst of 100 webhook events per minute **When** they arrive simultaneously **Then** all events are acknowledged with HTTP 200 without dropping any **And** async processing handles them via EventEmitter2 without blocking

6. **Given** any sync event (webhook receipt) **When** it is processed **Then** a structured JSON log entry with correlation ID is emitted **And** the `zenhub_syncs` record serves as the audit trail with 7-year retention policy

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`

### Implementation Approach

#### 1. Prisma Schema Changes

**Add `sprint` schema** to `apps/api/prisma/schema.prisma`:

- Add `"sprint"` to the `schemas` array in `datasource db`: `schemas = ["core", "evaluation", "publication", "audit", "sprint"]`

**Create `ZenhubSync` model** in `apps/api/prisma/schema.prisma`:

```prisma
enum ZenhubSyncType {
  WEBHOOK
  POLL
  BACKFILL

  @@schema("sprint")
}

enum ZenhubSyncStatus {
  RECEIVED
  PROCESSING
  COMPLETED
  FAILED

  @@schema("sprint")
}

model ZenhubSync {
  id            String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  deliveryId    String            @unique @map("delivery_id")
  syncType      ZenhubSyncType    @map("sync_type")
  status        ZenhubSyncStatus  @default(RECEIVED)
  eventType     String            @map("event_type")
  payload       Json?
  correlationId String?           @map("correlation_id")
  errorMessage  String?           @map("error_message")
  retryCount    Int               @default(0) @map("retry_count")
  receivedAt    DateTime          @default(now()) @map("received_at")
  processedAt   DateTime?         @map("processed_at")
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @updatedAt @map("updated_at")

  @@index([syncType, status], map: "zenhub_syncs_type_status_idx")
  @@index([deliveryId], map: "zenhub_syncs_delivery_id_idx")
  @@index([receivedAt], map: "zenhub_syncs_received_at_idx")
  @@map("zenhub_syncs")
  @@schema("sprint")
}
```

**Create migration**: Run `npx prisma migrate dev --name add_sprint_schema_and_zenhub_syncs` from `apps/api/`. The migration SQL must include `CREATE SCHEMA IF NOT EXISTS "sprint";` at the top since the `sprint` schema is new.

#### 2. Shared Types (`packages/shared/src/types/zenhub.types.ts`)

Add webhook event types to existing file:

```typescript
export interface ZenhubWebhookEvent {
  type: string; // e.g., 'issue_transfer', 'estimate_set', 'sprint_start', 'sprint_end'
  organization: string;
  repo: string;
  workspace_id: string;
  [key: string]: unknown; // flexible payload
}

export interface ZenhubWebhookReceivedEvent {
  eventType: 'zenhub.webhook.received';
  timestamp: string;
  correlationId: string;
  payload: {
    syncId: string;
    webhookEventType: string;
    deliveryId: string;
  };
}
```

Export from `packages/shared/src/index.ts`.

#### 3. Shared Schemas (`packages/shared/src/schemas/zenhub-webhook.schema.ts`)

Create Zod validation for webhook payload:

```typescript
import { z } from 'zod';

export const zenhubWebhookPayloadSchema = z
  .object({
    type: z.string(),
    organization: z.string().optional(),
    repo: z.string().optional(),
    workspace_id: z.string().optional(),
  })
  .passthrough(); // allow additional Zenhub-specific fields

export type ZenhubWebhookPayloadDto = z.infer<typeof zenhubWebhookPayloadSchema>;
```

Export from `packages/shared/src/index.ts`.

#### 4. Webhook Controller (`apps/api/src/modules/zenhub/zenhub-webhook.controller.ts`)

**CRITICAL PATTERN:** Mirror `apps/api/src/modules/ingestion/ingestion.controller.ts` exactly.

```
Route: POST /webhooks/zenhub (NO JWT auth — uses HMAC signature validation)
Controller path: @Controller({ path: 'webhooks', version: '1' })
```

- Extract headers: `x-zenhub-signature` (HMAC), `x-zenhub-event` (event type), `x-zenhub-delivery` (delivery ID)
- Use `@Req() req: RawBodyRequest<Request>` for raw body access
- Use `@Throttle({ default: { ttl: 1000, limit: 100 } })` for burst handling (AC5)
- Use `@HttpCode(HttpStatus.OK)` to return 200
- Validate headers exist, parse raw body, call service for signature verification
- On invalid/missing signature: throw `DomainException(ERROR_CODES.ZENHUB_WEBHOOK_SIGNATURE_INVALID, ..., HttpStatus.UNAUTHORIZED)`
- On valid: call `zenhubWebhookService.processWebhook(...)` then return `{ status: 'accepted' }`
- Log using `new Logger(ZenhubWebhookController.name)` with correlationId from `req.correlationId`

**IMPORTANT:** Register this controller in `ZenhubModule` alongside `ZenhubConfigController`.

#### 5. Webhook Service (`apps/api/src/modules/zenhub/zenhub-webhook.service.ts`)

Inject: `PrismaService`, `ZenhubConfigService`, `EventEmitter2`, `Logger`

**Methods:**

**`validateSignature(rawBody: Buffer, signature: string): Promise<boolean>`**

- Get current secret via `zenhubConfigService.resolveWebhookSecret()`
- Also check previous secret from `zenhub.webhook_secret_previous` setting for rotation support (AC4)
- Compute HMAC-SHA256: `createHmac('sha256', secret).update(rawBody).digest('hex')`
- Expected format: `sha256=<hex>` (strip prefix before comparing, or prepend prefix before comparing)
- Use `timingSafeEqual(Buffer.from(computed), Buffer.from(provided))` — prevent timing attacks
- Import `createHmac`, `timingSafeEqual` from `node:crypto`
- If current secret fails but previous secret succeeds AND previous secret is within 24h transition window → accept
- Check transition window via `zenhub.webhook_secret_rotated_at` setting timestamp

**`processWebhook(eventType: string, deliveryId: string, payload: Record<string, unknown>, correlationId: string): Promise<void>`**

- **Idempotency check** (AC3): Try to find existing `ZenhubSync` by `deliveryId`
  - If exists: log as duplicate with `ZENHUB_WEBHOOK_DUPLICATE_EVENT`, return early (no error)
- **Create sync record**: Insert `ZenhubSync` with status `RECEIVED`, syncType `WEBHOOK`
- **Emit event**: `this.eventEmitter.emit('zenhub.webhook.received', { eventType: 'zenhub.webhook.received', timestamp, correlationId, payload: { syncId, webhookEventType, deliveryId } })`
- Log receipt with structured Pino fields: `{ eventType, deliveryId, syncId, correlationId }`

#### 6. Secret Rotation Support

When the admin updates the webhook secret via `ZenhubConfigService.updateConfig`:

- Before overwriting the current secret, store the old value as `zenhub.webhook_secret_previous` via SettingsService
- Store `zenhub.webhook_secret_rotated_at` with current timestamp
- The webhook service checks both secrets during the 24h window

Add to `ZenhubConfigService.updateConfig()` — when `webhookSecret` is updated:

```typescript
// Before saving new secret, preserve old one for rotation
const currentSecret = await this.resolveWebhookSecret();
if (currentSecret) {
  await this.settingsService.updateSetting(
    'zenhub.webhook_secret_previous',
    currentSecret,
    adminId,
    correlationId,
    { redactAudit: true },
  );
  await this.settingsService.updateSetting(
    'zenhub.webhook_secret_rotated_at',
    new Date().toISOString(),
    adminId,
    correlationId,
  );
}
```

#### 7. Module Registration (`apps/api/src/modules/zenhub/zenhub.module.ts`)

Update to include:

```typescript
@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [ZenhubConfigController, ZenhubWebhookController],
  providers: [ZenhubConfigService, ZenhubWebhookService],
  exports: [ZenhubConfigService, ZenhubWebhookService],
})
export class ZenhubModule {}
```

**No changes needed to `app.module.ts`** — `ZenhubModule` is already registered.

#### 8. Tests

**`zenhub-webhook.controller.spec.ts`** — Following vitest + @nestjs/testing pattern from `ingestion.controller.spec.ts`:

- Test missing `x-zenhub-signature` header → throws DomainException
- Test missing `x-zenhub-event` header → throws DomainException
- Test invalid signature → throws DomainException with UNAUTHORIZED
- Test valid webhook → calls processWebhook and returns `{ status: 'accepted' }`
- Test missing raw body → throws DomainException

**`zenhub-webhook.service.spec.ts`** — Following vitest pattern from `zenhub-config.service.spec.ts`:

- Test `validateSignature` with valid HMAC → returns true
- Test `validateSignature` with invalid HMAC → returns false
- Test `validateSignature` with previous secret during rotation window → returns true
- Test `validateSignature` with previous secret after rotation window → returns false
- Test `processWebhook` with new delivery → creates ZenhubSync record and emits event
- Test `processWebhook` with duplicate delivery → logs duplicate, no new record, no error
- Test structured logging includes correlationId

### Key Patterns to Follow

- **Controller pattern**: `@Controller({ path: 'webhooks', version: '1' })` — NO `@UseGuards(JwtAuthGuard)` on webhook endpoint (uses HMAC instead)
- **HMAC verification**: Use `node:crypto` with `createHmac` + `timingSafeEqual` — same as GitHub webhook handler in `ingestion.service.ts:369-390`
- **Error handling**: Use `DomainException` with `ERROR_CODES.ZENHUB_WEBHOOK_SIGNATURE_INVALID` (already defined in `packages/shared/src/constants/error-codes.ts:178`)
- **Event emission**: Follow `zenhub.config.updated` pattern from `zenhub-config.service.ts:116-123` — dot-notation event names
- **Idempotency**: Check `deliveryId` unique constraint on `ZenhubSync` before inserting
- **Logging**: Use `new Logger(ClassName.name)` from `@nestjs/common` — Pino structured logging auto-attached via `nestjs-pino` config in `app.module.ts`
- **Correlation IDs**: Available via `req.correlationId` — auto-generated by `LoggerModule.forRoot()` config in `app.module.ts:38-64`
- **Response format**: Webhook returns `{ status: 'accepted' }` (not `createSuccessResponse`)
- **Test framework**: `vitest` (not Jest) — import `describe, it, expect, beforeEach, vi` from `vitest`
- **Service injection**: Follow mock pattern from `zenhub-config.service.spec.ts` — `vi.fn()` mocks with `Test.createTestingModule`

### Dependencies

- `node:crypto` (built-in — no package install needed)
- Existing `PrismaModule` + `PrismaService` for database access
- Existing `SettingsModule` + `SettingsService` for secret retrieval
- Existing `EventEmitter2` from `@nestjs/event-emitter` (already in app.module.ts)
- Existing `ZenhubConfigService` for `resolveWebhookSecret()` method
- Existing error codes: `ZENHUB_WEBHOOK_SIGNATURE_INVALID`, `ZENHUB_WEBHOOK_DUPLICATE_EVENT` (already in shared package)
- **NO new npm packages required**

### Previous Story Intelligence (zh-1-1)

- Config service uses `SettingsService` for persistence with platform setting keys prefixed `zenhub.*`
- `resolveWebhookSecret()` is already public on `ZenhubConfigService` — reuse it
- Test pattern: mock `SettingsService`, `ConfigService`, `EventEmitter2` as plain objects with `vi.fn()`
- ZenhubModule already imports `PrismaModule` and `SettingsModule`
- `ZenhubConfigController` is already registered in the module

### Files to Create

- `apps/api/prisma/migrations/<timestamp>_add_sprint_schema_and_zenhub_syncs/migration.sql`
- `apps/api/src/modules/zenhub/zenhub-webhook.controller.ts`
- `apps/api/src/modules/zenhub/zenhub-webhook.service.ts`
- `apps/api/src/modules/zenhub/zenhub-webhook.controller.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-webhook.service.spec.ts`
- `packages/shared/src/schemas/zenhub-webhook.schema.ts`

### Files to Modify

- `apps/api/prisma/schema.prisma` — add `"sprint"` to schemas, add enums + `ZenhubSync` model
- `apps/api/src/modules/zenhub/zenhub.module.ts` — add webhook controller + service
- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — add secret rotation logic in `updateConfig`
- `packages/shared/src/types/zenhub.types.ts` — add webhook event types
- `packages/shared/src/index.ts` — export new schema/types

## Tasks / Subtasks

- [x] Task 1: Prisma schema + migration (AC: 1, 6)
  - [x] Add `"sprint"` to schemas array
  - [x] Add `ZenhubSyncType` and `ZenhubSyncStatus` enums
  - [x] Add `ZenhubSync` model with all fields and indexes
  - [x] Generate and verify migration SQL (must include `CREATE SCHEMA IF NOT EXISTS "sprint"`)
  - [x] Run migration and regenerate Prisma client

- [x] Task 2: Shared types and schemas (AC: 1)
  - [x] Add webhook event types to `packages/shared/src/types/zenhub.types.ts`
  - [x] Create `packages/shared/src/schemas/zenhub-webhook.schema.ts`
  - [x] Export new types and schemas from `packages/shared/src/index.ts`

- [x] Task 3: Webhook service (AC: 1, 2, 3, 4, 6)
  - [x] Create `zenhub-webhook.service.ts` with `validateSignature` method
  - [x] Implement HMAC-SHA256 with `timingSafeEqual`
  - [x] Implement dual-secret rotation support (current + previous within 24h)
  - [x] Implement `processWebhook` with idempotency check
  - [x] Implement EventEmitter2 emission of `zenhub.webhook.received`
  - [x] Add structured logging with correlation IDs

- [x] Task 4: Secret rotation in config service (AC: 4)
  - [x] Modify `ZenhubConfigService.updateConfig` to preserve old secret before overwriting
  - [x] Store `zenhub.webhook_secret_previous` and `zenhub.webhook_secret_rotated_at`

- [x] Task 5: Webhook controller (AC: 1, 2, 5)
  - [x] Create `zenhub-webhook.controller.ts` mirroring ingestion controller pattern
  - [x] Extract headers: `x-zenhub-signature`, `x-zenhub-event`, `x-zenhub-delivery`
  - [x] Use `RawBodyRequest<Request>` for raw body access
  - [x] Add `@Throttle` for burst handling
  - [x] Wire up signature validation → process webhook → return 200

- [x] Task 6: Module registration (AC: all)
  - [x] Add `ZenhubWebhookController` and `ZenhubWebhookService` to `ZenhubModule`

- [x] Task 7: Unit tests (AC: all)
  - [x] Write `zenhub-webhook.controller.spec.ts` (6 test cases)
  - [x] Write `zenhub-webhook.service.spec.ts` (7 test cases)
  - [x] Verify all tests pass with `npx vitest run`

## Dev Notes

- The `sprint` schema is brand new — the migration MUST include `CREATE SCHEMA IF NOT EXISTS "sprint";` before creating tables
- The webhook endpoint path is `/api/v1/webhooks/zenhub` — note this is under `webhooks` not `zenhub`. The controller path is `webhooks` and the method route is `zenhub`
- Raw body must be available — NestJS requires `rawBody: true` in the bootstrap options. Check `apps/api/src/main.ts` for `NestFactory.create(AppModule, { rawBody: true })` — this should already be configured for GitHub webhooks. If not, it must be added
- Secret rotation uses the existing `SettingsService` pattern (no new DB tables)
- The `zenhub.webhook.received` event will be consumed by future stories (zh-1-3+) — for now it just emits

### Project Structure Notes

- New files follow existing zenhub module co-location: `apps/api/src/modules/zenhub/zenhub-webhook.*`
- Shared types/schemas follow existing pattern: webhook schema in `packages/shared/src/schemas/`, types in `packages/shared/src/types/`
- Tests co-located with source files (not in separate `__tests__` directory)

### References

- [Source: apps/api/src/modules/ingestion/ingestion.controller.ts] — GitHub webhook handler pattern to mirror
- [Source: apps/api/src/modules/ingestion/ingestion.service.ts:369-390] — HMAC signature validation pattern
- [Source: apps/api/src/modules/zenhub/zenhub-config.service.ts] — Existing config service with resolveWebhookSecret()
- [Source: apps/api/src/modules/zenhub/zenhub.module.ts] — Module to extend
- [Source: packages/shared/src/constants/error-codes.ts:177-182] — Zenhub error codes already defined
- [Source: apps/api/src/common/exceptions/domain.exception.ts] — DomainException pattern
- [Source: apps/api/src/app.module.ts:38-64] — Pino/correlation ID config
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md:156-167] — Webhook verification + secret rotation architecture decisions

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 7 tasks completed with all subtasks checked
- 29 tests passing across 4 test files (13 new tests: 7 service + 6 controller)
- No regressions introduced (pre-existing redis.service.spec.ts failures unrelated)
- TypeScript compilation clean for all zenhub and shared files
- Prisma client regenerated successfully with new sprint schema
- Secret rotation support added to existing ZenhubConfigService

### File List

**Created:**

- `apps/api/prisma/migrations/20260315000000_add_sprint_schema_and_zenhub_syncs/migration.sql`
- `apps/api/src/modules/zenhub/zenhub-webhook.controller.ts`
- `apps/api/src/modules/zenhub/zenhub-webhook.service.ts`
- `apps/api/src/modules/zenhub/zenhub-webhook.controller.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-webhook.service.spec.ts`
- `packages/shared/src/schemas/zenhub-webhook.schema.ts`

**Modified:**

- `apps/api/prisma/schema.prisma` — added "sprint" schema, ZenhubSyncType/ZenhubSyncStatus enums, ZenhubSync model
- `apps/api/src/modules/zenhub/zenhub.module.ts` — added ZenhubWebhookController + ZenhubWebhookService
- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — added secret rotation logic in updateConfig
- `packages/shared/src/types/zenhub.types.ts` — added ZenhubWebhookEvent + ZenhubWebhookReceivedEvent
- `packages/shared/src/index.ts` — exported new types and schemas

### Change Log

- 2026-03-15: Implemented Zenhub webhook receiver with HMAC-SHA256 verification, idempotent processing via zenhub_syncs table, dual-secret rotation support, and EventEmitter2 async event emission
