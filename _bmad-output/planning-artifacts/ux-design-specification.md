---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-Edin-2026-02-27.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - docs/edin_platform_description.md
---

# UX Design Specification Edin

**Author:** Fabrice
**Date:** 2026-02-28

---

## Executive Summary

### Project Vision

Edin is an integration-first curated contributor platform for the Rose decentralized finance ecosystem, built within the IOUR Foundation (Belgian non-profit). The platform connects to contributors' existing tools (starting with GitHub in MVP), evaluates output through an AI-powered Evaluation Engine, and distributes rewards using a scaling-law methodology across multiple temporal horizons. The web application serves three distinct interface contexts — a public-facing portal (SEO-optimized, SSR), an authenticated contributor dashboard (real-time SPA), and an admin dashboard — unified under a hybrid SPA/SSR architecture.

The UX design must serve seven personas spanning four contribution domains (Technology, Fintech, Impact, Governance) with radically different mental models, while maintaining a coherent product identity. The platform's credibility rests on three pillars that are fundamentally UX challenges: AI evaluation must feel fair and transparent, the scaling-law reward model must be comprehensible to >80% of contributors, and non-code contributions must have genuinely equal visual and experiential weight.

### Target Users

**Primary Contributors (Authenticated Experience):**

- **Lena — Senior Developer (Technology):** Highly selective, craft-driven. Needs AI evaluation that distinguishes quality from quantity. Judges the platform by whether a thorough code review scores higher than a quick-fix PR. Tech-savvy, uses GitHub natively.
- **Amir — Financial Engineer (Fintech):** PhD-level quant, never used Git. Needs a clear non-code contribution path and a community that values financial engineering as structurally equal to code. In MVP, contributes via GitHub (docs/specs). Low familiarity with developer tooling.
- **Sofia — Impact Analyst (Impact):** Non-developer seeking structural influence. Will judge the platform in the first 5 minutes by whether Impact contributions have the same visibility as code. Moderate technical literacy.
- **Yuki — Governance Specialist (Governance):** Former lawyer, DAO expert. Demands credible progressive decentralization with published milestones. Highly critical, will scrutinize governance displays for substance vs. marketing.

**Secondary Users:**

- **Daniel — Applicant:** Mid-level contributor navigating the 72-Hour Ignition onboarding. First impression of the platform; the admission UX defines perceived quality.
- **Marie — Admin:** Community operations lead managing admission queues, feedback assignments, health metrics, and contributor management. Needs efficiency-first, data-dense interfaces.
- **Henrik — Investor:** Accesses public showcase for due diligence. Needs credibility signals in under 60 seconds: contributor roster quality, community metrics, AI evaluation evidence.

**Device & Context:** Contributors primarily use desktop for deep work but check dashboards, feedback, and the Activity Feed from mobile. Investor and applicant access is multi-device. Admin is desktop-optimized.

### Key Design Challenges

1. **Multi-audience coherence across 7 personas and 6 RBAC tiers.** Each persona has a different mental model, technical fluency, and success definition — yet the platform must feel like one product. The RBAC system (Public → Applicant → Contributor → Founding Contributor → Working Group Lead → Admin) creates layered experiences that must transition seamlessly.

2. **AI evaluation transparency and trust.** Contributors must perceive AI scoring as fair (target: >70% trust score). The UX must present evaluation breakdowns that are transparent without being overwhelming, and provide a frictionless flag/appeal flow for disputed scores. This is the platform's credibility core.

3. **Scaling-law reward comprehension.** Seven temporal horizons and power-law compounding must be communicated so that >80% of contributors can explain the model. The UX must translate mathematical complexity into intuitive visual storytelling — progressive disclosure from "here's your trajectory" to "here's the math."

4. **Non-code contribution equality as lived experience.** The Activity Feed, contribution menu, and evaluation displays must deliver genuinely equal visual prominence across all four domains (FR40). Sofia and Yuki will judge this instantly. Structural equality in the database must become experiential equality on screen.

5. **72-Hour Ignition onboarding compression.** The journey from admission to first meaningful contribution must complete within 72 hours for >80% of contributors. The UX must guide without rushing: buddy pairing, welcome call coordination, domain-matched first-task selection, and progress tracking.

6. **Asynchronous processing transparency.** GitHub ingestion (<15 min), AI evaluation (<30 min for code), and Activity Feed updates (<5s) operate on different timescales. The UX must manage the gap between action and feedback with progressive status indicators that build trust rather than anxiety.

### Design Opportunities

1. **Activity Feed as community heartbeat.** A real-time, multi-domain Contribution Wall can become Edin's signature UX element — showing the garden growing in real-time. Unlike GitHub's individual contribution graphs, this is communal and cross-domain, creating belonging and visibility for all contribution types.

2. **Reward trajectory visualization as retention engine.** The scaling-law compounding, visualized as an interactive "you are here → here's where sustained engagement takes you" curve, serves both comprehension (H3 validation) and retention. This can be a compelling, shareable moment.

3. **Curated admission as brand ritual.** The contribution-based application, personal welcome call, and buddy assignment can be designed as a premium experience that communicates selectivity and care — making each accepted contributor feel chosen. First impressions define retention.

4. **Progressive disclosure for domain-specific depth.** A clean primary experience with domain-specific depth available on demand serves all personas: Lena gets code metrics, Amir gets financial models, Sofia gets impact frameworks, Yuki gets governance details — without cluttering each other's views.

## Core User Experience

### Defining Experience

Edin's core user experience is the **evaluation feedback loop**: contribute in external tools → see your work ingested and evaluated → understand your impact → be motivated to contribute again. The defining interaction is not the contribution itself (which happens in GitHub and other tools), but the **return visit** — the moment a contributor opens their Edin dashboard and sees how their work was scored, where it appears on the Activity Feed, and how it advances their reward trajectory.

This feedback loop must feel fair, transparent, and motivating. If it does, contributors return. If it doesn't, they leave. Every UX decision flows from protecting the integrity of this loop.

**Core Loop by Persona:**

