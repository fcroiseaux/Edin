# Story 1.2: Database Schema Foundation and Prisma Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the database configured with domain-separated schemas and initial tables for contributors and roles,
so that feature development can proceed with a properly structured data layer.

## Acceptance Criteria

### AC1: Domain-Separated Database Schemas

**Given** PostgreSQL is running via Docker Compose
**When** I run `pnpm prisma migrate dev`
**Then** four PostgreSQL schemas are created:

- **core** - Houses contributor identity, roles, authentication state
- **evaluation** - Isolates AI evaluation scores and peer feedback data
- **publication** - Segregates article and editorial workflow data
- **audit** - Maintains immutable security and compliance audit trail

**And** all table and column names follow strict snake_case convention
**And** Prisma model names use PascalCase singular with `@@map` decorators to snake_case plural tables

### AC2: Contributors Table Schema (Core Schema)

**Given** the Prisma schema is configured
**When** I examine the contributors table in the core schema
**Then** the following columns exist with these exact specifications:

| Column     | Type      | Properties                             | Purpose                                                                                                        |
| ---------- | --------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| id         | UUID      | Primary Key, default gen_random_uuid() | Unique system identifier                                                                                       |
| github_id  | Integer   | Unique, Not Null                       | GitHub OAuth identifier                                                                                        |
| email      | String    | Unique, Nullable                       | Contact email from GitHub profile                                                                              |
| name       | String    | Not Null                               | Display name from GitHub                                                                                       |
| bio        | String    | Nullable, max 500 chars                | User-provided biography                                                                                        |
| avatar_url | String    | Nullable                               | GitHub profile avatar URL                                                                                      |
| domain     | Enum      | Nullable                               | Primary domain: Technology / Fintech / Impact / Governance                                                     |
| role       | Enum      | Not Null, Default: PUBLIC              | Permission tier: PUBLIC / APPLICANT / CONTRIBUTOR / EDITOR / FOUNDING_CONTRIBUTOR / WORKING_GROUP_LEAD / ADMIN |
| is_active  | Boolean   | Not Null, Default: true                | Soft-delete support                                                                                            |
| created_at | Timestamp | Not Null, Default: now()               | Account creation timestamp                                                                                     |
| updated_at | Timestamp | Not Null, @updatedAt                   | Last modification timestamp                                                                                    |

**And** all enum values match the RBAC tiers defined in Story 1.4

### AC3: Audit Logs Table Schema (Audit Schema)

**Given** the Prisma schema is configured
**When** I examine the audit_logs table in the audit schema
**Then** the following columns exist:

| Column         | Type      | Properties                   | Purpose                                                                         |
| -------------- | --------- | ---------------------------- | ------------------------------------------------------------------------------- |
| id             | UUID      | Primary Key                  | Unique audit entry identifier                                                   |
| actor_id       | UUID      | FK to contributors, nullable | Contributor performing the action (null for system)                             |
| action         | String    | Not Null                     | Action type: CREATED, UPDATED, DELETED, APPROVED, REJECTED, OVERRIDE, PUBLISHED |
| entity_type    | String    | Not Null                     | Resource type: contributor, evaluation, article, role, settings                 |
| entity_id      | String    | Not Null                     | ID of the affected entity                                                       |
| details        | JSONB     | Nullable                     | Flexible details (old values, new values, reason)                               |
| correlation_id | String    | Nullable                     | Request tracing ID for distributed transaction tracking                         |
| created_at     | Timestamp | Not Null, Default: now()     | Audit entry timestamp                                                           |

**And** all audit_logs rows are immutable (no UPDATE or DELETE operations after insertion)
**And** retention policy enforces 2-year minimum retention (NFR-S6)
**And** correlation_id enables traceability of distributed transactions

### AC4: Zod Schema Integration with packages/shared

**Given** the Prisma schema is configured
**When** I import types from `@edin/shared`
**Then** the following Zod schemas are available:

**createContributorSchema:**

