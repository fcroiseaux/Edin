# Story zh-1.3: Zenhub API Polling Service

Status: done

## Story

As an admin,
I want the system to poll the Zenhub GraphQL API on a configurable schedule with rate limit handling and pagination,
So that aggregate sprint data is captured and any webhook gaps are filled.

## Epic

zh-Epic 1: Integration Setup & Data Pipeline

## FRs Covered

FR4, FR5, FR6

## Acceptance Criteria

1. **Given** the Zenhub integration is configured with valid API credentials **When** the configured polling interval elapses (default: 15 minutes) **Then** the system queries the Zenhub GraphQL API for sprint, velocity, epic, and issue data **And** the polling cycle completes within 60 seconds **And** results are logged to `zenhub_syncs` with sync_type `poll` **And** a `zenhub.poll.completed` event is emitted

2. **Given** the Zenhub API responds with rate limit headers (429) **When** the polling service encounters the rate limit **Then** it respects the Retry-After header with exponential backoff **And** the rate limit event is logged as `ZENHUB_API_RATE_LIMITED` **And** no data is lost

3. **Given** the Zenhub workspace contains more data than fits in one API response **When** the polling service fetches data **Then** it paginates through all results until complete **And** uses upsert semantics (never creates duplicates)

4. **Given** the Zenhub API is temporarily unreachable **When** a polling cycle fails **Then** the system logs the failure as `ZENHUB_API_UNREACHABLE` **And** BullMQ retries automatically according to configured retry policy **And** the existing GitHub webhook pipeline is not affected

5. **Given** the BullMQ `zenhub-polling` queue **When** it runs alongside existing queues **Then** it does not cause resource contention or degrade existing job processing

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`

### Implementation Approach

#### 1. Zenhub GraphQL Client (`apps/api/src/modules/zenhub/zenhub-graphql.client.ts`)

Create a dedicated GraphQL client using native `fetch()` (no new npm dependency needed — Node.js 18+ built-in).

**Pattern:** Follow `apps/api/src/modules/ingestion/github-api.service.ts` rate-limit retry pattern.

```typescript
@Injectable()
export class ZenhubGraphqlClient {
  constructor(private readonly zenhubConfigService: ZenhubConfigService) {}