- **Lena (Developer):** Push code → see AI evaluation with quality-over-quantity scoring → see her review ranked above a trivial PR → feel validated → take on harder work
- **Amir (Financial Engineer):** Submit financial analysis via GitHub → see it evaluated with domain-appropriate criteria → see it on the Activity Feed alongside code → feel equal → deepen engagement
- **Sofia (Impact Analyst):** Submit impact framework → see peer feedback + emerging AI evaluation → see Impact contributions prominently displayed → feel structurally valued → propose larger initiatives
- **Yuki (Governance Specialist):** Review governance milestones → see credible decentralization progress → contribute governance proposals → see transparent decision trails → deepen trust
- **Daniel (Applicant):** Land on public portal → feel the community is real and selective → complete micro-task application → receive personal welcome → make first contribution within 72 hours
- **Marie (Admin):** Open admin dashboard → see community health at a glance → manage admission queue efficiently → assign feedback → monitor onboarding progress
- **Henrik (Investor):** Land on public showcase → see credible contributor roster in <30 seconds → review quality metrics and AI evaluation evidence → see real momentum → engage for deeper diligence

### Platform Strategy

**Primary Platform:** Web application with hybrid SPA/SSR architecture.

- **Public pages** (project showcase, Founding Circle, domain manifestos, contributor roster): Server-side rendered for SEO, fast initial load, and investor/applicant discovery. Optimized for sub-1.5s First Contentful Paint on 4G.
- **Authenticated dashboards** (contributor, admin): Single-page application for responsive, real-time interactions. Activity Feed updates via WebSocket/SSE. Time to Interactive <3s.
- **Mobile-responsive:** Contributors check evaluations, feedback, and the Activity Feed from mobile. Admin is desktop-optimized. Public pages render across all devices.
- **No native app required:** The web application covers all use cases. Mobile browser access is sufficient for the monitoring/checking pattern that contributors use on mobile.
- **No offline functionality:** All value comes from real-time evaluation data, live Activity Feed, and server-side AI processing. Offline adds complexity without user value.

### Effortless Interactions

**Zero-effort contribution ingestion:** Contributors push to GitHub — their work appears in Edin automatically. No manual submission, no copy-pasting, no second upload. The Integration Layer handles everything. If a contributor has to do anything to register their work in Edin, the UX has failed.

**One-glance evaluation comprehension:** The evaluation score is immediately visible with a clear quality indicator. One click reveals the full breakdown — criteria, scoring, and how it compares. No hunting, no jargon, no confusion about what "73/100" means.

**Instant task discovery:** The contribution menu surfaces domain-matched, skill-appropriate tasks immediately. Filtering by domain, difficulty, and effort is instantaneous (<1s per NFR-P7). A contributor should go from "I have time to contribute" to "I know what to work on" in under 30 seconds.

**Seamless onboarding progression:** The 72-Hour Ignition tracks itself. A contributor sees where they are in the onboarding flow, what's next (welcome call, buddy intro, first task), and how much time they have — without needing to ask anyone.

**Automatic notifications:** Evaluation complete, peer feedback received, task status changed, governance proposal updated — contributors are notified without polling. They check Edin when something happens, not to check if something happened.

### Critical Success Moments

1. **First evaluation received** — The moment a new contributor sees their first AI evaluation score and breakdown. This is where trust in the platform is won or lost. The UX must communicate fairness instantly: "Your code review was scored higher than a quick fix because of these quality factors." If this moment fails, H2 fails.

2. **First Activity Feed experience** — The first time a contributor sees the Contribution Wall with real-time multi-domain activity. This creates the "living garden" impression. All four domains must be visibly active with equal treatment. If the Feed feels code-dominated or static, the multi-domain thesis fails.

3. **First reward trajectory view** — The moment a contributor sees the scaling-law compounding visualization and understands "if I stay and contribute at this level, here's where my rewards go." This must create an "aha" moment, not confusion. If >20% of contributors can't explain what they see, the UX must be simplified.

4. **Investor 30-second credibility check** — Henrik lands on the public showcase. Within 30 seconds he must see: real contributor names with real backgrounds, live community metrics, AI evaluation evidence, and enough substance to justify a deeper conversation. If the first impression is "marketing page," he leaves.

5. **Non-code contribution equality moment** — The first time Amir, Sofia, or Yuki sees their non-code contribution displayed on the Activity Feed with the same visual prominence as Lena's code commit. This is the moment the multi-domain equality promise becomes real. If their contribution feels visually secondary, the structural equality is performative.

6. **Admission acceptance** — Daniel receives acceptance, a personal welcome message, and a scheduled welcome call. This is the brand ritual. It must feel like joining something exclusive and caring, not like joining a filter. The onboarding UX from this moment through the 72-hour mark defines long-term retention.

### Experience Principles

1. **Close the loop, not the tool.** Edin never replaces the contributor's workflow — it completes it. The platform's value is the feedback loop: contribute elsewhere, understand your impact here. Every screen serves the return visit.

2. **Transparency is trust.** Every evaluation score has a visible breakdown. Every reward calculation has a visible formula. Every governance decision has a visible trail. If a contributor cannot understand why something happened, the UX has failed. Opacity is the enemy.

3. **Equal by default, deep by choice.** All four domains receive identical visual treatment in every shared interface — Activity Feed, contribution menu, leaderboards, metrics. Domain-specific detail is available through progressive disclosure, never at the expense of another domain's visibility.

4. **Compression without pressure.** Time-sensitive experiences (72-Hour Ignition, evaluation wait, reward trajectory) must feel guided, not rushed. Progressive status indicators replace anxiety. "Your evaluation is processing" with a clear timeline beats a spinner.

5. **The garden is alive.** The platform must feel like a living community, not a static dashboard. Real-time Activity Feed, contributor presence signals, and fresh contribution data create the heartbeat. Edin should feel different every time you open it.

## Desired Emotional Response

### Primary Emotional Goals

**Recognized** — "My craft matters here." The dominant emotional goal across all contributor personas. Edin's AI evaluation must make contributors feel seen at a craft level — quality distinguished from quantity, depth valued over speed, domain expertise respected regardless of whether it's code or governance. This is the emotional antidote to every platform that reduced their work to commit counts or social popularity.

**Belonging** — "I was chosen. I'm building something with people I respect." The curated admission model creates the foundation; the Activity Feed and working groups sustain it. Contributors should feel they are co-architects of something meaningful, not users of a tool. The "garden" metaphor must be emotionally real: this is a cultivated space, not a marketplace.

**Fair** — "I understand how I was evaluated, and it makes sense." Not agreement with every score, but trust in the process. Transparency creates this feeling; opacity destroys it. Every evaluation breakdown, every reward calculation, every governance decision must reinforce the conviction that the system operates honestly.

