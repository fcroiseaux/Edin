---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
status: complete
completedAt: '2026-03-15'
inputDocuments:
  - _bmad-output/planning-artifacts/zenhub-edin-integration-proposal.md
  - _bmad-output/planning-artifacts/research/technical-github-zenhub-project-management-research-2026-03-13.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - docs/edin_platform_description.md
documentCounts:
  briefs: 0
  research: 1
  brainstorming: 0
  projectDocs: 4
workflowType: 'prd'
classification:
  projectType: web_app
  domain: fintech
  complexity: high
  projectContext: brownfield
---

# Product Requirements Document - Edin Zenhub Integration

**Author:** Fabrice
**Date:** 2026-03-15

**Document Sections:** Executive Summary → Project Classification → Success Criteria → User Journeys → Domain-Specific Requirements → Innovation & Novel Patterns → Web Application Specific Requirements → Project Scoping & Phased Development → Functional Requirements → Non-Functional Requirements

**FR Count:** 53 (39 MVP, 14 Phase 2) | **NFR Count:** 33 across 7 categories

## Executive Summary

Edin is a curated contributor platform for the Rose decentralized finance ecosystem, built with Next.js 16, NestJS 11, PostgreSQL, and Redis. The platform currently tracks contributions (commits, PRs, code reviews) via GitHub webhooks, evaluates them with an AI-powered engine (Anthropic Claude), and allocates blockchain-based token rewards across seven temporal scales using scaling-law mathematics.

This PRD defines the **Zenhub Integration** — connecting Zenhub's sprint management capabilities with Edin's contribution tracking, evaluation, and reward systems. The integration transforms Edin from a platform that evaluates contributions after the fact into one that **orchestrates contributions proactively**: sprint planning ensures work is valuable, coordinated, and synergistic before it happens, and the reward system allocates tokens to contributions that were deliberately planned, prioritized, and delivered within a coherent strategy.

The approved direction is to track **all contributions** — platform development, financial research, governance, documentation, and impact work — through the sprint/scrum process, with story points assigned to all contribution types. This creates a single visibility point for everything happening across the Rose ecosystem while giving project leadership the ability to prioritize, delay, or accelerate work so contributions stack synergistically.

The integration spans three layers: (1) Zenhub as the sprint management tool with zero-code adoption, (2) technical integration pulling Zenhub data into Edin via webhooks and API polling for sprint metrics, contribution enrichment, and admin dashboards, and (3) bidirectional sync between Zenhub issues and Edin's existing task system so contributor ecosystem work flows through the same sprint process as platform development.

### What Makes This Special

No existing contributor incentivization platform connects project management (planning and prioritization) to reward allocation. Platforms like Gitcoin, Coordinape, and SourceCred reward output — Edin rewards **planned, coordinated output**. The core insight is that contribution value is not just about quality — it is about timing, coordination, and strategic fit. A brilliant piece of work done at the wrong time or in isolation is worth less than good work that fits the plan.

By enriching the AI evaluation engine with planning context — story points, sprint velocity, estimation accuracy, commitment ratio — Edin evaluates contributors not just on what they produced, but on how reliably they estimated, committed, and delivered within the sprint framework. This creates a holistic picture of contributor value that no competitor offers, and provides project leadership with a steering mechanism for the entire contributor economy.

The integration reuses existing infrastructure: GitHub webhook patterns for Zenhub webhooks, BullMQ for API polling jobs, Recharts for sprint dashboards, CASL for permissions, and the existing activity feed and notification systems for sprint events.

## Project Classification

- **Project Type:** Web application (feature extension to existing Next.js/NestJS monorepo)
- **Domain:** Fintech (decentralized finance, blockchain token rewards, regulatory context)
- **Complexity:** High (multi-system bidirectional integration, evaluation engine extension, existing data model constraints, CASL permissions, multiple user roles)
- **Project Context:** Brownfield (extending existing platform with ~79 functional requirements already implemented)

## Success Criteria

### User Success

**Contributors:**

- Sprint planning provides clarity on what to work on next and why — contributors report that the process reduces ambiguity, not adds bureaucracy
- Contributors can see how their planned work connects to the broader Rose ecosystem strategy
- Story point estimation for non-dev contributions (research, documentation, governance) feels meaningful, not forced
- Contributors understand that planning reliability (estimating accurately, delivering on commitments) is part of their evaluation — and see it as fair

**Project Leads / Scrum Masters:**

- A single sprint board shows all contributions across all domains (dev, research, governance, finance, documentation)
- Sprint planning enables proactive steering: leaders can prioritize, delay, or accelerate work so contributions stack synergistically
- Burndown charts and velocity data are available without leaving GitHub
- Sprint capacity can be estimated based on historical velocity data within 3 sprints of adoption

**Management / Stakeholders:**

- One dashboard provides cross-domain visibility into what is happening, what is planned, and what was delivered
- Velocity trends and estimation accuracy data support informed capacity decisions
- AI-generated sprint summaries (Zenhub Pulse) reduce status meeting overhead
- Combined effort metrics (evaluation score + story points + planning reliability) provide a holistic view of contributor value

### Business Success