- Validates new contributor creation from OAuth callback
- Requires: github_id (number), name (string), email (string, valid email format), avatar_url (string, URL format)
- Optional: bio (max 500 chars), domain (one of: Technology, Fintech, Impact, Governance)
- Enforces field constraints matching database schema

**updateContributorSchema:**

- Validates contributor profile updates
- Optional fields: name, bio (max 500 chars), domain, avatar_url
- Rejects changes to system fields: id, github_id, role, is_active

**And** TypeScript types are inferred from Zod schemas via `z.infer<typeof schema>` (no duplicate types)
**And** both frontend (Next.js) and backend (NestJS) use identical schemas from `@edin/shared`

### AC5: Development Seeding

**Given** the database is running
**When** I run `pnpm prisma db seed`
**Then** the following seed data is created:

**Admin User:**

- github_id: 1
- email: admin@edin.local
- name: Edin Admin
- role: ADMIN
- is_active: true

**Test Contributor:**

- github_id: 2
- email: contributor@edin.local
- name: Test Contributor
- domain: Technology
- role: CONTRIBUTOR
- is_active: true

**And** seed data is idempotent (safe to run multiple times via upsert)
**And** seed data does not conflict with production migrations
**And** seed script is located at `apps/api/prisma/seed.ts`

## Tasks / Subtasks

- [x] Task 1: Configure Prisma 7 multi-schema setup (AC: 1)
  - [x] 1.1: Create `apps/api/prisma.config.ts` (Prisma 7 requires config at project root, not inside prisma/) with datasource URL via env()
  - [x] 1.2: Update `apps/api/prisma/schema.prisma` with generator, datasource, enums (ContributorRole, ContributorDomain), Contributor model with `@@schema("core")` and `@@map("contributors")`, AuditLog model with `@@schema("audit")` and `@@map("audit_logs")`
  - [x] 1.3: Add empty schema placeholders for `evaluation` and `publication` (created via raw SQL in migration)
  - [x] 1.4: Create initial migration via `pnpm prisma migrate dev --name init_core_audit_schemas`
  - [x] 1.5: Add raw SQL to migration to `CREATE SCHEMA IF NOT EXISTS evaluation; CREATE SCHEMA IF NOT EXISTS publication;` for the two schemas without tables yet
- [x] Task 2: Create Zod schemas in packages/shared (AC: 4)
  - [x] 2.1: Create `packages/shared/src/schemas/contributor.schema.ts` with `createContributorSchema` and `updateContributorSchema`
  - [x] 2.2: Create `packages/shared/src/types/contributor.types.ts` with types inferred from Zod schemas
  - [x] 2.3: `packages/shared/src/constants/roles.ts` already exists with ContributorRole enum values (from Story 1.1)
  - [x] 2.4: Create `packages/shared/src/constants/domains.ts` with ContributorDomain enum values
  - [x] 2.5: Update `packages/shared/src/index.ts` to re-export all schemas, types, and constants
- [x] Task 3: Create seed script (AC: 5)
  - [x] 3.1: Create `apps/api/prisma/seed.ts` with idempotent upsert for admin and test contributor
  - [x] 3.2: Configure seed command in `apps/api/prisma.config.ts` under `migrations.seed` (Prisma 7 uses config file, not package.json)
  - [x] 3.3: Verify seed runs successfully: `pnpm prisma db seed` (idempotent, verified by running twice)
- [x] Task 4: Update PrismaService for Prisma 7 (AC: 1, 2, 3)
  - [x] 4.1: Update `apps/api/src/prisma/prisma.service.ts` to use Prisma 7 adapter pattern (PrismaPg adapter with ConfigService)
  - [x] 4.2: Ensure PrismaService logs connection events via NestJS Logger (backed by Pino)
  - [x] 4.3: Verify PrismaModule is registered as global module in `app.module.ts` (already configured)
