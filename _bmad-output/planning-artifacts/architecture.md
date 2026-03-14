---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-01'
lastEditedAt: '2026-03-14'
editReason: 'Add ROSE Design System Architecture section — design tokens, ABC Normal font strategy, sidebar navigation, component library scope, Reading Canvas layout. Aligns architecture with ROSE UX revision (2026-03-14).'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/product-brief-Edin-2026-02-27.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - docs/edin_platform_description.md
  - docs/rose-design/ROSE_deck.pdf
  - docs/rose-design/fonts/ABCNormal-*.ttf
workflowType: 'architecture'
project_name: 'Edin'
user_name: 'Fabrice'
date: '2026-03-01'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

79 functional requirements across 13 categories, with clear MVP/Phase 2+ phase annotations:

| Category                             | FR Count       | MVP Scope                             | Architectural Implication                                                             |
| ------------------------------------ | -------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| Contributor Identity & Profiles      | 8 (FR1-FR7b)   | Full                                  | User management service, OAuth integration, RBAC engine                               |
| Admission & Onboarding               | 7 (FR8-FR14)   | Full                                  | Application workflow engine, buddy matching, onboarding state machine                 |
| Contribution Ingestion & Attribution | 6 (FR15-FR20)  | Full                                  | GitHub webhook listener, ingestion pipeline, normalization layer, attribution engine  |
| AI Evaluation Engine                 | 7 (FR21-FR27)  | Full                                  | ML model serving, evaluation pipeline, model versioning, human review queue           |
| Peer Feedback System                 | 5 (FR28-FR32)  | Full                                  | Assignment algorithm, rubric engine, turnaround tracking                              |
| Community Structure & Working Groups | 6 (FR33-FR38)  | Full                                  | Task management, working group domain model, contribution menu                        |
| Activity Feed & Community Visibility | 4 (FR39-FR42)  | Full                                  | Real-time event stream, notification service, feed aggregation                        |
| Public Showcase & Investor View      | 5 (FR43-FR47)  | Full                                  | Public API layer, metrics aggregation, SSR for SEO                                    |
| Admin & Platform Operations          | 5 (FR48-FR52b) | Mostly Full                           | Admin dashboard, metrics pipeline, audit log service                                  |
| Governance & Proposals               | 4 (FR53-FR56)  | Phase 2 (except FR55b static display) | Proposal lifecycle engine, governance weight calculator                               |
| Reward System Foundations            | 4 (FR57-FR60)  | Partial (basic scoring Phase 1)       | Score computation engine, temporal aggregation, visualization                         |
| Publication Platform                 | 14 (FR66-FR79) | Full                                  | CMS/authoring service, editorial workflow engine, plagiarism detection, SEO rendering |
| Compliance & Data Protection         | 5 (FR61-FR65)  | Full                                  | Consent management, data export/deletion, PII separation, AI Act documentation        |

**Non-Functional Requirements:**

40+ NFRs organized into 8 categories that drive architectural decisions:

- **Performance (NFR-P1-P7):** FCP <1.5s, TTI <3s, API p95 <500ms, feed updates <5s, GitHub ingestion <15min, AI evaluation <30min code / <15min docs
- **Security (NFR-S1-S9):** Encryption in transit/at rest, OAuth 2.0/OIDC with PKCE, RBAC enforcement, OWASP Top 10, immutable audit logs (2-year retention), PII separation, smart contract audits (Phase 2+)
- **Scalability (NFR-SC1-SC6):** 50 concurrent users Phase 1, 200 Phase 2, 500+ contributions/day, 20+ repos, horizontal scaling to 3x without re-architecture
- **Reliability (NFR-R1-R5):** >99.5% uptime, RPO <4h, RTO <2h, graceful degradation for evaluation engine
- **Accessibility (NFR-A1-A5):** WCAG 2.1 AA, screen reader support, keyboard navigation, automated + quarterly manual audits
- **Integration (NFR-I1-I5):** >99% ingestion success, rate limiting handling, extensible schema for Phase 2 integrations, API versioning, least-privilege connectors
- **Observability (NFR-O1-O4):** Alerting within 60s, correlation IDs on all requests, KPI dashboards <5min lag, zero-downtime deployments with <5min rollback
- **Content Delivery (NFR-C1-C3):** Article FCP <1.2s, LCP <2.5s, SSR with structured data, 1000+ articles without degradation

**Scale & Complexity:**

- Primary domain: Full-stack web application (finance domain)
- Complexity level: High
- Estimated architectural components: 12-15 distinct services/modules

### Technical Constraints & Dependencies

- **GitHub API dependency** — Webhook-first with REST API fallback; rate limiting handling required; >99% ingestion reliability target
- **OAuth 2.0 / OIDC** — GitHub OAuth as primary authentication; email/password fallback; future eIDAS 2.0 wallet integration must be accommodated
- **AI/ML model serving** — Evaluation engine must support model versioning, A/B testing against human experts, and graceful degradation
- **Blockchain L2 (Phase 2)** — Architecture must accommodate future on-chain reward distribution; data separation (no PII on-chain) is a Phase 1 constraint
- **GDPR & EU AI Act** — Data portability, right to erasure with pseudonymization, model cards, human oversight documentation — all Phase 1 requirements
- **MiCA regulatory dependency** — Token classification outcome will shape Phase 2 reward system design; architecture must remain flexible until classification is resolved
- **Belgian non-profit structure (IOUR Foundation)** — Governance and financial constraints from foundation legal framework
- **Budget constraint** — EUR 1M seed/MVP fundraising target; 2-3 full-stack developers + 1 AI/ML engineer + operations

### Cross-Cutting Concerns Identified

1. **Authentication & Authorization** — OAuth 2.0/OIDC flows, RBAC with 7 tiers, permission enforcement across every API endpoint and UI component
2. **Audit Logging** — Immutable logs for all security-relevant actions (admission, evaluations, role changes, governance, content moderation); 2-year retention; queryable within 10s
3. **Observability** — Correlation IDs on 100% of requests, structured logging, alerting within 60s, KPI dashboards, zero-downtime deploys
4. **Data Privacy & Separation** — PII stored separately from contribution/evaluation records; on-chain records contain no identifiable data; GDPR export/deletion support
5. **API Versioning** — All endpoints versioned from day one; 6-month deprecation support for deprecated endpoints
6. **Graceful Degradation** — Evaluation engine failures show "pending" state; ingestion pipeline retries with exponential backoff; peer feedback has manual override fallback
7. **Accessibility** — WCAG 2.1 AA across all pages; screen reader announcements within 2s of dynamic updates; keyboard-only navigation for all flows
8. **Extensibility** — Integration schema designed for Phase 2 sources (Google Workspace, Slack); evaluation pipeline accepts new contribution types; connector architecture supports community-built integrations in Phase 3

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application based on project requirements analysis. The platform requires a rich SSR-capable frontend (SEO for publication platform and public showcase), a modular backend API with complex business logic (evaluation engine, ingestion pipeline, RBAC), real-time features, and AI/ML integration.

### Technical Preferences

- **Language:** TypeScript (end-to-end)
- **Frontend:** Next.js (App Router)
- **Backend:** NestJS
- **Database:** PostgreSQL
- **Cache:** Redis
- **Containerization:** Docker

### Starter Options Considered

**Option A: next-forge (Turborepo-based Next.js template)**

- Production-grade Turborepo template with auth, ORM, billing, analytics, emails, i18n, feature flags
- Strong for Next.js-only full-stack apps (API routes within Next.js)
- **Rejected:** Opinionated around Next.js API routes — does not accommodate a separate NestJS backend. Comes with vendor-specific integrations (Clerk, Stripe, Resend) that do not align with Edin's needs. Significant surgery required to integrate NestJS, defeating the purpose of a starter

**Option B: Nx monorepo with Next.js + NestJS generators**

- First-class generators for both Next.js and NestJS
- Richer tooling: dependency graph visualization, affected commands, code generators
- **Rejected:** Heavier setup, steeper learning curve, more configuration. Better suited for larger teams (10+). Edin's team of 2-3 developers would be over-served by Nx's enterprise features

**Option C: Turborepo + pnpm workspaces (custom scaffold) — Selected**

- Lightweight monorepo management with create-turbo
- Clean separation: apps/web (Next.js), apps/api (NestJS), packages/shared (shared types, validators, contracts)
- Minimal overhead — Turborepo handles caching and task orchestration, pnpm handles dependency management
- Full control over each app's configuration without fighting starter opinions
- Ideal for a 2-3 developer team that needs speed without enterprise complexity

### Selected Starter: Turborepo + pnpm workspaces

**Rationale for Selection:**

Turborepo with pnpm workspaces provides the lightest-weight monorepo management while giving full control over the Next.js and NestJS configurations. For a small team (2-3 developers), this avoids the overhead of enterprise tooling (Nx) and the opinion lock-in of full-stack starters (next-forge). The custom scaffold approach ensures each app is initialized with its official CLI tooling, guaranteeing compatibility with latest versions and documentation.

**Initialization Command:**

```bash
npx create-turbo@latest edin --package-manager pnpm
```

Then scaffold within the monorepo:

```bash
# Frontend
cd apps && npx create-next-app@latest web --typescript --tailwind --eslint --app --turbopack

# Backend
cd apps && npx @nestjs/cli new api --package-manager pnpm --strict

# Shared packages
mkdir -p packages/shared packages/config packages/tsconfig
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**

- TypeScript end-to-end (frontend, backend, shared packages)
- Node.js runtime for both Next.js and NestJS
- Strict TypeScript configuration enforced via --strict flag

**Styling Solution:**

- Tailwind CSS 4.x (default with Next.js 16, aligns with UX spec's design system)

**Build Tooling:**

- Turbopack (stable in Next.js 16, used by default for dev and build)
- Turborepo for monorepo task orchestration and caching
- pnpm for dependency management with workspace protocol

**Testing Framework:**

- Vitest for unit and integration tests (fast, TypeScript-native)
- Playwright for end-to-end tests (cross-browser, accessibility testing support)

**Code Organization:**

- Monorepo structure: apps/web, apps/api, packages/shared, packages/config, packages/tsconfig
- Shared types and validators as single source of truth across frontend and backend
- NestJS modular architecture with dependency injection for backend services

**Development Experience:**

- Hot reloading via Turbopack (frontend) and NestJS watch mode (backend)
- Docker Compose for local development (PostgreSQL, Redis)
- ESLint + Prettier for consistent code formatting
- Turborepo remote caching for CI/CD optimization

**Technology Stack Summary:**

| Component        | Choice                  | Version |
| ---------------- | ----------------------- | ------- |
| Monorepo         | Turborepo + pnpm        | Latest  |
| Frontend         | Next.js (App Router)    | 16.x    |
| Backend          | NestJS                  | 11.x    |
| ORM              | Prisma                  | 7.x     |
| Database         | PostgreSQL              | 16+     |
| Cache            | Redis                   | 7.x     |
| Containerization | Docker + Docker Compose | Latest  |
| Styling          | Tailwind CSS            | 4.x     |
| Testing          | Vitest + Playwright     | Latest  |
| Linting          | ESLint + Prettier       | Latest  |

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Data modeling: Single PostgreSQL database with domain-separated schemas
- Authentication: Passport.js + JWT + CASL RBAC
- API style: REST with OpenAPI/Swagger
- Async processing: BullMQ for job queues
- Validation: Zod (shared packages, single source of truth)

**Important Decisions (Shape Architecture):**

- Real-time: SSE for Activity Feed
- Frontend state: TanStack Query + Zustand
- Rich text editor: Tiptap for Publication Platform
- Internal communication: NestJS EventEmitter2 (modular monolith)
- Observability: OpenTelemetry + Pino structured logging

**Deferred Decisions (Post-MVP):**

- Blockchain L2 selection (awaiting MiCA classification)
- AI model serving infrastructure (awaiting evaluation prototype validation)
- Microservices extraction (Phase 2 scale threshold: 200+ users)
- CDN / Edge caching (awaiting publication traffic growth)
- GraphQL layer (awaiting external API consumer needs)

### Data Architecture

**Database Design:**

- Decision: Single PostgreSQL 16+ instance with domain-separated schemas
- Schemas: `core` (contributors, roles, working groups), `evaluation` (AI evaluations, peer feedback, scores), `publication` (articles, editorial workflow), `audit` (immutable logs, governance actions)
- Rationale: Clean domain boundaries mapping to NestJS modules without multi-database operational overhead. Single instance simplifies transactional consistency and cross-domain queries
- ORM: Prisma 7.x with Prisma Migrate for schema migrations

**Caching Strategy:**

- Decision: Redis 7.x for Activity Feed cache, session store, contributor profile cache, evaluation score cache, rate limiting counters, and BullMQ job queue backing store
- Rationale: Single Redis instance serves multiple purposes at Phase 1 scale. Separate Redis instances only if scaling demands it

**Job Queue:**

- Decision: BullMQ (Redis-backed)
- Use cases: GitHub ingestion pipeline, AI evaluation dispatch, notification delivery, peer feedback assignment, plagiarism detection
- Rationale: Mature, battle-tested, excellent NestJS integration via @nestjs/bullmq. Built-in retry, dead-letter queues, rate limiting, and delayed jobs

**Validation:**

- Decision: Zod in packages/shared as single source of truth
- Usage: Shared Zod schemas validate on both frontend (React Hook Form resolver) and backend (NestJS pipes). API request/response contracts defined once, enforced everywhere
- Rationale: Eliminates validation drift between frontend and backend. TypeScript type inference from Zod schemas reduces boilerplate

### Authentication & Security

**Authentication:**

- Decision: Passport.js via @nestjs/passport
- Strategies: GitHub OAuth (primary), Local strategy with email/password (fallback)
- Rationale: NestJS-native, no vendor lock-in, full control for future eIDAS 2.0 digital identity wallet integration

**Token Strategy:**

- Decision: JWT with short-lived access tokens (15 minutes) + Redis-stored refresh tokens (30-day expiry, rotation on every use)
- Session expiry: 24 hours of inactivity (NFR-S4)
- Rationale: Stateless API calls for performance, instant refresh token revocation via Redis for security (e.g., admin revoking contributor access)

**RBAC:**

- Decision: CASL (@casl/ability) with NestJS guards
- Implementation: Define abilities per role, check against specific resources. Decorator-based (`@CheckAbility()`) for clean controller code
- 7 tiers: Public, Applicant, Contributor/Author, Editor, Founding Contributor, Working Group Lead, Admin
- Rationale: Resource-level granularity ("editor can edit only assigned articles", "WG lead manages only their domain") without hand-rolling complex guard logic. Scales naturally as new roles/resources appear

**API Security:**

- Decision: Helmet (security headers) + CORS configuration + @nestjs/throttler (Redis-backed rate limiting)
- Rationale: OWASP Top 10 coverage out of the box. Per-user rate limiting via Redis counters

**Secrets Management:**

- Decision: NestJS ConfigModule with Zod schema validation at startup
- Rationale: Application crashes immediately on misconfiguration rather than failing at runtime. Environment variables validated against a Zod schema on bootstrap

### API & Communication Patterns

**API Style:**

- Decision: RESTful API with OpenAPI/Swagger auto-generated documentation
- Implementation: @nestjs/swagger decorators on controllers. Swagger UI available at /api/docs in development
- Rationale: NestJS has first-class Swagger support. Simpler than GraphQL for a small team. Can layer GraphQL later if external API consumers need flexible queries

**API Versioning:**

- Decision: URI-based versioning (`/api/v1/...`)
- Implementation: NestJS versioning module with URI strategy
- Deprecation policy: 6-month support for deprecated endpoints (NFR-I4)
- Rationale: Simplest to understand, debug, and route

**Error Handling:**

- Decision: Global NestJS exception filter with standard error envelope
- Format: `{ status, message, code, correlationId, timestamp }`
- Implementation: Correlation ID injected via middleware on every request, propagated through all logs and responses
- Rationale: Consistent error format across all endpoints. Correlation ID enables NFR-O2 (trace from user report to root cause within 30 minutes)

**Real-Time Communication:**

- Decision: Server-Sent Events (SSE) for Activity Feed
- Implementation: NestJS @Sse() decorator, Redis pub/sub for multi-instance broadcasting
- Rationale: One-directional (server to client) is all the feed needs. Simpler than WebSocket, native browser support. Upgrade to WebSocket only if bidirectional needs emerge (Phase 2 governance discussions)

**Async Processing:**

- Decision: BullMQ with dedicated queues per domain
- Queues: `github-ingestion`, `evaluation-dispatch`, `notification`, `feedback-assignment`, `plagiarism-check`
- Rationale: Isolated queues prevent slow evaluation jobs from blocking fast notification delivery. Dead-letter queues for failed jobs enable NFR-R2 (zero contribution loss)

**Internal Module Communication:**

- Decision: NestJS EventEmitter2 for loose coupling between modules
- Events: `contribution.ingested`, `evaluation.completed`, `feedback.submitted`, `article.published`, etc.
- Rationale: Decouples modules (ingestion module emits, evaluation module listens) while staying in-process. No distributed messaging overhead at Phase 1 scale. EventEmitter2 becomes a message broker (RabbitMQ, NATS) only if microservices extraction is needed

### Frontend Architecture

**Server State Management:**

- Decision: TanStack Query (React Query)
- Rationale: Industry standard for Next.js App Router. Handles caching, deduplication, background refetching, and optimistic updates. Eliminates manual fetch/cache logic

**Client State Management:**

- Decision: Zustand
- Use cases: UI-only state (sidebar toggle, modal state, theme preference, notification panel)
- Rationale: Minimal footprint, no boilerplate, scales without pain. Avoids Redux complexity for simple UI state

**Forms:**

- Decision: React Hook Form + @hookform/resolvers/zod
- Rationale: Zod schemas from packages/shared validate on both client and server. Performant (uncontrolled components by default), excellent TypeScript integration

**Component Organization:**

- Decision: Feature-based co-location with Next.js App Router route groups
- Structure: `app/(public)/` (showcase, articles, manifestos), `app/(dashboard)/` (contributor views), `app/(admin)/` (admin panel)
- Shared UI components in `packages/ui` (ROSE design system: tokens, fonts, layout containers, Radix wrappers, domain identity, content display, profile/reward components — see "ROSE Design System Architecture" section)
- Rationale: Features are self-contained. Adding a new feature means adding a route group, not touching shared directories

**Rich Text Editor (Publication Platform):**

- Decision: Tiptap (headless, ProseMirror-based)
- Rationale: Extensible, headless editor that fits the "modern Economist" editorial experience from the UX spec. Supports inline comments for editorial feedback (FR68). Collaborative editing path available for Phase 2

**Data Visualization:**

- Decision: Recharts
- Use cases: Evaluation score charts, reward trajectory visualization, admin health metrics, contribution patterns
- Rationale: Lightweight, composable, React-native. Accessible by default (NFR-A4). Sufficient for Phase 1 charting needs

### Infrastructure & Deployment

**Hosting Strategy:**

- Decision: Docker containers, cloud-agnostic
- Local: Docker Compose (PostgreSQL, Redis, API, Web)
- Production: Deployable to any container platform (AWS ECS, GCP Cloud Run, Railway, Fly.io)
- Rationale: Don't lock into a cloud provider until fundraising clarifies budget and scale requirements

**CI/CD:**

- Decision: GitHub Actions
- Pipeline: Build, lint, test (Vitest), E2E test (Playwright), security scan on every PR. Deploy on merge to main
- Rationale: Natural fit — GitHub is already the core integration point for Edin

**Structured Logging:**

- Decision: Pino via nestjs-pino
- Format: JSON structured logs with correlation ID, timestamp, level, module context
- Rationale: Fastest Node.js logger. JSON output ready for any log aggregation backend. Correlation IDs attached automatically via request middleware

**Observability:**

- Decision: OpenTelemetry for traces and metrics
- Implementation: @opentelemetry/sdk-node with auto-instrumentation for HTTP, Prisma, BullMQ, Redis
- Export: Vendor-agnostic — choose backend later (Grafana stack, Datadog, or New Relic)
- Rationale: Satisfies NFR-O1 (alerting within 60s) and NFR-O2 (correlation ID tracing). Vendor-agnostic instrumentation avoids lock-in

**Environment Configuration:**

- Decision: `.env` files per environment + NestJS ConfigModule + Zod validation
- Files: `.env.development`, `.env.staging`, `.env.production`
- Rationale: Validated at startup — no runtime surprises from missing or malformed environment variables

**Database Backups:**

- Decision: Automated pg_dump via cron (self-hosted) or managed PostgreSQL snapshots (cloud)
- Targets: RPO <4 hours, RTO <2 hours (NFR-R4)
- Rationale: Simple to start. Upgrade to managed database service when production infrastructure is finalized

### Decision Impact Analysis

**Implementation Sequence:**

1. Monorepo scaffold (Turborepo + pnpm + Docker Compose with PostgreSQL and Redis)
2. NestJS API foundation (ConfigModule, Pino logging, OpenTelemetry, global exception filter, correlation IDs)
3. Authentication (Passport.js GitHub OAuth + JWT + RBAC with CASL)
4. Database schema (Prisma, domain-separated schemas, seed data)
5. Next.js frontend foundation (TanStack Query, Zustand, route groups, Tailwind design system)
6. GitHub integration (webhook listener, BullMQ ingestion pipeline)
7. Core features (contributor profiles, admission, activity feed, peer feedback)
8. AI Evaluation Engine prototype
9. Publication Platform (Tiptap editor, editorial workflow)

**Cross-Component Dependencies:**

- Auth (Passport + CASL) must be complete before any authenticated feature
- BullMQ + Redis must be configured before ingestion pipeline or evaluation dispatch
- Shared Zod schemas must be defined before frontend forms or API validation
- Prisma schema must cover all domain-separated schemas before feature development
- OpenTelemetry + Pino must be configured early — retrofitting observability is painful
- Tiptap editor depends on the shared UI package (packages/ui) being established first

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 28 areas where AI agents could make different choices, organized into 5 categories (naming, structure, format, communication, process).

### Naming Patterns

**Database Naming Conventions:**

| Element      | Convention                       | Example                                                               |
| ------------ | -------------------------------- | --------------------------------------------------------------------- |
| Tables       | snake_case, plural               | `contributors`, `peer_feedbacks`, `working_groups`                    |
| Columns      | snake_case                       | `created_at`, `evaluation_score`, `is_active`                         |
| Primary keys | `id` (UUID)                      | `id UUID DEFAULT gen_random_uuid()`                                   |
| Foreign keys | `{referenced_table_singular}_id` | `contributor_id`, `article_id`                                        |
| Indexes      | `idx_{table}_{columns}`          | `idx_contributors_email`, `idx_evaluations_contributor_id_created_at` |
| Enums        | PascalCase                       | `ContributionStatus`, `ArticleLifecycle`                              |
| Schemas      | snake_case, singular domain      | `core`, `evaluation`, `publication`, `audit`                          |

Note: Prisma model names are PascalCase singular (`Contributor`, `Evaluation`). Prisma's `@@map` maps to snake_case plural table names.

**API Naming Conventions:**

| Element               | Convention               | Example                                                            |
| --------------------- | ------------------------ | ------------------------------------------------------------------ |
| Endpoints             | kebab-case, plural nouns | `/api/v1/contributors`, `/api/v1/working-groups`                   |
| Route parameters      | camelCase                | `/api/v1/contributors/:contributorId`                              |
| Query parameters      | camelCase                | `?workingGroupId=...&sortBy=createdAt`                             |
| Request/response body | camelCase                | `{ "contributorId": "...", "evaluationScore": 85 }`                |
| HTTP methods          | Standard REST            | GET (read), POST (create), PATCH (partial update), DELETE (remove) |
| Pagination            | Cursor-based             | `?cursor=...&limit=20` (default limit: 20, max: 100)               |
| Filtering             | Field-based              | `?domain=technology&status=active`                                 |

**Code Naming Conventions:**

| Element          | Convention                      | Example                                                                       |
| ---------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Files (NestJS)   | kebab-case with suffix          | `contributor.service.ts`, `evaluation.controller.ts`, `create-article.dto.ts` |
| Files (Next.js)  | kebab-case                      | `contributor-card.tsx`, `use-evaluation.ts`                                   |
| Classes          | PascalCase                      | `ContributorService`, `EvaluationController`                                  |
| Interfaces/Types | PascalCase, no `I` prefix       | `Contributor`, `EvaluationResult`, `CreateArticleInput`                       |
| Functions        | camelCase                       | `getContributor()`, `submitEvaluation()`                                      |
| Variables        | camelCase                       | `contributorId`, `evaluationScore`                                            |
| Constants        | UPPER_SNAKE_CASE                | `MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE`                                     |
| React components | PascalCase                      | `ContributorCard`, `ActivityFeed`, `EvaluationNarrative`                      |
| React hooks      | camelCase with `use` prefix     | `useContributor()`, `useEvaluation()`                                         |
| Zod schemas      | camelCase with `Schema` suffix  | `createArticleSchema`, `contributorProfileSchema`                             |
| NestJS modules   | PascalCase with `Module` suffix | `ContributorModule`, `EvaluationModule`                                       |
| BullMQ queues    | kebab-case                      | `github-ingestion`, `evaluation-dispatch`, `notification`                     |
| BullMQ jobs      | camelCase                       | `processCommit`, `evaluateContribution`, `sendNotification`                   |

### Structure Patterns

**Backend (NestJS) Module Organization:**

```
apps/api/src/
  modules/
    contributor/
      contributor.module.ts
      contributor.controller.ts
      contributor.service.ts
      dto/
        create-contributor.dto.ts
        update-contributor.dto.ts
      entities/
        contributor.entity.ts
      contributor.service.spec.ts
      contributor.controller.spec.ts
    evaluation/
      evaluation.module.ts
      ...
    publication/
      publication.module.ts
      ...
  common/
    decorators/
    filters/
    guards/
    interceptors/
    pipes/
  config/
    app.config.ts
    database.config.ts
    redis.config.ts
  main.ts
  app.module.ts