  async query<T>(graphqlQuery: string, variables?: Record<string, unknown>): Promise<T>;
  // 1. Get API token via zenhubConfigService.resolveApiToken()
  // 2. POST to https://api.zenhub.com/public/graphql
  // 3. Headers: Authorization: Bearer <token>, Content-Type: application/json
  // 4. Handle 429: extract Retry-After header, wait, retry (max 2 retries)
  // 5. Handle network errors: throw ZenhubApiError
  // 6. Return response.data
}
```

**Rate limit handling:**

- Check response status 429 → extract `Retry-After` header (seconds)
- Exponential backoff: 1st retry wait Retry-After or 1s, 2nd retry 2x
- After max retries: throw error with `ZENHUB_API_RATE_LIMITED` code
- Log each retry with structured fields

**Error classes (co-located):**

```typescript
export class ZenhubApiError extends Error { ... }
export class ZenhubRateLimitError extends Error { readonly status = 429; ... }
```

#### 2. Polling Service (`apps/api/src/modules/zenhub/zenhub-polling.service.ts`)

Orchestrates the polling logic. Called by the BullMQ processor.

```typescript
@Injectable()
export class ZenhubPollingService {
  constructor(
    private readonly graphqlClient: ZenhubGraphqlClient,
    private readonly prisma: PrismaService,
    private readonly zenhubConfigService: ZenhubConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async executePoll(correlationId: string): Promise<void>;
  // 1. Check API token is configured — abort if not
  // 2. Get workspace mapping from config
  // 3. Create zenhub_syncs record (syncType: POLL, status: RECEIVED)
  // 4. Fetch sprints with pagination (fetchAllSprints)
  // 5. Fetch issues with pagination (fetchAllIssues)
  // 6. Store raw data as JSONB payload in zenhub_syncs
  // 7. Update sync record: status COMPLETED, processedAt = now()
  // 8. Emit zenhub.poll.completed event
  // On error:
  // 9. Update sync record: status FAILED, errorMessage
  // 10. Emit zenhub.poll.failed event
  // 11. Rethrow for BullMQ retry

  private async fetchAllSprints(workspaceId: string): Promise<unknown[]>;
  // Paginate through Zenhub sprints using cursor-based pagination
  // GraphQL query: sprints(workspaceId, after: cursor) { nodes { ... } pageInfo { hasNextPage endCursor } }

  private async fetchAllIssues(workspaceId: string): Promise<unknown[]>;
  // Paginate through Zenhub issues
  // GraphQL query: searchIssues(workspaceId, after: cursor) { nodes { ... } pageInfo { hasNextPage endCursor } }
}
```

#### 3. Polling Processor (`apps/api/src/modules/zenhub/zenhub-polling.processor.ts`)

**CRITICAL PATTERN:** Mirror `apps/api/src/modules/notification/notification.processor.ts` exactly.

```typescript
@Processor('zenhub-polling')
export class ZenhubPollingProcessor extends WorkerHost {
  constructor(
    private readonly pollingService: ZenhubPollingService,
    @InjectQueue('zenhub-polling-dlq') private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ZenhubPollingJobData>): Promise<void>;
  // 1. Log poll start
  // 2. Call pollingService.executePoll(correlationId)
  // 3. On error: check attemptsMade vs maxAttempts, move to DLQ if exhausted
}
```

**Job data type:**

```typescript
export interface ZenhubPollingJobData {
  correlationId: string;
  triggeredBy: 'schedule' | 'manual';
}
```

#### 4. Polling Scheduler (in `ZenhubPollingService`)

Register a repeatable job on module initialization:

```typescript
@Injectable()
export class ZenhubPollingService implements OnModuleInit {
  constructor(@InjectQueue('zenhub-polling') private readonly pollingQueue: Queue) {}

  async onModuleInit(): Promise<void> {
    const intervalMs = await this.zenhubConfigService.resolvePollingInterval();
    await this.pollingQueue.add(
      'sync-sprint-data',
      { correlationId: `poll-scheduled-${Date.now()}`, triggeredBy: 'schedule' },
      { repeat: { every: intervalMs }, removeOnComplete: true, removeOnFail: false },
    );
  }
}
```

#### 5. Module Registration Updates

**`zenhub.module.ts`:**

```typescript
@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    BullModule.registerQueue({
      name: 'zenhub-polling',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 }, // 1min, 2min, 4min
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'zenhub-polling-dlq',
      defaultJobOptions: { removeOnComplete: true, removeOnFail: false },
    }),
  ],
  controllers: [ZenhubConfigController, ZenhubWebhookController],
  providers: [ZenhubConfigService, ZenhubWebhookService, ZenhubGraphqlClient, ZenhubPollingService, ZenhubPollingProcessor],
  exports: [ZenhubConfigService, ZenhubWebhookService, ZenhubPollingService],
})
```

#### 6. Config Service Changes

Make `resolvePollingInterval()` and `resolveWorkspaceMapping()` public on `ZenhubConfigService` — they are currently private but the polling service needs them.

#### 7. Shared Types (`packages/shared/src/types/zenhub.types.ts`)

Add polling event types:

```typescript
export interface ZenhubPollCompletedEvent {
  eventType: 'zenhub.poll.completed';
  timestamp: string;
  correlationId: string;
  payload: { syncId: string; sprintCount: number; issueCount: number; durationMs: number };
}