- [x] Task 5: Integration verification (AC: 1, 2, 3, 4, 5)
  - [x] 5.1: Run `pnpm prisma migrate dev` and verify all four schemas exist (core, audit, evaluation, publication)
  - [x] 5.2: Run `pnpm prisma db seed` and verify seed data (admin + test contributor, idempotent)
  - [x] 5.3: Run `pnpm prisma generate` and verify type generation (generated to apps/api/generated/prisma/client/)
  - [x] 5.4: Verify `@edin/shared` exports compile in both `apps/api` and `apps/web` (pnpm build passes)
  - [x] 5.5: Run `pnpm build` to ensure no build breakage (all 4 packages build successfully)
  - [x] 5.6: Run `pnpm lint` and `pnpm test` to verify quality gates (6 lint tasks pass, 60 tests pass)

## Dev Notes

### Architecture Compliance

- **Database:** Single PostgreSQL 16+ instance with domain-separated schemas (core, evaluation, publication, audit)
- **ORM:** Prisma 7.x exclusively. No other ORM or raw query pattern unless migration SQL
- **Validation:** Zod in `packages/shared` as single source of truth. Types inferred via `z.infer`, never duplicated
- **Module ownership:** A module may only WRITE to tables in its owning schema. Cross-schema reads allowed via Prisma relations
- **API response envelope:** All data returned through contributor endpoints must follow `{ data, meta }` envelope (handled by existing ResponseWrapperInterceptor)
- **Error mapping:** Prisma UniqueConstraintViolation on github_id -> `DUPLICATE_GITHUB_ID` error code mapped through DomainException

### Prisma 7 Critical Gotchas (from Story 1.1 learnings)

- **prisma.config.ts required:** Connection URL management moved from schema.prisma to config file
- **Generator name:** Use `prisma-client` (NOT `prisma-client-js`)
- **Explicit output path:** `output = "../node_modules/.prisma/client"`
- **PrismaClient constructor:** Requires config object, NOT zero-argument constructor
- **Connection pool:** NO default timeout in Prisma 7 - must explicitly configure `pool_timeout` and `connection_limit`
- **Multi-schema approach:** Use single schema.prisma file with `@@schema("name")` attributes on each model. Do NOT use multi-file schema (known issues in Prisma 7)
- **ESM requirement:** TypeScript must target `ES2023`, module `ESNext`

### Database Naming Conventions

| Element        | Convention              | Example                                      |
| -------------- | ----------------------- | -------------------------------------------- |
| Tables         | snake_case, plural      | `contributors`, `audit_logs`                 |
| Columns        | snake_case              | `github_id`, `created_at`, `is_active`       |
| Primary keys   | `id` (UUID)             | `id UUID DEFAULT gen_random_uuid()`          |
| Foreign keys   | `{table_singular}_id`   | `contributor_id`, `article_id`               |
| Indexes        | `idx_{table}_{columns}` | `idx_contributors_email`                     |
| Enums (Prisma) | PascalCase              | `ContributorRole`, `ContributorDomain`       |
| Prisma models  | PascalCase singular     | `Contributor`, `AuditLog`                    |
| Schema names   | snake_case singular     | `core`, `evaluation`, `publication`, `audit` |

### Code Naming Conventions (from architecture)

| Element        | Convention                 | Example                       |
| -------------- | -------------------------- | ----------------------------- |
| Files (NestJS) | kebab-case with suffix     | `contributor.service.ts`      |
| Test files     | `.spec.ts` co-located      | `contributor.service.spec.ts` |
| Classes        | PascalCase                 | `ContributorService`          |
| Functions      | camelCase                  | `getContributor()`            |
| Constants      | UPPER_SNAKE_CASE           | `MAX_BIO_LENGTH`              |
| Zod schemas    | camelCase + Schema suffix  | `createContributorSchema`     |
| NestJS modules | PascalCase + Module suffix | `ContributorModule`           |

### Logging Standards

- All database operations log at `info` level for key events (contributor created, seed completed)
- Errors log at `error` level with full context
- Always include `correlationId` in log context
- Never log PII (email, name) at `info` level or above - use contributor ID only

### File Locations