```

Rules:

- One module per domain (maps 1:1 to database schemas)
- Tests co-located with source files (`*.spec.ts` next to `*.ts`)
- DTOs in `dto/` subdirectory within each module
- Shared utilities in `common/` directory
- Configuration files in `config/` directory

**Frontend (Next.js) Organization:**

```
apps/web/
  app/
    (public)/
      page.tsx
      articles/
        [slug]/page.tsx
      contributors/page.tsx
    (dashboard)/
      layout.tsx
      dashboard/page.tsx
      contributions/page.tsx
      evaluations/page.tsx
      publication/
        new/page.tsx
        [id]/edit/page.tsx
    (admin)/
      layout.tsx
      admin/page.tsx
      admission/page.tsx
  components/
    ui/
    features/
      activity-feed/
      evaluation-narrative/
      editorial-workflow/
  hooks/
    use-contributor.ts
    use-evaluation.ts
  lib/
    api-client.ts
    auth.ts
```

Rules:

- Route groups for permission boundaries: `(public)`, `(dashboard)`, `(admin)`
- Components co-located by feature in `components/features/`
- Shared hooks in `hooks/` directory
- API client and utilities in `lib/`
- No `src/` directory — Next.js App Router convention

**Shared Packages:**

```
packages/
  shared/
    src/
      schemas/
        contributor.schema.ts
        evaluation.schema.ts
        article.schema.ts
      types/
        contributor.types.ts
        api-response.types.ts
      constants/
        roles.ts
        domains.ts
      index.ts
  ui/
    src/
      button.tsx
      card.tsx
      input.tsx
      index.ts
  config/
    eslint/
    tsconfig/
```

### Format Patterns

**API Response Envelope:**

All API responses use a consistent envelope:

```typescript
// Success response
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-01T12:00:00.000Z",
    "correlationId": "uuid-v4",
    "pagination": {
      "cursor": "next-cursor-value",
      "hasMore": true,
      "total": 150
    }
  }
}

