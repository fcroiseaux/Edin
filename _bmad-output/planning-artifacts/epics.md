---
stepsCompleted: [1, 2, 3, 4]
lastEditedAt: '2026-03-14'
editReason: 'Add Epic 0 (ROSE Design System Foundation) and update UX design references to match ROSE revision (2026-03-14)'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# Edin - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Edin, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Visitors can view public contributor profiles showing name, bio, domain, and contribution history
- FR2: Contributors can create and edit their personal profile with bio, domain expertise, and skill areas
- FR3: Contributors can view their own contribution history, evaluation scores, and peer feedback received
- FR4: Contributors can view other contributors' public profiles and contribution histories
- FR5: The system can assign and display role designations (Contributor, Founding Contributor, Working Group Lead)
- FR6: Contributors can authenticate via GitHub OAuth
- FR7: The system can enforce role-based access control across six permission tiers (Public, Applicant, Contributor, Founding Contributor, Working Group Lead, Admin)
- FR7b: Admins can designate contributors as Founding Contributors based on documented criteria
- FR8: Applicants can submit a contribution-based application including a domain-specific micro-task
- FR9: Existing contributors can review and evaluate admission applications
- FR10: Admins can manage the admission queue (view, assign reviewers, approve, reject)
- FR11: Admitted contributors can be paired with a buddy for their first 30 days
- FR12: Admitted contributors can access a curated first-task recommendation matched to their domain and skill level
- FR13: Admins can configure domain-specific micro-tasks for the application process
- FR14: The system can track onboarding progress against the 72-Hour Ignition timeline
- FR15: The system can connect to GitHub repositories and ingest commits, pull requests, code reviews, and CI/CD outputs
- FR16: The system can attribute contributions to specific contributors based on version control metadata
- FR17: The system can normalize ingested artifacts into a consistent evaluation-ready format
- FR18: Contributors can view the status of their ingested contributions on their dashboard
- FR19: The system can detect multi-contributor collaboration on shared deliverables, apply default equal-split attribution, and allow contributors to confirm or request admin override
- FR20: Admins can configure which repositories are monitored by the integration layer
- FR21: The system can automatically evaluate code contributions for complexity, maintainability, test coverage, and standards adherence
- FR22: The system can automatically evaluate documentation contributions using a configurable rubric (structural completeness, readability, reference integrity)
- FR23: Contributors can view transparent evaluation breakdowns showing how their work was scored and the criteria applied
- FR24: The system can benchmark AI evaluation outputs against human expert assessments
- FR25: Contributors can view their evaluation score history and trends over time
- FR26: The system can version evaluation models and indicate which model version scored each contribution
- FR27: Contributors can flag an evaluation they believe is incorrect for human review
- FR28: The system can assign peer reviewers to contributions not yet covered by AI evaluation
- FR29: Reviewers can complete a structured feedback rubric (5-7 questions) for assigned contributions
- FR30: Contributors can view peer feedback received on their dashboard
- FR31: Admins can monitor peer feedback turnaround times and identify overdue assignments
- FR32: The system can track feedback completion rates, timeliness, and rubric coverage
- FR33: Contributors can view and join one of four domain working groups (Technology, Finance, Impact, Governance)
- FR34: Contributors can browse a curated contribution menu of available tasks tagged by domain, difficulty, and estimated effort
- FR35: Admins and Working Group Leads can create, edit, and retire tasks on the contribution menu
- FR36: Contributors can claim tasks from the contribution menu
- FR37: The system can track task status (available, claimed, in progress, completed, evaluated)
- FR38: Working Group Leads can manage their domain working group (WG dashboard, task prioritization, announcements, domain-specific admission review)
- FR39: All stakeholders can view an Activity Feed (Contribution Wall) showing contributions across all domains
- FR40: The Activity Feed can display contributions from all four domains with equivalent visual prominence
- FR41: Contributors can receive notifications when their contributions are evaluated or when peer feedback is available
- FR42: The system can update the Activity Feed within <5 seconds of ingestion completion
- FR43: Visitors can access a public project showcase page displaying mission, vision, and Founding Circle roster without authentication
- FR44: Visitors can view domain manifestos describing each of the four contribution pillars
- FR45: Visitors can view key platform metrics (active contributors, contribution velocity, domain distribution, retention rates)
- FR46: Visitors can browse the contributor roster with professional backgrounds and domain expertise
- FR47: Visitors can view aggregate AI evaluation data on public contribution pages
- FR48: Admins can view a health metrics dashboard showing community vitals
- FR49: Admins can manage contributor roles and permissions
- FR50: Admins can configure platform settings (monitored repositories, feedback assignment rules, onboarding parameters)
- FR51: Admins can generate and export platform metrics reports
- FR52: The system can maintain immutable audit logs of admission decisions, evaluation outputs, and governance actions
- FR52b: Admins can send targeted messages to specific contributors or contributor groups (Phase 2)
- FR53: Contributors can submit governance proposals for community discussion (Phase 2)
- FR54: Contributors can participate in structured discussions on governance proposals (Phase 2)
- FR55: The system can track governance proposal lifecycle with contributor-visible decision trail (Phase 2)
- FR55b: Contributors can view a progressive decentralization roadmap (Phase 1: static display; Phase 2: dynamic tracking)
- FR56: Contributors can accumulate governance weight from contribution score, engagement duration, and domain breadth (Phase 2)
- FR57: Contributors can view a reward trajectory visualization showing scaling-law compounding rewards
- FR58: The system can calculate contribution scores (AI evaluation + peer feedback + task complexity + domain normalization) on 0-100 scale (Phase 1: basic scoring; Phase 2: full multi-temporal)
- FR59: Contributors and visitors can view scaling-law reward methodology explanation with visual representations
- FR60: The system can track contribution scores across temporal horizons (Phase 1: single-horizon; Phase 2+: multi-temporal)
- FR61: The system can present data processing agreements to contributors during onboarding for explicit consent
- FR62: Contributors can request export of their personal data (GDPR data portability)
- FR63: Contributors can request deletion of their personal data with pseudonymization of on-chain records (GDPR right to erasure)
- FR64: The system can maintain separation between contributor identity data and contribution/evaluation records
- FR65: The system can generate EU AI Act compliance documentation (Model Card, Evaluation Criteria Spec, Human Oversight Report, Data Processing Record)
- FR66: Contributors can create and submit article drafts through a structured authoring interface with rich text editing, domain tagging, and abstract/summary fields
- FR67: The system can assign an Editor to each submitted article based on domain expertise match and Editor availability
- FR68: Editors can review assigned articles and provide structured editorial feedback including inline comments, revision requests, and approval/rejection decisions
- FR69: Authors can view editorial feedback on their drafts and submit revised versions, with version history preserved
- FR70: The system can track article lifecycle (draft → submitted → editorial review → revision requested → approved → published → archived)
- FR71: The system can allocate 20% of the author's content reward to the assigned Editor upon article publication
- FR72: Visitors can browse and read published articles on the public portal without authentication
- FR73: Published articles can display author profile, Editor profile, domain tags, publication date, and AI evaluation score
- FR74: Contributors can claim available Editor roles for articles matching their domain expertise
- FR75: The AI Evaluation Engine can evaluate published article quality (analytical depth, originality, clarity, domain relevance)
- FR76: Authors and Editors can view publication metrics (view count, external referral sources, reader engagement)
- FR77: Admins can manage editorial standards, publication guidelines, and Editor eligibility criteria
- FR78: Admins can moderate published content (unpublish, flag for review, request corrections) with audit trail
- FR79: The system can detect and flag potential plagiarism and undisclosed AI-generated content in article submissions

Total FRs: 79

### NonFunctional Requirements

- NFR-P1: Public pages First Contentful Paint <1.5s on 4G connection
- NFR-P2: Authenticated dashboard Time to Interactive <3s; user actions complete within 2s
- NFR-P3: Activity Feed updates <5 seconds from ingestion completion to feed visibility
- NFR-P4: 95th percentile API response time <500ms
- NFR-P5: GitHub ingestion pipeline <15 minutes from contribution event to dashboard visibility
- NFR-P6: AI evaluation <30 minutes for code; <15 minutes for documentation
- NFR-P7: Search and filtering results <1s
- NFR-S1: TLS encryption for all data in transit; no unencrypted endpoints
- NFR-S2: AES-256 encryption at rest for contributor PII, evaluation scores, token balances
- NFR-S3: No plaintext credentials in codebase, logs, or storage; all secrets encrypted at rest
- NFR-S4: OAuth 2.0 / OIDC with PKCE; 24h session expiry; 30-day refresh token; token rotation on every refresh
- NFR-S5: Zero unauthorized access across all RBAC tiers verified by automated tests
- NFR-S6: Immutable audit logs with 100% event coverage; 2-year retention; queryable within 10s
- NFR-S7: OWASP Top 10 mitigations verified (input validation, CSRF, XSS, SQL injection prevention)
- NFR-S8: On-chain records contain no directly identifiable data; identity mapping stored separately
- NFR-S9: Smart contract third-party audit with no critical/high findings unresolved (Phase 2+)
- NFR-SC1: 50 concurrent contributors with no performance degradation (Phase 1)
- NFR-SC2: 200 concurrent contributors with <10% degradation (Phase 2)
- NFR-SC3: 500+ contributions/day without feed latency exceeding 10s
- NFR-SC4: 20+ monitored repositories with >99% ingestion success rate and <15 min p95 latency
- NFR-SC5: 2+ years contribution data without query performance degradation beyond 20%
- NFR-SC6: Horizontal scaling to 3x instances with linear throughput increase
- NFR-R1: >99.5% uptime monthly
- NFR-R2: Automatic retry with exponential backoff; zero contribution loss from transient GitHub failures
- NFR-R3: Graceful degradation for evaluation engine failures ("evaluation pending" state)
- NFR-R4: Daily backups with <4h RPO; <2h RTO
- NFR-R5: >95% peer feedback assignment success rate
- NFR-A1: WCAG 2.1 Level AA compliance for all pages
- NFR-A2: Screen-reader compatible Activity Feed and evaluation displays (announcements within 2s)
- NFR-A3: Complete keyboard-only navigation for all task flows
- NFR-A4: 4.5:1 color contrast minimum; alternative text for chart data
- NFR-A5: Automated accessibility testing on every deployment; manual audit quarterly
- NFR-I1: >99% artifact ingestion success rate measured weekly
- NFR-I2: Webhook-first architecture; rate-limited requests queued without data loss
- NFR-I3: New integration source addable by single developer within 2 weeks
- NFR-I4: API versioning with 6-month deprecation support
- NFR-I5: Minimum permissions per integration connector; automated permission scope audit
- NFR-O1: Alerts within 60 seconds of threshold breach
- NFR-O2: 100% correlation IDs; root cause traceable within 30 minutes from logs
- NFR-O3: All KPIs on dashboard with <5 minute data lag; export available
- NFR-O4: Zero-downtime deployments; rollback within 5 minutes; staging validation required
- NFR-C1: Article pages FCP <1.2s; LCP <2.5s; Core Web Vitals passing
- NFR-C2: SSR article pages with JSON-LD structured data; Open Graph/Twitter Card metadata; sitemap updated within 1h
- NFR-C3: 1000+ published articles without query degradation beyond 10%; search <1s

Total NFRs: 44

### Additional Requirements

**From Architecture — Starter Template (CRITICAL for Epic 1 Story 1):**

- Turborepo + pnpm workspaces monorepo scaffold (apps/web, apps/api, packages/shared)
- Next.js 16 (App Router) with Tailwind CSS 4.x and Turbopack
- NestJS 11 with strict TypeScript
- Prisma 7.x with PostgreSQL 16+ (domain-separated schemas: core, evaluation, publication, audit)
- Redis 7.x for caching, session store, and BullMQ backing
- Docker + Docker Compose for local development
- Vitest + Playwright for testing
- ESLint + Prettier + Husky for code quality

**From Architecture — Infrastructure & Deployment:**

- Docker containers, cloud-agnostic hosting
- GitHub Actions CI/CD pipeline (build, lint, test, E2E, security scan, deploy on merge)
- Pino structured JSON logging with correlation IDs via nestjs-pino
- OpenTelemetry for traces and metrics (vendor-agnostic)
- Environment configuration via .env files + NestJS ConfigModule + Zod validation at startup
- Automated pg_dump backups (RPO <4h, RTO <2h)

**From Architecture — Implementation Sequence:**

1. Monorepo scaffold (Turborepo + pnpm + Docker Compose)
2. NestJS API foundation (ConfigModule, Pino, OpenTelemetry, global exception filter, correlation IDs)
3. Authentication (Passport.js GitHub OAuth + JWT + RBAC with CASL)
4. Database schema (Prisma, domain-separated schemas, seed data)
5. Next.js frontend foundation (TanStack Query, Zustand, route groups, Tailwind design system)
6. GitHub integration (webhook listener, BullMQ ingestion pipeline)
7. Core features (contributor profiles, admission, activity feed, peer feedback)
8. AI Evaluation Engine prototype
9. Publication Platform (Tiptap editor, editorial workflow)

**From Architecture — Cross-Component Dependencies:**

- Auth (Passport + CASL) must be complete before any authenticated feature
- BullMQ + Redis must be configured before ingestion pipeline or evaluation dispatch
- Shared Zod schemas must be defined before frontend forms or API validation
- Prisma schema must cover domain-separated schemas before feature development
- OpenTelemetry + Pino must be configured early
- Tiptap editor depends on packages/ui being established

**From Architecture — Key Technology Decisions:**

- REST API with OpenAPI/Swagger auto-generated docs (@nestjs/swagger)
- URI-based API versioning (/api/v1/...)
- SSE for Activity Feed real-time updates (Redis pub/sub for multi-instance)
- BullMQ with dedicated queues: github-ingestion, evaluation-dispatch, notification, feedback-assignment, plagiarism-check
- EventEmitter2 for internal module communication
- JWT with 15-min access tokens + Redis refresh tokens (30-day, rotation on use)
- CASL for RBAC with 7 tiers
- TanStack Query (server state) + Zustand (client state)
- React Hook Form + Zod (from packages/shared)
- Tiptap (headless ProseMirror-based) for Publication Platform editor
- Recharts for data visualization

**From Architecture — Implementation Patterns:**

- API response envelope: { data, meta } for success; { error: { code, message, status, correlationId } } for errors
- Cursor-based pagination (default limit: 20, max: 100)
- DomainException base class for all business errors
- Domain events: {domain}.{entity}.{action} via EventEmitter2
- Skeleton loaders for loading states (not spinners)
- Optimistic updates for user actions
- Tests co-located with source files (\*.spec.ts)
- No PII in logs at info level or above

**From UX — ROSE Design System Requirements (revised 2026-03-14):**