| File                    | Path                                                | Action                      |
| ----------------------- | --------------------------------------------------- | --------------------------- |
| Prisma config           | `apps/api/prisma/prisma.config.ts`                  | CREATE                      |
| Prisma schema           | `apps/api/prisma/schema.prisma`                     | UPDATE (currently skeleton) |
| Migrations              | `apps/api/prisma/migrations/`                       | AUTO-GENERATED              |
| Seed script             | `apps/api/prisma/seed.ts`                           | CREATE                      |
| PrismaService           | `apps/api/src/prisma/prisma.service.ts`             | UPDATE (currently shell)    |
| Contributor Zod schemas | `packages/shared/src/schemas/contributor.schema.ts` | CREATE                      |
| Contributor types       | `packages/shared/src/types/contributor.types.ts`    | CREATE                      |
| Roles constants         | `packages/shared/src/constants/roles.ts`            | CREATE                      |
| Domains constants       | `packages/shared/src/constants/domains.ts`          | CREATE                      |
| Shared index            | `packages/shared/src/index.ts`                      | UPDATE                      |

### Existing Infrastructure (Do NOT modify)

- Docker Compose: PostgreSQL 16 + Redis 7 already configured and running
- NestJS bootstrap (main.ts): Pino logging, OpenTelemetry, Swagger, CORS, Helmet all configured
- GlobalExceptionFilter: Already wraps errors in standard envelope
- CorrelationIdInterceptor: Already assigns correlation IDs to requests
- ResponseWrapperInterceptor: Already wraps success responses in `{ data, meta }`
- CI/CD pipeline: Already runs build, lint, test, security scan
- Husky + commitlint: Already enforcing commit standards

### Cross-Story Dependencies

**This story blocks:**

- Story 1.3 (GitHub OAuth) - needs contributors table for user records
- Story 1.4 (RBAC) - needs role enum and audit_logs table
- Story 1.5 (Founding Contributor) - needs contributors + audit_logs
- Epic 2+ stories - all need contributor profile structure

**This story depends on:**

- Story 1.1 (DONE) - Docker Compose with PostgreSQL, monorepo structure, packages/shared created

### Project Structure Notes

- Monorepo uses Turborepo + pnpm workspaces
- Local packages referenced via workspace protocol: `"@edin/shared": "workspace:*"`
- Build commands: `pnpm build` (all), `pnpm --filter api build` (API only)
- Dev commands: `pnpm dev` (all), `pnpm --filter api dev` (API only)

### Testing Requirements

- Unit tests: Vitest with co-located `*.spec.ts` files
- Zod schema tests: Verify valid inputs pass, invalid inputs fail with correct error messages
- Migration test: Verify `pnpm prisma migrate dev` creates all schemas and tables
- Seed test: Verify `pnpm prisma db seed` populates expected records and is idempotent
- Build verification: `pnpm build` must pass without errors

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 1, Story 1.2]
- [Source: _bmad-output/planning-artifacts/architecture.md - Database Architecture, Naming Conventions, Code Structure]
- [Source: _bmad-output/planning-artifacts/prd.md - FR6, FR7, NFR-S3, NFR-S6, Data Model Requirements]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Role Display, Domain Badges]
- [Source: _bmad-output/implementation-artifacts/1-1-initialize-monorepo-and-development-environment.md - Established Patterns, Prisma 7 Gotchas]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma 7 breaking changes: `url` removed from schema.prisma datasource; moved to `prisma.config.ts` with `datasource.url`
- Prisma 7 config file must be at project root (not inside prisma/ directory)
- Prisma 7 client uses adapter pattern: `@prisma/adapter-pg` required for PostgreSQL
- Prisma 7 PrismaClient constructor requires config object (not zero-arg)
- Prisma 7 `multiSchema` preview feature deprecated, now available by default
- Prisma 7 generated client output is TypeScript; import from generated path, not `@prisma/client`
- Prisma 7 seed config uses `migrations.seed` in `prisma.config.ts`, not `prisma.seed` in `package.json`
- Prisma 7 PrismaClient no longer accepts `datasourceUrl` constructor option

### Completion Notes List