// Error response
{
  "error": {
    "code": "CONTRIBUTOR_NOT_FOUND",
    "message": "Contributor with ID xyz not found",
    "status": 404,
    "correlationId": "uuid-v4",
    "timestamp": "2026-03-01T12:00:00.000Z",
    "details": []
  }
}
```

Rules:

- Success: always wrap in `{ data, meta }`
- Error: always wrap in `{ error: { code, message, status, correlationId } }`
- Error codes: UPPER_SNAKE_CASE domain-prefixed (`EVALUATION_MODEL_UNAVAILABLE`, `ARTICLE_ALREADY_PUBLISHED`)
- Dates: ISO 8601 strings everywhere (`2026-03-01T12:00:00.000Z`)
- Null fields: include with `null` value, do not omit
- Empty arrays: include as `[]`, do not omit
- IDs: UUID v4 strings

**HTTP Status Code Usage:**

| Code | Usage                                                                               |
| ---- | ----------------------------------------------------------------------------------- |
| 200  | Successful GET, PATCH                                                               |
| 201  | Successful POST (resource created)                                                  |
| 204  | Successful DELETE (no content)                                                      |
| 400  | Validation error (Zod parse failure)                                                |
| 401  | Not authenticated                                                                   |
| 403  | Authenticated but not authorized (CASL check failed)                                |
| 404  | Resource not found                                                                  |
| 409  | Conflict (duplicate, state transition error)                                        |
| 422  | Business rule violation (e.g., article cannot be published without editor approval) |
| 429  | Rate limited                                                                        |
| 500  | Unexpected server error                                                             |

### Communication Patterns

**Event Naming:**

- Convention: `{domain}.{entity}.{action}` in dot.case
- Examples: `contribution.commit.ingested`, `evaluation.score.completed`, `publication.article.published`, `admission.application.submitted`
- Payload structure:

```typescript
interface DomainEvent<T> {
  eventType: string;
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: T;
}
```

**Logging Standards:**

| Level   | Usage                                  | Example                                                       |
| ------- | -------------------------------------- | ------------------------------------------------------------- |
| `error` | Unrecoverable failures, exceptions     | Failed database query, unhandled exception                    |
| `warn`  | Recoverable issues, degraded state     | Evaluation engine timeout, retry attempt                      |
| `info`  | Key business events, state transitions | Contributor admitted, article published, evaluation completed |
| `debug` | Detailed flow, useful for development  | Query parameters, cache hit/miss, job processing steps        |

Rules:

- Always include `correlationId` in log context
- Always include `module` name (NestJS module that generated the log)
- Never log PII (contributor email, name) at `info` level or above — use contributor ID only
- Log entry/exit of async jobs (BullMQ processors) at `info` level
- Log all external API calls (GitHub API) at `debug` level with response time

### Process Patterns

**Error Handling:**

Backend (NestJS):

- Global exception filter catches all unhandled errors, formats as standard error envelope
- Business exceptions extend a base `DomainException` class with error code and HTTP status
- Prisma errors mapped to appropriate HTTP status (NotFound -> 404, UniqueConstraint -> 409)
- BullMQ job failures: retry 3 times with exponential backoff (1s, 4s, 16s), then dead-letter queue

Frontend (Next.js):

- TanStack Query `onError` callbacks for API error handling
- React Error Boundaries at route group level (`(dashboard)`, `(admin)`)
- Toast notifications for user-facing errors (non-blocking)
- Full-page error states for critical failures (authentication, network)
- Evaluation engine unavailable: show "Evaluation pending" badge (never show raw error)

**Loading States:**

- TanStack Query provides `isLoading`, `isFetching`, `isError` states automatically
- Skeleton loaders for initial page loads (not spinners)
- Optimistic updates for user actions (claim task, submit feedback, submit article)
- SSE reconnection: automatic with exponential backoff, show "Reconnecting..." indicator after 5s

**Authentication Flow:**

1. User clicks "Sign in with GitHub"
2. Redirect to GitHub OAuth -> callback to `/api/v1/auth/github/callback`
3. NestJS Passport validates, creates/updates contributor record
4. JWT access token (15min) + refresh token (Redis, 30-day) returned
5. Frontend stores access token in memory (not localStorage), refresh token as httpOnly cookie
6. TanStack Query interceptor refreshes token automatically on 401
7. Logout: invalidate refresh token in Redis, clear cookies

**Validation Flow:**

1. Zod schema defined in `packages/shared/src/schemas/`
2. Frontend: React Hook Form validates on submit using Zod resolver
3. Backend: NestJS validation pipe parses request body/query with same Zod schema
4. Validation errors returned as `400` with `details` array listing each field error

### Enforcement Guidelines

**All AI Agents MUST:**

- Follow the naming conventions table exactly — no exceptions, no alternative styles
- Use the API response envelope for every endpoint — no raw responses
- Co-locate tests with source files — never create a separate `__tests__/` directory
- Use Zod schemas from `packages/shared` for all validation — never define validation inline
- Emit domain events for all state transitions — never modify state silently
- Include `correlationId` in all log statements — never log without context
- Use the `DomainException` base class for all business errors — never throw raw `HttpException`
- Use skeleton loaders for loading states — never use spinners for page content

**Pattern Enforcement:**

- ESLint rules enforce naming conventions (file naming, import patterns)
- Prisma schema lint validates database naming conventions
- CI pipeline runs pattern checks: no raw `HttpException`, no missing correlation IDs
- PR template includes checklist: "Follows naming conventions", "Uses response envelope", "Tests co-located"

### Pattern Examples

**Good:**

```typescript
// NestJS controller following all patterns
@Controller('api/v1/contributors')
export class ContributorController {
  @Get(':contributorId')
  @CheckAbility({ action: 'read', subject: 'Contributor' })
  async getContributor(
    @Param('contributorId', ParseUUIDPipe) contributorId: string,
  ): Promise<ApiResponse<ContributorDto>> {
    const contributor = await this.contributorService.findById(contributorId);
    return { data: contributor, meta: { timestamp: new Date().toISOString() } };
  }
}
```

**Anti-Patterns:**

```typescript
// Wrong: singular endpoint, PascalCase param
@Controller('api/v1/Contributor')
// Wrong: raw response without envelope
return contributor;
// Wrong: raw HttpException instead of DomainException
throw new HttpException('Not found', 404);
// Wrong: logging PII
this.logger.info(`Contributor ${email} logged in`);
// Wrong: spinner instead of skeleton
{isLoading && <Spinner />}
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
edin/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── deploy-staging.yml
│   │   └── deploy-production.yml
│   ├── pull_request_template.md
│   └── CODEOWNERS
├── .husky/
│   ├── pre-commit
│   └── commit-msg
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.prod.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── commitlint.config.js
│
├── apps/
│   ├── web/                                    # Next.js 16 Frontend
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── .env.local
│   │   ├── .env.example
│   │   ├── public/
│   │   │   ├── fonts/
│   │   │   ├── images/
│   │   │   └── favicon.ico
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── global.css
│   │   │   ├── not-found.tsx
│   │   │   ├── error.tsx
│   │   │   ├── (public)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx                    # Landing / project showcase (FR43)
│   │   │   │   ├── about/page.tsx              # Mission, vision, manifesto (FR44)
│   │   │   │   ├── contributors/
│   │   │   │   │   ├── page.tsx                # Public contributor roster (FR46)
│   │   │   │   │   └── [id]/page.tsx           # Public contributor profile (FR1)
│   │   │   │   ├── articles/
│   │   │   │   │   ├── page.tsx                # Published articles listing (FR72)
│   │   │   │   │   └── [slug]/page.tsx         # Article reading view (FR72, FR73)
│   │   │   │   ├── metrics/page.tsx            # Public platform metrics (FR45, FR47)
│   │   │   │   ├── apply/page.tsx              # Contributor application form (FR8)
│   │   │   │   └── rewards/page.tsx            # Reward methodology explanation (FR59)
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx          # Contributor home (FR3)
│   │   │   │   ├── contributions/page.tsx      # Contribution history (FR18)
│   │   │   │   ├── evaluations/
│   │   │   │   │   ├── page.tsx                # Evaluation overview (FR25)
│   │   │   │   │   └── [id]/page.tsx           # Evaluation detail / narrative (FR23)
│   │   │   │   ├── feedback/
│   │   │   │   │   ├── page.tsx                # Feedback received (FR30)
│   │   │   │   │   └── review/[id]/page.tsx    # Submit peer feedback (FR29)
│   │   │   │   ├── working-groups/
│   │   │   │   │   ├── page.tsx                # Working groups overview (FR33)
│   │   │   │   │   └── [id]/page.tsx           # Working group detail (FR38)
│   │   │   │   ├── tasks/page.tsx              # Contribution menu (FR34, FR36)
│   │   │   │   ├── publication/
│   │   │   │   │   ├── page.tsx                # My articles list
│   │   │   │   │   ├── new/page.tsx            # Article editor (FR66)
│   │   │   │   │   ├── [id]/edit/page.tsx      # Edit article draft (FR69)
│   │   │   │   │   └── [id]/review/page.tsx    # Editorial review view (FR68)
│   │   │   │   ├── profile/page.tsx            # Edit own profile (FR2)
│   │   │   │   ├── rewards/page.tsx            # Reward trajectory (FR57)
│   │   │   │   ├── governance/page.tsx         # Governance roadmap (FR55b)
│   │   │   │   └── activity/page.tsx           # Activity Feed (FR39, FR40)
│   │   │   ├── (admin)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── admin/page.tsx              # Health metrics dashboard (FR48)
│   │   │   │   ├── admission/page.tsx          # Admission queue (FR10)
│   │   │   │   ├── contributors/page.tsx       # Manage roles & permissions (FR49)
│   │   │   │   ├── tasks/page.tsx              # Contribution menu management (FR35)
│   │   │   │   ├── feedback/page.tsx           # Feedback monitoring (FR31)
│   │   │   │   ├── publication/page.tsx        # Content moderation (FR77, FR78)
│   │   │   │   ├── settings/page.tsx           # Platform settings (FR50)
│   │   │   │   └── reports/page.tsx            # Metrics reports (FR51)
│   │   │   └── api/
│   │   │       └── auth/
│   │   │           └── [...nextauth]/route.ts  # Auth callback handler
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── features/
│   │   │       ├── activity-feed/
│   │   │       │   ├── activity-feed.tsx
│   │   │       │   ├── activity-item.tsx
│   │   │       │   └── use-activity-feed.ts
│   │   │       ├── evaluation-narrative/
│   │   │       │   ├── narrative-card.tsx
│   │   │       │   └── score-breakdown.tsx
│   │   │       ├── editorial-workflow/
│   │   │       │   ├── article-editor.tsx
│   │   │       │   ├── editorial-feedback.tsx
│   │   │       │   └── article-lifecycle.tsx
│   │   │       ├── contributor-profile/
│   │   │       │   ├── profile-card.tsx
│   │   │       │   └── contribution-history.tsx
│   │   │       └── reward-trajectory/
│   │   │           ├── trajectory-chart.tsx
│   │   │           └── scaling-law-explainer.tsx
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-contributor.ts
│   │   │   ├── use-evaluation.ts
│   │   │   └── use-sse.ts
│   │   └── lib/
│   │       ├── api-client.ts
│   │       ├── auth.ts
│   │       └── utils.ts
│   │
│   └── api/                                    # NestJS 11 Backend
│       ├── package.json
│       ├── nest-cli.json
│       ├── tsconfig.json
│       ├── tsconfig.build.json
│       ├── .env
│       ├── .env.example
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── config/
│       │   │   ├── app.config.ts
│       │   │   ├── database.config.ts
│       │   │   ├── redis.config.ts
│       │   │   ├── auth.config.ts
│       │   │   └── github.config.ts
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   │   ├── check-ability.decorator.ts
│       │   │   │   └── current-user.decorator.ts
│       │   │   ├── filters/
│       │   │   │   └── global-exception.filter.ts
│       │   │   ├── guards/
│       │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   └── ability.guard.ts
│       │   │   ├── interceptors/
│       │   │   │   ├── correlation-id.interceptor.ts
│       │   │   │   ├── response-wrapper.interceptor.ts
│       │   │   │   └── logging.interceptor.ts
│       │   │   ├── pipes/
│       │   │   │   └── zod-validation.pipe.ts
│       │   │   ├── exceptions/
│       │   │   │   └── domain.exception.ts
│       │   │   └── types/
│       │   │       └── api-response.type.ts
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── strategies/
│       │   │   │   │   ├── github.strategy.ts
│       │   │   │   │   ├── jwt.strategy.ts
│       │   │   │   │   └── local.strategy.ts
│       │   │   │   ├── casl/
│       │   │   │   │   ├── ability.factory.ts
│       │   │   │   │   └── policies.ts
│       │   │   │   ├── dto/
│       │   │   │   │   └── login.dto.ts
│       │   │   │   ├── auth.service.spec.ts
│       │   │   │   └── auth.controller.spec.ts
│       │   │   ├── contributor/
│       │   │   │   ├── contributor.module.ts
│       │   │   │   ├── contributor.controller.ts
│       │   │   │   ├── contributor.service.ts
│       │   │   │   ├── dto/
│       │   │   │   ├── contributor.service.spec.ts
│       │   │   │   └── contributor.controller.spec.ts
│       │   │   ├── admission/
│       │   │   │   ├── admission.module.ts
│       │   │   │   ├── admission.controller.ts
│       │   │   │   ├── admission.service.ts
│       │   │   │   └── dto/
│       │   │   ├── ingestion/
│       │   │   │   ├── ingestion.module.ts
│       │   │   │   ├── ingestion.controller.ts
│       │   │   │   ├── ingestion.service.ts
│       │   │   │   ├── processors/
│       │   │   │   │   ├── commit.processor.ts
│       │   │   │   │   ├── pull-request.processor.ts
│       │   │   │   │   └── review.processor.ts
│       │   │   │   ├── normalizer/
│       │   │   │   │   └── contribution.normalizer.ts
│       │   │   │   └── dto/
│       │   │   ├── evaluation/
│       │   │   │   ├── evaluation.module.ts
│       │   │   │   ├── evaluation.controller.ts
│       │   │   │   ├── evaluation.service.ts
│       │   │   │   ├── processors/
│       │   │   │   │   ├── code-evaluation.processor.ts
│       │   │   │   │   └── doc-evaluation.processor.ts
│       │   │   │   ├── models/
│       │   │   │   │   └── evaluation-model.registry.ts
│       │   │   │   └── dto/
│       │   │   ├── feedback/
│       │   │   │   ├── feedback.module.ts
│       │   │   │   ├── feedback.controller.ts
│       │   │   │   ├── feedback.service.ts
│       │   │   │   └── dto/
│       │   │   ├── working-group/
│       │   │   │   ├── working-group.module.ts
│       │   │   │   ├── working-group.controller.ts
│       │   │   │   ├── working-group.service.ts
│       │   │   │   └── dto/
│       │   │   ├── task/
│       │   │   │   ├── task.module.ts
│       │   │   │   ├── task.controller.ts
│       │   │   │   ├── task.service.ts
│       │   │   │   └── dto/
│       │   │   ├── activity/
│       │   │   │   ├── activity.module.ts
│       │   │   │   ├── activity.controller.ts
│       │   │   │   ├── activity.service.ts
│       │   │   │   └── activity.gateway.ts
│       │   │   ├── publication/
│       │   │   │   ├── publication.module.ts
│       │   │   │   ├── article.controller.ts
│       │   │   │   ├── article.service.ts
│       │   │   │   ├── editorial.service.ts
│       │   │   │   ├── plagiarism.service.ts
│       │   │   │   └── dto/
│       │   │   ├── reward/
│       │   │   │   ├── reward.module.ts
│       │   │   │   ├── reward.controller.ts
│       │   │   │   ├── reward.service.ts
│       │   │   │   └── dto/
│       │   │   ├── showcase/
│       │   │   │   ├── showcase.module.ts
│       │   │   │   ├── showcase.controller.ts
│       │   │   │   └── showcase.service.ts
│       │   │   ├── admin/
│       │   │   │   ├── admin.module.ts
│       │   │   │   ├── admin.controller.ts
│       │   │   │   ├── admin.service.ts
│       │   │   │   └── dto/
│       │   │   ├── notification/
│       │   │   │   ├── notification.module.ts
│       │   │   │   ├── notification.service.ts
│       │   │   │   └── processors/
│       │   │   │       └── notification.processor.ts
│       │   │   ├── compliance/
│       │   │   │   ├── compliance.module.ts
│       │   │   │   ├── compliance.controller.ts
│       │   │   │   ├── compliance.service.ts
│       │   │   │   └── audit/
│       │   │   │       ├── audit.service.ts
│       │   │   │       └── audit.interceptor.ts
│       │   │   └── health/
│       │   │       ├── health.module.ts
│       │   │       └── health.controller.ts
│       │   └── prisma/
│       │       ├── prisma.module.ts
│       │       └── prisma.service.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── test/
│           ├── e2e/
│           │   ├── auth.e2e-spec.ts
│           │   ├── contributor.e2e-spec.ts
│           │   └── app.e2e-spec.ts
│           └── fixtures/
│               └── test-data.ts
│
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── schemas/
│   │       │   ├── contributor.schema.ts
│   │       │   ├── evaluation.schema.ts
│   │       │   ├── article.schema.ts
│   │       │   ├── feedback.schema.ts
│   │       │   ├── admission.schema.ts
│   │       │   ├── task.schema.ts
│   │       │   └── api-response.schema.ts
│   │       ├── types/
│   │       │   ├── contributor.types.ts
│   │       │   ├── evaluation.types.ts
│   │       │   ├── article.types.ts
│   │       │   ├── events.types.ts
│   │       │   └── api-response.types.ts
│   │       ├── constants/
│   │       │   ├── roles.ts
│   │       │   ├── domains.ts
│   │       │   ├── article-lifecycle.ts
│   │       │   └── error-codes.ts
│   │       └── index.ts
│   ├── ui/                                    # @edin/ui — ROSE Design System
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── tokens/
│   │       │   └── theme.css                  # Tailwind v4 @theme — ROSE design tokens
│   │       ├── fonts/
│   │       │   ├── abc-normal.css             # @font-face declarations (7 weights)
│   │       │   └── ABCNormal-*.woff2          # Subsetted font files
│   │       ├── primitives/                    # Foundation (Tailwind-only, no Radix)
│   │       │   ├── button.tsx
│   │       │   ├── card.tsx
│   │       │   ├── input.tsx
│   │       │   ├── badge.tsx
│   │       │   └── skeleton.tsx
│   │       ├── radix/                         # Radix wrappers with ROSE theming
│   │       │   ├── accordion.tsx
│   │       │   ├── avatar.tsx
│   │       │   ├── dialog.tsx
│   │       │   ├── dropdown-menu.tsx
│   │       │   ├── popover.tsx
│   │       │   ├── scroll-area.tsx
│   │       │   ├── select.tsx
│   │       │   ├── switch.tsx
│   │       │   ├── tabs.tsx
│   │       │   ├── toast.tsx
│   │       │   └── tooltip.tsx
│   │       ├── layout/                        # Layout containers
│   │       │   ├── dashboard-shell.tsx         # Sidebar + content (authenticated)
│   │       │   ├── sidebar-nav.tsx             # 240px/64px collapsible sidebar
│   │       │   ├── reading-canvas.tsx          # 680px immersive article layout
│   │       │   ├── hero-section.tsx            # Public portal gradient hero
│   │       │   └── public-layout.tsx           # Public portal layout frame
│   │       ├── domain/                        # Domain identity components
│   │       │   ├── pillar-accent-line.tsx      # 3px vertical pillar-color bar
│   │       │   ├── domain-badge.tsx            # Uppercase pillar-color label
│   │       │   └── pillar-card.tsx             # Public portal domain card
│   │       ├── content/                       # Content display components
│   │       │   ├── narrative-card.tsx          # Prose-first card with pillar border
│   │       │   ├── evaluation-breakdown.tsx    # Narrative + progressive disclosure
│   │       │   ├── article-byline.tsx          # Author + Editor dual credit
│   │       │   ├── pull-quote.tsx              # Orange-bordered pull quote
│   │       │   ├── activity-feed-item.tsx      # Feed item with equal domain weight
│   │       │   └── status-indicator.tsx        # Calm async process status
│   │       ├── profile/                       # Profile & reward components
│   │       │   ├── contributor-profile.tsx     # Author-biography-style display
│   │       │   ├── fingerprint-item.tsx        # Impact fingerprint with pillar dot
│   │       │   ├── growth-curve.tsx            # Organic SVG reward trajectory
│   │       │   ├── reward-stat.tsx             # Single reward metric card
│   │       │   └── notification-dot.tsx        # 6px calm notification indicator
│   │       └── index.ts
│   ├── config/
│   │   ├── eslint/
│   │   │   └── index.js
│   │   └── tsconfig/
│   │       ├── base.json
│   │       ├── nextjs.json
│   │       └── nestjs.json
│   └── eslint-config/
│       └── package.json
│
└── e2e/
    ├── package.json
    ├── playwright.config.ts
    ├── tests/
    │   ├── auth.spec.ts
    │   ├── onboarding.spec.ts
    │   ├── contribution-flow.spec.ts
    │   ├── publication-flow.spec.ts
    │   └── admin-flow.spec.ts
    └── fixtures/
        └── test-helpers.ts
