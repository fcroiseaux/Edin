# Edin Platform — Release Notes

**Version:** March 2026
**Date:** 2026-03-27

## Overview

This release completes the full Edin platform build-out: 10 core epics, 7 ZenHub integration epics, and 5 Newspaper & Positive Incentives epics — all delivered. Major highlights include the ROSE design system, a complete prize framework with community nominations, a contributor newspaper powered by an intrinsic time engine, and full ZenHub sprint integration.

---

## New Features

### ROSE Design System (Epic 0)

A complete design token system aligned with the ROSE brand identity.

- **Design tokens** — color palette, typography scale, spacing, radius, and shadow tokens in CSS custom properties
- **ABC Normal font** — integrated across all weight variants (Light through Super)
- **UI primitives** — Button, Badge, Card, Input, and other base components themed with ROSE tokens
- **Radix UI wrappers** — Dialog, Dropdown, Tooltip, and Tabs wrapped with ROSE theming
- **Dashboard shell** — sidebar navigation with collapsible sections
- **Reading canvas** — public portal layout for content display

### Prize Framework & Automated Awards (np-Epic 1)

Domain-agnostic prize infrastructure with automated detection.

- **Channels & prize categories** — configurable channels (domain, working group, cross-domain, custom) and prize categories with threshold/scaling JSON configs
- **Meaningful event tracking** — detects cross-domain collaborations and high-significance contributions automatically
- **Cross-domain collaboration prizes** — awarded when a contribution spans multiple domains
- **Breakthrough prizes** — awarded for contributions exceeding the 95th percentile in their domain
- **Prize dashboard** — admin overview of awards by category, channel, and time period; contributor view of personal awards

### Community Recognition & Peer Nominations (np-Epic 2)

Contributor-driven recognition with Chatham House anonymity.

- **Peer nominations** — contributors nominate peers for community-nominated prize categories with rationale, 30-day cooldown and expiry
- **Nomination voting** — authenticated vote casting with duplicate prevention; vote counts visible without revealing voter identity
- **Vote-threshold triggers** — when a nomination reaches the configured threshold, a prize is automatically awarded with Chatham House labeling

### Track Record Evaluation Stream (np-Epic 3)

Long-term contributor achievement tracking independent of per-contribution evaluation.

- **Track record data model** — dedicated schema with milestone thresholds configurable per domain
- **Discrete milestone detection** — batch processor scans contributors for threshold crossings (e.g., 10th contribution, 50th review)
- **Track record outcomes** — granted outcomes visible on contributor profiles with achievement history

### Contributor Newspaper (np-Epic 4)

An event-driven internal newspaper with intrinsic time.

- **Newspaper editions & items** — editions aggregate platform events over variable time spans; items carry headlines, bodies, and significance scores
- **Intrinsic time engine** — editions are generated based on event density rather than calendar time; quiet periods produce fewer editions
- **Chatham House attribution** — all newspaper items use anonymized attribution labels
- **Newspaper landing page** — public-facing layout with edition listing, item cards, and significance indicators
- **Reference scale indicator** — contextualizes each edition's activity level (high / normal / low) relative to historical density
- **Significance ranking & channel filtering** — items sorted by significance; filterable by channel
- **Edition navigation** — browse between editions with previous/next controls

### Newspaper Editorial Curation & Community Engagement (np-Epic 5)

Editorial oversight and community participation on newspaper content.

- **Editorial curation** — editors can override item rankings within editions; audit trail tracks all editorial changes
- **Community voting** — authenticated contributors vote on newspaper items; vote counts update in real time via SSE

### ZenHub Integration (zh-Epics 1–7)

Full bidirectional integration with ZenHub for sprint management.

- **Webhook receiver** — HMAC-verified ingestion of ZenHub events
- **API polling service** — scheduled polling for data not covered by webhooks
- **Manual backfill** — one-time historical data import
- **Sprint metrics** — velocity, burndown, scope change, and estimation accuracy tracking
- **Sprint dashboard** — views for velocity charts, burndown, and domain filtering
- **Combined evaluation** — sprint context injected into AI evaluation prompts; planning reliability factored into scores
- **Bidirectional task sync** — auto-create Edin tasks from ZenHub issues; sync status and story points
- **Sync conflict resolution** — detect and resolve conflicts when both systems are updated concurrently
- **Sprint activity & notifications** — sprint events appear in the activity feed; contributors receive sprint-related notifications
- **Monitoring** — webhook/polling log viewer and sync conflict alert dashboard

### Publication Platform Enhancements

- **File upload import** — create articles from `.md`, `.txt`, or `.docx` files
- **Article editor toolbar** — formatting toolbar with save-draft button and word count
- **Draft management** — delete draft articles with confirmation dialog

### Admin & UI Improvements

- **Admin sidebar navigation** — redesigned as a left sidebar with dynamic dashboard overview sections
- **Evaluation model registry** — uses real Anthropic API models; admin form to register new models
- **GitHub repository management** — admin form to add monitored repositories
- **ROSE branding** — logo, favicon, and homepage aligned with ROSE identity and whitepaper content
