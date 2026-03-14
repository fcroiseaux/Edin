# Zenhub + Edin Integration Proposal

**Date:** 2026-03-13
**Updated:** 2026-03-14 — Incorporated stakeholder feedback: all contributions (not just dev) to be tracked through sprint/scrum process
**Purpose:** Describe how Zenhub and Edin can be integrated and used together to organize team tasks and measure effort
**Status:** Approved direction — all contributions through scrum, with contributor input on long-term model

---

## Context

Edin is a curated contributor platform for the Rose decentralized finance ecosystem, built with Next.js 16, NestJS 11, PostgreSQL, and Redis. It already integrates with GitHub for authentication (OAuth) and contribution ingestion (webhooks tracking commits, PRs, code reviews). Edin has its own task management system, working groups, activity feeds, and an AI-powered evaluation engine.

The proposal is to add **Zenhub** to organize **all contributions** — both platform development and contributor ecosystem work — through a unified sprint/scrum process. This gives full visibility into everything happening across the project. This document outlines three integration layers and the day-to-day workflows.

---

## Layer 1: Zenhub as the Development Management Tool

This is the immediate, zero-code integration — using Zenhub to manage how we **build** Edin and track **all contributor activity** across the ecosystem.

### What Zenhub Provides (That We Don't Have Today)

| Capability            | Current State   | With Zenhub                                            |
| --------------------- | --------------- | ------------------------------------------------------ |
| Sprint planning       | Manual / ad-hoc | Structured sprints with start/end dates, story points  |
| Velocity tracking     | None            | Automatic velocity calculation across sprints          |
| Burndown charts       | None            | Real-time sprint burndown visible inside GitHub        |
| Effort estimation     | None            | Story point estimation with historical calibration     |
| Cross-repo visibility | Fragmented      | Multi-repo workspace (api, web, packages in one board) |
| Roadmap               | Documents only  | Visual timeline linked to epics and milestones         |
| AI sprint summaries   | None            | GPT-powered Pulse auto-generates sprint reports        |

### How It Works Day-to-Day

**For Developers:**

1. Open GitHub as usual — Zenhub appears as a new tab in each repository
2. Issues on the Zenhub board are organized into pipelines: Backlog → Sprint Backlog → In Progress → In Review → Done
3. When you create a branch, open a PR, or merge code, Zenhub automatically updates the linked issue
4. No context switching — everything stays in GitHub

**For Project Leads / Scrum Masters:**

1. Plan sprints by dragging issues into the Sprint Backlog and assigning story points
2. Monitor burndown charts during the sprint to see if the team is on track
3. Review velocity reports after each sprint to calibrate future planning
4. Use roadmaps to map epics against quarterly goals
5. Share AI-generated sprint summaries with stakeholders

**For Organization / Management:**

1. View cross-team progress via Zenhub roadmaps
2. Track cumulative flow and cycle time to identify bottlenecks
3. Use velocity data to make informed capacity decisions
4. Compare planned vs delivered story points to assess estimation accuracy

### Setup for the Edin Monorepo

Zenhub supports multi-repo workspaces, which maps perfectly to Edin's structure:

```
Zenhub Workspace: "Edin Platform"
├── Repository: apps/api (NestJS backend)
├── Repository: apps/web (Next.js frontend)
├── Repository: packages/* (shared packages)
└── Single unified board with all issues
```

Epics can span repositories — for example, an epic "Publication Platform V2" would include backend API issues, frontend component issues, and shared type updates, all visible on one board with one burndown.

---

## Layer 2: Technical Integration — Connecting Zenhub Data to Edin

This is a **priority integration** — pulling Zenhub data **into** Edin's existing systems to create a unified contributor effort picture. Since all contributions will flow through the sprint process, this layer is essential (not optional) for the full vision.

### Why This Matters

Edin already tracks **contributions** (commits, PRs, code reviews) via GitHub webhooks and evaluates them with AI. But contributions alone don't tell the full story of effort. Zenhub adds the **planning dimension**: what was planned, what was estimated, what was delivered, and how efficiently.

Combining both creates a complete effort measurement:

```
┌─────────────────────────────────────────────────────────┐
│                  EDIN EFFORT MODEL                       │
│                                                          │
│  GitHub Contributions    +    Zenhub Sprint Data         │
│  (what was produced)          (what was planned)         │
│                                                          │
│  - Commits               - Story points estimated        │
│  - Pull Requests         - Story points delivered         │
│  - Code Reviews          - Sprint velocity               │
│  - Documentation         - Cycle time per issue          │
│                          - Pipeline transitions           │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│                    ↓                                     │
│          AI Evaluation Engine                            │
│    (enriched with planning context)                      │
│                    ↓                                     │
│          Contributor Scores & Rewards                    │
└─────────────────────────────────────────────────────────┘
```