export interface ZenhubPollFailedEvent {
  eventType: 'zenhub.poll.failed';
  timestamp: string;
  correlationId: string;
  payload: { syncId: string; errorMessage: string; errorCode: string };
}
```

Export from `packages/shared/src/index.ts`.

#### 8. Tests

**`zenhub-graphql.client.spec.ts`:**

- Test successful query returns data
- Test 429 rate limit → retries with backoff
- Test 429 after max retries → throws ZenhubRateLimitError
- Test network error → throws ZenhubApiError
- Test missing API token → throws error

**`zenhub-polling.service.spec.ts`:**

- Test successful poll → creates sync record, fetches data, updates COMPLETED, emits event
- Test poll with no API token → aborts gracefully
- Test poll failure → updates sync FAILED, emits failed event, rethrows
- Test pagination: multiple pages fetched until hasNextPage=false

**`zenhub-polling.processor.spec.ts`:**

- Test successful processing → calls pollingService.executePoll
- Test failure with retries remaining → rethrows for BullMQ retry
- Test failure after max retries → moves to DLQ

### Key Patterns to Follow

- **BullMQ module pattern**: `BullModule.registerQueue` with DLQ — same as `notification.module.ts`
- **Processor pattern**: Extend `WorkerHost`, inject DLQ with `@InjectQueue`, handle DLQ on max retries — same as `notification.processor.ts`
- **Rate limit retry**: `withRateLimitRetry` pattern from `github-api.service.ts:230-251`
- **GraphQL API**: Use native `fetch()` — no new npm dependency. Zenhub GraphQL endpoint: `https://api.zenhub.com/public/graphql`
- **Event emission**: `zenhub.poll.completed` / `zenhub.poll.failed` — dot-notation
- **Sync logging**: Use existing `ZenhubSync` model with `syncType: 'POLL'`
- **Test framework**: vitest with `@nestjs/testing`, mock BullMQ queues with `getQueueToken`

### Dependencies

- No new npm packages — uses native `fetch()` for GraphQL
- Existing `BullModule` from `@nestjs/bullmq` (already in app.module.ts)
- Existing `ZenhubSync` Prisma model (created in zh-1-2)
- Existing error codes: `ZENHUB_API_RATE_LIMITED`, `ZENHUB_API_UNREACHABLE` (in shared package)

### Previous Story Intelligence (zh-1-2)

- `ZenhubSync` model supports `syncType: 'POLL'` enum value
- `ZenhubConfigService.resolveApiToken()` is public — reuse for API auth
- `resolvePollingInterval()` and `resolveWorkspaceMapping()` need to be made public
- EventEmitter2 event pattern established: typed interface, emit with event name string

### Files to Create

- `apps/api/src/modules/zenhub/zenhub-graphql.client.ts`
- `apps/api/src/modules/zenhub/zenhub-polling.service.ts`
- `apps/api/src/modules/zenhub/zenhub-polling.processor.ts`
- `apps/api/src/modules/zenhub/zenhub-graphql.client.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-polling.service.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-polling.processor.spec.ts`

### Files to Modify

- `apps/api/src/modules/zenhub/zenhub.module.ts` — add BullMQ queues, new providers
- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — make resolvePollingInterval + resolveWorkspaceMapping public
- `packages/shared/src/types/zenhub.types.ts` — add poll event types
- `packages/shared/src/index.ts` — export new types

## Tasks / Subtasks

- [x] Task 1: Config service visibility changes (AC: 1)
  - [x] Make `resolvePollingInterval()` public on ZenhubConfigService
  - [x] Make `resolveWorkspaceMapping()` public on ZenhubConfigService

- [x] Task 2: Shared types for polling events (AC: 1, 4)
  - [x] Add `ZenhubPollCompletedEvent` and `ZenhubPollFailedEvent` to shared types
  - [x] Export from `packages/shared/src/index.ts`

- [x] Task 3: GraphQL client (AC: 1, 2, 3)
  - [x] Create `zenhub-graphql.client.ts` with `query()` method using native fetch
  - [x] Implement rate limit handling with Retry-After and exponential backoff
  - [x] Add `ZenhubApiError` and `ZenhubRateLimitError` error classes