```

### Architectural Boundaries

**API Boundaries:**

| Boundary        | Endpoint Prefix            | Auth Required          | Description                                                          |
| --------------- | -------------------------- | ---------------------- | -------------------------------------------------------------------- |
| Public Showcase | `/api/v1/showcase/*`       | No                     | Project info, public metrics, contributor roster, published articles |
| Authentication  | `/api/v1/auth/*`           | No (except logout)     | OAuth flows, token refresh, logout                                   |
| Contributor     | `/api/v1/contributors/*`   | Yes                    | Profiles, contribution history, evaluations                          |
| Admission       | `/api/v1/admission/*`      | Partial                | Application (no auth), review (auth)                                 |
| Ingestion       | `/api/v1/ingestion/*`      | Webhook secret         | GitHub webhook receiver                                              |
| Evaluation      | `/api/v1/evaluations/*`    | Yes                    | Evaluation results, flagging, model info                             |
| Feedback        | `/api/v1/feedback/*`       | Yes                    | Peer feedback submission, assignment                                 |
| Working Groups  | `/api/v1/working-groups/*` | Yes                    | WG management, membership                                            |
| Tasks           | `/api/v1/tasks/*`          | Yes                    | Contribution menu, task claiming                                     |
| Activity        | `/api/v1/activity/*`       | Yes                    | Activity Feed (SSE), notifications                                   |
| Publication     | `/api/v1/articles/*`       | Yes (write), No (read) | Article CRUD, editorial workflow                                     |
| Rewards         | `/api/v1/rewards/*`        | Yes                    | Score history, trajectory                                            |
| Admin           | `/api/v1/admin/*`          | Yes (Admin role)       | Platform management, reports                                         |
| Compliance      | `/api/v1/compliance/*`     | Yes                    | GDPR export/delete, consent                                          |
| Health          | `/api/v1/health`           | No                     | Liveness/readiness probes                                            |

**Service Boundaries (NestJS Modules):**

Each module encapsulates its domain logic and exposes only through its controller (HTTP) or service (injected by other modules). Cross-module communication happens via:

1. **Direct injection** — When Module A needs Module B's service (e.g., Evaluation imports ContributorService to look up contributor)
2. **EventEmitter2** — For loose coupling on state transitions (e.g., Ingestion emits `contribution.commit.ingested`, Evaluation listens)
3. **BullMQ** — For async processing (e.g., Ingestion enqueues job, Evaluation processor dequeues)

**Data Boundaries (PostgreSQL Schemas):**

| Schema        | Tables                                                                           | Owning Module(s)                                          |
| ------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `core`        | contributors, roles, working_groups, tasks, applications, buddies, notifications | contributor, admission, working-group, task, notification |
| `evaluation`  | evaluations, evaluation_models, peer_feedbacks, contribution_scores              | evaluation, feedback, reward                              |
| `publication` | articles, editorial_reviews, article_versions                                    | publication                                               |
| `audit`       | audit_logs, consent_records, compliance_requests                                 | compliance                                                |

Rule: A module may only write to tables in its owning schema. Cross-schema reads are allowed via Prisma relations.

### Requirements to Structure Mapping

**FR Category to Module Mapping:**

| FR Category                        | Backend Module                               | Frontend Route Group                                | Shared Schema           |
| ---------------------------------- | -------------------------------------------- | --------------------------------------------------- | ----------------------- |
| Contributor Identity (FR1-FR7b)    | `modules/contributor/`, `modules/auth/`      | `(public)/contributors/`, `(dashboard)/profile/`    | `contributor.schema.ts` |
| Admission & Onboarding (FR8-FR14)  | `modules/admission/`                         | `(public)/apply/`, `(admin)/admission/`             | `admission.schema.ts`   |
| Contribution Ingestion (FR15-FR20) | `modules/ingestion/`                         | `(dashboard)/contributions/`                        | `contributor.schema.ts` |
| AI Evaluation Engine (FR21-FR27)   | `modules/evaluation/`                        | `(dashboard)/evaluations/`                          | `evaluation.schema.ts`  |
| Peer Feedback (FR28-FR32)          | `modules/feedback/`                          | `(dashboard)/feedback/`                             | `feedback.schema.ts`    |
| Community Structure (FR33-FR38)    | `modules/working-group/`, `modules/task/`    | `(dashboard)/working-groups/`, `(dashboard)/tasks/` | `task.schema.ts`        |
| Activity Feed (FR39-FR42)          | `modules/activity/`, `modules/notification/` | `(dashboard)/activity/`                             | `events.types.ts`       |
| Public Showcase (FR43-FR47)        | `modules/showcase/`                          | `(public)/`, `(public)/metrics/`                    | —                       |
| Admin Operations (FR48-FR52b)      | `modules/admin/`                             | `(admin)/*`                                         | —                       |
| Governance (FR53-FR56)             | `modules/reward/` (Phase 1 static)           | `(dashboard)/governance/`                           | —                       |
| Reward System (FR57-FR60)          | `modules/reward/`                            | `(dashboard)/rewards/`, `(public)/rewards/`         | —                       |
| Publication Platform (FR66-FR79)   | `modules/publication/`                       | `(dashboard)/publication/`, `(public)/articles/`    | `article.schema.ts`     |
| Compliance (FR61-FR65)             | `modules/compliance/`                        | — (API only)                                        | —                       |

### Integration Points

**Internal Communication Flow:**

```
GitHub Webhook
  -> ingestion.controller (validates webhook secret)
  -> BullMQ queue: github-ingestion
  -> commit.processor / pull-request.processor / review.processor
  -> contribution.normalizer (standardizes to evaluation-ready format)
  -> EventEmitter: contribution.commit.ingested
  -> evaluation.service (listens, enqueues evaluation job)
  -> BullMQ queue: evaluation-dispatch
  -> code-evaluation.processor / doc-evaluation.processor
  -> EventEmitter: evaluation.score.completed
  -> activity.service (listens, pushes to SSE stream)
  -> reward.service (listens, updates contribution scores)
  -> notification.service (listens, enqueues notification)
```

**External Integrations:**

| Service         | Integration Point                      | Module                           |
| --------------- | -------------------------------------- | -------------------------------- |
| GitHub API      | Webhook receiver + REST API client     | `modules/ingestion/`             |
| GitHub OAuth    | Passport strategy                      | `modules/auth/strategies/`       |
| AI/LLM Provider | Evaluation model API calls             | `modules/evaluation/processors/` |
| Redis           | BullMQ, caching, sessions, SSE pub/sub | `common/` (shared connection)    |
| PostgreSQL      | Prisma ORM                             | `prisma/` (shared service)       |

### Development Workflow Integration

**Local Development:**

```bash
# Start infrastructure
docker compose up -d postgres redis

# Start API (watch mode)
pnpm --filter api dev

# Start Web (Turbopack)
pnpm --filter web dev

# Run all in parallel
pnpm dev    # Turborepo runs both apps
```

**Build Process:**

```bash
pnpm build  # Turborepo builds all apps + packages (cached)
pnpm test   # Vitest across all packages
pnpm lint   # ESLint across all packages
pnpm e2e    # Playwright E2E tests
```

**Deployment:**

```bash
docker build -f docker/api.Dockerfile -t edin-api .
docker build -f docker/web.Dockerfile -t edin-web .
# Or: docker compose -f docker-compose.prod.yml up
```

## ROSE Design System Architecture

_Added 2026-03-14 — Aligns architecture with ROSE UX revision. The UX specification was fully rewritten on 2026-03-14 with the ROSE brand design language (dark-first aesthetic, ABC Normal typography, vivid orange accents, pillar-coded domain colors). This section documents the architectural decisions required to implement the design system._

### Design System Overview

The Edin design system is a **custom system built on Tailwind CSS v4 + Radix UI primitives**, housed in the `packages/ui` (`@edin/ui`) shared monorepo package. The ROSE brand identity deck is the primary visual reference — dark cinematic backgrounds, ABC Normal typeface, vivid orange accents, pillar-coded color shields.

**Key principle:** Dark-first design. The dark palette is the base theme; light mode is a considered variant via class toggle, not the default.

### ABC Normal Font Architecture

**Typeface:** ABC Normal — 7-weight custom font family from the ROSE brand identity deck.

**Font Files:** Source TTF files are in `docs/rose-design/fonts/ABCNormal-*.ttf`. For production, fonts must be subsetted and converted to WOFF2.

**Weight Mapping:**

| Font File         | CSS `font-weight` | Design Role                              |
| ----------------- | ----------------- | ---------------------------------------- |
| ABCNormal-Light   | 300               | Captions, metadata, subtle text          |
| ABCNormal-Book    | 400               | Body text, paragraphs, article prose     |
| ABCNormal-Neutral | 450               | Emphasis within body text                |
| ABCNormal-Medium  | 500               | Navigation, labels, UI elements, buttons |
| ABCNormal-Bold    | 700               | Sub-headings, card titles                |
| ABCNormal-Black   | 800               | Section headings, bold emphasis          |
| ABCNormal-Super   | 900               | Hero headlines, landing page impact text |

**Loading Strategy:**

```
packages/ui/src/fonts/abc-normal.css
```

- `@font-face` declarations for all 7 weights with `font-display: swap`
- WOFF2 format only (modern browser coverage sufficient for Edin's audience)
- Subset to Latin + Latin Extended character sets via `pyftsubset` or `glyphanger` during build
- Preload the two most common weights (Book 400 and Medium 500) via `<link rel="preload">` in Next.js `app/layout.tsx`
- Remaining weights load on demand (Super 900 only needed on hero, Light 300 on metadata)

**Fallback Stack:** `'ABC Normal', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Performance Budget:**

- Total font payload target: <200KB (all 7 weights, subsetted, WOFF2 compressed)
- Critical path: Book (400) + Medium (500) ≈ ~50KB — preloaded
- Non-critical: remaining 5 weights ≈ ~150KB — lazy loaded

**Note:** ABC Normal is a licensed commercial typeface. Font files must NOT be committed to the public repository. They should be included via a private package, environment-specific asset pipeline, or `.gitignore`-protected local directory. The build process fetches them from a secure source.

### Dark-First Tailwind v4 Theme

**Configuration file:** `packages/ui/src/tokens/theme.css`

The ROSE design tokens are defined as CSS custom properties via Tailwind v4's `@theme` directive. This file is imported by `apps/web/app/global.css`.

**Complete Token Definition:**

```css
@theme {
  /* ── Surface Colors (Dark Mode Default) ── */
  --color-surface-base: #1a1a1d;
  --color-surface-raised: #222225;
  --color-surface-overlay: #2a2a2e;
  --color-surface-subtle: #32323a;
  --color-surface-reading: #1e1e22;
  --color-surface-editor: #252528;

  /* ── Accent Colors (ROSE) ── */
  --color-accent-primary: #ff5a00;
  --color-accent-primary-hover: #ff7a2e;
  --color-accent-secondary: #e4bdb8;
  --color-accent-secondary-muted: #c9a09a;

  /* ── Pillar Colors (Domain Identity) ── */
  --color-pillar-tech: #ff5a00;
  --color-pillar-impact: #00e87b;
  --color-pillar-governance: #00c4e8;
  --color-pillar-finance: #e8aa00;

  /* ── Semantic Colors ── */
  --color-success: #00e87b;
  --color-warning: #e8aa00;
  --color-error: #e85a5a;
  --color-info: #00c4e8;

  /* ── Text Colors (Dark Mode) ── */
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #a0a0a8;
  --color-text-tertiary: #6a6a72;
  --color-text-heading: #e4bdb8;
  --color-text-accent: #ff5a00;
  --color-text-inverse: #1a1a1d;

  /* ── Typography ── */
  --font-family-primary: 'ABC Normal', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* ── Type Scale (Major Third 1.25) ── */
  --text-display: 3rem; /* 48px — Super 900 */
  --text-h1: 2.25rem; /* 36px — Black 800 */
  --text-h2: 1.75rem; /* 28px — Bold 700 */
  --text-h3: 1.375rem; /* 22px — Bold 700 */
  --text-h4: 1.125rem; /* 18px — Medium 500 */
  --text-body-lg: 1.125rem; /* 18px — Book 400, article prose */
  --text-body: 1rem; /* 16px — Book 400, UI text */
  --text-body-sm: 0.875rem; /* 14px — Book 400, metadata */
  --text-caption: 0.75rem; /* 12px — Light 300, timestamps */

  /* ── Spacing (4px base unit) ── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* ── Border Radius ── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* ── Shadows (Dark Mode — minimal) ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
}
```

**Dark/Light Mode Strategy:**

- `surface-base` through `surface-editor` define the dark mode (default)
- Light mode implemented via `[data-theme="light"]` selector overriding surface and text tokens
- Light mode is Phase 2 scope — dark-first is the MVP design
- The `surface-reading` token exists specifically for long-form article comfort on dark backgrounds

### Layout Container Architecture

The platform uses **three distinct layout containers**, each a React component in `packages/ui/src/layout/`:

#### DashboardShell (`dashboard-shell.tsx`)

**Purpose:** The authenticated workspace frame for all contributor, editor, and admin pages.

**Architecture:**

- **Sidebar:** Fixed left panel, 240px expanded / 64px collapsed
- **Content area:** Fills remaining width on `surface-base` background
- **Collapse behavior:** Toggle via button or keyboard shortcut. Preference persisted in `localStorage`
- **Mobile:** Sidebar becomes a full-screen overlay triggered by hamburger menu
- **Route integration:** Used as the `layout.tsx` for both `(dashboard)` and `(admin)` route groups

**Landmarks:** `<nav>` for sidebar, `<main>` for content area, skip-to-content link

#### ReadingCanvas (`reading-canvas.tsx`)

**Purpose:** Immersive article reading — strips away dashboard chrome entirely.

**Architecture:**

- **Background:** Full-width `surface-reading` (#1E1E22) — slightly warmer than base for reading comfort
- **Content column:** Centered, max-width 680px (optimal reading measure: ~65-75 characters at 18px)
- **Navigation:** Minimal top bar with back-to-dashboard link and article metadata. No sidebar
- **Typography:** ABC Normal Book at 18px, line-height 1.7
- **Route integration:** Used as the layout for `(public)/articles/[slug]/page.tsx`

**Critical:** This is a separate layout component, NOT a variant of DashboardShell. Articles render without any sidebar or dashboard navigation.

#### HeroSection (`hero-section.tsx`)

**Purpose:** Cinematic ROSE gradient hero for the public portal.

**Architecture:**

- **Background:** Radial gradient with orange/pink glow overlay on `surface-base`
- **Content:** Centered — overline (ABC Normal Medium, uppercase), headline (ABC Normal Super), subtitle, CTA button
- **Variants:** Full-height (homepage) / compact (subpages)
- **Route integration:** Used on `(public)/page.tsx` (landing page) and public subpages

#### PublicLayout (`public-layout.tsx`)

**Purpose:** The unauthenticated layout frame for public portal pages.

**Architecture:**

- **Navigation:** Top navigation bar — transparent on hero gradient, `surface-base` on scroll
- **Content area:** Full-width, with 12-column responsive grid
- **Mobile:** Hamburger menu, full-screen overlay on `surface-base`
- **Route integration:** Used as the `layout.tsx` for the `(public)` route group

### Radix UI Primitives — Architectural Dependencies

14 Radix UI primitives are used as behavioral foundations, wrapped with ROSE theming in `packages/ui/src/radix/`:

| Radix Primitive  | Edin Usage                                    | Architectural Note                                     |
| ---------------- | --------------------------------------------- | ------------------------------------------------------ |
| `Accordion`      | Evaluation progressive disclosure             | Keyboard-navigable, used with `EvaluationBreakdown`    |
| `Avatar`         | Profile photos, byline avatars                | `radius-full`, initials fallback                       |
| `Dialog`         | Confirmation modals, application submission   | `surface-overlay` background                           |
| `DropdownMenu`   | Action menus on cards, settings               | `surface-raised`, `accent-primary` hover               |
| `NavigationMenu` | Public portal top navigation                  | Not used in DashboardShell (custom SidebarNav instead) |
| `Popover`        | Quick profile previews, detail tooltips       | Pillar-color border                                    |
| `ScrollArea`     | Sidebar scroll, long feed lists               | Custom scrollbar styling                               |
| `Select`         | Domain filter, difficulty filter, form fields | Dark fields, orange focus ring                         |
| `Separator`      | Section dividers                              | `surface-subtle`, 1px                                  |
| `Switch`         | Settings toggles, notification preferences    | `accent-primary` when active                           |
| `Tabs`           | Feed domain tabs, profile sections            | Pillar-color underline when domain-specific            |
| `Toast`          | Success/error notifications                   | Bottom-right, auto-dismiss (5s)                        |
| `Tooltip`        | Icon explanations, abbreviations              | `surface-overlay`, compact                             |
| `VisuallyHidden` | Accessibility labels                          | Structural — no visual output                          |

**All Radix primitives are imported as unstyled** and wrapped with Tailwind utility classes in the `packages/ui/src/radix/` directory. This gives full visual control while preserving Radix's ARIA, keyboard, and focus management.

### Component Library Scope

The `@edin/ui` package contains **20+ custom components** organized into 5 categories:

**Primitives (Tailwind-only, no Radix):**

- `Button` — Primary (orange fill), Secondary (outline), Ghost (text-only)
- `Card` — `surface-raised`, `radius-md`, 16px padding
- `Input` / `Textarea` — Dark fields on `surface-raised`, orange focus ring
- `Badge` — Small label, `radius-sm`, domain variant uses pillar colors
- `Skeleton` — Loading placeholder, `surface-subtle` animated shimmer

**Domain Identity:**

- `PillarAccentLine` — 3px vertical bar in pillar color (tech=orange, impact=green, governance=cyan, finance=gold)
- `DomainBadge` — Uppercase 11px pillar-color label with optional tinted background
- `PillarCard` — Domain identity card for public portal with hover border effect

**Content Display:**

- `NarrativeCard` — Prose-first card with `PillarAccentLine` border, the primary content unit
- `EvaluationBreakdown` — Full evaluation with narrative-first progressive disclosure (Radix Accordion)
- `ArticleByline` — Author + Editor dual credit display for published articles
- `PullQuote` — Orange-bordered pull quote for articles
- `ActivityFeedItem` — Chronological contribution display with equal domain weight
- `StatusIndicator` — Calm status for async processes ("Your contribution is being analyzed")

**Profile & Rewards:**

- `ContributorProfile` — Author-biography-style display with "Your Fingerprints" section
- `FingerprintItem` — Impact fingerprint with pillar-color dot
- `GrowthCurve` — Organic SVG reward trajectory (Recharts, pillar-color curves on dark background)
- `RewardStat` — Single reward metric card with pillar-color value

**Navigation & Feedback:**

- `SidebarNav` — Left sidebar navigation with pillar-color dots and notification indicators
- `NotificationDot` — 6px `accent-primary` dot (no count, no urgency — calm notification)

### Design System Implementation Rules

**All AI Agents implementing frontend features MUST:**

- Use ROSE design tokens from `theme.css` — never hardcode hex values
- Use ABC Normal as the primary typeface — no system fonts except as fallback
- Use `surface-base` (#1A1A1D) as the default background — dark-first, always
- Use `surface-reading` (#1E1E22) for long-form article backgrounds
- Use pillar colors for domain identification — never create new domain color mappings
- Use `accent-primary` (#FF5A00) for primary CTAs, links, and focus rings
- Use `text-heading` (#E4BDB8, blush pink) for headings on dark backgrounds
- Maintain 24px minimum spacing between content blocks ("the page breathes")
- Use Radix wrappers from `packages/ui/src/radix/` — never import Radix directly in `apps/web`
- Verify WCAG 2.1 AA contrast for all new text/background combinations
- Use skeleton loaders for loading states, never spinners
- Maximum one Primary button per viewport

**Pillar Color Usage — Critical Rule:**

All four domain pillar colors MUST have equal visual weight. No domain appears more prominent or positioned higher by default. The pillar-color accent line (3px vertical bar) is the primary domain identity pattern.

| Domain                          | Token               | Hex       | Usage Examples                               |
| ------------------------------- | ------------------- | --------- | -------------------------------------------- |
| Technology & Development        | `pillar-tech`       | `#FF5A00` | Evaluation cards, feed items, profile badges |
| Impact & Sustainability         | `pillar-impact`     | `#00E87B` | Same layout patterns, green accent           |
| Consciousness & Governance      | `pillar-governance` | `#00C4E8` | Same layout patterns, cyan accent            |
| Finance & Financial Engineering | `pillar-finance`    | `#E8AA00` | Same layout patterns, gold accent            |

### Logo Policy

- **Edin logo** is the primary brand mark across ALL platform sections (header, sidebar, public portal)
- **ROSE shield/rose crest** appears ONLY in Rose-specific content sections (About Rose, Rose context pages)
- The ROSE design language (colors, typography, visual feel) informs the overall design system, but brand identity stays Edin

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices validated as compatible:

- Next.js 16 + NestJS 11 + Turborepo + pnpm workspaces: proven monorepo combination
- Prisma 7 (pure TypeScript) integrates natively with NestJS DI and PostgreSQL 16+
- Redis 7.x serves BullMQ, caching, sessions, and SSE pub/sub without client conflicts
- Zod schemas shared across Next.js (React Hook Form) and NestJS (validation pipe) from single package
- TanStack Query + Zustand: clean separation of server state vs. client state
- Tiptap (ProseMirror) runs client-side, no backend dependency conflict
- OpenTelemetry auto-instrumentation covers HTTP, Prisma, BullMQ, Redis
- Docker Compose orchestrates all services for local dev without port conflicts

**Pattern Consistency:** No contradictions found:

- snake_case DB -> camelCase API -> camelCase/PascalCase code, Prisma `@@map` handles mapping
- Response envelope enforced globally via interceptor — cannot be bypassed by individual controllers
- Event naming (`domain.entity.action`) aligns with module structure (`modules/{domain}/`)
- Error handling: DomainException -> global exception filter -> standard error envelope — single path

**Structure Alignment:** Project structure directly maps to decisions:

- One NestJS module per domain = one PostgreSQL schema = one FR category
- Route groups (public)/(dashboard)/(admin) = RBAC tiers = CASL ability sets
- packages/shared = single source of truth for validation schemas and types

### Requirements Coverage Validation

**Functional Requirements Coverage (79 FRs):**

| FR Category                        | Coverage          | Notes                                                                          |
| ---------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| Contributor Identity (FR1-FR7b)    | Fully covered     | modules/auth/ + modules/contributor/, CASL RBAC, GitHub OAuth                  |
| Admission & Onboarding (FR8-FR14)  | Fully covered     | modules/admission/, 72-Hour Ignition tracked via onboarding state              |
| Contribution Ingestion (FR15-FR20) | Fully covered     | modules/ingestion/, BullMQ processors, webhook + REST fallback                 |
| AI Evaluation Engine (FR21-FR27)   | Fully covered     | modules/evaluation/, model versioning registry, human review queue             |
| Peer Feedback (FR28-FR32)          | Fully covered     | modules/feedback/, assignment algorithm, turnaround tracking                   |
| Community Structure (FR33-FR38)    | Fully covered     | modules/working-group/ + modules/task/                                         |
| Activity Feed (FR39-FR42)          | Fully covered     | SSE via modules/activity/, Redis pub/sub, <5s target                           |
| Public Showcase (FR43-FR47)        | Fully covered     | modules/showcase/, SSR for SEO                                                 |
| Admin Operations (FR48-FR52b)      | Fully covered     | modules/admin/, FR52b marked Phase 2                                           |
| Governance (FR53-FR56)             | Covered (Phase 2) | FR55b static roadmap in Phase 1. FR53-56 deferred                              |
| Reward System (FR57-FR60)          | Partially covered | Phase 1: basic scoring. Multi-temporal Phase 2. Architecture accommodates both |
| Publication Platform (FR66-FR79)   | Fully covered     | modules/publication/, Tiptap, editorial workflow, plagiarism, SSR              |
| Compliance (FR61-FR65)             | Fully covered     | modules/compliance/, audit service, PII separation, GDPR                       |

**Non-Functional Requirements Coverage:**

| NFR Category             | Coverage      | Architectural Support                                |
| ------------------------ | ------------- | ---------------------------------------------------- |
| Performance (P1-P7)      | Fully covered | SSR, Redis cache, BullMQ async, cursor pagination    |
| Security (S1-S9)         | Fully covered | Helmet, JWT+PKCE, CASL, audit logs, data separation  |
| Scalability (SC1-SC6)    | Fully covered | Stateless services, Docker horizontal scaling, Redis |
| Reliability (R1-R5)      | Fully covered | BullMQ retry+DLQ, graceful degradation, backups      |
| Accessibility (A1-A5)    | Fully covered | Tailwind contrast, Playwright a11y, skeleton loaders |
| Integration (I1-I5)      | Fully covered | Webhook-first, rate limiting, extensible normalizer  |
| Observability (O1-O4)    | Fully covered | OpenTelemetry, Pino, correlation IDs, zero-downtime  |
| Content Delivery (C1-C3) | Fully covered | Next.js SSR, structured data, Core Web Vitals        |

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions documented with specific versions. Technology stack fully specified with 10 components, all version-pinned.

**Structure Completeness:** Complete directory tree with 150+ files/directories. Every FR mapped to a specific module and route. Integration points defined with data flow diagram.

**Pattern Completeness:** 28 conflict points addressed. Naming conventions comprehensive across DB, API, and code. Concrete examples and anti-patterns provided.

### Gap Analysis Results

**No Critical Gaps Found.** (ROSE design system gaps resolved in 2026-03-14 architecture update.)

**Important Gaps (non-blocking, addressable during implementation):**

1. **Database schema detail** — Prisma models not yet defined at field level. Domain-separated schema boundaries and table ownership rules are sufficient for implementation.
2. **AI/LLM provider not specified** — Evaluation engine architecture defined but specific provider deferred to prototype experimentation.
3. **Email delivery service** — Notification module architected but delivery service (Resend, SendGrid, SES) not chosen. Low priority for MVP.

**Nice-to-Have Gaps:**

1. Storybook for packages/ui component documentation
2. OpenAPI-to-TypeScript API client SDK generation

**Previously Identified Gaps (Resolved 2026-03-14):**

1. ~~ABC Normal font loading strategy~~ — Documented in "ABC Normal Font Architecture" section
2. ~~Dark-first Tailwind v4 theme definition~~ — Full `@theme` block in "Dark-First Tailwind v4 Theme" section
3. ~~Sidebar navigation pattern~~ — DashboardShell + SidebarNav in "Layout Container Architecture" section
4. ~~Radix UI primitives inventory~~ — 14 primitives listed in "Radix UI Primitives" section
5. ~~Component library scope~~ — 20+ components in "Component Library Scope" section
6. ~~Reading Canvas layout~~ — Documented in "Layout Container Architecture" section

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed (79 FRs, 40+ NFRs)
- [x] Scale and complexity assessed (high complexity, full-stack web app)
- [x] Technical constraints identified (8 constraints)
- [x] Cross-cutting concerns mapped (8 concerns)

**Architectural Decisions**

- [x] Critical decisions documented with versions (10 technology components)
- [x] Technology stack fully specified
- [x] Integration patterns defined (EventEmitter2, BullMQ, direct injection)
- [x] Performance considerations addressed (caching, SSR, async processing)
- [x] Security architecture defined (Passport, JWT, CASL, Helmet)
- [x] Deferred decisions documented with rationale (5 decisions)

**Implementation Patterns**

- [x] Naming conventions established (DB, API, code — 15 element types)
- [x] Structure patterns defined (NestJS modules, Next.js routes, shared packages)
- [x] Communication patterns specified (events, logging, SSE)
- [x] Process patterns documented (error handling, loading states, auth flow, validation flow)
- [x] Enforcement guidelines defined (8 mandatory rules, CI checks)

**ROSE Design System (Added 2026-03-14)**

- [x] ABC Normal font architecture (7 weights, loading strategy, performance budget)
- [x] Dark-first Tailwind v4 `@theme` with complete ROSE token definition
- [x] Three layout containers defined (DashboardShell, ReadingCanvas, HeroSection)
- [x] 14 Radix UI primitives inventoried with ROSE theming strategy
- [x] 20+ custom component library scope defined across 5 categories
- [x] Pillar color system with equal-weight domain identity rules
- [x] Logo policy documented (Edin primary, ROSE shield for Rose-specific sections only)
- [x] Design system implementation rules for AI agent consistency

**Project Structure**

- [x] Complete directory structure defined (150+ files)
- [x] Component boundaries established (15 API boundaries, 4 DB schemas)
- [x] Integration points mapped (internal flow diagram, 5 external integrations)
- [x] Requirements to structure mapping complete (13 FR categories to modules)
- [x] `packages/ui` structure updated with ROSE design system organization

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- End-to-end type safety via shared Zod schemas and TypeScript
- Clean domain separation (NestJS modules = DB schemas = FR categories)
- Event-driven pipeline enables loose coupling and async processing
- Modular monolith allows future microservices extraction without re-architecture
- Comprehensive pattern enforcement prevents AI agent implementation conflicts

**Areas for Future Enhancement:**

- Database field-level schema (during implementation)
- AI/LLM provider selection (during evaluation prototype)
- Email delivery service (during notification implementation)
- Storybook for UI component documentation (when packages/ui matures)

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt, check the naming conventions table and pattern examples

**First Implementation Priority:**

```bash
npx create-turbo@latest edin --package-manager pnpm
```

Then follow the implementation sequence defined in Core Architectural Decisions: scaffold monorepo, configure NestJS foundation, set up authentication, define Prisma schema, build Next.js frontend foundation, then implement features in order.