### Emotional Journey Mapping

| Stage | Target Emotion | Design Implication | Anti-Pattern to Avoid |
|---|---|---|---|
| **Discovery** (public portal) | Intrigued, impressed — "This is serious and different" | Substance-first showcase: real names, real metrics, real AI evidence. No stock photos, no vague promises | "Another crypto marketing page" — glossy without substance |
| **Application** | Respected, challenged — "They're asking me to demonstrate, not just fill forms" | Domain-specific micro-task that feels like a preview of contribution, not a test | "Just another form" — bureaucratic, impersonal |
| **Acceptance** | Chosen, welcomed — "I'm joining something exclusive that wants me specifically" | Personal welcome message, scheduled welcome call, buddy assignment within 24 hours | "Processed and filed" — automated confirmation email |
| **First 72 hours** | Guided, capable — "I know exactly what to do and I can do it" | Clear onboarding progression, visible timeline, domain-matched first task, buddy available | "Overwhelmed and lost" — too many options, no clear path |
| **First evaluation** | Understood, fairly assessed — "The system sees what I actually did" | Transparent score breakdown, quality factors highlighted, clear criteria explanation | "Gamed, opaque, arbitrary" — score without explanation |
| **Ongoing contribution** | Valued, growing — "My impact is compounding and visible" | Contribution history with trend lines, skill growth indicators, community recognition | "Grinding for tokens" — transactional, mechanical |
| **Reward trajectory** | Motivated, committed — "Staying makes mathematical sense" | Visual projection showing compounding growth, clear "you are here" indicator | "Confused, skeptical" — complex formula without visual translation |
| **Community interaction** | Peer among peers — "I belong here regardless of my domain" | Equal domain visibility, cross-domain activity, working group presence | "Outsider, unequal" — code-dominated culture |
| **Error / failure states** | Supported, informed — "Something went wrong but I know what's happening" | Clear error messages with next steps, evaluation appeal flow, status transparency | "Abandoned, anxious" — silent failures, unexplained states |

### Micro-Emotions