### Integration Architecture

Edin's existing architecture already supports this pattern:

```
Zenhub GraphQL API                    Edin Platform
─────────────────                    ──────────────

POST /public/graphql  ◄──────────  NestJS Ingestion Module
  (issues, epics,                   (already handles GitHub
   sprints, velocity,                webhooks — extend to
   pipeline events)                  poll Zenhub API)
                                          │
Zenhub Webhooks  ─────────────────►  /api/v1/webhooks/zenhub
  (issue moved,                      (new endpoint, same
   sprint started/ended,              pattern as GitHub
   estimate changed)                  webhook receiver)
                                          │
                                          ▼
                                    PostgreSQL
                                    ┌─────────────────┐
                                    │ core.Contribution │ (existing)
                                    │ + sprint context  │ (new fields)
                                    │                   │
                                    │ core.SprintMetric │ (new table)
                                    │  - velocity       │
                                    │  - burndown data  │
                                    │  - cycle time     │
                                    └─────────────────┘
                                          │
                                          ▼
                                    Evaluation Engine
                                    (Anthropic Claude)
                                    - Existing: code quality, impact
                                    - New: planning accuracy,
                                      estimation reliability,
                                      sprint commitment ratio
```

### What Would Need to Be Built

| Component                   | Effort | Description                                                                                         |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| Zenhub webhook receiver     | Small  | New NestJS endpoint at `/api/v1/webhooks/zenhub`, same pattern as existing GitHub webhook handler   |
| Zenhub API polling service  | Small  | Scheduled job (BullMQ, already in stack) to pull sprint/velocity data via GraphQL                   |
| Sprint metrics table        | Small  | New Prisma model `SprintMetric` in the core schema                                                  |
| Contribution enrichment     | Medium | Link existing contributions to Zenhub sprint context (story points, pipeline history)               |
| Admin sprint dashboard      | Medium | New admin page showing velocity charts, burndown, sprint history (using Recharts, already in stack) |
| Evaluation engine extension | Medium | Extend AI evaluation prompts to consider planning context alongside code quality                    |

### What Already Exists and Can Be Reused

- **GitHub webhook infrastructure** — same pattern for Zenhub webhooks
- **BullMQ job queues** — for scheduled API polling
- **Recharts** — already used, perfect for velocity/burndown charts
- **Activity feed** — sprint events can flow into existing activity system
- **Notification system** — sprint alerts using existing notification types
- **CASL permissions** — access control for sprint data by role
- **Admin dashboard** — new sprint section alongside existing reports

---

## Layer 3: Mapping Zenhub to Edin's Existing Task System

Edin already has a task management system with statuses: AVAILABLE → CLAIMED → IN_PROGRESS → COMPLETED → EVALUATED. Since the decision is to track **all contributions** through the sprint process, Zenhub and Edin's task system need to work together.

### Approved Direction: Unified Sprint Tracking for All Contributions

All work — both platform development and contributor ecosystem tasks — flows through Zenhub's sprint process:

- **Development work** (engineering tasks, bugs, features, tech debt) — managed directly in Zenhub as GitHub issues
- **Contributor ecosystem work** (research, documentation, governance, finance) — represented in Zenhub for sprint tracking, with Edin's task system handling contributor-facing assignment and AI evaluation
- **Sync between systems**: Zenhub issues with specific labels (e.g., `contributor-task`) auto-create or link to Edin tasks; status changes in Zenhub pipeline sync to Edin task status; story points from Zenhub feed into Edin's effort metrics

This provides a **single sprint view** of everything happening across the project, while preserving Edin's contributor engagement and evaluation capabilities.

### Phased Approach

1. **Phase 1**: Use Zenhub for all sprint planning and tracking (zero-code, immediate)
2. **Phase 2**: Build the technical sync between Zenhub issues and Edin tasks (development effort)
3. **Long-term**: Gather contributor feedback on the unified model and adjust based on their input

---

## Proposed Workflow: Sprint Cycle with Zenhub + Edin

### Week 0 — Sprint Planning

1. **Zenhub**: Review backlog, estimate story points, pull issues into sprint
2. **Zenhub**: AI Pulse reviews previous sprint velocity to recommend capacity
3. **Edin Admin**: Include contributor ecosystem tasks in the sprint alongside development work