- Reduction in wasted contributions: work done outside the sprint plan that duplicates, conflicts with, or is mistimed relative to other work decreases measurably within 2 sprints
- Delivery predictability improves: planned vs delivered story points ratio reaches >75% within 4 sprints
- Contributor retention: contributors who go through the sprint process report equal or higher satisfaction compared to ad-hoc contribution (measured via feedback)
- ROI: the cost of Zenhub ($12.50/user/mo) is offset by improved coordination — fewer revisions, fewer abandoned contributions, faster time-to-value on strategic initiatives
- Reward allocation quality: token distribution correlates with both contribution quality (AI evaluation) and planning reliability (sprint data), creating a fairer and more defensible reward model

### Technical Success

- Zenhub webhook receiver processes events with <5s latency and 99.9% reliability, following the same patterns as the existing GitHub webhook infrastructure
- API polling service (BullMQ) syncs sprint, velocity, and pipeline data at configurable intervals (default: every 15 minutes) without impacting existing job queues
- Bidirectional task sync between Zenhub issues and Edin tasks operates with eventual consistency (target: <5 minute sync lag), with conflict resolution favoring Zenhub as source of truth for sprint data
- Existing contribution ingestion pipeline (GitHub webhooks) is not degraded by the addition of Zenhub data enrichment
- Sprint metrics (velocity, burndown, cycle time) are accurately calculated and match Zenhub's own reporting within acceptable rounding tolerances
- Admin sprint dashboard loads within 2s for up to 12 months of historical sprint data

### Measurable Outcomes

| Metric                  | Target                                                                 | Timeframe |
| ----------------------- | ---------------------------------------------------------------------- | --------- |
| Sprint adoption         | 100% of active contributors tracked through sprints                    | Month 2   |
| Delivery predictability | >75% planned vs delivered SP ratio                                     | Sprint 4  |
| Sync reliability        | 99.9% webhook/polling success rate                                     | Ongoing   |
| Dashboard adoption      | Project leads check sprint dashboard 3x/week                           | Month 2   |
| Estimation calibration  | Story point variance <30% from actual effort                           | Sprint 6  |
| Evaluation enrichment   | 100% of sprint contributions include planning context in AI evaluation | Month 4   |

## User Journeys

### Journey 1: Nadia, Backend Developer — First Sprint with Zenhub

Nadia is a senior NestJS developer who joined Edin two months ago. She's been contributing code through GitHub — PRs, code reviews, bug fixes — and receiving AI evaluation scores. But she sometimes felt her work overlapped with others, and twice she built features that got deprioritized because they didn't fit the current roadmap. Her evaluation scores were good, but she suspected her contributions could have been more impactful if better coordinated.

**Opening Scene:** Nadia opens GitHub on Monday morning and sees a new tab — Zenhub. She's been told that all contributions now go through a sprint process. She checks the Zenhub board and sees the current sprint's issues organized into pipelines: Sprint Backlog, In Progress, In Review, Done. She finds three issues assigned to her, each with story points already estimated during the planning session she attended last Friday. One is a 5-point API endpoint, one is a 3-point bug fix, and one is a 2-point code review task.

**Rising Action:** During the sprint, Nadia moves her issues through the pipelines as she works. When she creates a branch for the API endpoint, Zenhub automatically links it to the issue. Her PR triggers the usual GitHub webhook — Edin captures the contribution. But now, her contribution is also tagged with sprint context: it's part of Sprint 3, estimated at 5 story points, and connected to an epic ("Zenhub Integration MVP"). She finishes the 5-pointer in 3 days and picks up a stretch goal from the backlog — a 3-pointer she'd been wanting to tackle.