**Trust over skepticism** — The most critical micro-emotion. Contributors in the Web3/crypto space have been burned by platforms that promised decentralization and delivered autocracy (Yuki's explicit concern), that promised fair rewards and delivered popularity contests, or that promised inclusion and delivered code-centrism. Every interaction must build trust incrementally through evidence, not claims. Specific trust signals: real names on the roster, visible evaluation criteria before contributing, governance milestones with dates, reward formulas shown in full.

**Confidence over confusion** — Second-most critical. The scaling-law reward model and AI evaluation are intellectually complex. If a contributor feels confused at any point — when viewing their score, when reading the reward explanation, when navigating the onboarding — the UX has failed before trust can even form. Confidence comes from progressive disclosure: simple summary first, detail on demand, full transparency available.

**Belonging over isolation** — Critical for non-code contributors. Amir has never contributed to open source. Sofia has been sidelined as "the non-technical person." The UX must actively signal inclusion through equal visual treatment, domain-specific welcome paths, and visible non-code activity. Belonging is not the absence of exclusion — it must be positively designed.

**Accomplishment over frustration** — The 72-Hour Ignition must end with a visible, celebrated contribution. Not "you completed onboarding" but "your work is on the Contribution Wall and here's how it was received." Every contribution cycle should close with a clear sense of completion and visible impact.

**Calm authority over hype** — Edin's tone should feel like a well-run institution, not a startup pitch. The IOUR Foundation's non-profit structure, the Belgian regulatory context, and the mathematical rigor of the scaling laws all support a tone of quiet confidence. The UX should feel curated, considered, and substantive — never breathless, never overselling.

### Design Implications

| Emotional Goal | UX Design Approach |
|---|---|
| **Recognized** | AI evaluation scores show quality factors prominently (code complexity, review thoroughness, documentation depth). Contribution cards on the Activity Feed highlight *what made this contribution valuable*, not just that it happened. Evaluation breakdowns lead with quality narrative, not just numbers. |
| **Belonging** | Founding Circle roster with real photos and bios. Working group activity visible on dashboard. "Your Fingerprints Are Everywhere" — show contributors where their work influenced the project. Community rituals (welcome calls, working group meetings) have UX touchpoints. |
| **Fair** | Every score has a one-click breakdown. Evaluation criteria visible before contributing. Flag/appeal flow is 2 clicks, not buried. Reward formula shown in full with a "how this applies to you" personalized view. Governance decisions show the trail from proposal to outcome. |
| **Trust** | No claims without evidence. Public metrics are real-time, not curated snapshots. Contributor roster shows real professional backgrounds. AI evaluation shows model version and agreement rate with human experts. Progressive decentralization roadmap shows completed milestones, not just promises. |
| **Confidence** | Progressive disclosure everywhere: summary → detail → full data. Onboarding has a visible progress bar with clear next steps. Reward trajectory has "simple view" and "detailed view." Evaluation has "your score" → "why this score" → "full criteria." |
| **Calm authority** | Muted, professional color palette. Typography that conveys substance. No exclamation marks in UI copy. Data-dense where appropriate (admin dashboard). White space and breathing room where emotional impact matters (public showcase, evaluation results). |

### Emotional Design Principles

1. **Evidence before claims.** Never tell contributors the platform is fair — show them the evaluation breakdown. Never tell investors the community is real — show them the live Activity Feed. Every emotional goal is achieved through demonstrable proof, not marketing language.

2. **Dignity in every interaction.** From the application micro-task (which respects expertise) to the evaluation appeal (which takes disagreement seriously) to the error state (which explains clearly) — every touchpoint treats the contributor as a respected professional. No patronizing, no gamification tricks, no engagement manipulation.

3. **Emotional safety for vulnerability.** Contributors submit work for AI judgment — this is inherently vulnerable. The UX must create safety around evaluation: scores are private by default, breakdowns are explanatory not punitive, trends show growth not failure, and the appeal flow signals "we take your perspective seriously."

4. **Warmth through substance.** The curated community feel comes not from friendly illustrations or casual copy, but from showing real people doing real work with real recognition. Warmth is the Contribution Wall showing a financial analysis next to a code commit with equal prominence. Warmth is the buddy system with a real name and a scheduled call.

5. **Anticipatory reassurance.** During asynchronous waits (evaluation processing, ingestion pipeline, feedback assignment), the UX proactively communicates status and timeline. "Your code is being evaluated — typical time: 20 minutes" prevents anxiety before it forms. Never leave a contributor wondering what's happening.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**GitHub — The developer's home (Lena, Daniel, Marie)**

GitHub is the gravitational center for Edin's primary persona (Lena) and the MVP's sole integration target. Its contribution graph is one of the most powerful UX inventions in developer tools — a single visual that communicates consistency, volume, and commitment at a glance. The PR review flow treats code review as a first-class activity, aligning with Edin's quality-over-quantity ethos. The notification system efficiently routes attention without overwhelming. Profile pages create portable professional identity. Key lesson: a single, well-designed visualization can drive behavior. Edin's reward trajectory visualization should aspire to the same behavioral power. GitHub's progressive disclosure (summary → diff → line-by-line comments) is the model for how Edin should reveal evaluation detail.

**Linear — Opinionated simplicity for complex work (all contributors)**

Linear is the best current example of a professional tool that feels fast, clean, and opinionated without being simplistic. Keyboard-driven navigation, sub-200ms interactions, minimal visual noise, and an information hierarchy that puts the work front and center. It manages complex project states without visual clutter. The onboarding is frictionless. Key lesson: Edin's contributor dashboard should aspire to Linear's information density without visual overwhelm. The contribution menu is structurally similar to Linear's issue views — filtering should feel equally instant. Linear's tone (professional, confident, no exclamation marks) matches Edin's "calm authority" emotional principle.

**Stripe Dashboard — Trust through data clarity (Henrik, Marie, all contributors)**

Stripe's dashboard is the gold standard for presenting financial/metrics data in a way that builds trust. Clean typography, generous white space, real-time data that feels reliable, and progressive disclosure from summary metrics to granular detail. The dashboard tells you "everything is working" at a glance, with drill-down available when needed. Error states are clear and actionable. Key lesson: Edin's admin dashboard (Marie), public metrics (Henrik), and evaluation displays (all contributors) should draw from Stripe's "trust through data clarity" approach. The evaluation score breakdown should feel as trustworthy as a Stripe payment receipt.

**Strava — The social contribution loop (all contributors)**

Strava's core UX loop is remarkably similar to Edin's: perform an activity elsewhere → it's automatically ingested → you see your stats → the community feed shows others' activities → you're motivated to do more. The Activity Feed is the heartbeat. The "segment" system lets different types of athletes feel equally valued in their domain. Key lesson: Strava proves the automatic ingestion → evaluation → social feed → motivation loop works at scale. Edin's Activity Feed should study how Strava makes the feed feel communal without being competitive. The segment model is analogous to Edin's four domains.

**The Economist app — Substance over flash (Amir, Yuki, Henrik)**

For non-developer personas, the reference isn't a tech tool — it's a publication that respects intellectual depth. The Economist treats complex topics with visual clarity and editorial authority. Clean typography, data visualizations that explain rather than decorate, and a tone that assumes intelligence without assuming expertise. Key lesson: Edin's public showcase, domain manifestos, and reward methodology explanation should draw from this "intellectual authority" aesthetic. The scaling-law explanation should feel like an Economist data feature — rigorous but accessible.

### Transferable UX Patterns

| Pattern | Source | Edin Application |
|---|---|---|
| **Contribution graph / streak visualization** | GitHub | Reward trajectory visualization — a single visual showing compounding engagement over time |
| **Progressive disclosure: summary → detail → raw data** | GitHub PR reviews, Stripe | Evaluation scores: score → breakdown → full criteria → raw data |
| **Instant filtering with keyboard shortcuts** | Linear | Contribution menu filtering by domain/difficulty/effort |
| **Automatic activity ingestion → social feed** | Strava | GitHub integration → Activity Feed (Contribution Wall) |
| **Domain-specific excellence within unified feed** | Strava segments | Four-pillar equality: each domain has its own quality metrics, shared feed |
| **Trust-building data presentation** | Stripe Dashboard | Admin health metrics, public investor view, evaluation transparency |
| **Real-time status with clear processing states** | Stripe (payment processing) | Evaluation pipeline: "ingested → processing → evaluated" with estimated time |
| **Substance-first content with data visualization** | The Economist | Reward methodology explanation, domain manifestos, public showcase |
| **Keyboard-driven navigation for power users** | Linear | Contributor dashboard navigation for repeat users (Lena) |
| **Onboarding that gets you productive fast** | Linear | 72-Hour Ignition — minimal steps to first meaningful contribution |

### Anti-Patterns to Avoid

| Anti-Pattern | Where It Appears | Why It Fails for Edin |
|---|---|---|
| **Popularity-contest UX** | Gitcoin grant rounds, social media likes | Directly contradicts the "fair AI evaluation" thesis. No upvote/like mechanics on contributions. Quality is assessed by AI, not crowd sentiment |
| **Crypto-jargon overload** | Most DAO dashboards | Alienates Amir, Sofia, and Henrik immediately. Edin must speak contributor language, not blockchain language. "Rewards" not "tokenomics." "Evaluation" not "staking" |
| **Gamification badges and achievements** | Many contributor platforms | Creates the wrong emotional register. Edin's contributors are senior professionals, not players. Recognition should feel earned and substantive, not collectible |
| **Dashboard-as-decoration** | Corporate analytics tools | Empty charts and vanity metrics destroy Henrik's trust in 10 seconds. Every metric displayed must be real, current, and meaningful |
| **Complexity-first reward displays** | DeFi yield dashboards | The scaling-law model is already intellectually complex. The UX must simplify first. Progressive disclosure is mandatory |
| **Code-centric activity feeds** | GitHub, GitLab | If the Activity Feed defaults to showing code commits more prominently, non-code contributors feel invisible. Equal visual weight must be designed, not default |
| **Impersonal onboarding wizards** | SaaS products | The 72-Hour Ignition is a human experience (buddy, welcome call, personal message). The UX should support warmth, not replace it with a step-by-step wizard |

### Design Inspiration Strategy

**What to Adopt:**

- GitHub's progressive disclosure model for evaluation scores (summary → breakdown → full criteria)
- Linear's information density, speed, and professional tone for the contributor dashboard
- Stripe's data presentation patterns for metrics, admin views, and investor-facing pages
- Strava's automatic ingestion → social feed → motivation loop as the structural model for the core experience

**What to Adapt:**

- GitHub's contribution graph → Edin's reward trajectory visualization (multi-temporal, not just daily; compounding, not linear)
- Strava's segment model → Edin's four-domain equality (with stronger visual parity enforcement)
- Linear's keyboard navigation → available for power users but not required (Amir may never use shortcuts)
- The Economist's editorial authority → domain manifestos and reward methodology, but more interactive and personalized

**What to Avoid:**

- Any UX pattern that looks or feels like a crypto/DeFi dashboard
- Any gamification (badges, streaks, leaderboards) — recognition through evaluation quality and community visibility instead
- Any popularity-based mechanics (likes, upvotes, social ranking)
- Any onboarding that feels automated or impersonal

## Design System Foundation

### Design System Choice

**Tailwind CSS + Headless Component Library (Radix UI)**

A themeable, utility-first approach combining Tailwind CSS for complete visual control with Radix UI for accessible, unstyled interaction primitives. This gives Edin full design authority over its visual identity while leveraging battle-tested accessibility and interaction patterns.

This is neither a fully custom system (too expensive for MVP timeline) nor an opinionated component library (too generic for Edin's distinctive brand needs). It occupies the strategic middle ground: custom visual identity built on proven interaction foundations.

### Rationale for Selection

| Decision Factor | Requirement | How Tailwind + Radix Delivers |
|---|---|---|
| **Visual identity** | Edin needs a distinctive, curated aesthetic — not "generic SaaS" or "crypto startup" | Tailwind provides pixel-level control. No inherited visual opinions from Material, Ant, or Bootstrap. Edin looks like nothing else |
| **Timeline** | MVP by Q2 2026 with 2-3 developers | Tailwind accelerates UI development through utility classes. Radix provides complex interaction patterns (modals, dropdowns, accordions, tooltips) without building from scratch |
| **Accessibility** | WCAG 2.1 Level AA (NFR-A1), screen reader support (NFR-A2), keyboard navigation (NFR-A3) | Radix UI is built accessibility-first: keyboard navigation, focus management, ARIA attributes, and screen reader announcements are built into every primitive |
| **SSR compatibility** | Hybrid SPA/SSR architecture (Next.js/SvelteKit) | Both Tailwind and Radix work seamlessly with SSR frameworks. No hydration issues, no flash of unstyled content |
| **Performance** | FCP <1.5s (NFR-P1), TTI <3s (NFR-P2) | Tailwind purges unused CSS at build time — minimal CSS payload. Radix components are tree-shakeable. No heavy framework runtime |
| **Three interface contexts** | Public portal, contributor dashboard, admin dashboard need distinct but coherent experiences | Tailwind's design token system (via tailwind.config) creates shared foundation with context-specific variations. Same tokens, different compositions |
| **Data-dense displays** | Admin dashboard, evaluation breakdowns, metrics views need information density | Tailwind excels at dense, precise layouts. No component library padding/margin opinions to override |
| **Real-time updates** | Activity Feed, evaluation notifications, admin health metrics | Radix primitives handle dynamic content updates with proper ARIA live region support |
| **Team familiarity** | Small team needs low learning curve | Tailwind is the most widely adopted CSS framework in the React/Next.js ecosystem. Radix has excellent documentation |

**Why not Material Design / Ant Design:** Both carry strong visual associations (Google / enterprise) that conflict with Edin's need for distinctive "calm authority." Their opinionated component styling would require extensive overriding to achieve the desired aesthetic, negating the speed advantage.

**Why not fully custom:** With 2-3 developers and a 6-month MVP timeline, building accessible modals, dropdowns, tooltips, and focus management from scratch would consume disproportionate effort for foundational UI patterns that are already solved.

### Implementation Approach

**Design Token Architecture:**

Tailwind's configuration file (`tailwind.config`) serves as the single source of truth for all design tokens:

- **Colors:** Brand palette, semantic colors (success/warning/error/info), domain colors (one per pillar — Technology, Fintech, Impact, Governance), neutral scale
- **Typography:** Font families, size scale, weight scale, line heights. Professional serif or sans-serif stack aligned with "calm authority" and "intellectual substance" principles
- **Spacing:** Consistent spacing scale used across all three interface contexts
- **Breakpoints:** Mobile-first responsive breakpoints aligned with the three device contexts (mobile contributor checking, desktop deep work, desktop admin)
- **Shadows/Borders:** Subtle elevation system for cards, modals, and interactive elements
- **Animation:** Restrained motion tokens — functional transitions only, no decorative animation (aligned with "calm authority" principle)

**Component Strategy:**

| Component Type | Approach | Examples |
|---|---|---|
| **Interaction primitives** | Radix UI (unstyled, accessible) | Modals, dropdowns, tooltips, tabs, accordions, popovers, toggle groups, progress bars |
| **Form elements** | Radix UI + custom Tailwind styling | Inputs, selects, checkboxes, radio groups, sliders |
| **Layout components** | Custom Tailwind compositions | Page shells, sidebars, responsive grids, card layouts |
| **Data display** | Custom Tailwind compositions | Tables, metric cards, charts, evaluation breakdowns, Activity Feed items |
| **Navigation** | Custom Tailwind + Radix Navigation Menu | Top nav, sidebar nav, breadcrumbs, mobile menu |
| **Feedback/Status** | Radix Toast + custom styling | Notifications, status indicators, processing states, error messages |

**Shared Component Library:**

Build a project-level component library (`/components/ui/`) with Edin-styled wrappers around Radix primitives. Each wrapper applies Tailwind classes consistent with the design token system. This creates reusable, consistent components while keeping full visual control:

- `Button` — primary, secondary, ghost, destructive variants
- `Card` — contribution card, evaluation card, metric card, profile card
- `Badge` — domain badges (Technology, Fintech, Impact, Governance), status badges
- `ScoreDisplay` — evaluation score with progressive disclosure (summary → breakdown)
- `FeedItem` — Activity Feed contribution item with domain-equal visual treatment
- `StatusIndicator` — processing pipeline status (ingested → evaluating → complete)

### Customization Strategy

**Domain Color System:**

Each of the four contribution domains receives a distinct color that appears consistently across all interfaces — Activity Feed items, contribution menu tags, working group badges, profile domain indicators, and evaluation displays. These four colors are first-class design tokens, not afterthoughts:

- **Technology & Development** — color TBD during visual design
- **Fintech & Financial Engineering** — color TBD during visual design
- **Impact & Sustainability** — color TBD during visual design
- **Consciousness & Governance** — color TBD during visual design

Domain colors must pass WCAG AA contrast requirements in all usage contexts.

**Three Interface Context Themes:**

The design token system supports three visual contexts sharing a common foundation:

- **Public portal:** More white space, larger typography, hero sections, editorial feel (The Economist inspiration). Optimized for first impression and credibility.
- **Contributor dashboard:** Denser information display, functional typography, real-time elements, data-forward (Linear/Stripe inspiration). Optimized for the return visit and evaluation feedback loop.
- **Admin dashboard:** Maximum information density, compact spacing, table-heavy layouts, efficiency-first (Stripe Dashboard inspiration). Optimized for operational speed.

**Progressive Enhancement:**

The design system starts lean for MVP and extends as the platform grows:

- MVP: Core components for the seven must-have capabilities. ~20-25 components.
- Phase 2: Extended components for governance workflow, advanced analytics, multi-integration views.
- Phase 3: Components for DAO governance, portable reputation displays, cross-ecosystem views.

## Defining Interaction

### The Defining Experience

**"See how your contribution was truly understood."**

The moment a contributor opens their evaluation breakdown and sees that the AI understood the nature of their work — that a thorough code review was valued higher than a quick fix, that a financial model was assessed on its analytical rigor, that an impact framework was recognized for its governance implications — that's the moment Edin becomes irreplaceable.

This is what a contributor would tell a respected peer: "There's a platform where an AI actually understands the quality of what you do — and rewards you for it."

The Activity Feed creates belonging; the reward trajectory creates retention. But fair, transparent evaluation is the foundation on which both are built. Without trust in evaluation, belonging feels hollow and retention feels manipulative. This is Edin's intellectual moat.

### User Mental Model

Each persona brings a fundamentally different mental model to the evaluation experience:

**Lena (Developer) — Code review quality model.**

Her reference frame is a senior engineer reviewing her PR. She expects to see criteria she recognizes — complexity, maintainability, test coverage, standards adherence — applied with nuance she respects. A good evaluation distinguishes a deep refactor from a trivial rename. A bad evaluation treats all PRs as equal. She will mentally benchmark Edin's evaluation against tools she already knows (SonarQube, CodeClimate, a respected tech lead's review). To win her trust, the evaluation must demonstrate at least one insight she wouldn't have gotten from existing tools.

**Amir (Financial Engineer) — Academic peer review model.**

His reference frame is a journal referee or a senior quant reviewing a research paper. He expects domain-appropriate criteria: analytical rigor, methodology soundness, practical applicability, novelty of approach. If the evaluation applies code-centric metrics to his financial model ("test coverage: N/A"), it confirms his fear that this is just another developer platform with non-code contribution as an afterthought. The evaluation criteria must speak his language.

**Sofia (Impact Analyst) — Impact assessment framework model.**

Her reference frame is a multilateral development bank evaluating a project proposal. She expects recognition of systemic thinking, stakeholder analysis, long-term impact projection — not just deliverable completion. If her social impact assessment framework is scored solely on "document completeness," the evaluation has missed the point. She needs to see that strategic, systems-level thinking is a first-class evaluation dimension.

**Yuki (Governance Specialist) — Legal audit model.**

Her reference frame is a legal review or governance audit. She expects full criteria visibility, version-tracked evaluation models, and a credible appeal path. She will look for the evaluation's equivalent of "showing your work" — not just the score, but the reasoning chain. If she can't audit the process, she won't trust the outcome. The appeal flow is not optional for Yuki — it's a trust prerequisite.

**Daniel (New Contributor) — Grade/feedback model.**

His reference frame is getting a grade back from a respected teacher. He expects fairness, encouragement where warranted, and clear guidance on how to improve. His first evaluation defines whether he trusts the platform. If the first score feels arbitrary or unexplained, he may not submit a second contribution.

**Common Mental Model Risks:**

- Score without explanation → "black box" perception → trust collapse
- Code-centric criteria applied to non-code work → domain inequality → non-developer churn
- High-quantity contributor scoring above high-quality → broken thesis → Lena leaves
- No recourse for disputed scores → powerlessness → Yuki leaves
- First evaluation too harsh without context → discouragement → Daniel leaves

### Success Criteria for Core Experience

The evaluation experience succeeds when:

1. **Immediate comprehension** — A contributor sees their evaluation score and understands what it means within 3 seconds. The score display communicates quality level at a glance (not just a number, but a contextual indicator).

2. **One-click understanding** — One click from the score reveals the full breakdown: which criteria were applied, how each dimension was scored, and what the main quality factors were. The breakdown answers "why this score?" without requiring further clicks.

3. **Domain-appropriate criteria** — The evaluation criteria displayed match the contribution's domain. A code commit shows code quality dimensions. A financial analysis shows analytical rigor dimensions. An impact assessment shows strategic thinking dimensions. No contributor sees irrelevant criteria.

4. **Quality over quantity signal** — A contributor who submitted one deep, high-quality contribution sees a higher score than a contributor who submitted three shallow ones. This must be visible in the scoring breakdown — not just implied, but explicitly communicated as a quality factor.

5. **Improvement path visible** — The evaluation breakdown suggests where the contributor could strengthen their work. Not prescriptive ("you should have...") but informative ("the dimensions with most room for growth are..."). This transforms evaluation from judgment into feedback.

6. **Trust verification available** — For contributors who want to go deeper (Yuki), the full evaluation criteria specification, model version, and AI-human agreement rate are accessible. Two more clicks, not buried in settings.

7. **Appeal feels respected** — Flagging an evaluation for human review is a 2-click action visible from the evaluation breakdown. The contributor receives acknowledgment immediately and resolution within a defined timeframe. The flag is not buried or discouraged.

### Novel UX Patterns

**What's Familiar (adopt directly):**

- **Score + breakdown pattern** — Universal across credit scores, academic grades, code analysis tools, performance reviews. Contributors immediately understand "I got a score, I can click to see why." No learning curve.
- **Progressive disclosure** — Summary → detail → raw data. Well-established in GitHub (PR overview → diff → line comments), Stripe (transaction → receipt → event log), and every analytics dashboard. Users expect this drill-down flow.
- **Notification + action** — "Your evaluation is ready → View" follows the same pattern as email notifications, GitHub review requests, and Slack messages. Familiar trigger for returning to the platform.

**What's Novel (requires careful design):**

- **Multi-domain evaluation criteria** — No existing platform evaluates code, financial engineering, impact analysis, and governance proposals through the same system with domain-specific criteria. The UX must make this feel natural, not forced. Approach: the evaluation card adapts its criteria labels and dimensions to the contribution type. A code evaluation card looks different from a governance evaluation card — same structure, different vocabulary.
- **AI evaluation with transparency** — Most AI-powered tools present results as black boxes. Edin's transparency requirement (show criteria, model version, agreement rate) is novel. Approach: treat the evaluation like a Stripe receipt — every line item visible, total at the top, full audit trail available.
- **Evaluation appeal as trust mechanism** — Most platforms treat appeals as complaints. Edin must frame the flag/appeal flow as a collaborative quality signal: "Your feedback improves the evaluation system." Approach: when a contributor flags an evaluation, show it as contributing to evaluation quality, not disputing the system.

**Teaching Strategy:**

Use the familiar score/breakdown pattern as the entry point. Contributors see something they immediately understand (a score, a breakdown, an improvement suggestion). As they engage more deeply, they discover Edin's novel layers: domain-specific criteria that speak their language, transparent AI methodology, an appeal flow that respects their judgment. The novelty emerges through use, not through instruction.

### Experience Mechanics

**1. Initiation — The evaluation arrives:**

- **Trigger:** Contribution is evaluated (within <30 min for code, <15 min for docs per NFR-P6)
- **Notification:** "Your [contribution type] has been evaluated" — push notification + dashboard indicator
- **Dashboard state:** The contributor's latest contributions panel shows a new evaluation badge on the relevant contribution card
- **Activity Feed:** The evaluated contribution appears/updates on the Contribution Wall with its score visible

**2. Interaction — The contributor opens the evaluation:**

- **First view (summary):** The evaluation card shows: contribution title, domain badge, overall score (0-100 with contextual quality indicator), evaluation date, and a one-line quality summary ("High-quality code review with thorough coverage analysis")
- **One-click breakdown:** Expanding the evaluation reveals: individual dimension scores (3-5 dimensions per domain), quality factors that most influenced the score (what made this score what it is), comparison to the contributor's own historical average (trend), and improvement suggestions
- **Deep dive (optional):** A "View full evaluation" link reveals: complete criteria specification for this contribution type, model version used, the contributor's score in context of the quality distribution, and link to flag/appeal

**3. Feedback — The contributor understands their score:**

- **Positive reinforcement:** Quality factors are presented as strengths first: "Strong in: analytical rigor, methodology clarity. Room to grow: reference completeness"
- **Trend line:** A small sparkline shows the contributor's evaluation trend over their last 10 contributions — growth is visible
- **Contextual tooltip:** Hovering over any dimension score shows a brief explanation of what that dimension measures and what distinguishes high from low scores
- **No ranking against others:** Evaluation is about personal quality and growth, not competition. No leaderboard, no percentile ranking

**4. Completion — The contributor knows what comes next:**

- **Score feeds reward trajectory:** A subtle link connects the evaluation to the contributor's reward trajectory: "This evaluation contributes to your [weekly/monthly] reward cycle"
- **Contribution Wall update:** The Activity Feed shows the evaluated contribution with its score, visible to the community — recognition is social
- **Next action prompt:** If the contributor has been inactive, the evaluation card suggests: "Ready for your next contribution? View tasks in [your domain]"
- **Appeal available:** "Something not right? Flag this evaluation" — visible but not prominent. Accessible without being anxious

**5. Error / Edge Cases:**

- **Evaluation delayed beyond threshold:** Status indicator shows "Evaluation in progress — taking longer than usual. Typical: 20 min, current: 45 min. We'll notify you when ready."
- **Evaluation fails (AI error):** "We couldn't complete the evaluation for this contribution. A human reviewer has been notified. You'll receive feedback within [timeframe]."
- **Score disputed (flagged):** "Thank you for flagging this evaluation. A human reviewer will examine your contribution. You'll receive an updated evaluation within [timeframe]. Your feedback helps improve our evaluation quality."

## Visual Design Foundation

### Color System

**Brand Palette:**

- **Primary: Deep Emerald** (~#2D6A4F) — Connects to the Edin garden/fertile plain metaphor. Communicates maturity, sustainability, and care. Distinct from crypto blue/purple and generic SaaS teal. Used for primary CTAs, active states, brand accents, and key interactive elements.
- **Neutral scale: Warm grays** (stone/warm-gray family) — Organic, not clinical. Used for backgrounds, text, borders, and surface hierarchy. Warm neutrals support the "cultivated, not industrial" identity.
- **Background: Off-white** (~#FAFAF8) — Slightly warm, not pure white. Communicates warmth and substance. Public portal uses generously; dashboards use for breathing room between dense content.

**Semantic Colors:**

| Token | Color | Usage |
|---|---|---|
| `success` | Green (brand family) | Positive states, completed evaluations, successful ingestion |
| `warning` | Warm amber (~#D97706) | Attention states, pending reviews, approaching thresholds |
| `error` | Muted red (~#DC2626) | Error states, failed ingestion, evaluation failures |
| `info` | Slate blue (~#4B6BFB) | Informational states, tips, system messages |

**Domain Colors (equal visual weight, WCAG AA compliant):**

| Domain | Color | Hex Range | Rationale |
|---|---|---|---|
| **Technology & Development** | Slate Blue | ~#4B6BFB | Familiar tech association, precision, clarity |
| **Fintech & Financial Engineering** | Warm Amber/Gold | ~#D97706 | Financial heritage, mathematical elegance |
| **Impact & Sustainability** | Teal | ~#0D9488 | Growth and sustainability, distinct from brand emerald |
| **Consciousness & Governance** | Deep Violet | ~#7C3AED | Authority, governance tradition, contemplative depth |

Domain colors appear on: Activity Feed item borders/accents, contribution menu tags, working group badges, profile domain indicators, evaluation card domain labels, and metric displays. All four colors must have equivalent saturation and visual weight — none should appear primary or secondary relative to others.

**Color Usage Rules:**

- Primary emerald is reserved for brand-level elements and interactive states, never for a single domain
- Domain colors are structural — they identify contribution origin, not quality or hierarchy
- Semantic colors override domain colors in status contexts (an error on a Technology contribution shows red, not blue)
- Dark text on light backgrounds as the default. Reversed (light on dark) only for primary CTAs and selected states
- All color combinations must meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for large text)

### Typography System

**Typeface Strategy:**

- **Headings (public portal): Serif** — Newsreader, Lora, or Source Serif Pro (open-source, web-optimized). The serif communicates editorial authority and intellectual substance on public-facing pages. Aligns with The Economist inspiration and "calm authority" emotional principle.
- **Body / Dashboard UI: Inter** — The most refined open-source sans-serif for screen rendering. Designed for UI at all sizes, excellent legibility at small sizes for data-dense displays. Used throughout contributor and admin dashboards, and for body text everywhere. Aligns with Linear/Stripe/GitHub inspiration.
- **Monospace: JetBrains Mono** or Fira Code — For code snippets in evaluation breakdowns, contribution references, technical metadata, and any developer-facing content.

**Type Scale:**

| Level | Size | Weight | Typeface | Usage |
|---|---|---|---|---|
| Display | 36-48px | Serif, semibold | Heading font | Public portal hero headings, landing page |
| H1 | 30px | Serif, semibold | Heading font | Page titles (public), major section headers |
| H2 | 24px | Sans-serif, semibold | Inter | Section headers (dashboard), card group titles |
| H3 | 20px | Sans-serif, medium | Inter | Subsection headers, modal titles, card titles |
| H4 | 16px | Sans-serif, semibold | Inter | Card subtitles, table headers, form labels |
| Body | 16px | Sans-serif, regular | Inter | Standard text, descriptions, form content |
| Body small | 14px | Sans-serif, regular | Inter | Secondary text, metadata, timestamps, tooltips |
| Caption | 12px | Sans-serif, medium | Inter | Labels, badges, status indicators, table metadata |

**Typography Rules:**

- Line height: 1.5 for body text, 1.25 for headings, 1.6 for long-form content (public portal articles, manifestos)
- Maximum line length: 65-75 characters for readability on public pages. Dashboard text fills available width.
- Font weight hierarchy: semibold for headings and emphasis, medium for interactive labels, regular for body. No bold in body text — use semibold sparingly for inline emphasis.
- Serif headings used only on public-facing pages. Contributor and admin dashboards use Inter throughout for density and consistency.

### Spacing & Layout Foundation

**Base Unit:** 4px (Tailwind default spacing scale)

**Practical Spacing Scale:**

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Inline spacing, icon gaps, tight label padding |
| `sm` | 8px | Minimum spacing between related elements, compact padding |
| `md` | 16px | Standard padding, card internal spacing, form field gaps |
| `lg` | 24px | Section spacing, card gaps (public), generous padding |
| `xl` | 32px | Major section breaks, public portal margins |
| `2xl` | 48px | Page-level spacing, hero section padding |
| `3xl` | 64px | Public portal section separators |

**Context-Specific Density:**

| Context | Card Padding | Card Gap | Section Gap | Max Content Width |
|---|---|---|---|---|
| **Public portal** | 24-32px | 24-32px | 48-64px | 1200px |
| **Contributor dashboard** | 16-20px | 16px | 24-32px | Full width (minus sidebar) |
| **Admin dashboard** | 12-16px | 12px | 16-24px | Full width (minus sidebar) |

**Grid System:**

- **Public portal:** 12-column grid, max-width 1200px, 32px gutters. Content centered. Editorial layout with generous margins.
- **Contributor dashboard:** Fixed sidebar (240-280px, collapsible) + main content area with fluid 12-column grid. Sidebar contains navigation, domain filter, and quick actions.
- **Admin dashboard:** Collapsible sidebar (240px collapsed to 64px icon-only) + full-width content area optimized for data tables, metric grids, and queue management.
- **Mobile (< 768px):** Single column layout. Bottom tab navigation for contributor dashboard (Home/Feed, Tasks, Evaluations, Profile). Sidebar hidden. Admin dashboard not optimized for mobile (desktop-only per design decision).

**Layout Principles:**

1. **Hierarchy through whitespace.** Separation between sections uses spacing, not borders or dividers. Less visual noise, more deliberate structure. Borders reserved for interactive elements (cards, inputs, tables) where containment is functional.
2. **Cards as primary containers.** Contribution cards, evaluation cards, metric cards, profile cards — all use the same base card component styled to context-appropriate density. Consistent elevation (subtle shadow), consistent corner radius (8px), consistent internal structure.
3. **Sidebar navigation for authenticated contexts.** Left sidebar with icon + label navigation. Collapsible to icon-only for more content space. Active state uses primary emerald. Sections: Dashboard, Activity Feed, Tasks, Evaluations, Working Groups, Profile (contributor) or Dashboard, Admissions, Contributors, Feedback, Metrics, Settings (admin).
4. **Top navigation for public portal.** Horizontal navigation with logo, section links (About, Domains, Contributors, Metrics, Apply), and auth action (Sign In / Dashboard). Sticky on scroll. Transparent over hero, solid on scroll.

### Accessibility Considerations

**Color Accessibility:**

- All text/background combinations meet WCAG 2.1 AA minimum contrast ratios: 4.5:1 for normal text (< 18px), 3:1 for large text (>= 18px bold or >= 24px regular)
- Domain colors are never used as the sole indicator — always paired with text labels or icons (color should not be the only means of conveying information)
- Interactive elements (links, buttons) have visible focus indicators using the primary emerald with a 2px offset outline
- Data visualizations use patterns/shapes in addition to color for accessibility (evaluation score charts, reward trajectory)

**Typography Accessibility:**

- Minimum body text size: 16px (no text smaller than 12px anywhere in the interface)
- Sufficient line height (1.5 for body) prevents text from feeling cramped for users with cognitive disabilities
- Font choices (Inter, serif heading) are designed for screen readability at all sizes
- No text embedded in images — all text is live HTML for screen reader access

**Interaction Accessibility:**

- All interactive elements have minimum 44x44px touch targets on mobile (per WCAG 2.5.5)
- Keyboard focus order follows visual layout order — no focus traps
- Skip navigation links for keyboard users on all pages
- Reduced motion preference respected: `prefers-reduced-motion` media query disables all non-essential animations
