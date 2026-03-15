# Story zh-1-1: Zenhub Integration Configuration & Permissions

## Status: done

## Story

As an admin,
I want to configure Zenhub API credentials, webhook settings, polling interval, and workspace mapping with role-based access control enforced,
So that I can securely set up and manage the integration before data starts flowing.

## Epic

zh-Epic 1: Integration Setup & Data Pipeline

## FRs Covered

FR29, FR30, FR31, FR32, FR37, FR38, FR39

## Acceptance Criteria

1. **Given** an admin is authenticated **When** they navigate to the Zenhub configuration page **Then** they can view and update the Zenhub API key, webhook URL, webhook secret, polling interval, and workspace mapping **And** changes are persisted securely (API tokens never in client-side code or logs)

2. **Given** a non-admin user (contributor or project lead) **When** they attempt to access the Zenhub configuration page or API **Then** they receive a 403 Forbidden response

3. **Given** the CASL permission model **When** sprint-related subjects are queried **Then** `SprintMetric` grants: admin (CRUD), project_lead (read all), contributor (read own) **And** `SprintDashboard` grants: admin (full), project_lead (read), contributor (none) **And** `IntegrationConfig` grants: admin only

4. **Given** environment variables are not configured **When** the application starts **Then** Zod validation reports missing required variables clearly without exposing secrets

## Technical Implementation Context

### Architecture References

- Architecture: `_bmad-output/planning-artifacts/architecture-zenhub-integration.md`
- PRD: `_bmad-output/planning-artifacts/prd-zenhub-integration.md`
- Epics: `_bmad-output/planning-artifacts/epics-zenhub-integration.md`

### Implementation Approach

**Backend:**

1. **CASL Subjects** (`apps/api/src/modules/auth/casl/subjects.ts`): Add `SprintMetric`, `SprintDashboard`, `IntegrationConfig` to `AppSubjects` union type

2. **CASL Ability Factory** (`apps/api/src/modules/auth/casl/ability.factory.ts`): Add permissions per role as per AC3

3. **Error Codes** (`packages/shared/src/constants/error-codes.ts`): Add Zenhub-specific error codes (ZENHUB_WEBHOOK_SIGNATURE_INVALID, ZENHUB_WEBHOOK_DUPLICATE_EVENT, ZENHUB_API_RATE_LIMITED, ZENHUB_API_UNREACHABLE, ZENHUB_CONFIG_NOT_FOUND)

4. **Env Config** (`apps/api/src/config/zenhub.config.ts`): Zod-validated Zenhub env vars — all optional with defaults since config can also be set via admin panel

5. **Update App Config** (`apps/api/src/config/app.config.ts`): Merge Zenhub env vars into app config schema

6. **Shared Schemas** (`packages/shared/src/schemas/zenhub-config.schema.ts`): Zod schemas for Zenhub config DTOs

7. **Shared Types** (`packages/shared/src/types/zenhub.types.ts`): TypeScript types for Zenhub config

8. **Zenhub Module** (`apps/api/src/modules/zenhub/`):
   - `zenhub.module.ts`: Module importing PrismaModule, CaslModule, SettingsModule
   - `zenhub-config.controller.ts`: GET/PATCH endpoints at `/api/v1/admin/zenhub-config` — admin-only via CASL
   - `zenhub-config.service.ts`: Service using SettingsService for persistence, audit logging via AuditService

9. **Register Module** (`apps/api/src/app.module.ts`): Import ZenhubModule

**Frontend:**

10. **Admin Configuration Page** (`apps/web/app/(admin)/admin/sprints/configuration/page.tsx`): Form for API key, webhook URL, webhook secret, polling interval, workspace mapping

11. **TanStack Query Hooks** (`apps/web/hooks/use-zenhub-config.ts`): Fetch/update config

12. **Admin Nav** (`apps/web/app/(admin)/layout.tsx`): Add "Sprints" nav item

**Tests:**

13. Unit tests for zenhub-config.service, zenhub-config.controller, CASL subjects

### Key Patterns to Follow

- Controller: `@Controller({ path: 'admin/zenhub-config', version: '1' })` with `@UseGuards(JwtAuthGuard, AbilityGuard)` and `@CheckAbility`
- Service: Inject `SettingsService` for PlatformSetting persistence, `AuditService` for audit logging
- Config: Stored as `PlatformSetting` keys (e.g., `zenhub.webhook_url`, `zenhub.polling_interval_ms`, `zenhub.workspace_mapping`)
- Security: API token masked in GET responses (show only last 4 chars), never logged
- Response: Use `createSuccessResponse()` envelope
- Errors: Use `DomainException` with domain-prefixed error codes

### Dependencies

- Existing `SettingsModule` / `SettingsService` for config persistence
- Existing CASL infrastructure (`CaslModule`, `AbilityGuard`, `CheckAbility`)
- Existing `AuditService` for audit logging
- No new Prisma migrations needed (uses existing PlatformSetting model)