- Task 1: Configured Prisma 7 multi-schema setup with `prisma.config.ts`, full schema with Contributor and AuditLog models, enums, and four PostgreSQL schemas. Initial migration auto-generated plus manual raw SQL for evaluation/publication schemas.
- Task 2: Created Zod validation schemas (`createContributorSchema`, `updateContributorSchema`), TypeScript types inferred from Zod, domain constants, and re-exported from `@edin/shared`. 27 unit tests covering valid inputs, invalid inputs, nullable email, and edge cases.
- Task 3: Created idempotent seed script with PrismaPg adapter, configured in `prisma.config.ts`. Seeds admin user (ADMIN role) and test contributor (CONTRIBUTOR role, Technology domain).
- Task 4: Updated PrismaService to extend PrismaClient using Prisma 7 adapter pattern with `PrismaPg`, injects `ConfigService` for DATABASE_URL, validates required env configuration, and logs connection lifecycle events. 7 unit tests added.
- Task 5: Full integration verification passed: all 4 schemas exist, seed data correct and idempotent, prisma generate works, `pnpm build` passes (all packages), `pnpm lint` passes (6 tasks), `pnpm test` passes (60 tests).

### Implementation Plan

- Used Prisma 7 adapter pattern (`@prisma/adapter-pg`) for all database connections
- Generated Prisma client to `apps/api/generated/prisma/client/` (gitignored)
- Multi-schema via `@@schema()` attribute on each model (single schema.prisma file)
- Zod as single source of truth for validation; TypeScript types inferred via `z.infer`
- Used `.strict()` on update schema to reject system fields (id, github_id, role, is_active)

### File List

**Created:**

- `apps/api/prisma.config.ts` — Prisma 7 config with datasource URL, migration path, seed command
- `apps/api/prisma/migrations/20260302093909_init_core_audit_schemas/migration.sql` — Initial migration SQL
- `apps/api/prisma/seed.ts` — Idempotent seed script for admin and test contributor
- `apps/api/src/prisma/prisma.service.spec.ts` — PrismaService unit tests (4 tests)
- `packages/shared/src/schemas/contributor.schema.ts` — Zod validation schemas
- `packages/shared/src/schemas/contributor.schema.spec.ts` — Schema validation tests (26 tests)
- `packages/shared/src/types/contributor.types.ts` — TypeScript types inferred from Zod
- `packages/shared/src/constants/domains.ts` — ContributorDomain enum values

**Modified:**

- `apps/api/prisma/schema.prisma` — Full Prisma schema with models, enums, multi-schema config
- `apps/api/src/prisma/prisma.service.ts` — Extends PrismaClient with Prisma 7 adapter pattern
- `apps/api/package.json` — Added @prisma/client, @prisma/adapter-pg, prisma devDependency
- `packages/shared/src/index.ts` — Re-exports new schemas, types, constants
- `package.json` — Added prisma and @prisma/engines to onlyBuiltDependencies
- `.gitignore` — Added apps/api/generated/ to ignored paths
- `pnpm-lock.yaml` — Lockfile updates for Prisma 7 and adapter dependencies

## Senior Developer Review (AI)

### Reviewer

Fabrice (AI workflow), 2026-03-02

### Outcome

Changes requested were resolved and verified against ACs.

### Issues Fixed

- Added explicit `core` schema creation and fully schema-qualified `core` objects in migration SQL.
- Added database-level immutability enforcement for `audit.audit_logs` with update/delete blocking triggers.
- Added explicit retention policy statement tied to immutable audit-log design.
- Aligned contributor create validation with nullable database email (`email` accepts `null`).
- Added fail-fast `DATABASE_URL` validation in `PrismaService`.
- Expanded PrismaService tests to cover lifecycle hooks and required configuration behavior.
- Synced story file list with actual git changes by documenting `pnpm-lock.yaml`.

## Change Log

- 2026-03-02: Story 1.2 implemented — Database schema foundation with Prisma 7, domain-separated schemas (core, audit, evaluation, publication), Contributor and AuditLog models, Zod validation schemas, seed data, PrismaService with adapter pattern
- 2026-03-02: Code review fixes applied — core schema migration corrected, audit immutability enforced with triggers, nullable email validation aligned, PrismaService config guard and lifecycle tests added, file list synchronized