- Tailwind CSS v4 + Radix UI primitives (14 primitives) + custom `@edin/ui` component library
- Dark-first design: `surface-base` (#1A1A1D) as default background; light mode is a Phase 2 variant
- ABC Normal typeface (7 weights: Light/Book/Neutral/Medium/Bold/Black/Super) — weight-based hierarchy, not serif/sans-serif split
- Pillar colors: Technology (#FF5A00 orange), Impact (#00E87B green), Governance (#00C4E8 cyan), Finance (#E8AA00 gold)
- Accent: vivid orange (#FF5A00) primary, blush pink (#E4BDB8) headings on dark backgrounds
- 4px spacing base unit; minimum 24px between content blocks ("the page breathes")
- No red/green for scoring; narrative-first evaluation design with progressive disclosure
- Three layout containers: DashboardShell (sidebar 240px/64px), ReadingCanvas (680px centered), PublicPortal (gradient hero)
- 20+ custom ROSE-themed components (NarrativeCard, EvaluationBreakdown, PillarAccentLine, DomainBadge, etc.)

**From UX — Responsive & Accessibility:**

- Mobile-first for article reading; desktop-first for authoring and admin
- Sidebar collapses to mobile overlay; breakpoints at 640/768/1024/1280/1536px
- Minimum touch targets: 44x44px
- Visible focus indicators (3px `accent-primary` orange ring)
- `prefers-reduced-motion` support; 200ms ease-out transitions only
- WCAG 2.1 AA contrast verified: text-primary on surface-base ~15:1, text-heading on surface-base ~8:1

**From UX — Interaction Patterns:**

- "Narrative Evaluation" pattern: narrative card → expandable dimension cards → trajectory visualization
- Block-based article editor with slash commands (Tiptap)
- Inline editorial feedback (highlighted passages with side-panel comments)
- Activity Feed: chronological, no ranking, no leaderboards
- No badge counts, no streak counters, no gamification
- 48-hour delay on publication metrics to prevent refresh anxiety
- Skeleton loaders with gentle pulsing opacity
- 200ms ease-out transitions, no decorative animation

### FR Coverage Map

- FR1: Epic 2 — Public contributor profiles
- FR2: Epic 2 — Contributor profile editing
- FR3: Epic 2 — Contributor dashboard (own history, scores, feedback)
- FR4: Epic 2 — View other contributors' profiles
- FR5: Epic 2 — Role designations display
- FR6: Epic 1 — GitHub OAuth authentication
- FR7: Epic 1 — RBAC across permission tiers
- FR7b: Epic 1 — Founding Contributor designation
- FR8: Epic 3 — Contribution-based application with micro-task
- FR9: Epic 3 — Contributor review of applications
- FR10: Epic 3 — Admin admission queue management
- FR11: Epic 3 — Buddy pairing for new contributors
- FR12: Epic 3 — First-task recommendation
- FR13: Epic 3 — Admin configures micro-tasks
- FR14: Epic 3 — 72-Hour Ignition tracking
- FR15: Epic 4 — GitHub repository connection and ingestion
- FR16: Epic 4 — Contribution attribution from version control
- FR17: Epic 4 — Artifact normalization to evaluation-ready format
- FR18: Epic 4 — Contributor dashboard ingestion status
- FR19: Epic 4 — Multi-contributor collaboration detection and attribution
- FR20: Epic 4 — Admin configures monitored repositories
- FR21: Epic 7 — AI code evaluation (complexity, maintainability, test coverage)
- FR22: Epic 7 — AI documentation evaluation (completeness, readability, references)
- FR23: Epic 7 — Transparent evaluation breakdowns (Narrative Evaluation)
- FR24: Epic 7 — AI evaluation benchmarking against human experts
- FR25: Epic 7 — Evaluation score history and trends
- FR26: Epic 7 — Evaluation model versioning
- FR27: Epic 7 — Flag evaluation for human review
- FR28: Epic 6 — Peer reviewer assignment
- FR29: Epic 6 — Structured feedback rubric
- FR30: Epic 6 — View peer feedback on dashboard
- FR31: Epic 6 — Admin monitor feedback turnaround
- FR32: Epic 6 — Feedback completion tracking
- FR33: Epic 5 — View and join working groups
- FR34: Epic 5 — Browse contribution menu
- FR35: Epic 5 — Create/edit/retire tasks (Admin, WG Leads)
- FR36: Epic 5 — Claim tasks from contribution menu
- FR37: Epic 5 — Task status tracking
- FR38: Epic 5 — Working Group Lead management
- FR39: Epic 5 — Activity Feed across all domains
- FR40: Epic 5 — Equal visual prominence across domains
- FR41: Epic 5 — Notifications for evaluations and feedback
- FR42: Epic 5 — Activity Feed real-time updates (<5s)
- FR43: Epic 2 — Public showcase page
- FR44: Epic 2 — Domain manifestos
- FR45: Epic 2 — Public platform metrics
- FR46: Epic 2 — Public contributor roster
- FR47: Epic 7 — Public AI evaluation data
- FR48: Epic 10 — Admin health metrics dashboard
- FR49: Epic 10 — Admin manage roles and permissions
- FR50: Epic 10 — Admin platform settings
- FR51: Epic 10 — Admin metrics reports export
- FR52: Epic 10 — Immutable audit logs
- FR52b: Phase 2 — Deferred (admin targeted messaging)
- FR53: Phase 2 — Deferred (governance proposals)
- FR54: Phase 2 — Deferred (governance discussions)
- FR55: Phase 2 — Deferred (governance lifecycle tracking)
- FR55b: Epic 2 — Progressive decentralization roadmap (static display)
- FR56: Phase 2 — Deferred (governance weight accumulation)
- FR57: Epic 9 — Reward trajectory visualization
- FR58: Epic 7 (basic scoring) / Epic 9 (advanced) — Contribution score calculation
- FR59: Epic 2 (public explanation) / Epic 9 (dashboard visualization) — Reward methodology explanation
- FR60: Epic 7 (single-horizon) / Epic 9 (multi-temporal) — Temporal score tracking
- FR61: Epic 3 — GDPR consent at onboarding
- FR62: Epic 10 — GDPR data export
- FR63: Epic 10 — GDPR data deletion with pseudonymization
- FR64: Epic 10 — PII separation from contribution records
- FR65: Epic 10 — EU AI Act compliance documentation
- FR66: Epic 8 — Article authoring interface
- FR67: Epic 8 — Editor assignment
- FR68: Epic 8 — Editorial feedback (inline comments, decisions)
- FR69: Epic 8 — Author revision workflow
- FR70: Epic 8 — Article lifecycle state machine
- FR71: Epic 8 — Author/Editor 80/20 reward split
- FR72: Epic 8 — Public article reading experience
- FR73: Epic 8 — Published article metadata display
- FR74: Epic 8 — Claim Editor role
- FR75: Epic 8 — AI article quality evaluation
- FR76: Epic 8 — Publication metrics
- FR77: Epic 8 — Admin editorial standards management
- FR78: Epic 8 — Admin content moderation
- FR79: Epic 8 — Plagiarism and AI-content detection

**Coverage summary:** 74 FRs mapped to MVP Epics 1-10. 5 FRs deferred to Phase 2 (FR52b, FR53, FR54, FR55, FR56).

## Epic List

### Epic 0: ROSE Design System Foundation

The platform's visual identity is established through the ROSE design language — dark-first surfaces, ABC Normal typography, vivid orange accents, and pillar-coded domain colors. All design tokens, font loading, layout containers, Radix UI wrappers, and base components are implemented in `@edin/ui` before any feature development begins. Every subsequent epic depends on this foundation.
**FRs covered:** None directly (design infrastructure). Enables visual implementation of FR40 (equal visual prominence), NFR-A1-A5 (accessibility), NFR-P1 (FCP <1.5s font optimization).

### Epic 1: Project Foundation & Contributor Authentication

Contributors can sign in via GitHub OAuth, and the platform enforces role-based access control across 7 permission tiers. The monorepo is scaffolded with all infrastructure (Turborepo, Next.js 16, NestJS 11, Prisma 7, PostgreSQL, Redis, Docker), CI/CD, observability, and the shared design system foundation.
**FRs covered:** FR6, FR7, FR7b

### Epic 2: Contributor Profiles & Public Showcase

Contributors can create and edit profiles with bio, domain expertise, and skill areas. Visitors can browse the public showcase page, domain manifestos, contributor roster, platform metrics, and a static progressive decentralization roadmap — all without authentication. The public reward methodology explanation is accessible.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR43, FR44, FR45, FR46, FR55b, FR59

### Epic 3: Admission & Onboarding

Applicants can submit a contribution-based application with a domain-specific micro-task. Existing contributors review applications. Admins manage the admission queue. Admitted contributors are paired with a buddy, receive a curated first-task recommendation, and progress through the 72-Hour Ignition onboarding. GDPR data processing consent is presented during onboarding.
**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR61

### Epic 4: GitHub Integration & Contribution Tracking

The system connects to GitHub repositories, ingests commits, pull requests, code reviews, and CI/CD outputs via webhooks. Contributions are attributed to specific contributors, normalized into evaluation-ready format, and displayed on the contributor dashboard. Multi-contributor collaboration is detected with attribution confirmation.
**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20

### Epic 5: Community Structure, Tasks & Activity Feed

Contributors can view and join domain working groups, browse a curated contribution menu, claim tasks, and track task progress. The Activity Feed displays contributions across all four domains with equal visual prominence and real-time updates. Contributors receive notifications for evaluations and feedback. Working Group Leads manage their domains.
**FRs covered:** FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42

### Epic 6: Peer Feedback System

The system assigns peer reviewers to contributions. Reviewers complete a structured feedback rubric. Contributors view feedback on their dashboard. Admins monitor turnaround times and completion rates.
**FRs covered:** FR28, FR29, FR30, FR31, FR32

### Epic 7: AI Evaluation Engine

The system automatically evaluates code and documentation contributions using AI, producing transparent narrative evaluation breakdowns. Contributors can view score history, trends, and flag evaluations for human review. Evaluation models are versioned. AI outputs are benchmarked against human expert assessments. Basic contribution scoring is calculated. Public AI evaluation data is available.
**FRs covered:** FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR47, FR58 (basic), FR60 (single-horizon)

### Epic 8: Publication Platform

Contributors can create article drafts using a rich block editor with slash commands. Submitted articles are assigned an Editor matched by domain expertise. Editors provide inline editorial feedback. Authors revise through version-tracked iterations. Published articles are displayed on a beautifully designed public reading experience with author/editor bylines, domain tags, and AI evaluation scores. Publication metrics are available. Admins manage editorial standards and moderate content. Plagiarism detection flags suspicious submissions.
**FRs covered:** FR66, FR67, FR68, FR69, FR70, FR71, FR72, FR73, FR74, FR75, FR76, FR77, FR78, FR79

### Epic 9: Reward System & Scoring

Contributors can view their contribution scores, reward trajectory visualizations showing scaling-law compounding, and understand the multi-temporal reward methodology. Scores integrate AI evaluation, peer feedback, task complexity, and domain normalization.
**FRs covered:** FR57, FR58 (advanced), FR59 (dashboard), FR60 (multi-temporal)

### Epic 10: Admin Operations, Compliance & Observability

Admins have a health metrics dashboard showing community vitals, can manage contributor roles and permissions, configure platform settings, generate and export metrics reports. The system maintains immutable audit logs. GDPR data export and deletion with pseudonymization is supported. EU AI Act compliance documentation is generated. PII is separated from contribution records.
**FRs covered:** FR48, FR49, FR50, FR51, FR52, FR62, FR63, FR64, FR65

### Phase 2 Deferred

**FRs deferred:** FR52b (admin targeted messaging), FR53 (governance proposals), FR54 (governance discussions), FR55 (governance lifecycle), FR56 (governance weight)

## Epic 0: ROSE Design System Foundation

The platform's visual identity is established through the ROSE design language — dark-first surfaces, ABC Normal typography, vivid orange accents, and pillar-coded domain colors. All design tokens, font loading, layout containers, Radix UI wrappers, and base components are implemented in `@edin/ui` before any feature development begins. Every subsequent epic depends on this foundation.

### Story 0.1: ROSE Design Tokens & ABC Normal Font Integration

As a contributor,
I want the platform to render with the ROSE visual identity — dark backgrounds, ABC Normal typography, and vivid orange accents,
So that every page feels like a beautifully designed publication from my first visit.

**Acceptance Criteria:**

**Given** the `@edin/ui` package exists in the monorepo
**When** I create the design token file at `packages/ui/src/tokens/theme.css`
**Then** a Tailwind v4 `@theme` block defines all ROSE CSS custom properties: 6 surface colors (`surface-base` #1A1A1D through `surface-editor` #252528), 4 accent colors (`accent-primary` #FF5A00, `accent-primary-hover` #FF7A2E, `accent-secondary` #E4BDB8, `accent-secondary-muted` #C9A09A), 4 pillar colors (`pillar-tech` #FF5A00, `pillar-impact` #00E87B, `pillar-governance` #00C4E8, `pillar-finance` #E8AA00), 4 semantic colors (`success`, `warning`, `error`, `info`), 6 text colors, the full type scale (Major Third 1.25), spacing scale (4px base unit, space-1 through space-16), border radii (radius-sm through radius-full), and shadow definitions
**And** the token file is importable by `apps/web/app/global.css`

**Given** the ABC Normal font files exist in `docs/rose-design/fonts/`
**When** I configure font loading in `packages/ui/src/fonts/abc-normal.css`
**Then** `@font-face` declarations are defined for all 7 weights (Light 300, Book 400, Neutral 450, Medium 500, Bold 700, Black 800, Super 900) using WOFF2 format with `font-display: swap`
**And** the font family is registered as `'ABC Normal'` with fallback `'-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'`
**And** font files are subsetted to Latin + Latin Extended character sets
**And** the total font payload is under 200KB (all 7 weights, subsetted, WOFF2)

**Given** the fonts and tokens are configured
**When** I add `<link rel="preload">` tags to `apps/web/app/layout.tsx`
**Then** ABC Normal Book (400) and ABC Normal Medium (500) are preloaded as the critical path fonts
**And** remaining weights (Light, Neutral, Bold, Black, Super) load on demand
**And** First Contentful Paint is not blocked by font loading (swap behavior ensures text is visible immediately with fallback)

**Given** the design tokens and fonts are integrated
**When** I view any page in the application
**Then** the background is `surface-base` (#1A1A1D) by default
**And** body text uses ABC Normal Book at 16px with `text-primary` (#F0F0F0) color
**And** all Tailwind utility classes (`bg-surface-base`, `text-accent-primary`, `font-bold`, etc.) resolve to the ROSE token values

### Story 0.2: Foundation UI Primitives

As a contributor,
I want consistent, accessible interactive elements across the platform,
So that buttons, inputs, cards, and badges feel cohesive and respond predictably.

**Acceptance Criteria:**

**Given** the ROSE tokens are configured (Story 0.1)
**When** I build the `Button` component in `packages/ui/src/primitives/button.tsx`
**Then** three variants are available: Primary (`accent-primary` fill #FF5A00, white text), Secondary (`surface-subtle` border, `text-primary` text, transparent fill), and Ghost (no border, no fill, `text-accent` or `text-secondary` text)
**And** button text uses ABC Normal Medium at 14-16px with action verb labels
**And** minimum touch target is 44x44px
**And** hover: Primary lightens to `accent-primary-hover`, Secondary shows `surface-subtle` fill, Ghost shows underline
**And** focus: 3px `accent-primary` ring on all variants, visible on dark and light surfaces
**And** disabled: 40% opacity, `cursor: not-allowed`, no hover effect

**Given** the ROSE tokens are configured
**When** I build the `Input` and `Textarea` components
**Then** fields render on `surface-raised` background with 1px `surface-subtle` border, `text-primary` text, ABC Normal Book 16px
**And** focus state shows 3px orange focus ring (`accent-primary`), border shifts to `accent-primary`
**And** error state shows `error` (#E85A5A) border with inline error message
**And** placeholder text uses `text-tertiary`, ABC Normal Light
**And** labels are always positioned above inputs (ABC Normal Medium, 14px, `text-secondary`)

**Given** the ROSE tokens are configured
**When** I build the `Card` component
**Then** cards render with `surface-raised` background, `radius-md` (8px), `shadow-sm`, 16px internal padding
**And** cards have a 1px `surface-subtle` border
**And** card hover state shows subtle border/shadow shift

**Given** the ROSE tokens are configured
**When** I build the `Badge` component
**Then** badges render with `radius-sm` (4px), ABC Normal Medium, 12px
**And** a domain variant accepts a `domain` prop (tech/impact/governance/finance) and renders with the corresponding pillar color
**And** badges can be text-only or filled (8% opacity pillar color background + pillar-color border)

**Given** the ROSE tokens are configured
**When** I build the `Skeleton` component
**Then** skeleton loaders render on `surface-subtle` with an animated shimmer effect
**And** the animation respects `prefers-reduced-motion` (disables shimmer when reduced motion is preferred)

### Story 0.3: Radix UI Wrappers with ROSE Theming

As a contributor,
I want modals, dropdowns, tabs, and accordions that are keyboard-accessible and visually consistent with the ROSE design,
So that I can navigate the platform efficiently without a mouse.

**Acceptance Criteria:**

**Given** Radix UI primitives are installed as dependencies
**When** I create ROSE-themed wrappers in `packages/ui/src/radix/`
**Then** the following 12 components are available as styled wrappers (Radix handles behavior, ROSE handles visuals):

- `Accordion` — dark surface, blush-pink trigger text, keyboard-navigable expand/collapse
- `Avatar` — `radius-full`, initials fallback on `surface-subtle` background
- `Dialog` — `surface-overlay` background, `shadow-lg`, focus-trapped, escape-to-close
- `DropdownMenu` — `surface-raised`, `accent-primary` on hover, keyboard arrow navigation
- `Popover` — `surface-raised` with pillar-color border variant
- `ScrollArea` — subtle scrollbar styled in `surface-subtle`
- `Select` — dark input fields, orange focus ring, keyboard-selectable options
- `Switch` — `accent-primary` when active, `surface-subtle` when inactive
- `Tabs` — underline style, pillar-color underline when domain-specific
- `Toast` — bottom-right, auto-dismiss after 5 seconds, non-blocking
- `Tooltip` — `surface-overlay` background, compact text

**And** all wrappers preserve Radix's accessibility features (ARIA attributes, keyboard navigation, focus management)
**And** `VisuallyHidden` is re-exported directly from Radix (no styling wrapper needed)

**Given** any Radix wrapper is used in `apps/web`
**When** a keyboard user navigates to it
**Then** focus is visible with a 3px `accent-primary` ring
**And** all interactive states (open/close, select, toggle) are operable via keyboard only (NFR-A3)
**And** screen readers announce state changes within 2 seconds (NFR-A2)

### Story 0.4: Layout Containers — DashboardShell & SidebarNav

As a contributor,
I want a clean sidebar navigation that shows me where I am and what needs attention,
So that I can move between evaluations, contributions, publications, and settings without losing context.

**Acceptance Criteria:**

**Given** the ROSE tokens and foundation components are available (Stories 0.1-0.3)
**When** I build `DashboardShell` in `packages/ui/src/layout/dashboard-shell.tsx`
**Then** the layout renders a fixed left sidebar (240px wide) alongside a main content area on `surface-base`
**And** the sidebar has a `surface-raised` background
**And** the content area fills the remaining viewport width
**And** proper HTML landmarks are used: `<nav>` for sidebar, `<main>` for content
**And** a skip-to-content link is the first focusable element

**Given** the DashboardShell is rendered
**When** I click the collapse button or press the keyboard shortcut
**Then** the sidebar collapses to 64px (icon-only mode)
**And** the collapse preference is persisted in `localStorage`
**And** the transition is 200ms ease-out
**And** the transition is skipped when `prefers-reduced-motion` is active

**Given** the viewport is below 768px (mobile)
**When** I view the dashboard
**Then** the sidebar is hidden by default
**And** a hamburger menu button appears in the top bar
**And** tapping the hamburger opens the sidebar as a full-screen overlay on `surface-base`
**And** the overlay can be dismissed by tapping outside, pressing escape, or tapping the close button

**Given** the DashboardShell is available
**When** I build `SidebarNav` in `packages/ui/src/layout/sidebar-nav.tsx`
**Then** the navigation shows: the Edin logo at the top, nav sections with section titles, and nav items with labels
**And** each nav item can display a pillar-color dot for domain context
**And** the active nav item shows `accent-primary` text + 2px right border + subtle `accent-primary` background tint (8% opacity)
**And** the component accepts an `aria-current="page"` prop for the active item
**And** navigation is fully keyboard-navigable with visible focus indicators

**Given** a nav item has unread updates
**When** the notification state is active
**Then** a 6px `accent-primary` dot appears on the nav item — no count badge, no urgency
**And** the `aria-label` announces "new updates available" for screen readers

### Story 0.5: Layout Containers — ReadingCanvas & Public Portal

As a reader,
I want published articles to feel like opening a beautifully designed magazine — immersive, focused, with no platform chrome competing for attention,
So that I can engage with the community's intellectual output in comfort.

**Acceptance Criteria:**

**Given** the ROSE tokens are available (Story 0.1)
**When** I build `ReadingCanvas` in `packages/ui/src/layout/reading-canvas.tsx`
**Then** the layout renders a full-width `surface-reading` (#1E1E22) background with a centered content column at max-width 680px
**And** the content column uses ABC Normal Book at 18px, line-height 1.7 (optimal reading measure ~65-75 characters)
**And** paragraph spacing is 1.5em between paragraphs
**And** headings use ABC Normal Black with `text-heading` (blush pink #E4BDB8) color
**And** a minimal top navigation bar provides a back-to-dashboard link and article metadata
**And** NO sidebar, NO dashboard navigation — this is a distinct layout, not a variant of DashboardShell
**And** the layout is used as the template for `(public)/articles/[slug]/page.tsx`
**And** the `<article>` landmark is used with proper heading hierarchy

**Given** I build `HeroSection` in `packages/ui/src/layout/hero-section.tsx`
**When** the component is rendered on the public homepage
**Then** a cinematic ROSE gradient background renders (radial orange/pink glow on `surface-base`)
**And** centered content shows: overline (ABC Normal Medium, uppercase, letter-spacing 0.1em), headline (ABC Normal Super 48px), subtitle (ABC Normal Book), and a Primary CTA button
**And** two variants are available: full-height (homepage) and compact (subpages)
**And** the gradient is decorative — text meets WCAG AA contrast against the darkest background value

**Given** I build `PublicLayout` in `packages/ui/src/layout/public-layout.tsx`
**When** the layout is rendered for unauthenticated pages
**Then** a top navigation bar renders — transparent over the hero gradient, transitioning to `surface-base` on scroll
**And** the content area uses a 12-column responsive grid
**And** mobile navigation uses a hamburger menu with full-screen overlay on `surface-base`
**And** the layout is used as `layout.tsx` for the `(public)` route group

### Story 0.6: Domain Identity & Content Display Components

As a contributor,
I want every piece of content to show which domain it belongs to through consistent visual markers,
So that I can immediately see Technology, Impact, Governance, and Finance work treated with equal dignity.

**Acceptance Criteria:**

**Given** the ROSE tokens and primitives are available (Stories 0.1-0.3)
**When** I build `PillarAccentLine` in `packages/ui/src/domain/pillar-accent-line.tsx`
**Then** the component renders a 3px-wide vertical color bar spanning the full height of its parent container
**And** the color is determined by a `domain` prop: `tech` (#FF5A00 orange), `impact` (#00E87B green), `governance` (#00C4E8 cyan), `finance` (#E8AA00 gold)
**And** the color bar has `radius-full` rounded ends
**And** the color is NEVER the sole information carrier — it is always paired with a text label (NFR-A4)

**Given** the ROSE tokens are available
**When** I build `DomainBadge` in `packages/ui/src/domain/domain-badge.tsx`
**Then** the badge renders uppercase text at 11px, ABC Normal Medium, `letter-spacing: 0.05em`, in the domain's pillar color
**And** two variants are available: text-only and filled (8% opacity pillar-color background + pillar-color border)
**And** all four domain badges have identical dimensions and visual weight — no domain appears more prominent

**Given** the ROSE tokens are available
**When** I build `NarrativeCard` in `packages/ui/src/content/narrative-card.tsx`
**Then** the card renders with a `PillarAccentLine` left border, a header (title + `DomainBadge`), a narrative paragraph (ABC Normal Book 15px), and a metadata row
**And** hover state shows a subtle border/shadow shift
**And** an Evaluation variant includes a "See detail" Radix Accordion for progressive disclosure
**And** a Feedback variant includes resolve action buttons
**And** the card is a clickable region with a descriptive `aria-label`

**Given** the ROSE tokens are available
**When** I build `ArticleByline` in `packages/ui/src/content/article-byline.tsx`
**Then** the component displays Author (avatar + name + role) and Editor (avatar + name + role) side by side, separated by a spacer
**And** each name is a link to the contributor's profile
**And** variants: single author (no editor), dual (author + editor), multi-author

**Given** the ROSE tokens are available
**When** I build `PullQuote` in `packages/ui/src/content/pull-quote.tsx`
**Then** the component renders a 3px `accent-primary` left border with quote text (ABC Normal Light, 24px, `text-heading` blush pink color) and left padding
**And** the component is wrapped in `<blockquote>` with proper semantics

**Given** the ROSE tokens are available
**When** I build `ActivityFeedItem` in `packages/ui/src/content/activity-feed-item.tsx`
**Then** the component renders with `PillarAccentLine` + title + summary + metadata row (DomainBadge, contributor name, timestamp)
**And** all four domains use identical layout — no domain has more visual weight than another (FR40)
**And** the component uses `<li>` semantics with a linked title

**Given** the ROSE tokens are available
**When** I build `StatusIndicator` in `packages/ui/src/content/status-indicator.tsx`
**Then** the component shows a status text in active voice (e.g., "Your contribution is being analyzed") with optional subtle spinner
**And** text uses ABC Normal Book, `text-secondary`
**And** states: processing, completed, needs attention
**And** the component uses an ARIA live region so screen readers announce status changes

## Epic 1: Project Foundation & Contributor Authentication

Contributors can sign in via GitHub OAuth, and the platform enforces role-based access control across 7 permission tiers. The monorepo is scaffolded with all infrastructure (Turborepo, Next.js 16, NestJS 11, Prisma 7, PostgreSQL, Redis, Docker), CI/CD, observability, and the shared design system foundation.

### Story 1.1: Initialize Monorepo and Development Environment

As a developer,
I want a fully scaffolded monorepo with all infrastructure configured,
So that I can begin building features on a solid, consistent foundation.

**Acceptance Criteria:**

**Given** the project does not yet exist
**When** I run the initialization commands
**Then** a Turborepo monorepo is created with pnpm workspaces containing apps/web (Next.js 16 with App Router, Tailwind CSS 4.x, Turbopack), apps/api (NestJS 11 with strict TypeScript), and packages/shared (Zod schemas, types, constants)
**And** a packages/ui directory is initialized for shared UI components
**And** a packages/config directory contains shared ESLint and TypeScript configurations

**Given** the monorepo is initialized
**When** I run `docker-compose up`
**Then** PostgreSQL 16+ and Redis 7.x containers start and are accessible from both apps/web and apps/api
**And** a .env.example file documents all required environment variables

**Given** the monorepo is initialized
**When** I run `pnpm dev`
**Then** both Next.js (Turbopack) and NestJS start in watch mode with hot reloading
**And** the NestJS API responds with a health check at GET /api/v1/health

**Given** the monorepo is initialized
**When** I push code to the repository
**Then** a GitHub Actions CI pipeline runs: build, lint (ESLint + Prettier), unit tests (Vitest), and security scan
**And** Husky pre-commit hooks enforce linting and commit message format (commitlint)

**Given** the NestJS API is running
**When** any request is received
**Then** Pino structured JSON logging captures each request with a correlation ID
**And** OpenTelemetry auto-instrumentation is configured for HTTP, Prisma, and Redis
**And** a global exception filter returns errors in the standard envelope format: { error: { code, message, status, correlationId, timestamp } }

**Given** the Next.js frontend is running
**When** I access the root URL
**Then** a minimal landing page renders with the ROSE design system foundation: dark charcoal background (surface-base #1A1A1D), ABC Normal typeface loaded via next/font, and the vivid orange accent color (#FF5A00)

### Story 1.2: Database Schema Foundation and Prisma Configuration

As a developer,
I want the database configured with domain-separated schemas and initial tables for contributors and roles,
So that feature development can proceed with a properly structured data layer.

**Acceptance Criteria:**

**Given** PostgreSQL is running via Docker Compose
**When** I run `pnpm prisma migrate dev`
**Then** four PostgreSQL schemas are created: core, evaluation, publication, audit
**And** the core schema contains a contributors table with columns: id (UUID PK), github_id (unique), email (unique, nullable), name, bio (nullable), avatar_url (nullable), domain (nullable), role (enum: PUBLIC, APPLICANT, CONTRIBUTOR, EDITOR, FOUNDING_CONTRIBUTOR, WORKING_GROUP_LEAD, ADMIN), is_active (boolean), created_at, updated_at
**And** the audit schema contains an audit_logs table with columns: id (UUID PK), actor_id (FK nullable), action, entity_type, entity_id, details (JSONB), correlation_id, created_at
**And** all table and column names follow snake_case convention
**And** Prisma model names use PascalCase singular with @@map to snake_case plural tables

**Given** the Prisma schema is configured
**When** I import types from packages/shared
**Then** contributor-related Zod schemas (createContributorSchema, updateContributorSchema) are available and validate on both frontend and backend
**And** TypeScript types are inferred from Zod schemas without duplication

**Given** the database is running
**When** I run `pnpm prisma db seed`
**Then** an admin user and test contributor are seeded for development

### Story 1.3: GitHub OAuth Authentication

As a contributor,
I want to sign in with my GitHub account,
So that I can access the platform without creating a separate account.

**Acceptance Criteria:**

**Given** I am an unauthenticated visitor on the landing page
**When** I click "Sign in with GitHub"
**Then** I am redirected to GitHub's OAuth authorization page requesting minimal permissions (read:user, user:email)

**Given** I have authorized the application on GitHub
**When** GitHub redirects me back to the callback URL
**Then** a contributor record is created or updated in the database with my GitHub profile data (name, avatar, email)
**And** a JWT access token (15-minute expiry) is returned in the response body
**And** a refresh token (30-day expiry) is stored in Redis and set as an httpOnly secure cookie
**And** I am redirected to the contributor dashboard

**Given** I have a valid access token
**When** I make API requests
**Then** the requests are authenticated and my contributor context is available via a @CurrentUser() decorator

**Given** my access token has expired
**When** I make an API request
**Then** the frontend automatically uses the refresh token cookie to obtain a new access token
**And** the old refresh token is invalidated and a new one is issued (token rotation)
**And** the request is retried transparently

**Given** I am authenticated
**When** I click "Sign out"
**Then** my refresh token is invalidated in Redis
**And** the httpOnly cookie is cleared
**And** I am redirected to the public landing page

**Given** a contributor does not exist with my GitHub ID
**When** I complete GitHub OAuth for the first time
**Then** a new contributor record is created with role APPLICANT
**And** an audit log entry is recorded for the account creation

### Story 1.4: Role-Based Access Control (RBAC)

As a platform operator,
I want the system to enforce role-based access control across all API endpoints,
So that contributors, admins, and public visitors can only access permitted resources.

**Acceptance Criteria:**

**Given** the CASL ability factory is configured with 7 permission tiers
**When** a request is made to any protected API endpoint
**Then** a @CheckAbility() guard verifies the contributor's role has the required permission for the requested action and resource
**And** unauthorized requests return 403 with error code AUTHORIZATION_DENIED

**Given** the following RBAC tiers are defined
**When** permissions are evaluated
**Then** PUBLIC can access: project showcase, contributor roster, domain manifestos, public metrics, published articles
**And** APPLICANT can access: application workflow, micro-task submission
**And** CONTRIBUTOR can access: dashboard, profile, contribution history, evaluations, peer feedback, working groups, task menu, article submission
**And** EDITOR can access: all contributor access + editorial workflow on assigned articles, Editor profile
**And** FOUNDING_CONTRIBUTOR can access: all contributor access + governance weight bonus, early feature access
**And** WORKING_GROUP_LEAD can access: all contributor access + working group management, domain task curation
**And** ADMIN can access: full platform access including admission queue, health metrics, settings, content moderation

**Given** a contributor's role is changed
**When** the role update is persisted
**Then** an audit log entry is recorded with the old role, new role, actor, and correlation ID

**Given** the RBAC system is in place
**When** automated tests run
**Then** every RBAC tier is verified with tests confirming access grants and denials for each endpoint (NFR-S5)

### Story 1.5: Founding Contributor Designation

As an admin,
I want to designate contributors as Founding Contributors,
So that early members receive permanent recognition with governance weight bonus and early feature access.

**Acceptance Criteria:**

**Given** I am authenticated as an admin
**When** I access the admin API endpoint PATCH /api/v1/admin/contributors/:contributorId/founding-status
**Then** I can set a contributor's role to FOUNDING_CONTRIBUTOR with a designation reason

**Given** a contributor is designated as Founding Contributor
**When** the designation is saved
**Then** the contributor's role is permanently set to FOUNDING_CONTRIBUTOR
**And** the designation is recorded in the audit log with the admin's ID, the contributor's ID, the reason, and a timestamp
**And** the contributor's profile displays a Founding Contributor badge

**Given** a contributor has Founding Contributor status
**When** any admin attempts to downgrade their role
**Then** the system prevents the downgrade and returns a 422 error with code FOUNDING_STATUS_PERMANENT
**And** no changes are made to the contributor's role

## Epic 2: Contributor Profiles & Public Showcase

Contributors can create and edit profiles with bio, domain expertise, and skill areas. Visitors can browse the public showcase page, domain manifestos, contributor roster, platform metrics, and a static progressive decentralization roadmap — all without authentication. The public reward methodology explanation is accessible.

### Story 2.1: Contributor Profile Creation & Editing

As a contributor,
I want to create and edit my personal profile with bio, domain expertise, and skill areas,
So that other contributors and visitors can understand my background and contributions.

**Acceptance Criteria:**

**Given** I am authenticated as a contributor
**When** I navigate to /dashboard/profile
**Then** I see a profile editing form with fields for: display name, bio (rich text, max 500 characters), primary domain (select: Technology, Finance, Impact, Governance), skill areas (multi-select tags), and a profile photo (synced from GitHub by default, with override option)
**And** the form is validated using the shared Zod schema (contributorProfileSchema) on both frontend and backend

**Given** I am editing my profile
**When** I update my bio and primary domain and click Save
**Then** the profile is updated via PATCH /api/v1/contributors/me
**And** the response follows the API envelope format { data, meta }
**And** a success toast notification appears: "Profile updated"
**And** the form uses optimistic updates via TanStack Query

**Given** I submit a profile update with invalid data (e.g., bio exceeding 500 characters)
**When** the Zod validation fails
**Then** field-level error messages are displayed inline
**And** the API returns 400 with a details array listing each validation error

**Given** I update my profile
**When** the update is saved
**Then** an audit log entry is created recording the profile change with my contributor ID and correlation ID

### Story 2.2: Public & Private Contributor Profile Views

As a visitor or contributor,
I want to view contributor profiles showing name, bio, domain, role, and contribution history,
So that I can understand each contributor's expertise and involvement.

**Acceptance Criteria:**

**Given** I am an unauthenticated visitor
**When** I navigate to /contributors/:id
**Then** I see a public contributor profile with: name, avatar, bio, primary domain, skill areas, role designation (Contributor, Founding Contributor, Working Group Lead), and domain badge with the appropriate pillar accent color (Technology: #FF5A00 orange, Finance: #E8AA00 gold, Impact: #00E87B green, Governance: #00C4E8 cyan)
**And** the page is server-side rendered for SEO
**And** the profile layout uses ABC Normal weight-based hierarchy (Bold 700 for headings, Book 400 for body text, Medium 500 for labels)

**Given** I am an authenticated contributor
**When** I navigate to /dashboard
**Then** I see my own dashboard with: my profile summary, contribution history (placeholder for Epic 4 data), evaluation scores (placeholder for Epic 7 data), and peer feedback received (placeholder for Epic 6 data)
**And** placeholder sections display dignified empty states explaining what will appear ("Contributions will appear here once your GitHub repositories are connected")

**Given** I am an authenticated contributor
**When** I navigate to another contributor's profile at /contributors/:id
**Then** I see their public profile information and contribution history
**And** Founding Contributors display a permanent Founding Contributor badge

**Given** the system assigns role designations
**When** a contributor's profile is displayed
**Then** the role designation (FR5) is shown as a subtle badge below the contributor's name
**And** all four domain badges have equivalent visual weight (no domain appears more prominent)

### Story 2.3: Public Project Showcase Page

As a visitor,
I want to access a public project showcase displaying Edin's mission, vision, and Founding Circle roster,
So that I can understand the project and its community without creating an account.

**Acceptance Criteria:**

**Given** I am an unauthenticated visitor
**When** I navigate to the root URL /
**Then** I see a public showcase page with: a hero section communicating Edin's mission ("Where Expertise Becomes Publication"), a brief value proposition covering AI evaluation, scaling-law rewards, curated community, and publication platform, and a Founding Circle section listing contributors with the FOUNDING_CONTRIBUTOR role showing their names, avatars, domains, and bios
**And** the page is server-side rendered with appropriate meta tags (title, description, Open Graph, Twitter Card)
**And** the design follows the ROSE spec: ABC Normal Bold headings in blush pink (#E4BDB8), dark background (surface-base #1A1A1D), gradient hero section, generous whitespace (48px+ between sections), and vivid orange (#FF5A00) CTAs

**Given** the Founding Circle has members
**When** the showcase page loads
**Then** founding contributors are displayed as profile cards with equal visual weight across all domains
**And** the page loads with First Contentful Paint <1.5s on 4G connection (NFR-P1)

**Given** the Founding Circle is empty (no founding contributors yet)
**When** the showcase page loads
**Then** the Founding Circle section displays a dignified empty state: "The Founding Circle is forming. Serious contributors are building something different."

### Story 2.4: Domain Manifestos & Contributor Roster

As a visitor,
I want to view domain manifestos and browse the contributor roster,
So that I can understand each domain pillar and evaluate the community's caliber.

**Acceptance Criteria:**

**Given** I am an unauthenticated visitor
**When** I navigate to /about
**Then** I see four domain manifesto sections: Technology, Finance & Financial Engineering, Impact & Sustainability, and Governance
**And** each manifesto section has its domain accent color as a subtle visual element (border or background tint)
**And** all four sections have identical layout structure and visual weight (no domain dominates)
**And** the page is server-side rendered for SEO

**Given** I am an unauthenticated visitor
**When** I navigate to /contributors
**Then** I see a browsable contributor roster showing: name, avatar, domain, role designation, and a brief bio excerpt for each contributor
**And** I can filter contributors by domain (Technology, Finance, Impact, Governance)
**And** I can search contributors by name
**And** filtering and search return results within <1s (NFR-P7)
**And** the contributor list uses cursor-based pagination (default 20, max 100)

**Given** the contributor roster is displayed
**When** I click on a contributor card
**Then** I am navigated to their public profile page at /contributors/:id

### Story 2.5: Public Platform Metrics & Reward Methodology

As a visitor or investor,
I want to view key platform metrics and understand the scaling-law reward methodology,
So that I can evaluate community health and the economic model.

**Acceptance Criteria:**

**Given** I am an unauthenticated visitor
**When** I navigate to /metrics
**Then** I see key platform metrics including: number of active contributors, contribution velocity (contributions per week), domain distribution (percentage per domain), and retention rates
**And** metrics are presented using calm, insightful visualizations (Recharts) with organic visual language — no red/green traffic-light indicators
**And** the page is server-side rendered for SEO

**Given** the platform has no contributor data yet
**When** I view the metrics page
**Then** placeholder visualizations display with dignified empty states explaining what each metric will show

**Given** I am an unauthenticated visitor
**When** I navigate to /rewards
**Then** I see a clear explanation of the scaling-law reward methodology with visual representations showing how compounding rewards grow with sustained engagement
**And** the explanation uses organic growth metaphors ("Your garden is growing") rather than financial dashboards
**And** the content is structured for >80% comprehension (per PRD Success Criteria)
**And** the page is server-side rendered for SEO

### Story 2.6: Progressive Decentralization Roadmap

As a contributor or visitor,
I want to view a progressive decentralization roadmap,
So that I can understand the timeline for governance authority transfer from the founding team to the community.

**Acceptance Criteria:**

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/governance
**Then** I see a static progressive decentralization roadmap displaying: specific milestones for governance transfer, the current stage highlighted, and the timeline for authority transition
**And** the roadmap is presented as a visual timeline with calm, clear design (no urgency signals)
**And** each milestone includes a brief description of what governance capability is transferred

**Given** I am an unauthenticated visitor
**When** the progressive decentralization information is referenced on the public showcase
**Then** a summary of the roadmap is visible with a link to the full roadmap (accessible after authentication)

**Given** the roadmap is a Phase 1 static display
**When** the page renders
**Then** the content is loaded from a configurable data source (database or configuration file) so it can be updated by admins without code changes

## Epic 3: Admission & Onboarding

Applicants can submit a contribution-based application with a domain-specific micro-task. Existing contributors review applications. Admins manage the admission queue. Admitted contributors are paired with a buddy, receive a curated first-task recommendation, and progress through the 72-Hour Ignition onboarding. GDPR data processing consent is presented during onboarding.

### Story 3.1: Contributor Application with Micro-Task

As an applicant,
I want to submit a contribution-based application including a domain-specific micro-task,
So that I can demonstrate my competence and join the Edin community.

**Acceptance Criteria:**

**Given** I am an unauthenticated visitor
**When** I navigate to /apply
**Then** I see an application form with fields for: name, email, primary domain (select: Technology, Finance, Impact, Governance), a brief statement of interest (max 300 characters), and a domain-specific micro-task assignment displayed based on my selected domain
**And** the micro-task description clearly states expected deliverable, estimated effort (2-4 hours), and submission format
**And** the page design follows UX spec: "respectful challenge" — feels like an invitation to demonstrate competence, not a gatekeeping hurdle

**Given** I have completed the application form and micro-task
**When** I click Submit
**Then** my application is saved via POST /api/v1/admission/applications with status PENDING
**And** I receive an on-screen confirmation: "We'll review your application within 48 hours"
**And** a contributor record is created with role APPLICANT if I authenticated via GitHub, or the application is stored for linking upon first GitHub auth
**And** an audit log entry records the application submission

**Given** I am submitting the application
**When** the form is displayed
**Then** a GDPR data processing agreement is presented with a checkbox for explicit consent (FR61)
**And** the application cannot be submitted without consent being granted
**And** the consent record is stored with timestamp and version of the agreement

**Given** I submit an application with invalid data
**When** Zod validation fails
**Then** field-level error messages are shown inline
**And** the API returns 400 with validation details

### Story 3.2: Application Review & Admission Queue

As an existing contributor or admin,
I want to review admission applications and manage the admission queue,
So that we maintain community quality through curated admission.

**Acceptance Criteria:**

**Given** I am an authenticated contributor
**When** I am assigned as a reviewer for an application
**Then** I can view the applicant's profile, statement of interest, and micro-task submission
**And** I can submit a review with a recommendation (approve, request more info, decline) and written feedback

**Given** I am an authenticated admin
**When** I navigate to /admin/admission
**Then** I see the admission queue showing all pending applications with: applicant name, domain, submission date, assigned reviewers, and review status
**And** applications are sorted by submission date (oldest first)
**And** I can filter by domain and review status

**Given** I am an admin viewing the admission queue
**When** I select an application
**Then** I can: assign reviewers from the contributor pool, view reviewer feedback, approve the application, request additional information from the applicant, or decline with a reason
**And** each action is recorded in the audit log

**Given** an admin approves an application
**When** the approval is saved
**Then** the applicant's role is updated from APPLICANT to CONTRIBUTOR
**And** the 72-Hour Ignition timer begins (FR14)
**And** an audit log entry records the admission decision with admin ID, applicant ID, and reason

**Given** an admin declines an application
**When** the decline is saved
**Then** the application status is updated to DECLINED with a reason
**And** the applicant sees a graceful decline message with the provided reason
**And** an audit log entry records the decision

### Story 3.3: Admin Micro-Task Configuration

As an admin,
I want to configure domain-specific micro-tasks for the application process,
So that each domain has an appropriate competence demonstration aligned with current community needs.

**Acceptance Criteria:**

**Given** I am an authenticated admin
**When** I navigate to /admin/settings (admission section)
**Then** I can view, create, edit, and deactivate micro-tasks for each of the four domains
**And** each micro-task has fields for: domain, title, description (rich text), expected deliverable, estimated effort, and active/inactive status

**Given** I create or edit a micro-task
**When** I save the micro-task
**Then** the micro-task is persisted via the API
**And** applicants selecting that domain see the updated micro-task on the application form
**And** only one micro-task per domain can be active at a time (previous active task is deactivated)

**Given** multiple micro-tasks exist for a domain
**When** I view the micro-task list
**Then** I see the history of micro-tasks with their active/inactive status and creation dates
**And** deactivated micro-tasks remain in the database for reference but are not shown to applicants

### Story 3.4: Buddy Assignment & First-Task Recommendation

As a newly admitted contributor,
I want to be paired with a buddy and receive a curated first-task recommendation,
So that I have personal guidance and a meaningful starting point within 72 hours.

**Acceptance Criteria:**

**Given** I have been admitted as a contributor
**When** I log in for the first time after admission
**Then** I see a welcome experience on my dashboard showing: my assigned buddy with their photo, name, domain, and a brief bio
**And** the buddy assignment feels like meeting a person, not receiving a system notification (UX spec)

**Given** I am a newly admitted contributor
**When** my buddy is assigned
**Then** the system selects a buddy from active contributors in my primary domain who have opted in to buddy duty
**And** if no domain match is available, a buddy from any domain is assigned
**And** admins can manually override buddy assignments via the admin panel

**Given** I am a newly admitted contributor with a buddy assigned
**When** I view my onboarding dashboard
**Then** I see a suggested first task matched to my domain and skill level
**And** the task is pre-scoped to be achievable in hours, not days
**And** a "Claim this task" action is available (linking to Epic 5 task claiming)

**Given** buddy assignments are made
**When** a buddy is assigned
**Then** the buddy assignment is recorded in the database with contributor ID, buddy ID, assignment date, and 30-day expiry
**And** the buddy receives a notification that they have been paired with a new contributor

### Story 3.5: 72-Hour Ignition Onboarding Tracking

As a platform operator,
I want the system to track onboarding progress against the 72-Hour Ignition timeline,
So that we can ensure new contributors reach their first contribution within 72 hours.

**Acceptance Criteria:**

**Given** a contributor has been admitted
**When** the 72-Hour Ignition begins
**Then** the system records the ignition start timestamp and tracks the following milestones: account activated, buddy assigned, first task viewed, first task claimed, first contribution submitted

**Given** I am a newly admitted contributor
**When** I view my dashboard during the first 72 hours
**Then** I see a subtle progress indicator (not a wizard — UX spec) showing completed onboarding milestones
**And** the indicator uses a step design that communicates progress without urgency or countdown anxiety
**And** uncompleted milestones show what will happen next, not what I'm missing

**Given** I am an admin
**When** I view the admission dashboard
**Then** I can see onboarding status for recently admitted contributors: which milestones are complete, time elapsed since admission, and whether the 72-hour target is at risk
**And** contributors approaching 72 hours without a first contribution are flagged for attention

**Given** the 72-hour period elapses
**When** a contributor has not completed all milestones
**Then** the system records the final status but does not penalize the contributor
**And** the onboarding indicator transitions to a gentle "complete at your own pace" state

## Epic 4: GitHub Integration & Contribution Tracking

The system connects to GitHub repositories, ingests commits, pull requests, code reviews, and CI/CD outputs via webhooks. Contributions are attributed to specific contributors, normalized into evaluation-ready format, and displayed on the contributor dashboard. Multi-contributor collaboration is detected with attribution confirmation.

### Story 4.1: GitHub Repository Connection & Webhook Configuration

As an admin,
I want to configure which GitHub repositories are monitored by the integration layer,
So that the system captures all relevant contributor activity from the Rose ecosystem.

**Acceptance Criteria:**

**Given** I am an authenticated admin
**When** I navigate to /admin/settings (integration section)
**Then** I can add GitHub repositories by providing the owner/repo identifier
**And** I can view a list of currently monitored repositories with their webhook status (active, pending, error)
**And** I can remove repositories from monitoring

**Given** I add a new repository for monitoring
**When** the repository is saved
**Then** the system registers a GitHub webhook on the repository via the GitHub API for events: push, pull_request, pull_request_review
**And** the webhook secret is generated, stored securely (encrypted at rest per NFR-S3), and used to validate incoming payloads
**And** the webhook URL points to POST /api/v1/ingestion/github/webhook
**And** an audit log entry records the repository addition

**Given** a webhook is registered on a repository
**When** the webhook fails to register (e.g., insufficient permissions)
**Then** the system displays a clear error message explaining the issue (e.g., "GitHub App needs admin access to this repository")
**And** the repository is saved with status PENDING so the admin can retry

**Given** I remove a repository from monitoring
**When** the removal is saved
**Then** the GitHub webhook is deregistered via the API
**And** previously ingested contributions from this repository remain in the system
**And** an audit log entry records the repository removal

### Story 4.2: Contribution Ingestion Pipeline

As a contributor,
I want the system to automatically ingest my GitHub activity,
So that my commits, pull requests, and code reviews are captured without manual submission.

**Acceptance Criteria:**

**Given** a monitored repository receives a push event
**When** the GitHub webhook fires
**Then** the NestJS ingestion controller validates the webhook signature using the stored secret
**And** a job is dispatched to the `github-ingestion` BullMQ queue with the webhook payload
**And** the webhook endpoint returns 200 immediately (async processing)

**Given** a github-ingestion job is processing a push event
**When** the processor runs
**Then** each commit in the push is extracted with: SHA, author, message, timestamp, files changed, additions, deletions
**And** pull request events extract: PR number, title, description, author, status, reviewers, linked issues, merge status
**And** pull request review events extract: reviewer, review body, review status (approved, changes requested, commented)

**Given** raw GitHub artifacts are extracted
**When** the normalization step runs
**Then** each artifact is transformed into a normalized contribution record with fields: contributor_id, source (GITHUB), source_ref (commit SHA or PR number), contribution_type (COMMIT, PULL_REQUEST, CODE_REVIEW), title, description, raw_data (JSONB), normalized_at timestamp, and status (INGESTED)
**And** the normalized schema is extensible for future integration sources (NFR-I3)

**Given** a webhook delivery fails or the ingestion queue is unavailable
**When** the job fails
**Then** BullMQ retries 3 times with exponential backoff (1s, 4s, 16s)
**And** after 3 failures, the job is moved to the dead-letter queue
**And** zero contributions are lost from transient failures (NFR-R2)
**And** a warning-level log is emitted with the correlation ID

**Given** the GitHub API rate limit is reached during enrichment
**When** the processor detects a 429 response
**Then** the job is delayed until the rate limit reset time
**And** processing resumes automatically without data loss (NFR-I2)

**Given** contributions are ingested
**When** processing completes
**Then** a domain event `contribution.commit.ingested` (or `.pull_request.ingested`, `.review.ingested`) is emitted via EventEmitter2
**And** the total pipeline latency from GitHub event to database persistence is <15 minutes (NFR-P5)

### Story 4.3: Contribution Attribution & Dashboard Display

As a contributor,
I want to see my ingested contributions on my dashboard with proper attribution,
So that I can verify my work is captured and track my contribution status.

**Acceptance Criteria:**

**Given** a contribution has been ingested from GitHub
**When** the attribution step runs
**Then** the system matches the Git author email or GitHub username to a registered contributor record
**And** the contribution is linked to the contributor via contributor_id
**And** unmatched contributions are flagged for admin review with status UNATTRIBUTED

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/contributions
**Then** I see a chronological list of my ingested contributions showing: contribution type icon (commit, PR, review), title, repository name, ingestion timestamp, and status (ingested, evaluation pending, evaluated)
**And** each contribution displays with equal visual prominence regardless of type (no type hierarchy)
**And** the list uses cursor-based pagination

**Given** I view my contributions list
**When** a new contribution is ingested
**Then** the list updates within <5 seconds via SSE (preparing for Epic 5 Activity Feed, using the same real-time infrastructure)

**Given** a contribution has status INGESTED
**When** I view its detail
**Then** I see the full normalized contribution data: source, type, title, description, and timestamp
**And** a status indicator shows "Awaiting evaluation" in a calm, non-urgent style (not a countdown or warning)

### Story 4.4: Multi-Contributor Collaboration Detection

As a contributor,
I want the system to detect when I collaborate with others on shared deliverables,
So that credit is fairly attributed to all contributors involved.

**Acceptance Criteria:**

**Given** a pull request has multiple contributors
**When** the ingestion pipeline processes the PR
**Then** the system detects co-authorship using: Git co-author metadata (Co-authored-by trailers), multiple committers on the same PR, and linked issues with assignees
**And** a default equal-split attribution is applied across all detected contributors

**Given** a multi-contributor contribution is detected
**When** the attribution is saved
**Then** each contributor sees the contribution on their dashboard with a collaboration indicator showing: other contributor names and the attribution split (e.g., "50/50 with Lena")
**And** each contributor can confirm the attribution from their dashboard

**Given** a contributor believes the attribution split is incorrect
**When** they click "Request attribution review"
**Then** the contribution is flagged for admin review with the contributor's comment
**And** the admin can override the attribution split via PATCH /api/v1/admin/contributions/:id/attribution
**And** the attribution change is recorded in the audit log

**Given** attribution is applied
**When** the system processes attributions over time
**Then** >90% of attributions are accepted without override (FR19 acceptance criterion)
**And** the system tracks the override rate as a quality metric

## Epic 5: Community Structure, Tasks & Activity Feed

Contributors can view and join domain working groups, browse a curated contribution menu, claim tasks, and track task progress. The Activity Feed displays contributions across all four domains with equal visual prominence and real-time updates. Contributors receive notifications for evaluations and feedback. Working Group Leads manage their domains.

### Story 5.1: Working Groups & Domain Membership

As a contributor,
I want to view and join one of four domain working groups,
So that I can connect with contributors in my area of expertise and access domain-relevant opportunities.

**Acceptance Criteria:**

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/working-groups
**Then** I see four working groups displayed with equal visual weight: Technology (#FF5A00 orange accent), Finance & Financial Engineering (#E8AA00 gold accent), Impact & Sustainability (#00E87B green accent), and Governance (#00C4E8 cyan accent)
**And** each group shows: domain name, brief description, member count, and a domain-colored badge
**And** no domain appears more prominent or positioned higher by default

**Given** I view the working groups page
**When** I click "Join" on a working group
**Then** I am added as a member of that working group via POST /api/v1/working-groups/:id/members
**And** the group's member count updates
**And** I can join multiple working groups (my primary domain is set in my profile, but membership is not restricted)

**Given** I am a member of a working group
**When** I view the working group detail at /dashboard/working-groups/:id
**Then** I see: a list of current members with profiles, recent contributions from group members, and active tasks tagged for this domain
**And** the page layout uses the domain's accent color as a subtle background tint

**Given** I am a member of a working group
**When** I click "Leave"
**Then** I am removed from the working group
**And** my existing contributions within that domain remain attributed to me

### Story 5.2: Contribution Menu & Task Management

As a contributor,
I want to browse a curated contribution menu and claim tasks,
So that I can find meaningful work matched to my skills and contribute to the ecosystem.

**Acceptance Criteria:**

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/tasks
**Then** I see the contribution menu showing available tasks with: title, domain tag (with accent color), difficulty level (beginner, intermediate, advanced), estimated effort, and status (available, claimed, in progress, completed, evaluated)
**And** only tasks with status AVAILABLE are claimable
**And** the list supports filtering by domain, difficulty, and status
**And** filtering returns results within <1s (NFR-P7)
**And** the list uses cursor-based pagination

**Given** I find a task I want to work on
**When** I click "Claim"
**Then** the task status updates to CLAIMED with my contributor ID via PATCH /api/v1/tasks/:id/claim
**And** the task is no longer available for other contributors to claim
**And** the task appears in my "My Tasks" view with status CLAIMED
**And** the action uses an optimistic update via TanStack Query

**Given** I have claimed a task
**When** I begin working on it
**Then** I can update the status to IN_PROGRESS via the dashboard
**And** when my contribution is ingested from GitHub and linked to this task, the status can transition to COMPLETED

**Given** I am an admin or Working Group Lead
**When** I navigate to /admin/tasks (admin) or the WG management view
**Then** I can create new tasks with fields: title, description (rich text), domain, difficulty, estimated effort, and initial status (AVAILABLE)
**And** I can edit existing tasks' details
**And** I can retire tasks by setting status to RETIRED (they disappear from the menu but remain in the database)

**Given** the task status transitions
**When** a status change occurs
**Then** the system enforces valid transitions: AVAILABLE → CLAIMED → IN_PROGRESS → COMPLETED → EVALUATED
**And** invalid transitions return 422 with error code INVALID_TASK_TRANSITION
**And** each transition emits a domain event via EventEmitter2

### Story 5.3: Working Group Lead Management

As a Working Group Lead,
I want to manage my domain working group with a dashboard, task prioritization, and announcements,
So that I can guide my domain's contributors and coordinate community activity.

**Acceptance Criteria:**

**Given** I am an authenticated contributor with role WORKING_GROUP_LEAD
**When** I navigate to /dashboard/working-groups/:id (my assigned domain)
**Then** I see a WG Lead dashboard showing: member list with contribution activity, active tasks with claim status, recent contributions from domain members, and domain health indicators (active members, contribution velocity)

**Given** I am viewing the WG Lead dashboard
**When** I access the task prioritization view
**Then** I can reorder tasks within my domain's contribution menu to set priority
**And** the priority order is reflected in the contribution menu's default sort for contributors browsing my domain's tasks

**Given** I am a Working Group Lead
**When** I create an announcement
**Then** I can write a brief announcement (max 500 characters) via POST /api/v1/working-groups/:id/announcements
**And** the announcement appears at the top of the working group detail page for all members
**And** members receive a notification about the new announcement (FR41)

**Given** I am a Working Group Lead
**When** an admission application is submitted for my domain
**Then** I can participate in the domain-specific admission review by viewing the applicant's micro-task and submitting a domain expert review
**And** my review is visible to admins alongside other reviewer feedback in the admission queue

### Story 5.4: Activity Feed with Real-Time Updates

As a stakeholder,
I want to view an Activity Feed showing contributions across all domains with real-time updates,
So that I can see the community's work in motion and feel connected to the ecosystem.

**Acceptance Criteria:**

**Given** I am any user (authenticated or unauthenticated on the public showcase)
**When** I view the Activity Feed at /dashboard/activity (authenticated) or the public showcase feed section
**Then** I see a reverse-chronological stream of recent contributions including: contributor name and avatar, contribution type (commit, PR, review, article), title, domain badge with accent color, and timestamp
**And** contributions from all four domains are displayed with equivalent visual prominence — equal card dimensions, identical status indicators, no domain-based ordering hierarchy (FR40)
**And** the feed uses the UX spec's "calm stream to browse" aesthetic — no urgency signals, no unread counts

**Given** the Activity Feed is displayed
**When** a new contribution is ingested
**Then** the feed updates within <5 seconds via Server-Sent Events (SSE) using the NestJS @Sse() decorator and Redis pub/sub
**And** new items appear at the top with a gentle fade-in animation (200ms ease-out)
**And** the SSE connection auto-reconnects with exponential backoff if disconnected, showing "Reconnecting..." after 5s

**Given** the Activity Feed has many entries
**When** I scroll down
**Then** older entries load via cursor-based pagination (infinite scroll)
**And** the feed handles 500+ contributions/day without latency exceeding 10s (NFR-SC3)

**Given** the SSE connection is lost
**When** the connection is re-established
**Then** any contributions that occurred during disconnection are fetched and inserted chronologically
**And** no contributions are missed

### Story 5.5: Contributor Notifications

As a contributor,
I want to receive notifications when my contributions are evaluated or when peer feedback is available,
So that I can stay informed about my work without checking constantly.

**Acceptance Criteria:**

**Given** I am an authenticated contributor
**When** one of my contributions receives an AI evaluation (Epic 7) or peer feedback (Epic 6)
**Then** I receive an in-platform notification delivered via the notification BullMQ queue
**And** a subtle warm-toned dot appears on the sidebar navigation next to "Evaluations" or "Feedback" — not a badge count (UX spec: no notification overload)

**Given** I have unread notifications
**When** I navigate to the relevant section (evaluations or feedback)
**Then** the notification dot clears
**And** new items are visually distinguished with a subtle highlight that fades after viewing

**Given** I receive a notification
**When** I view the notification
**Then** the notification shows: a brief description of the event (e.g., "Your contribution to [project] has been evaluated"), timestamp, and a link to the relevant detail page
**And** notifications are stored in the database with: contributor_id, event_type, entity_id, read status, created_at

**Given** I am a Working Group Lead
**When** a new announcement is posted in my group or a contributor submits work for my domain
**Then** I receive a notification following the same subtle notification pattern

**Given** the notification system is operational
**When** notifications are dispatched
**Then** the `notification` BullMQ queue processes delivery asynchronously
**And** notification delivery does not block the operation that triggered it (e.g., evaluation completion)

## Epic 6: Peer Feedback System

The system assigns peer reviewers to contributions. Reviewers complete a structured feedback rubric. Contributors view feedback on their dashboard. Admins monitor turnaround times and completion rates.

### Story 6.1: Peer Reviewer Assignment

As a platform operator,
I want the system to automatically assign peer reviewers to contributions,
So that every contribution receives timely, structured feedback from a knowledgeable peer.

**Acceptance Criteria:**

**Given** a new contribution is ingested and not yet covered by AI evaluation
**When** the contribution reaches INGESTED status
**Then** the system dispatches a job to the `feedback-assignment` BullMQ queue to assign a peer reviewer

**Given** the feedback assignment processor runs
**When** it selects a reviewer
**Then** the reviewer is chosen based on: matching domain expertise (primary domain match preferred), not the contributor themselves, not already assigned to review this contribution, and lowest current review load (fewest pending reviews)
**And** the assignment is randomized within the eligible pool to prevent collusion patterns (fraud prevention)

**Given** a reviewer is assigned
**When** the assignment is saved
**Then** a peer_feedback record is created in the evaluation schema with: contribution_id, reviewer_id, status (ASSIGNED), assigned_at timestamp
**And** the reviewer receives a notification (via Epic 5 notification system) that a review is waiting
**And** a domain event `feedback.review.assigned` is emitted via EventEmitter2

**Given** no eligible reviewer is found
**When** the assignment fails
**Then** the contribution is flagged for manual admin assignment with status UNASSIGNED
**And** a warning-level log is emitted
**And** the admin can manually assign a reviewer via the admin panel (fallback per NFR-R5)

**Given** the assignment system operates
**When** assignments are processed
**Then** >95% of assignments succeed automatically (NFR-R5)
**And** admin manual override resolves unassigned reviews within <5 minutes

### Story 6.2: Structured Feedback Rubric & Submission

As a reviewer,
I want to complete a structured feedback rubric for assigned contributions,
So that I can provide consistent, actionable feedback that helps the contributor improve.

**Acceptance Criteria:**

**Given** I am an authenticated contributor with a pending review assignment
**When** I navigate to /dashboard/feedback/review/:id
**Then** I see the contribution details (type, title, description, linked artifacts) alongside a structured feedback rubric with 5-7 questions
**And** the rubric questions are appropriate to the contribution type (code review questions for commits/PRs, documentation questions for docs)
**And** each question has a rating scale (1-5) and a text field for written comments

**Given** I am completing the feedback rubric
**When** I fill in all questions and click Submit
**Then** the feedback is saved via POST /api/v1/feedback/:id/submit with status COMPLETED
**And** each answer must have substantive content exceeding a minimum character threshold (FR32 rubric coverage)
**And** the submission timestamp is recorded for turnaround tracking
**And** a domain event `feedback.review.submitted` is emitted
**And** the contributor who authored the work receives a notification that feedback is available

**Given** I submit feedback with incomplete answers
**When** validation runs
**Then** questions with empty or below-threshold responses are highlighted with inline errors
**And** the submission is blocked until all questions meet the minimum standard

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/feedback
**Then** I see peer feedback received on my contributions displayed as structured rubric responses
**And** feedback is presented with the reviewer's name and domain badge
**And** each feedback item shows the rubric responses with ratings and written comments
**And** the display follows the "calm clarity" aesthetic — no red/green scoring colors, descriptive labels instead

### Story 6.3: Feedback Monitoring & Tracking

As an admin,
I want to monitor peer feedback turnaround times and completion rates,
So that I can ensure contributors receive timely feedback and identify bottlenecks.

**Acceptance Criteria:**

**Given** I am an authenticated admin
**When** I navigate to /admin/feedback
**Then** I see a feedback monitoring dashboard showing: total pending reviews, average turnaround time (assignment to submission), completion rate (percentage of assigned reviews completed), and overdue reviews (exceeding a configurable SLA threshold, default 48 hours)
**And** overdue reviews are listed with reviewer name, contribution title, domain, and time elapsed since assignment

**Given** I see an overdue review
**When** I select it
**Then** I can reassign the review to a different reviewer via the admin panel
**And** the original reviewer's assignment is marked as REASSIGNED with a reason
**And** the new reviewer receives a notification
**And** the reassignment is recorded in the audit log

**Given** the feedback tracking system is operational
**When** feedback data accumulates
**Then** the system tracks and exposes the following metrics (FR32): feedback completion rate (percentage of assigned reviews completed), timeliness (average time from assignment to submission), and rubric coverage (percentage of rubric questions answered with substantive content)
**And** these metrics are available via the admin API for the health metrics dashboard (Epic 10)

**Given** feedback turnaround SLA is configurable
**When** an admin updates the SLA threshold in platform settings
**Then** the overdue calculation uses the new threshold
**And** existing in-progress reviews are re-evaluated against the updated SLA

---

## Epic 7: AI Evaluation Engine

### Story 7.1: Evaluation Pipeline & Code Evaluation

As a contributor,
I want my code contributions to be automatically evaluated for quality,
So that I receive objective, timely feedback on my work without waiting for human reviewers.

**Acceptance Criteria:**

**Given** a normalized contribution of type CODE exists in the system (ingested via Epic 4)
**When** the domain event `contribution.commit.ingested` or `contribution.pull-request.ingested` is emitted
**Then** the evaluation service listens and enqueues a job on the `evaluation-dispatch` BullMQ queue
**And** the job payload includes: contributionId, contributionType, contributorId, normalized artifact data, and a correlationId for tracing (NFR-O2)
**And** the queue uses dead-letter configuration so failed jobs are never lost (NFR-R2)

**Given** a code evaluation job is dequeued by the `code-evaluation` processor
**When** the processor analyzes the contribution
**Then** it evaluates four dimensions: complexity (cyclomatic complexity, nesting depth), maintainability (naming clarity, modularity, separation of concerns), test coverage (presence and quality of associated tests), and standards adherence (linting compliance, project convention alignment)
**And** each dimension produces a sub-score on a 0-100 scale
**And** a composite contribution score is calculated as a weighted combination of the dimension sub-scores with a task complexity multiplier and domain normalization factor (FR58 basic scoring)
**And** the final score is on a 0-100 scale with full provenance stored (formula version, weights, raw inputs)
**And** processing completes within 30 minutes for code evaluations (NFR-P6)

**Given** a code evaluation completes successfully
**When** the result is persisted
**Then** the evaluation record is stored in the `evaluation` schema with: contributionId, contributorId, evaluationModelVersion, dimensionScores, compositeScore, formulaVersion, rawInputs, timestamps
**And** the score is tracked at a single temporal horizon (FR60 single-horizon — session-level score recorded with timestamp for future aggregation)
**And** a domain event `evaluation.score.completed` is emitted (consumed by Activity Feed in Epic 5 and Notifications in Epic 5)
**And** the evaluation score is cached in Redis for quick dashboard retrieval

**Given** the evaluation processor encounters a transient failure (API timeout, resource exhaustion)
**When** the job fails
**Then** BullMQ retries with exponential backoff (NFR-R2)
**And** if all retries are exhausted, the job moves to the dead-letter queue
**And** the contribution displays as "Evaluation pending" on the contributor's dashboard — not an error state (NFR-R3 graceful degradation)
**And** an alert is fired if evaluation throughput drops >50% (NFR-O1)

**Given** the contributor views their dashboard
**When** an evaluation is in progress
**Then** the contribution shows a calm "Evaluation in progress" status with a skeleton loader (UX spec: no countdown timers, no urgency signals)

### Story 7.2: Documentation Evaluation & Model Versioning

As a contributor who submits documentation,
I want my documentation to be evaluated with appropriate criteria,
So that I receive feedback specific to the quality dimensions that matter for written work.

**Acceptance Criteria:**

**Given** a normalized contribution of type DOCUMENTATION exists in the system
**When** a documentation evaluation job is dequeued by the `doc-evaluation` processor
**Then** it evaluates three dimensions using a configurable rubric: structural completeness (required sections present for the document type), readability (Flesch-Kincaid grade level within target range per document type, as specified in FR22), and reference integrity (valid links and citations — no broken URLs, no orphaned references)
**And** each dimension produces a sub-score on a 0-100 scale
**And** the composite score follows the same formula as code evaluation (FR58) with documentation-specific weights
**And** processing completes within 15 minutes for documentation evaluations (NFR-P6)

**Given** the documentation evaluation rubric is configurable
**When** an admin updates rubric parameters (target Flesch-Kincaid range, required sections per document type)
**Then** the updated rubric is versioned and applied to subsequent evaluations
**And** existing evaluations retain the rubric version that was active when they were scored

**Given** the evaluation engine uses AI models
**When** any evaluation (code or documentation) is performed
**Then** the evaluation record includes the model version identifier that produced the score (FR26)
**And** the model version is stored in a versioning registry with: versionId, modelType, deployedAt, configurationHash, and status (active/deprecated/retired)

**Given** an admin views the evaluation model registry
**When** they navigate to /admin/evaluations/models
**Then** they see all model versions with deployment dates, evaluation counts, and status
**And** they can compare performance metrics between model versions (average scores, variance, human agreement rate)

**Given** a new model version is deployed
**When** it replaces or supplements an existing version
**Then** the registry records the transition with a timestamp
**And** all subsequent evaluations reference the new model version
**And** previous evaluations retain their original model version reference — scores are never retroactively changed

### Story 7.3: Transparent Evaluation Narrative & Score History

As a contributor,
I want to understand how my work was evaluated through an insightful narrative,
So that I feel recognized for my craft rather than reduced to a number.

**Acceptance Criteria:**

**Given** I am an authenticated contributor with a completed evaluation
**When** I navigate to /dashboard/evaluations/:id
**Then** I see a "Narrative Evaluation" display that opens with a narrative paragraph explaining what the AI recognized about my contribution — what was achieved, what quality was demonstrated, and how it advanced the ecosystem (UX spec: "Insight before numbers")
**And** the narrative is written in a respectful, editorial tone (like a thoughtful review, not a report card)
**And** below the narrative, dimension scores are revealed through progressive disclosure — a summary card that expands to show detailed breakdowns (UX spec: Stripe-inspired progressive disclosure)
**And** scores are displayed as subtle indicators with descriptive labels (e.g., "Strong maintainability"), not bold numbers or red/green colors (UX spec: calm clarity, no dashboard anxiety)
**And** the model version that produced the evaluation is displayed as a discrete footnote

**Given** I am viewing the evaluation narrative
**When** I expand the detailed breakdown
**Then** each dimension (complexity, maintainability, test coverage, standards adherence for code; structural completeness, readability, reference integrity for docs) shows its sub-score with a brief textual explanation of what was measured
**And** the evaluation formula version and weights are available via a "How was this calculated?" expandable section (full provenance transparency per FR23)
**And** the display uses the ROSE typography hierarchy: ABC Normal Bold 700 for the narrative heading, Book 400 for body text, Medium 500 for data labels (weight-based hierarchy, not typeface split)

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/evaluations
**Then** I see my evaluation score history displayed as a timeline visualization (FR25)
**And** the timeline shows scores over time with the narrative preview (first sentence) for each evaluation
**And** trend lines use organic, garden-inspired visual language — growth curves, not stock charts (UX spec: patient confidence)
**And** the visualization uses the contributor's pillar accent color (#FF5A00 orange for Technology, #E8AA00 gold for Finance, #00E87B green for Impact, #00C4E8 cyan for Governance)
**And** the chart meets accessibility requirements: sufficient color contrast (4.5:1 minimum) and alternative text representations for screen readers (NFR-A4)

**Given** I have multiple evaluations over time
**When** I view the trend visualization
**Then** I can filter by contribution type (code, documentation) and time period
**And** trend data is derived from the single-horizon scores (FR60 single-horizon)
**And** the API endpoint GET /api/v1/evaluations/history uses cursor-based pagination with default limit 20

### Story 7.4: Human Review & Benchmarking

As a contributor,
I want to flag an evaluation I believe is incorrect,
So that a human can review and correct potential AI errors, maintaining trust in the system.

**Acceptance Criteria:**

**Given** I am an authenticated contributor viewing an evaluation of my own contribution
**When** I click the "Request Human Review" action on the evaluation detail page
**Then** a dialog appears asking me to provide a brief reason for the flag (minimum 50 characters, to ensure substantive input)
**And** on submission, a POST /api/v1/evaluations/:id/flag creates a human review request with status PENDING
**And** a domain event `evaluation.review.flagged` is emitted
**And** the evaluation display shows a discreet "Human review requested" status indicator
**And** the flag action is recorded in the audit log (NFR-S6)

**Given** I am an admin
**When** I navigate to /admin/evaluations/review-queue
**Then** I see all flagged evaluations with: contributor name, contribution title, domain, original AI score, flag reason, and time since flagged
**And** the queue is sortable by date flagged and filterable by domain
**And** the queue uses cursor-based pagination

**Given** I am an admin reviewing a flagged evaluation
**When** I select a flagged item
**Then** I see the full evaluation narrative, dimension scores, the contributor's flag reason, and the original contribution artifacts side-by-side
**And** I can either: confirm the AI evaluation (marking the flag as RESOLVED with reason), or override the evaluation with adjusted scores and an updated narrative explanation
**And** if I override, the new scores replace the original with a full audit trail: original scores, override scores, admin ID, reason, timestamp
**And** a domain event `evaluation.review.resolved` is emitted
**And** the contributor receives a notification that their review request has been processed

**Given** the system benchmarks AI evaluations against human assessments (FR24)
**When** human review overrides accumulate
**Then** the system tracks the AI-human agreement rate (percentage of AI evaluations confirmed vs. overridden by humans)
**And** this agreement rate is calculated per model version and per domain
**And** the benchmarking data is available on the admin evaluation dashboard for model quality monitoring
**And** the agreement rate is also exposed for the public showcase (Epic 7, Story 7.5)

### Story 7.5: Public AI Evaluation Data

As a visitor (unauthenticated),
I want to view aggregate AI evaluation data on public pages,
So that I can assess the quality and rigor of Edin's evaluation system.

**Acceptance Criteria:**

**Given** I am a visitor on the public showcase page (Epic 2, Story 2.3)
**When** I view the AI evaluation metrics section
**Then** I see aggregate evaluation data including: evaluation scores by domain (average score per domain displayed as domain-colored indicators), score distributions (visual histogram or density plot showing the spread of scores), AI-human agreement rate (percentage derived from Story 7.4 benchmarking), and total evaluations completed (FR47)
**And** the data is presented with the "quiet authority" aesthetic appropriate for the Henrik (investor) persona — authoritative numbers with editorial context, not raw data dumps
**And** the metrics refresh periodically (cached in Redis, maximum 5-minute data lag)
**And** the page loads with FCP <1.5s on a 4G connection (NFR-P1)

**Given** I am a visitor viewing a contributor's public profile (Epic 2, Story 2.2)
**When** the contributor has granted consent for individual score visibility
**Then** I see their evaluation scores displayed alongside their contributions (FR47: individual scores visible with contributor consent)
**And** scores are presented in the narrative style — a brief summary of the contributor's evaluation quality, not a number in isolation

**Given** the contributor has not granted consent for individual score visibility
**When** I view their public profile
**Then** no individual evaluation scores are displayed
**And** their contributions are shown without score data — the absence is invisible (no "scores hidden" label)

**Given** the public evaluation data endpoint GET /api/v1/public/evaluations/aggregate
**When** it is called without authentication
**Then** it returns only aggregate statistics — never individual contributor scores or evaluation details
**And** the response follows the standard API envelope format with proper caching headers
**And** the endpoint responds within the 95th percentile <500ms target (NFR-P4)

---

## Epic 8: Publication Platform

### Story 8.1: Article Authoring Interface

As a contributor,
I want to create and submit article drafts through an intuitive writing interface,
So that I can share my intellectual insights with the community with minimal friction.

**Acceptance Criteria:**

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/publication/new
**Then** I see a focused authoring interface built on the Tiptap block-based editor (UX spec: Notion-like block editing with slash commands)
**And** the editor supports rich text editing: headings (H2-H4), bold, italic, blockquotes, code blocks (with syntax highlighting), ordered and unordered lists, links, and images
**And** slash commands (/) are available for inserting content blocks: code block, pull quote, data visualization placeholder, image, horizontal divider
**And** the interface displays fields for: article title, abstract/summary (max 300 characters), domain tag selection (Technology, Finance, Impact, Governance — single select), and the main article body
**And** the writing experience feels like a focused writing tool — no platform chrome competing for attention (UX spec: progressive navigation collapse during focused tasks)

**Given** I am writing an article
**When** I type content in the editor
**Then** the draft auto-saves every 30 seconds via PATCH /api/v1/articles/:id with status DRAFT
**And** a discreet "Saved" indicator appears briefly after each auto-save — no intrusive save confirmations
**And** I can manually save at any time with Ctrl/Cmd+S

**Given** I have a draft article
**When** I navigate to /dashboard/publication
**Then** I see my drafts listed with title, domain tag, last modified date, and article status
**And** I can resume editing any draft by clicking on it
**And** the list uses cursor-based pagination (default limit 20)

**Given** I have completed my article draft
**When** I click "Submit for Review"
**Then** validation runs: title is required, abstract is required (min 50 characters), domain tag is selected, and body has minimum content (500 characters)
**And** on success, the article status transitions from DRAFT to SUBMITTED via POST /api/v1/articles/:id/submit
**And** a domain event `publication.article.submitted` is emitted
**And** I see a confirmation message: "Your article has been submitted for editorial review"

### Story 8.2: Editorial Workflow & Lifecycle

As an editor,
I want to review assigned articles and provide structured editorial feedback,
So that I can help authors produce their best work through a clear editorial process.

**Acceptance Criteria:**

**Given** a contributor submits an article (status transitions to SUBMITTED)
**When** the `publication.article.submitted` event is processed
**Then** the system assigns an Editor based on: domain expertise match (editor's primary domain matches article domain tag) and editor availability (fewest active assignments) (FR67)
**And** if no eligible editor is available, the article is queued and an admin notification is sent
**And** admins can override the automatic assignment via /admin/publication/assignments
**And** the article status transitions to EDITORIAL_REVIEW
**And** the assigned editor receives a notification

**Given** I am an editor with an assigned article
**When** I navigate to /dashboard/publication/review/:id
**Then** I see the full article rendered with the editorial design typography alongside an editorial feedback panel
**And** I can provide inline comments by selecting text in the article — the comment appears contextually within the article, not in a separate panel (UX spec: inline editorial feedback adapted from Notion comments)
**And** I can add general editorial feedback in a structured form: overall assessment (text), specific revision requests (list), and a decision: Approve, Request Revisions, or Reject

**Given** I submit my editorial feedback with "Request Revisions"
**When** the feedback is saved via POST /api/v1/articles/:id/feedback
**Then** the article status transitions to REVISION_REQUESTED (FR70 lifecycle)
**And** the author receives a notification that editorial feedback is available
**And** a domain event `publication.article.revision-requested` is emitted

**Given** I am an author with revision requests
**When** I navigate to /dashboard/publication/:id/edit
**Then** I see the editor's inline comments displayed contextually within my article text
**And** I see the general feedback and specific revision requests in a sidebar panel
**And** I can edit my article to address the feedback
**And** on resubmission, a new version is created with version history preserved (FR69) — I can view previous versions via a version selector
**And** the article status transitions back to SUBMITTED, then automatically to EDITORIAL_REVIEW

**Given** I am an editor and I approve an article
**When** I select "Approve" in the editorial decision
**Then** the article status transitions to APPROVED (FR70)
**And** an admin can then publish the article, transitioning status to PUBLISHED
**And** the full article lifecycle is tracked: DRAFT → SUBMITTED → EDITORIAL_REVIEW → REVISION_REQUESTED (optional, repeatable) → APPROVED → PUBLISHED → ARCHIVED (FR70)
**And** each state transition is recorded with timestamp, actor, and reason in the audit log (NFR-S6)

### Story 8.3: Editor Roles & Eligibility

As a contributor,
I want to claim an editor role in my domain of expertise,
So that I can help shape the quality of published content and earn editorial rewards.

**Acceptance Criteria:**

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/publication/editor-application
**Then** I see the editor eligibility criteria for each domain: minimum contribution history threshold (configurable by admins, e.g., 10+ evaluated contributions in the domain) and minimum governance weight threshold (configurable by admins) (FR74)
**And** my current status against each criterion is displayed (met/not met) with my actual values shown

**Given** I meet the eligibility criteria for a domain
**When** I click "Apply as Editor" for that domain
**Then** my editor application is submitted via POST /api/v1/publication/editor-applications
**And** admins are notified of the pending application
**And** the application status is visible on my dashboard

**Given** I am an admin
**When** I navigate to /admin/publication/editors
**Then** I see pending editor applications with contributor profile, domain, contribution history summary, and governance weight
**And** I can approve or reject applications with a reason
**And** I can manage editorial standards and publication guidelines (FR77): configurable eligibility thresholds per domain, editorial rubric guidelines, and maximum concurrent assignments per editor
**And** I can revoke editor status from existing editors with an audit trail

**Given** I am an approved editor
**When** I view my dashboard
**Then** I see an "Editorial" section showing: my active assignments, completed reviews, and available articles in my domain that need an editor
**And** I can claim available unassigned articles in my domain (within my concurrent assignment limit)

### Story 8.4: Public Article Reading Experience

As a visitor,
I want to read published articles in a beautiful, immersive reading experience,
So that I can engage with the community's intellectual output as I would with a quality publication.

**Acceptance Criteria:**

**Given** I am a visitor (no authentication required)
**When** I navigate to /articles
**Then** I see published articles organized by domain, author, and publication date (FR72)
**And** each article card shows: title, abstract, author name, domain tag (with domain accent color), publication date, and a reading time estimate
**And** the layout gives equal visual prominence to all four domains (UX spec: equal dignity across domains)
**And** the page is server-side rendered for SEO (NFR-C2)
**And** articles are browsable with filtering by domain, author, and date range
**And** the list uses cursor-based pagination

**Given** I click on a published article
**When** the article page at /articles/:slug loads
**Then** I see the full article rendered inside the ReadingCanvas layout (680px max-width, surface-reading #1E1E22 background): ABC Normal Bold 700 headings in blush pink (#E4BDB8), Book 400 body text in #F0F0F0, generous margins, immersive reading tunnel
**And** the article displays: author profile (name, bio, domain badge), editor profile (name, domain badge), domain tag, publication date, and AI evaluation score (FR73, FR75 — evaluated using the same framework as other contributions, scoring analytical depth, originality, clarity, domain relevance)
**And** navigation chrome collapses to create a focused reading experience (UX spec: progressive navigation collapse)
**And** the page achieves FCP <1.2s and LCP <2.5s with passing Core Web Vitals (NFR-C1)

**Given** the article page is rendered
**When** search engines crawl it
**Then** the page includes structured data (JSON-LD) for article type, Open Graph metadata, and Twitter Card metadata (NFR-C2)
**And** the sitemap is updated within 1 hour of publication
**And** the article URL uses a human-readable slug derived from the title

**Given** the publication archive grows
**When** the system has 1000+ published articles
**Then** article search returns results within 1s (NFR-C3)
**And** query performance does not degrade beyond 10% compared to baseline

### Story 8.5: Publication Metrics & Reward Split

As an author or editor,
I want to see publication metrics and understand the editorial reward split,
So that I can track the reach of my published work and see how editorial collaboration is valued.

**Acceptance Criteria:**

**Given** I am an author with a published article
**When** I navigate to /dashboard/publication/:id/metrics
**Then** I see publication metrics including: view count, external referral sources (where readers are coming from), and reader engagement indicators (time on page, scroll depth) (FR76)
**And** metrics are displayed with a 48-hour delay after publication (UX spec: no real-time metric anxiety, preventing obsessive refresh behavior)
**And** the metrics use organic, garden-inspired visual language — growth over time, not raw counters

**Given** my article has been published
**When** the article receives a content reward based on its AI evaluation score
**Then** 80% of the content reward is allocated to me (the author) and 20% is allocated to the assigned editor (FR71)
**And** the reward split is visible on my publication dashboard with clear labeling: "Author reward: 80%" alongside the editor's name
**And** the editor sees their 20% allocation on their editorial dashboard with the article title and author name

**Given** I am an editor with published articles I reviewed
**When** I navigate to /dashboard/publication/editorial
**Then** I see a summary of my editorial contributions: articles reviewed, articles published, and accumulated editorial reward allocations
**And** each published article shows the reward split clearly (FR71)

**Given** publication metrics are tracked
**When** the metrics data is queried via GET /api/v1/articles/:id/metrics
**Then** the endpoint requires authentication (author, editor, or admin only)
**And** the response follows the standard API envelope format
**And** the endpoint responds within the 95th percentile <500ms target (NFR-P4)

### Story 8.6: Content Moderation & Plagiarism Detection

As an admin,
I want to moderate published content and detect plagiarism before publication,
So that I can maintain editorial integrity and protect the platform's reputation.

**Acceptance Criteria:**

**Given** a contributor submits an article (status transitions to SUBMITTED)
**When** the `publication.article.submitted` event is processed
**Then** before editorial review begins, the system enqueues a plagiarism detection job on the `plagiarism-check` BullMQ queue (FR79)
**And** the detector checks for: potential plagiarism (text similarity against known sources) and undisclosed AI-generated content (statistical patterns indicating AI authorship)
**And** results are attached to the article as a moderation report with confidence scores

**Given** the plagiarism check completes
**When** the report indicates potential issues (confidence above a configurable threshold)
**Then** the article is flagged for admin review before it enters editorial review
**And** the admin sees the flagged article at /admin/publication/moderation with: article title, author, flag type (plagiarism/AI-content), confidence score, and highlighted passages
**And** the admin can: dismiss the flag (false positive), request corrections from the author (with specific feedback), or reject the article

**Given** the plagiarism check completes with no issues
**When** the confidence scores are below the threshold
**Then** the article proceeds to editorial review automatically (Story 8.2)
**And** the clean moderation report is stored for audit purposes

**Given** I am an admin
**When** I navigate to /admin/publication/moderation
**Then** I see all published articles with moderation actions available: unpublish (removes from public view, status → ARCHIVED), flag for review (sends article back to EDITORIAL_REVIEW with admin notes), and request corrections (notifies author with specific required changes) (FR78)
**And** every moderation action is recorded in the audit log with: admin ID, action taken, reason, timestamp (NFR-S6)
**And** the author is notified of any moderation action with a clear, respectful explanation

**Given** an article is unpublished via moderation
**When** the status transitions to ARCHIVED
**Then** the article is removed from public pages and search results
**And** the article remains accessible to the author and admin in their respective dashboards
**And** the URL returns a 410 Gone status for SEO purposes
**And** the domain event `publication.article.moderated` is emitted

---

## Epic 9: Reward System & Scoring

### Story 9.1: Advanced Contribution Scoring & Multi-Temporal Tracking

As a contributor,
I want my contribution scores aggregated across multiple time horizons,
So that I can see both my immediate performance and my long-term trajectory of sustained engagement.

**Acceptance Criteria:**

**Given** the basic single-horizon scoring exists (Epic 7, Story 7.1)
**When** the advanced scoring module is deployed
**Then** the system extends score calculation to the full multi-temporal model (FR58 advanced): AI evaluation output, peer feedback score (from Epic 6), task complexity multiplier, and domain normalization factor
**And** the formula is configurable by admins via /admin/settings/scoring with version tracking — every formula change creates a new version with effective date, previous version archived
**And** scores remain on a 0-100 scale with full provenance stored: formula version, individual component values, weights applied, raw inputs

**Given** evaluation scores are recorded (from Epic 7)
**When** the temporal aggregation service runs
**Then** contribution scores are aggregated across six temporal horizons: session (per-contribution), daily, weekly, monthly, quarterly, and yearly (FR60 multi-temporal)
**And** each horizon stores: aggregated score, number of contributions in period, score trend (rising/stable/declining), and computation timestamp
**And** aggregation jobs run on a schedule via BullMQ: daily at 00:00 UTC, weekly on Monday, monthly on 1st, quarterly and yearly at period boundaries
**And** the aggregation is idempotent — re-running produces the same result

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/scores
**Then** I see my scores across all temporal horizons displayed with progressive disclosure: a summary card showing the most recent session score and the monthly trend, expandable to reveal all six horizons
**And** each horizon shows the aggregated score with a brief contextual label (e.g., "This month: 78 — 12 contributions, rising trend")
**And** the display uses the calm clarity aesthetic — no red/green comparisons, descriptive trend labels instead of directional arrows

**Given** the scoring formula is updated by an admin
**When** a new formula version is activated
**Then** all future evaluations use the new formula
**And** historical scores are not retroactively recalculated — they retain the formula version under which they were computed
**And** the contributor can see which formula version applies to each score via the provenance detail (expandable section)

### Story 9.2: Reward Trajectory Visualization

As a contributor,
I want to see how my scaling-law compounding rewards grow with sustained engagement,
So that I understand the long-term value of consistent, quality contributions.

**Acceptance Criteria:**

**Given** I am an authenticated contributor with score history across multiple temporal horizons
**When** I navigate to /dashboard/rewards/trajectory
**Then** I see a reward trajectory visualization showing how scaling-law compounding rewards grow with sustained engagement (FR57)
**And** the visualization displays a growth curve that illustrates the compounding effect: early contributions build slowly, sustained engagement accelerates reward accumulation
**And** the curve uses organic, garden-inspired visual language — growth metaphors (branches extending, garden filling in), not financial charts (UX spec: "Your garden is growing" not "Your score is 847")
**And** the visualization uses my pillar accent color (orange #FF5A00 / gold #E8AA00 / green #00E87B / cyan #00C4E8) as the primary curve color

**Given** I am viewing the reward trajectory
**When** I interact with the visualization
**Then** I can hover/tap on points along the curve to see: the contribution that generated the score, the temporal horizon context, and the compounding multiplier at that point
**And** I can toggle between time ranges: last 30 days, last quarter, last year, all time
**And** the visualization includes a projected trajectory (dotted/faded line) showing where sustained engagement at the current rate would lead — framed as possibility, not pressure

**Given** the trajectory visualization renders
**When** it is accessed by a screen reader
**Then** alternative text representations describe the trajectory pattern: overall trend, key inflection points, and current position (NFR-A4)
**And** the underlying data is available as a table via an "View as table" toggle for full accessibility
**And** color contrast meets the 4.5:1 minimum ratio (NFR-A4)

**Given** the trajectory data is fetched
**When** the API endpoint GET /api/v1/rewards/trajectory is called
**Then** it returns the computed trajectory points based on multi-temporal scores
**And** the response uses cursor-based pagination for large datasets
**And** the endpoint responds within the 95th percentile <500ms target (NFR-P4)

### Story 9.3: Reward Methodology Explanation

As a contributor or visitor,
I want to understand how the scaling-law reward methodology works,
So that I have full transparency into how contributions are valued and rewarded.

**Acceptance Criteria:**

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/rewards/methodology
**Then** I see an interactive explanation of the scaling-law reward methodology (FR59) with: a plain-language overview of how scores translate to rewards, visual representations of the compounding mechanism (step-by-step animated or progressive-disclosure diagrams), worked examples showing how sample contribution patterns produce different reward trajectories, and a glossary of key terms (domain normalization, complexity multiplier, temporal aggregation)
**And** the explanation is designed to achieve the >80% comprehension target (per PRD Success Criteria) — language is accessible, jargon is defined inline, and visual representations reinforce textual explanations

**Given** I am a visitor (unauthenticated)
**When** I navigate to /rewards/methodology (public route)
**Then** I see the same reward methodology explanation as authenticated contributors (FR59: visitors can access on public pages)
**And** the page is server-side rendered for SEO
**And** the page loads with FCP <1.5s (NFR-P1)
**And** the content uses the ROSE PublicPortal layout — ABC Normal Bold 700 headings in blush pink (#E4BDB8), dark background, generous whitespace, vivid orange (#FF5A00) CTAs (Henrik persona)

**Given** I am viewing the methodology explanation
**When** I scroll through the content
**Then** the explanation uses progressive disclosure: a concise summary at the top ("How Edin rewards sustained contribution"), expandable sections for each component of the formula, and an interactive calculator where I can input hypothetical contribution patterns and see projected outcomes
**And** the visual representations use the garden-inspired metaphor consistently: contributions as seeds, sustained engagement as cultivation, compounding rewards as harvest (UX spec: organic growth language)

**Given** the methodology content is rendered
**When** it is accessed by a screen reader
**Then** all visual representations have equivalent text descriptions (NFR-A4)
**And** the interactive calculator is fully keyboard-navigable (NFR-A3)
**And** the page meets WCAG 2.1 Level AA compliance (NFR-A1)

---

## Epic 10: Admin Operations, Compliance & Observability

### Story 10.1: Admin Health Metrics Dashboard

As an admin,
I want to view a health metrics dashboard showing community vitals and platform KPIs,
So that I can make data-driven decisions about community health and go/no-go readiness.

**Acceptance Criteria:**

**Given** I am an authenticated admin
**When** I navigate to /admin/dashboard
**Then** I see a health metrics dashboard displaying community vitals (FR48): active contributors (count and trend), retention rate (monthly cohort retention), domain balance (contributor distribution across Technology, Finance, Impact, Governance), and feedback turnaround (average time from assignment to submission, from Epic 6)
**And** the dashboard presents metrics with editorial context — each metric includes a brief textual interpretation (e.g., "Technology domain has 45% of contributors — consider recruiting for Impact"), not raw numbers in isolation (UX spec: insight before numbers)
**And** all leading and lagging KPIs from the PRD Success Criteria are available on the dashboard (NFR-O3)
**And** dashboard data has <5 minute data lag (NFR-O3), sourced from Redis-cached aggregations

**Given** I am viewing the admin dashboard
**When** I interact with metrics
**Then** each metric card uses progressive disclosure — summary value visible at a glance, expandable to show trend chart, breakdown by domain, and historical comparison
**And** the dashboard is keyboard-navigable (NFR-A3)
**And** the page loads within TTI <3s (NFR-P2)

**Given** I want to export platform metrics
**When** I click "Generate Report" on /admin/reports
**Then** I can configure a report with: date range, metrics to include (selectable from all KPIs), and format (CSV, JSON) (FR51)
**And** report generation runs asynchronously via BullMQ (large reports may take time)
**And** I receive a notification when the report is ready for download
**And** generated reports are available for 30 days before automatic cleanup
**And** data export is available for quarterly reporting (NFR-O3)

**Given** system health thresholds are breached
**When** API error rate exceeds 1%, ingestion pipeline fails, evaluation throughput drops >50%, or database query p95 exceeds 2s
**Then** an alert is fired within 60 seconds (NFR-O1)
**And** alerts are visible on the admin dashboard as a priority notification banner
**And** each alert includes: threshold breached, current value, time of breach, and a link to relevant logs

### Story 10.2: Role Management & Platform Settings

As an admin,
I want to manage contributor roles and configure platform settings,
So that I can control access, adjust operational parameters, and adapt the platform as the community evolves.

**Acceptance Criteria:**

**Given** I am an authenticated admin
**When** I navigate to /admin/contributors
**Then** I see a contributor management list with: name, email, current role, domain, join date, and last activity
**And** the list supports search by name/email and filtering by role and domain
**And** the list uses cursor-based pagination (default limit 20, max 100)

**Given** I select a contributor from the list
**When** I click "Manage Role"
**Then** I can assign or change their role across the six RBAC tiers: Public, Applicant, Contributor, Founding Contributor, Working Group Lead, Admin (FR49)
**And** role changes require a confirmation dialog with a reason field
**And** every role change is recorded in the audit log with: admin ID, contributor ID, previous role, new role, reason, timestamp (NFR-S6)
**And** a domain event `contributor.role.changed` is emitted
**And** the contributor receives a notification of their role change

**Given** I am an authenticated admin
**When** I navigate to /admin/settings
**Then** I see platform configuration organized into sections (FR50): monitored GitHub repositories (add/remove repos, toggle active monitoring), feedback assignment rules (SLA threshold, maximum concurrent assignments, auto-reassignment timing), onboarding parameters (72-Hour Ignition timeline thresholds, buddy assignment rules), and scoring formula configuration (weights, multipliers — linked to Epic 9 formula versioning)
**And** each settings change requires confirmation and is recorded in the audit log
**And** settings changes take effect immediately for new operations but do not retroactively alter existing data

**Given** I update a platform setting
**When** the change is saved via PATCH /api/v1/admin/settings/:section
**Then** the previous value is archived with timestamp for audit purposes
**And** a domain event `platform.settings.updated` is emitted with the section name and admin ID
**And** the response confirms the update with the new effective value

### Story 10.3: Immutable Audit Logs

As an admin,
I want an immutable audit trail of all security-relevant actions,
So that I can maintain regulatory compliance and contributor trust through full transparency.

**Acceptance Criteria:**

**Given** a security-relevant action occurs in the system
**When** the action is one of: admission decision (approve/reject), evaluation output (score recorded/overridden), role change, governance action, content moderation (publish/unpublish/flag), platform settings change, or data access request
**Then** an immutable audit log entry is created in the `audit` schema (FR52) with: eventType, actorId, actorRole, targetId, targetType, action, previousState, newState, reason, correlationId, and timestamp
**And** audit log entries are append-only — no update or delete operations are permitted on the audit table
**And** 100% of security-relevant events are covered (NFR-S6)

**Given** contributor identity data is stored
**When** the system persists contribution and evaluation records
**Then** contributor PII (name, email, GitHub profile) is stored in the `core` schema, separated from contribution/evaluation records in the `evaluation` and `publication` schemas (FR64)
**And** the mapping between contributor identity and their contributions is maintained via foreign key references (contributor_id) — but the `evaluation` and `publication` schemas contain no directly identifiable data beyond the contributor_id
**And** audit log entries reference contributor_id, not PII fields directly

**Given** I am an authenticated admin
**When** I navigate to /admin/audit-logs
**Then** I see audit log entries with: timestamp, event type, actor, action summary, and target
**And** the log is searchable by: event type, actor, target, date range, and correlationId
**And** search results return within 10 seconds (NFR-S6)
**And** the log uses cursor-based pagination

**Given** audit logs accumulate over time
**When** the retention policy is enforced
**Then** audit logs are retained for a minimum of 2 years (NFR-S6)
**And** logs older than the retention period are archived (not deleted) to cold storage
**And** archived logs remain queryable on request (with potentially higher latency)

### Story 10.4: GDPR Compliance & EU AI Act Documentation

As a contributor,
I want to exercise my data rights (export, deletion),
So that the platform respects my privacy in compliance with GDPR.

**Acceptance Criteria:**

**Given** I am an authenticated contributor
**When** I navigate to /dashboard/settings/privacy
**Then** I see data rights options: "Export My Data" and "Request Data Deletion"

**Given** I click "Export My Data"
**When** the export request is submitted via POST /api/v1/contributors/me/data-export
**Then** a data export job is enqueued on BullMQ (FR62 — GDPR data portability)
**And** the export compiles: my profile data, contribution history, evaluation scores and narratives, peer feedback received, publication history, reward data, and audit log entries where I am the actor or target
**And** the export is generated in a machine-readable format (JSON) and packaged as a downloadable ZIP
**And** I receive a notification when the export is ready (within 30 days per GDPR requirement, but target <24 hours)
**And** the export request is recorded in the audit log

**Given** I click "Request Data Deletion"
**When** the deletion request is submitted via POST /api/v1/contributors/me/data-deletion
**Then** a confirmation dialog explains the consequences: personal data will be permanently deleted, contribution records will be pseudonymized (contributor_id replaced with a stable pseudonym), and the action is irreversible (FR63)
**And** upon confirmation, the deletion request enters a 30-day cooling-off period during which I can cancel
**And** after the cooling-off period, the system: deletes all PII (name, email, bio, GitHub profile), replaces contributor_id references in evaluation, publication, and audit records with a pseudonymized identifier, and revokes all active sessions and tokens
**And** the pseudonymization ensures on-chain records (future Phase 2) contain no directly identifiable data (FR64)
**And** the deletion request and execution are recorded in the audit log with the pseudonymized ID

**Given** I am an admin responsible for regulatory compliance
**When** I navigate to /admin/compliance/ai-act
**Then** I can generate EU AI Act compliance documentation (FR65) including four document types: (a) Model Card per evaluation model version (auto-generated from the model versioning registry in Epic 7), (b) Evaluation Criteria Specification (auto-generated from the scoring formula configuration and rubric definitions), (c) Human Oversight Report (auto-generated from human review queue statistics — override rate, flag volume, resolution times from Epic 7), and (d) Data Processing Record (auto-generated from audit logs and data flow documentation)
**And** documents are generated from system data — legal review is manual (FR65)
**And** each document includes a generation timestamp and a "legal review pending" watermark until manually approved
**And** generated documents are versioned and stored for audit purposes