**Climax:** At the end of the sprint, Nadia sees the sprint report in the Edin admin dashboard. Her velocity was 13 story points — the stretch goal pushed her above her committed 10 points. Her AI evaluation scores are enriched with planning context: she delivered 130% of committed story points, her estimation accuracy was within 20% (she'd estimated the API endpoint at 5 but it took closer to 4 points of effort), and her code quality scores remained high. She sees a new metric she's never had before: **planning reliability: 130% delivery, 80% estimation accuracy**. She realizes that the sprint process gave her work more visibility and more impact — she wasn't duplicating anyone else's effort, and her stretch goal was aligned with the roadmap.

**Resolution:** Nadia's combined evaluation — code quality + planning reliability + strategic alignment — produces a higher token reward than her pre-sprint contributions of similar quality. She sees the sprint as adding clarity, not overhead. In the next sprint planning session, she volunteers to estimate her own issues and suggests a task she spotted in the backlog.

---

### Journey 2: Omar, Financial Researcher — Non-Dev Sprint Contribution

Omar is a financial engineer who contributes research papers and tokenomics models to the Rose ecosystem. Before the Zenhub integration, he worked asynchronously — writing research documents in Google Docs, uploading deliverables, and waiting for AI evaluation. He sometimes felt disconnected from the development team and unsure whether his research was being used.

**Opening Scene:** Omar joins a sprint planning call for the first time. The project lead shows the Zenhub board, which now includes non-dev tasks alongside engineering work. Omar sees a research task: "Analyze scaling law parameters for reward distribution" — 8 story points, assigned to him. He also sees how his research connects to an epic: "Evaluation Engine Extension," which also includes dev tasks for integrating planning context into the AI evaluator. For the first time, he can see how his research directly feeds into engineering work.

**Rising Action:** During the sprint, Omar works on his research using his usual tools — Jupyter notebooks, LaTeX, Google Docs. When he uploads his deliverable to the shared repository, Edin's contribution ingestion captures it. The Zenhub issue is moved to "In Review" by the project lead. Another contributor — a developer building the evaluation engine — reviews Omar's scaling law parameters and leaves comments on the GitHub issue. This cross-domain collaboration shows up in both their activity feeds.

**Climax:** The sprint closes. Omar delivered his 8-point research task on time, plus a 3-point supplementary analysis he added mid-sprint (approved by the project lead as a scope addition). The sprint dashboard shows his velocity: 11 points delivered, 8 committed. His AI evaluation scores the research on completeness, rigor, and applicability. But now there's an added dimension: his work was **planned**, connected to an epic, and delivered within the sprint framework. The combined evaluation reflects both the quality of his research and its strategic fit.

**Resolution:** Omar feels more connected to the team. He can see the burndown chart and knows his work is part of a larger coordinated effort. In the next sprint planning, he proposes a new research task that builds on what he learned — and the project lead prioritizes it because it aligns with the next epic. Omar's token rewards reflect not just research quality, but planning reliability and cross-domain collaboration.

---

### Journey 3: Sana, Project Lead — Steering the Contributor Economy

Sana is the project lead for Edin's core platform. She manages a team of 12 contributors across four domains: dev, financial engineering, governance, and documentation. Before Zenhub, she coordinated work through ad-hoc Slack messages, GitHub issues without estimation, and weekly calls. She had no way to measure velocity, predict capacity, or see whether contributions were stacking synergistically.

**Opening Scene:** Sana opens the Zenhub board on Sunday evening to prepare for Monday's sprint planning. She reviews the backlog: 47 issues across all domains, each tagged with domain labels (`dev`, `research`, `governance`, `docs`). She drags 28 issues into the Sprint Backlog, balancing across domains. She assigns story points based on the team's emerging velocity data — after 3 sprints, she knows the team averages about 85 points per sprint.

**Rising Action:** During the sprint, Sana checks the burndown chart daily. By Wednesday, she notices the dev track is ahead of schedule but the research track is lagging — Omar's scaling law analysis is more complex than estimated. She uses the Zenhub board to reprioritize: she moves a lower-priority dev task out of the sprint and brings in a research support task (a developer helping Omar with data extraction). This real-time steering is something she couldn't do before — she can see cross-domain dependencies and adjust in real-time.

**Climax:** Sprint closes. Sana opens the Edin admin sprint dashboard. She sees: velocity of 82 points (97% of target), 3 scope changes mid-sprint, cycle time averaging 4.2 days per issue. The combined view shows AI evaluation scores alongside sprint metrics — she can see which contributors are delivering high-quality work on time and which are struggling with estimation. She generates the sprint report (Zenhub Pulse + Edin evaluation data) and shares it with the stakeholders. For the first time, she has **objective data** to support capacity decisions and contribution prioritization.

**Resolution:** In the retrospective, Sana uses the sprint data to identify that governance contributions consistently take 40% longer than estimated. She adjusts story point calibration for governance tasks in the next sprint. She also identifies that cross-domain collaboration (like the dev helping Omar) produced the highest-quality outcomes — and proposes more intentional cross-domain pairing in future sprints. The sprint orchestration model is working: she can steer the contributor economy with data, not intuition.

---

### Journey 4: Alex, Admin — Configuring and Troubleshooting the Integration

Alex is the platform administrator who manages Edin's infrastructure. He's responsible for setting up the Zenhub integration, monitoring sync health, and troubleshooting issues.

**Opening Scene:** Alex configures the Zenhub integration in the Edin admin panel. He enters the Zenhub API credentials, configures the webhook URL (`/api/v1/webhooks/zenhub`), and sets the polling interval to 15 minutes. He maps the Zenhub workspace to Edin's working groups and configures CASL permissions — project leads can view all sprint data, contributors can see their own metrics, and admins have full access.

**Rising Action:** Two weeks into the integration, Alex notices a gap in the sprint dashboard — a batch of pipeline transition events didn't sync. He checks the webhook logs in the admin panel and sees that Zenhub had a brief outage that morning, causing 12 webhook deliveries to fail. The system's retry mechanism caught 10 of them, but 2 were lost. Alex triggers a manual API poll to backfill the missing data. He also sets up a monitoring alert for webhook failure rates exceeding 1%.

**Climax:** A contributor reports that their Edin task status didn't update when they moved the corresponding Zenhub issue to "Done." Alex investigates in the admin panel and finds a sync conflict — the Zenhub issue was moved to Done, but the Edin task had been manually updated to IN_PROGRESS by another process. He resolves the conflict (Zenhub wins as source of truth for sprint data) and adds a log entry. He also identifies that the conflict resolution rule needs to be documented more clearly.

**Resolution:** Alex creates a monitoring dashboard showing webhook success rates, sync lag times, and conflict resolution events. The integration stabilizes at 99.9% sync reliability. He documents the troubleshooting procedures and conflict resolution rules for the team.

### Journey Requirements Summary

| Journey             | Key Capabilities Revealed                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nadia (Developer)   | Sprint board in GitHub, automatic PR-to-issue linking, contribution enrichment with sprint context, planning reliability metrics, combined evaluation scoring                                        |
| Omar (Researcher)   | Non-dev task story pointing, cross-domain epic visibility, research deliverable ingestion with sprint context, cross-domain collaboration tracking                                                   |
| Sana (Project Lead) | Sprint planning with cross-domain backlog, real-time burndown monitoring, mid-sprint reprioritization, velocity analytics, combined sprint + evaluation reporting, sprint summaries for stakeholders |
| Alex (Admin)        | Integration configuration UI, webhook monitoring and logs, manual backfill triggers, sync conflict resolution, CASL permission management, monitoring alerts                                         |

## Domain-Specific Requirements

### Compliance & Regulatory

- **Token reward correlation:** Sprint planning data (story points, velocity, commitment ratio) will influence AI evaluation scores, which in turn affect token reward distribution. This creates a compliance consideration: the mapping from sprint metrics to reward adjustments must be transparent, auditable, and documented to avoid disputes or perceived unfairness — particularly given MiCA regulatory context for the token economy
- **Data retention:** Zenhub sprint data (velocity, burndown, pipeline transitions, story point history) must be retained according to the same data retention policies as existing contribution data — minimum 7 years for financial audit trail given the IOUR Foundation's non-profit structure
- **GDPR considerations:** Sprint metrics constitute contributor performance data. Contributors must be informed that planning reliability, estimation accuracy, and sprint velocity are tracked and used in evaluation. Consent must be explicit in the contributor onboarding/admission process
- **Audit trail:** All sync events between Zenhub and Edin (webhook receipts, API polls, task status changes, conflict resolutions) must be logged with timestamps and actor identifiers for auditability

### Technical Constraints

- **API credential security:** Zenhub API tokens and webhook secrets must be stored as encrypted environment variables, never in client-side code or version control. Same pattern as existing GitHub OAuth credentials
- **Webhook signature verification:** Zenhub webhook payloads must be verified using HMAC signatures before processing, preventing spoofed events from manipulating sprint data (and therefore evaluation scores and token rewards)
- **Rate limiting:** Zenhub GraphQL API has rate limits. The polling service must implement exponential backoff and respect rate limit headers to avoid service disruption
- **Data isolation:** Sprint data follows the same multi-tenancy and CASL permission model as existing contribution data. Contributors cannot access other contributors' sprint metrics unless explicitly permitted by role

### Integration Requirements

- **Zenhub GraphQL API:** Primary data source for sprint, velocity, epic, and issue data. Requires API key authentication. Must handle API versioning and deprecation gracefully
- **Zenhub Webhooks:** Real-time event stream for pipeline transitions, estimate changes, and sprint lifecycle events. Requires webhook endpoint registration and secret management
- **Existing GitHub webhook pipeline:** Must not be disrupted. Zenhub data enriches existing contributions but does not replace or modify the GitHub ingestion flow
- **Existing evaluation engine:** Planning context is additive — it enriches evaluation prompts but does not change existing evaluation dimensions (code quality, impact, collaboration). The evaluation engine must remain functional if Zenhub data is temporarily unavailable (graceful degradation)

### Risk Mitigations

| Risk                                              | Impact                                                                                                | Mitigation                                                                                                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zenhub API outage or deprecation                  | Sprint data stops flowing; evaluation loses planning context                                          | Graceful degradation — evaluation engine falls back to contribution-only scoring; cached sprint data serves dashboard; alert triggers manual review                                            |
| Sync conflict between Zenhub and Edin task status | Contributor sees inconsistent status; evaluation may use stale data                                   | Zenhub is source of truth for sprint data; conflict resolution logged and surfaced to admin; manual override available                                                                         |
| Story point gaming                                | Contributors inflate or deflate estimates to manipulate planning reliability scores                   | AI evaluation cross-references story points with actual contribution complexity; outlier detection flags suspicious estimation patterns; project leads review estimates during sprint planning |
| Non-dev story pointing feels arbitrary            | Research, governance, and documentation tasks are harder to estimate; frustration undermines adoption | Establish domain-specific estimation guides; calibrate story points separately per domain; use relative estimation within domain rather than cross-domain comparison                           |
| Contributor resistance to sprint process          | Contributors perceive sprint as bureaucracy rather than value; adoption drops                         | Phase rollout with opt-in period; demonstrate value through improved coordination and reward fairness; gather contributor feedback after each sprint; adjust process based on input            |
| Webhook secret compromise                         | Attacker sends spoofed events that manipulate sprint data and evaluations                             | HMAC signature verification on all webhooks; IP allowlisting if Zenhub supports it; monitoring for anomalous event patterns; webhook secret rotation procedure                                 |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Contribution Orchestration as a Reward Input**

Existing contributor platforms (Gitcoin, Coordinape, SourceCred, Colony) evaluate contributions retroactively — after work is done. Edin's Zenhub integration introduces a fundamentally different model: **planning reliability, estimation accuracy, and strategic alignment become first-class inputs to the evaluation and reward system**. This means the act of planning well — estimating accurately, committing realistically, delivering on time — is itself a valued contribution.

No competitor combines sprint management data with AI-powered evaluation to produce a holistic contributor score. This is a novel fusion of agile project management methodology with blockchain-based incentive design.

**2. Cross-Domain Sprint Management for Non-Code Contributions**

Sprint/scrum methodologies are well-established for software development but rarely applied to research, governance, documentation, or financial engineering work. Edin's approach of story-pointing all contribution types and tracking them through the same sprint framework is unconventional. The innovation is not in sprints themselves, but in applying sprint discipline to a multi-domain contributor ecosystem where most work is not code.

**3. AI Evaluation Enriched with Planning Context**

Edin's evaluation engine already uses AI (Anthropic Claude) to assess contribution quality. The innovation here is enriching evaluation prompts with planning metadata — story points, sprint velocity, commitment ratio, cycle time — so the AI can assess not just "was this good work?" but "was this the right work at the right time, delivered as promised?" This creates an evaluation dimension that no existing platform offers.

### Market Context & Competitive Landscape

| Platform          | Evaluation Model                                                | Planning Integration                       | Reward Model                      |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------ | --------------------------------- |
| **Gitcoin**       | Community voting (subjective)                                   | None                                       | Grant rounds, bounties            |
| **Coordinape**    | Peer circles (subjective)                                       | None                                       | Epoch-based allocation            |
| **SourceCred**    | Graph algorithm (automated)                                     | None                                       | Continuous token flow             |
| **Colony**        | Reputation staking (semi-automated)                             | Task-based only                            | Reputation-weighted               |
| **Edin + Zenhub** | AI evaluation + planning context (automated, multi-dimensional) | Full sprint integration across all domains | Multi-temporal scaling-law tokens |

The strategic white space remains unoccupied: **no platform combines AI evaluation, sprint planning data, and multi-temporal blockchain rewards**.

### Validation Approach

1. **Sprint adoption validation** (Month 1-2): Do contributors and project leads adopt the sprint process? Is story pointing non-dev work feasible? Metric: 100% contributor participation by Sprint 3
2. **Planning context value validation** (Month 3-4): Does enriching AI evaluation with sprint data produce meaningfully different (and fairer) evaluation scores? Metric: >70% of contributors report that combined scores feel more accurate than contribution-only scores
3. **Orchestration ROI validation** (Month 4-6): Does sprint coordination reduce wasted contributions and improve delivery predictability? Metric: >75% planned vs delivered SP ratio; measurable reduction in duplicate/mistimed contributions
4. **Reward fairness validation** (Month 6+): Do token rewards correlate with both contribution quality and planning reliability? Metric: contributor satisfaction with reward allocation equal or higher than pre-integration baseline

### Risk Mitigation

| Innovation Risk                                                                | Fallback                                                                                                                                                               |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Story pointing non-dev work proves impractical                                 | Fall back to binary tracking (done/not done) for non-dev tasks while keeping sprint structure; use time-based estimation instead of abstract story points              |
| Planning reliability penalizes contributors unfairly (e.g., external blockers) | Weight planning reliability as a minor evaluation dimension initially; allow project leads to flag external blockers that exclude affected sprint data from evaluation |
| AI evaluation with planning context produces worse results than without        | A/B test evaluation with and without planning context; keep contribution-only evaluation as baseline; only promote planning-enriched evaluation when validated         |
| Contributors game story points to inflate planning reliability                 | Cross-reference story points with AI-assessed contribution complexity; flag outliers; project lead review during sprint planning serves as human check                 |

## Web Application Specific Requirements

### Project-Type Overview

This is a feature extension to an existing Next.js 16 / NestJS 11 web application. The existing application already defines browser support, responsive design, performance targets, and accessibility standards (documented in the core Edin PRD). This section covers requirements specific to the Zenhub integration features — the new admin dashboard pages, webhook endpoints, and API polling infrastructure.

### Technical Architecture Considerations

**Frontend (Next.js 16 — apps/web):**

- **Sprint dashboard pages:** New admin routes under `/admin/sprints` for velocity charts, burndown, sprint history, and combined effort views. Uses existing Recharts library and admin layout patterns
- **Real-time updates:** Sprint dashboard should reflect near-real-time data. Existing patterns use server-side rendering with periodic client-side refresh. Consider WebSocket or polling for burndown chart updates during active sprints
- **Responsive design:** Sprint dashboard must be usable on tablet and desktop (project leads may check burndown on mobile). Follow existing responsive patterns from the admin dashboard
- **SEO:** Not applicable — sprint dashboard is behind authentication, admin-only

**Backend (NestJS 11 — apps/api):**

- **Webhook endpoint:** `/api/v1/webhooks/zenhub` — new NestJS controller following existing GitHub webhook handler patterns. Must handle HMAC signature verification, event type routing, and idempotent event processing
- **API polling service:** BullMQ scheduled job querying Zenhub GraphQL API. Must respect rate limits, handle pagination for historical data, and support configurable polling intervals
- **Data layer:** New Prisma models (`SprintMetric`, `ZenhubSync`, sprint-related fields on existing `Contribution` model). Migrations must be backward-compatible with existing schema
- **CASL permissions:** New permission subjects for sprint data (SprintMetric, SprintDashboard) with role-based access (admin: full, project_lead: read all, contributor: read own)

### Browser & Performance Requirements

- **Browser support:** Inherits from existing Edin platform (modern browsers: Chrome, Firefox, Safari, Edge — latest 2 versions)
- **Performance targets:**
  - Sprint dashboard initial load: <2s for up to 12 months of historical data
  - Burndown chart render: <500ms for single sprint view
  - Velocity chart render: <1s for 12-sprint history
  - Webhook processing latency: <5s from event receipt to database write
  - API polling cycle: completes within 60s per poll interval

### Accessibility

- Sprint dashboard follows existing Edin accessibility patterns (WCAG 2.1 AA)
- Charts (Recharts) must include accessible alternatives: data tables behind chart views, proper ARIA labels, keyboard navigation for interactive elements
- Sprint status indicators must not rely on color alone (use icons/text alongside color)

### Implementation Considerations

- **Existing patterns to follow:** The GitHub webhook handler (`apps/api/src/modules/github/`) provides the exact template for the Zenhub webhook receiver. Follow the same controller/service/processor pattern
- **Existing job queue patterns:** BullMQ jobs for GitHub contribution ingestion provide the template for Zenhub API polling jobs. Follow the same queue/processor/scheduler pattern
- **Admin dashboard patterns:** Existing admin pages (contribution reports, user management) provide layout and component patterns for the sprint dashboard
- **Testing approach:** Follow existing patterns — unit tests for services, integration tests for webhook processing, E2E tests for admin dashboard flows

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP — establish the data pipeline (Zenhub → Edin) and prove that sprint data enriches contributor evaluation. The MVP validates two hypotheses: (1) that contributors adopt sprint-based coordination, and (2) that sprint context produces meaningfully better evaluation scores.

**Resource Requirements:** 1 full-stack developer (NestJS + Next.js), familiar with existing Edin codebase. Estimated 2-3 weeks of development effort. No additional infrastructure — uses existing PostgreSQL, Redis, BullMQ stack.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- Nadia (Developer): Contributions enriched with sprint context, planning metrics visible
- Sana (Project Lead): Sprint dashboard with velocity/burndown, cross-domain sprint view
- Alex (Admin): Integration configuration, webhook monitoring

**Must-Have Capabilities:**

| Capability                       | Justification                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Zenhub webhook receiver          | Foundation — without event ingestion, no sprint data flows into Edin                 |
| Zenhub API polling service       | Complements webhooks — pulls sprint/velocity aggregates that webhooks don't provide  |
| SprintMetric Prisma model        | Data storage — all downstream features depend on persisted sprint data               |
| Contribution enrichment          | Core value — links existing contributions to sprint context (story points, pipeline) |
| Admin sprint dashboard           | Visibility — project leads need velocity/burndown to steer sprints                   |
| CASL permissions for sprint data | Security — sprint data must follow existing role-based access patterns               |
| Webhook monitoring & logs        | Operability — admin needs visibility into sync health from day one                   |

**Explicitly NOT in MVP:**

- Bidirectional task sync (Zenhub ↔ Edin tasks) — contributors use Zenhub directly for now
- Evaluation engine extension — AI evaluation continues without planning context until validated
- Combined effort dashboards — velocity and evaluation scores viewed separately initially
- Activity feed integration — sprint events not yet in the activity stream
- Notification integration — no sprint-specific alerts

### Post-MVP Features

**Phase 2 — Integration Depth (Month 3-4):**

| Feature                     | Dependency                  | Value                                                                   |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| Zenhub-Edin task sync       | MVP data pipeline stable    | Contributors see sprint tasks in Edin; ecosystem tasks flow into Zenhub |
| Evaluation engine extension | Task sync + validation data | AI evaluation enriched with planning reliability, estimation accuracy   |
| Combined effort dashboards  | Evaluation extension        | Single view: quality scores + sprint metrics per contributor            |
| Activity feed integration   | MVP event processing        | Sprint events visible in existing activity stream                       |
| Notification integration    | MVP event processing        | Sprint alerts via existing notification system                          |

**Phase 3 — Orchestration Maturity (Month 5+):**

| Feature                                  | Dependency                     | Value                                                  |
| ---------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| Contributor self-service sprint planning | Task sync                      | Contributors propose tasks for upcoming sprints        |
| Cross-sprint analytics                   | 4+ sprints of historical data  | Long-term velocity trends, growth trajectories         |
| Reward system integration                | Evaluation extension validated | Planning reliability directly influences token rewards |
| Contributor feedback loop                | 3+ sprints completed           | Post-sprint surveys feeding process improvement        |
| Domain-specific estimation guides        | Cross-sprint analytics         | Calibrated story pointing per contribution domain      |

### Risk Mitigation Strategy

**Technical Risks:**

- Most technically challenging: bidirectional task sync with conflict resolution (Phase 2, not MVP)
- MVP simplification: one-way data flow (Zenhub → Edin) avoids sync complexity entirely
- Riskiest assumption: Zenhub API stability and webhook reliability — mitigated by API polling as fallback

**Market Risks:**

- Biggest risk: contributors reject the sprint process as overhead
- MVP addresses this: sprint dashboard demonstrates coordination value before evaluation is affected
- Learning needed: does story pointing non-dev work feel natural? Validated by Phase 1 adoption metrics

**Resource Risks:**

- Minimum viable team: 1 developer for MVP (existing codebase knowledge required)
- Smaller feature set option: webhook receiver + sprint dashboard only (no contribution enrichment) — still proves data pipeline
- External dependency: Zenhub pricing and API availability — no lock-in; sprint data is mirrored in Edin's database

## Functional Requirements

### Zenhub Data Ingestion

- **FR1:** System can receive and process Zenhub webhook events (issue moved, sprint started, sprint ended, estimate changed) in real-time
- **FR2:** System can verify Zenhub webhook payload signatures (HMAC) before processing events
- **FR3:** System can process webhook events idempotently (duplicate events do not create duplicate data)
- **FR4:** System can poll the Zenhub GraphQL API on a configurable schedule to retrieve sprint, velocity, epic, and issue data
- **FR5:** System can handle Zenhub API rate limits without failing silently or losing data
- **FR6:** System can paginate through historical Zenhub data during initial setup or backfill operations
- **FR7:** Admin can trigger a manual API poll to backfill missing data after outages

### Sprint Metrics & Storage

- **FR8:** System can store sprint metrics (velocity, burndown data, cycle time, lead time) in the database
- **FR9:** System can calculate sprint velocity (total story points delivered per sprint)
- **FR10:** System can calculate burndown data (remaining story points over time within a sprint)
- **FR11:** System can calculate cycle time (time from "In Progress" to "Done" per issue)
- **FR12:** System can calculate lead time (time from issue creation to completion)
- **FR13:** System can track scope changes within a sprint (issues added or removed mid-sprint)
- **FR14:** System can track estimation accuracy (planned vs delivered story points per contributor and per sprint)
- **FR15:** System can store pipeline transition history for each issue (timestamps of status changes)

### Contribution Enrichment

- **FR16:** System can link existing GitHub contributions (commits, PRs, code reviews) to their corresponding Zenhub sprint context (sprint ID, story points, epic)
- **FR17:** System can associate story points with contributions of all types (dev, research, governance, documentation, finance)
- **FR18:** System can calculate planning reliability metrics per contributor (delivery ratio, estimation accuracy)
- **FR19:** System can identify and record cross-domain collaboration events (contributors from different domains working on the same epic or sprint)

### Sprint Dashboard

- **FR20:** Project leads can view a velocity chart showing story points delivered across up to 12 sprints
- **FR21:** Project leads can view a burndown chart for the current and historical sprints
- **FR22:** Project leads can view cycle time and lead time metrics per sprint
- **FR23:** Project leads can view scope change history within a sprint
- **FR24:** Project leads can view estimation accuracy trends (planned vs delivered) per contributor
- **FR25:** Project leads can view sprint data filtered by contribution domain (dev, research, governance, docs)
- **FR26:** Project leads can view a combined view showing sprint metrics alongside AI evaluation scores per contributor
- **FR27:** Project leads can export sprint reports (velocity, burndown, contributor metrics) for stakeholder sharing
- **FR28:** Contributors can view their own sprint metrics (personal velocity, estimation accuracy, planning reliability)

### Integration Configuration

- **FR29:** Admin can configure Zenhub API credentials (API key) in the admin panel
- **FR30:** Admin can configure the Zenhub webhook URL and secret
- **FR31:** Admin can set the API polling interval (default: 15 minutes)
- **FR32:** Admin can map a Zenhub workspace to Edin's working groups
- **FR33:** Admin can view webhook delivery logs (success, failure, retry status, timestamps)
- **FR34:** Admin can view API polling logs (success, failure, data volume, timestamps)
- **FR35:** Admin can configure monitoring alerts for webhook failure rates exceeding a threshold
- **FR36:** Admin can view sync conflict events and their resolution outcomes

### Permissions & Access Control

- **FR37:** System can enforce role-based access to sprint data: admins have full access, project leads can view all sprint data, contributors can view their own metrics
- **FR38:** System can extend existing role-based permission definitions with new sprint-related subjects (SprintMetric, SprintDashboard)
- **FR39:** System can restrict sprint configuration actions to admin role only

### Task Sync (Phase 2)

- **FR40:** System can automatically create Edin tasks from Zenhub issues labeled with a configurable tag (e.g., `contributor-task`) [Phase 2]
- **FR41:** System can sync status changes from Zenhub pipeline transitions to Edin task statuses (mapping: Backlog→AVAILABLE, In Progress→IN_PROGRESS, Done→COMPLETED) [Phase 2]
- **FR42:** System can sync story point estimates from Zenhub issues to linked Edin tasks [Phase 2]
- **FR43:** System can resolve sync conflicts between Zenhub and Edin task status using Zenhub as source of truth for sprint data [Phase 2]
- **FR44:** Admin can view and manually resolve sync conflicts that require human judgment [Phase 2]

### Evaluation Engine Extension (Phase 2)

- **FR45:** System can include planning context (story points, sprint velocity, estimation accuracy, commitment ratio) in AI evaluation prompts [Phase 2]
- **FR46:** System can generate a planning reliability score per contributor based on sprint data [Phase 2]
- **FR47:** System can produce combined evaluation scores that incorporate both contribution quality and planning reliability [Phase 2]
- **FR48:** System can operate evaluation without planning context if Zenhub data is temporarily unavailable (graceful degradation) [Phase 2]

### Activity & Notifications (Phase 2)

- **FR49:** System can publish sprint lifecycle events (sprint started, sprint completed, velocity milestone) to the existing activity feed [Phase 2]
- **FR50:** System can send sprint-related notifications (approaching deadline, velocity drop, scope change) through the existing notification system [Phase 2]

### Audit & Compliance

- **FR51:** System can log all sync events (webhook receipts, API polls, task status changes, conflict resolutions) with timestamps and actor identifiers
- **FR52:** System can retain Zenhub sprint data according to the platform's data retention policy (minimum 7 years)
- **FR53:** System can provide an audit trail of how sprint data influenced evaluation scores [Phase 2]

## Non-Functional Requirements

### Performance

- **NFR-P1:** Webhook endpoint responds with HTTP 200 acknowledgment within 500ms of receiving a Zenhub event; processing may continue asynchronously
- **NFR-P2:** Sprint dashboard pages load within 2s for up to 12 months of historical sprint data (up to 26 sprints at 2-week cadence)
- **NFR-P3:** Burndown chart renders within 500ms for a single sprint view
- **NFR-P4:** Velocity chart renders within 1s for 12-sprint historical view
- **NFR-P5:** API polling cycle completes within 60s per scheduled run, including pagination of up to 100 issues per sprint
- **NFR-P6:** Contribution enrichment (linking contributions to sprint context) completes within 30s per sprint close event
- **NFR-P7:** Sprint metric calculations (velocity, cycle time, estimation accuracy) execute in <5s per sprint

### Security

- **NFR-S1:** Zenhub API tokens are stored as encrypted environment variables, never in client-side code, logs, or version control
- **NFR-S2:** Zenhub webhook payloads are verified via HMAC signature before processing; unsigned or invalid payloads are rejected with HTTP 401 and logged
- **NFR-S3:** All sprint data API endpoints require authentication and enforce role-based permission checks
- **NFR-S4:** Sprint data is encrypted at rest (database) and in transit (TLS) following existing platform encryption standards
- **NFR-S5:** Webhook secrets support rotation without downtime (dual-secret verification during transition period)
- **NFR-S6:** Admin actions on integration configuration (credential changes, polling interval) are audit-logged with actor and timestamp

### Scalability

- **NFR-SC1:** Webhook receiver handles burst events of up to 100 events/minute during sprint close or bulk pipeline transitions without dropping events
- **NFR-SC2:** Sprint metrics storage supports up to 100 concurrent contributors across 52 sprints/year (2-week cadence) without query degradation
- **NFR-SC3:** API polling service scales to up to 5 Zenhub workspaces if the project expands beyond a single workspace
- **NFR-SC4:** Dashboard queries remain performant with up to 5 years of historical sprint data through appropriate indexing and pagination

### Reliability

- **NFR-R1:** Webhook processing achieves 99.9% success rate (measured monthly); failed webhooks are retried up to 3 times (1m/5m/15m intervals)
- **NFR-R2:** API polling service recovers automatically from transient Zenhub API failures without manual intervention
- **NFR-R3:** If Zenhub is unreachable for >1 hour, the system sends an alert to admin and continues serving cached sprint data on dashboards
- **NFR-R4:** Sprint metric calculations are idempotent — re-running a calculation produces the same result without data duplication
- **NFR-R5:** Evaluation engine continues to function without planning context if Zenhub data is unavailable (graceful degradation, not failure)

### Accessibility

- **NFR-A1:** Sprint dashboard pages comply with WCAG 2.1 AA, consistent with existing Edin platform accessibility standards
- **NFR-A2:** All chart visualizations include accessible data table alternatives and proper ARIA labels
- **NFR-A3:** Sprint status indicators use text/icons alongside color to convey state (not color-only)
- **NFR-A4:** Dashboard navigation supports full keyboard accessibility

### Integration

- **NFR-I1:** Zenhub integration handles Zenhub API versioning gracefully — breaking API changes are detected and logged, with the system falling back to cached data rather than failing
- **NFR-I2:** Integration does not degrade existing GitHub webhook processing performance (GitHub contribution ingestion latency remains unchanged)
- **NFR-I3:** Sprint data is stored in Edin's database as a first-class data model — if Zenhub is discontinued, historical sprint data remains accessible and queryable
- **NFR-I4:** Integration supports configurable webhook event filtering — admin can enable/disable specific event types without code changes

### Observability

- **NFR-O1:** All webhook receipts, API polls, and sync operations emit structured log entries (JSON) with correlation IDs for end-to-end tracing
- **NFR-O2:** Key operational metrics (webhook success rate, polling duration, sync lag, queue depth) are exposed for monitoring
- **NFR-O3:** Admin dashboard includes an integration health panel showing real-time sync status, last successful poll, and alert history