### Weeks 1-2 — Sprint Execution

1. **Developers**: Work from Zenhub board inside GitHub, move issues through pipelines
2. **Edin Ingestion**: GitHub webhooks capture contributions (commits, PRs) as they happen
3. **Zenhub**: Burndown chart updates in real-time, visible to all
4. **Daily standup**: Zenhub board as the single view of sprint progress

### End of Sprint — Review & Measurement

1. **Zenhub**: Sprint closes, velocity calculated automatically
2. **Zenhub Pulse**: AI generates sprint summary (accomplishments, blockers, patterns)
3. **Edin Evaluation**: AI evaluates contributions from the sprint (code quality, impact)
4. **Combined view**: Velocity (Zenhub) + evaluation scores (Edin) = complete effort picture
5. **Edin Rewards**: Contribution scores feed into reward calculations

### Retrospective

1. **Zenhub data**: Cycle time, blocked time, scope changes — objective metrics
2. **Edin data**: Evaluation scores, collaboration patterns, feedback
3. **Action items**: Created as new Zenhub issues, tracked in next sprint

---

## Effort Measurement: What We Can Track

### Development Effort (via Zenhub)

| Metric              | What It Tells Us                                     |
| ------------------- | ---------------------------------------------------- |
| Sprint velocity     | How much the team delivers per sprint (story points) |
| Velocity trend      | Is the team getting faster, slower, or stable?       |
| Burndown            | Are we on track mid-sprint?                          |
| Cycle time          | How long from "In Progress" to "Done"?               |
| Lead time           | How long from issue creation to completion?          |
| Scope changes       | How much work was added/removed mid-sprint?          |
| Estimation accuracy | Planned vs delivered story points                    |

### Contribution Quality (via Edin)

| Metric               | What It Tells Us                                          |
| -------------------- | --------------------------------------------------------- |
| AI evaluation score  | Quality of each contribution across 4 domains             |
| Collaboration index  | How well contributors work together (co-authors, reviews) |
| Task completion rate | What percentage of claimed tasks are completed?           |
| Publication output   | Articles written, editorial contributions                 |
| Peer feedback scores | How contributors rate each other's work                   |

### Combined Insights (Zenhub + Edin)

| Combined Metric      | Formula                                          |
| -------------------- | ------------------------------------------------ |
| Effort efficiency    | Evaluation score / story points consumed         |
| Quality velocity     | High-scoring contributions per sprint            |
| Planning reliability | Delivered SP / committed SP per contributor      |
| Engagement depth     | Active days + tasks claimed + articles + reviews |

---

## Cost & Timeline

### Immediate (Week 1) — Zero Cost

- Install Zenhub browser extension (free tier for small teams, $12.50/user/mo for Teams)
- Configure workspace for Edin monorepo
- Set up initial pipelines and epics
- Begin first sprint

### Short-Term (Month 2-3) — Development Effort

- Build Zenhub webhook receiver (1-2 days)
- Build API polling service for sprint data (1-2 days)
- Add sprint metrics to admin dashboard (3-5 days)
- Total: approximately 1-2 weeks of development

### Medium-Term (Month 4+) — Priority

- Build Zenhub ↔ Edin task sync for contributor ecosystem tasks
- Extend evaluation engine with planning context
- Build combined effort dashboards
- Gather contributor feedback on unified sprint model

---

## Resolved Decisions

| Question        | Decision                                                                     |
| --------------- | ---------------------------------------------------------------------------- |
| Scope           | All contributions tracked through scrum — both dev and contributor ecosystem |
| Long-term model | Contributors will be consulted on whether unified tracking works for them    |

## Open Questions

1. **Sprint cadence**: What sprint length makes sense — 1 week, 2 weeks?
2. **Story points**: Should we use Fibonacci (1, 2, 3, 5, 8, 13) or T-shirt sizing (S, M, L, XL)?
3. **Team scope**: Which team members would be on Zenhub? All contributors, or just the core development team?
4. **Evaluation integration**: Is enriching the AI evaluation with sprint planning data valuable, or is the reporting layer sufficient?
5. **Budget**: Is the $12.50/user/mo Teams tier acceptable, or should we start with the free tier?
6. **Timeline**: Should we start the Zenhub trial immediately, or wait for a specific milestone?

---

**Next step:** Create a PRD and architecture for the technical integration (Layer 2 + Layer 3 sync) using the BMAD workflow.