- [x] Task 4: Polling service (AC: 1, 3, 4)
  - [x] Create `zenhub-polling.service.ts` with `executePoll()` method
  - [x] Implement pagination for sprints and issues (cursor-based)
  - [x] Log poll results to `zenhub_syncs` with syncType POLL
  - [x] Emit `zenhub.poll.completed` and `zenhub.poll.failed` events
  - [x] Implement `OnModuleInit` to register repeatable BullMQ job

- [x] Task 5: Polling processor (AC: 4, 5)
  - [x] Create `zenhub-polling.processor.ts` extending WorkerHost
  - [x] Implement DLQ handling on max retries
  - [x] Log processing with correlation IDs

- [x] Task 6: Module registration (AC: 5)
  - [x] Register `zenhub-polling` and `zenhub-polling-dlq` queues in ZenhubModule
  - [x] Add all new providers

- [x] Task 7: Unit tests (AC: all)
  - [x] Write `zenhub-graphql.client.spec.ts` (5 test cases)
  - [x] Write `zenhub-polling.service.spec.ts` (4 test cases)
  - [x] Write `zenhub-polling.processor.spec.ts` (3 test cases)
  - [x] Verify all tests pass

## Dev Notes

- Use native `fetch()` for Zenhub GraphQL — no new dependency needed
- Zenhub GraphQL endpoint: `https://api.zenhub.com/public/graphql`
- The polling interval comes from `ZenhubConfigService.resolvePollingInterval()` (DB or env var, default 15min)
- BullMQ retry backoff for polling: 1min base with exponential (1m → 2m → 4m) vs notification's 1s base
- The `zenhub_syncs.deliveryId` for polls should be auto-generated: `poll-<timestamp>-<uuid>`
- Existing GitHub webhook pipeline MUST NOT be affected (AC4) — isolated queue

### Project Structure Notes

- All new files in `apps/api/src/modules/zenhub/` following module co-location
- Tests co-located with source files

### References

- [Source: apps/api/src/modules/notification/notification.module.ts] — BullMQ queue + DLQ pattern
- [Source: apps/api/src/modules/notification/notification.processor.ts] — WorkerHost + DLQ processor pattern
- [Source: apps/api/src/modules/ingestion/github-api.service.ts:230-274] — Rate limit retry + error class pattern
- [Source: apps/api/src/modules/zenhub/zenhub-config.service.ts] — resolveApiToken, resolvePollingInterval, resolveWorkspaceMapping
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md:186-192] — BullMQ polling architecture decision
- [Source: _bmad-output/planning-artifacts/architecture-zenhub-integration.md:316-339] — Polling service pattern code

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 7 tasks completed with all subtasks checked
- 42 tests passing across 7 test files (12 new: 5 client + 4 service + 3 processor)
- No regressions introduced (pre-existing redis/CASL test failures unrelated)
- TypeScript compilation clean for all zenhub files after explicit type annotations
- No new npm dependencies — uses native fetch() for GraphQL
- BullMQ queue isolation ensures no impact on existing GitHub webhook pipeline

### File List

**Created:**

- `apps/api/src/modules/zenhub/zenhub-graphql.client.ts`
- `apps/api/src/modules/zenhub/zenhub-polling.service.ts`
- `apps/api/src/modules/zenhub/zenhub-polling.processor.ts`
- `apps/api/src/modules/zenhub/zenhub-graphql.client.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-polling.service.spec.ts`
- `apps/api/src/modules/zenhub/zenhub-polling.processor.spec.ts`

**Modified:**

- `apps/api/src/modules/zenhub/zenhub.module.ts` — added BullMQ queues, GraphqlClient, PollingService, PollingProcessor
- `apps/api/src/modules/zenhub/zenhub-config.service.ts` — made resolvePollingInterval + resolveWorkspaceMapping public
- `packages/shared/src/types/zenhub.types.ts` — added ZenhubPollCompletedEvent + ZenhubPollFailedEvent
- `packages/shared/src/index.ts` — exported new types

### Change Log

- 2026-03-15: Implemented Zenhub API polling service with BullMQ scheduled repeatable jobs, GraphQL client with rate limit retry, cursor-based pagination, DLQ handling, and zenhub_syncs audit logging
