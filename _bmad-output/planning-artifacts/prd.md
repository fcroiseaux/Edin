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
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
status: complete
completedAt: 2026-02-27
lastEdited: 2026-02-28
editHistory:
  - date: 2026-02-28
    changes: 'Addressed all validation findings: phase annotations on FR53-56/FR58/FR60, added Fraud Prevention section, 3 new Success Criteria, MVP Hypothesis Validation table, rewrote NFR-O1-O4, fixed 8 SMART-flagged FRs, added 4 new FRs, fixed measurability on 4 FRs and 7 NFRs, aligned Amir journey with MVP scope, added multi-contributor scenario, NFR context enrichment, staking/vesting mention, fundraising KPI'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-Edin-2026-02-27.md
  - docs/edin_platform_description.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 1
workflowType: 'prd'
classification:
  projectType: web_app
  domain: fintech
  complexity: high
  projectContext: brownfield
---

# Product Requirements Document - Edin

**Author:** Fabrice
**Date:** 2026-02-27

**Document Sections:** Executive Summary → Project Classification → Success Criteria → User Journeys → Domain-Specific Requirements → Innovation & Novel Patterns → Web Application Specific Requirements → Project Scoping & Phased Development → Functional Requirements → Non-Functional Requirements

## Executive Summary

Edin is a curated contributor platform that organizes, evaluates, and rewards collaborative development within the Rose decentralized finance ecosystem. Built by the IOUR Foundation (Belgian non-profit), Edin addresses a structural failure in open-source economics: contributors produce enormous value but receive no objective evaluation and no sustained compensation. Existing platforms rely on subjective peer voting and single-task bounties — rewarding activity over impact, code over all other disciplines, and short-term engagement over long-term commitment.

Edin proposes a new economic model for human contribution. The platform connects to contributors' existing tools (GitHub, Google Workspace, Slack), ingests their output through an integration layer, and applies an AI-powered Evaluation Engine that objectively assesses quality across four domains: Technology, Fintech, Impact, and Governance. Evaluated contributions feed into a multi-scale reward system distributing blockchain-based tokens across seven temporal horizons — from hourly micro-rewards to yearly commitment recognition — using scaling-law mathematics derived from Rose's own financial research (ORTFM). A curated admission model ensures community quality through selectivity rather than open access.

The founding team is composed of visionary, ethically-driven individuals who aim to reshape finance for humanity. As AI automates routine development work, Edin creates structured space for uniquely human capabilities — mentoring, governance design, creative problem-solving, and leadership — and ensures these contributions are valued equally alongside technical output. The platform serves both as Rose's execution multiplier and as a prototype for a new social contract: one where human contribution is objectively measured, fairly compensated, and permanently recorded.

The recommended strategy is to validate the methodology with a founding community of 20-30 Rose contributors, then offer the evaluation and reward methodology to other ecosystems as a service — creating an independent sustainability path.

### What Makes This Special

**AI-Objective Evaluation as the foundation.** Every competitor relies on human judgment — peer voting, maintainer discretion, popularity contests. Edin uses AI to provide objective, scalable, transparent quality assessment, eliminating the most corrosive force in open-source communities: the perception that recognition is unfair. A meticulous code review scores higher than a sloppy PR with twice the line count — and the reward reflects that.

**Scaling-law compounding rewards as an intellectual moat.** The entire market operates on single-task bounties. Edin's multi-temporal reward system transforms contributors from contractors into stakeholders: the longer you stay, the more disproportionately you earn. This methodology is derived from the same empirical scaling laws powering Rose's Alpha Engine — a genuine mathematical moat no competitor can replicate without the underlying financial research.

**Integration-first, not tool-replacement.** Most platforms try to become the workspace. Edin connects to existing tools and focuses exclusively on evaluation and reward. Zero adoption friction. Zero workflow disruption.

**Curated community as network effect.** Open access is the industry default. Edin's admission-based model creates a selectivity flywheel: high-quality members attract high-quality applicants, raising the signal value of membership.

**Multi-domain equality by design.** Four structural pillars ensure that financial engineers, governance designers, and impact analysts have the same visibility, contribution pathways, and reward mechanisms as developers. Non-code contributions are architecturally first-class citizens.

**Human empowerment in an AI world.** As AI handles routine tasks, Edin explicitly creates space for the uniquely human capabilities that matter most. This narrative is entirely uncontested in the Web3 contributor space.

## Project Classification

- **Project Type:** Web application (SaaS-like platform with significant API/backend infrastructure and blockchain components)
- **Domain:** Fintech (blockchain-based contributor economy within a DeFi ecosystem, MiCA-regulated token economics)
- **Complexity:** High (regulated token economics, AI evaluation engine, multi-scale smart contract rewards, curated admission governance, multi-source integration architecture)
- **Project Context:** Brownfield (existing platform description and comprehensive product brief define the architecture and phased roadmap)

## Success Criteria

### User Success

**North Star Metric:** Active contributor retention rate at 90 days >40% quarter-over-quarter. If contributors stay, the evaluation works, the rewards are motivating, and the community has quality. If they leave, nothing else matters.

**Persona-Specific Success Moments:**

- **Lena (Technology):** Her detailed code review receives a higher evaluation score than a quick-fix PR with twice the line count — and the reward reflects craft over quantity. She stays because the AI sees what human popularity contests miss.
- **Amir (Fintech):** His scaling-law parameter analysis appears on the contribution wall alongside code commits — with the same visibility and reward pathway. He stays because financial engineering is a first-class domain, not an afterthought.
- **Sofia (Impact):** Her social impact assessment framework is adopted as a core governance criterion, influencing how the entire community measures success. She stays because Impact is a real pillar with real decision-making power.
- **Yuki (Governance):** A governance proposal she drafted is adopted by community vote, traceable from proposal to ratification on an immutable record. She stays because progressive decentralization is credible, not performative.

**Measurable User Metrics:**

| Metric | Target | Rationale |
|---|---|---|
| Time-to-first-contribution | <72 hours for >80% of admitted contributors | 72-Hour Ignition onboarding compresses the gap between admission and action |
| Multi-domain contribution balance | At least 1 active contributor per domain at all times | Four-pillar structure delivers on multi-domain equality |
| Belonging score | Average >=4/5 on "How valued do you feel?" | Contributors feel chosen and respected, not processed |
| Peer feedback satisfaction | >60% rate feedback as "useful" or "very useful" | Bridge mechanism holds until AI evaluation is online |
| Referral willingness | >70% would invite someone they respect | The ultimate quality signal — people only refer to things they're proud of |
| AI evaluation trust score (Phase 2+) | >70% rate evaluation as "fair" or "very fair" | Evaluation Engine is credible and contributors don't feel gamed |
| Reward comprehension rate | >80% can explain the scaling-law model | Reward system motivates because it's understood |
| Non-automatable contribution ratio | >25% of evaluated contributions are in mentoring, governance design, creative problem-solving, or leadership categories | Validates that uniquely human capabilities are being contributed and valued (Human Empowerment thesis) |
| Reward motivation effectiveness (Phase 2+) | >50% of retained contributors cite the reward model as a top-3 engagement factor in quarterly survey | Compounding rewards drive retention, not just comprehension |
| Admission selectivity signal | Track acceptance rate and quality differential between admitted and non-admitted applicants | Curated community thesis validated — selectivity creates signal value |

### Business Success

**Phase 1 — Foundation (Q1-Q2 2026):**

- 20+ active founding contributors with >50% 30-day retention
- AI evaluation prototype achieving >70% agreement with human expert assessment
- Regulatory opinion obtained on MiCA token classification
- L2 infrastructure partner selected with viable cost model (<5% of reward value in gas costs)
- Web portal MVP launched with contributor profiles and contribution tracking

**Phase 2 — Intelligence (Q3-Q4 2026):**

- 50-100 active contributors with >40% quarterly retention
- AI evaluation operational across 3+ contribution types (code, docs, community)
- Token rewards distributed on-chain across 3+ temporal scales
- Evaluation engine deployed as a modular API service
- At least 3 external projects expressing interest in the evaluation methodology

**Phase 3 — Scale (2027+):**

- 200+ active contributors with stable retention
- At least 3 external projects using Edin's evaluation methodology
- Revenue from external licensing covering >20% of operational costs
- Full 7-scale reward distribution operational and trusted
- Contributor Portable Reputation profiles recognized by at least 5 external organizations

**Decision Gates (Go/No-Go Checkpoints):**

| Gate | Trigger | Decision |
|---|---|---|
| Community Viability | End of Phase 1 | <15 active contributors after 60 days → STOP. Reassess mission-based attraction |
| Evaluation Credibility | AI prototype complete | <60% agreement with human experts → STOP AI-based rewards. Fall back to peer evaluation |
| Regulatory Feasibility | Token classification opinion received | MiCA requires e-money or asset-referenced license → REDESIGN token economics |
| Economic Viability | First quarter of on-chain rewards | Transaction costs >10% of reward value → REDUCE temporal scales or switch L2 |
| External Validation | End of Phase 2 | Zero external interest → ABANDON Ecosystem-as-a-Service hypothesis |

### Technical Success

| Metric | Target | Rationale |
|---|---|---|
| AI evaluation agreement rate | >70% vs human expert assessment | Core hypothesis validation — if AI can't evaluate fairly, the entire model collapses |
| L2 transaction cost ratio | <5% of reward value in gas costs | Economic viability of multi-temporal on-chain distribution |
| GitHub integration reliability | >99% artifact ingestion success rate | Integration layer is the data foundation — missed contributions erode trust |
| Evaluation transparency | 100% of evaluations include explainable criteria | Contributors must understand how their work was scored |
| Contribution attribution accuracy | >95% correct credit assignment | Fair attribution is non-negotiable in a multi-contributor environment |
| Portal availability | >99.5% uptime during active contributor hours | Community trust requires reliable access to profiles, dashboards, and feeds |
| Ingestion pipeline latency | <15 minutes from contribution to dashboard visibility | Contributors need near-real-time feedback on their work |

### Measurable Outcomes

**Leading Indicators (early signals of strategic health):**

| KPI | Target | Frequency |
|---|---|---|
| Application rate | 5+ qualified applications/week by end of Phase 1 | Weekly |
| 30-day contributor retention | >50% (Phase 1), >60% (Phase 2) | Monthly |
| Contribution frequency | >2 meaningful contributions/week per active contributor | Weekly |
| Cross-domain engagement | >30% of contributors engage beyond their primary domain | Monthly |
| Referral rate | >20% of new contributors from organic referrals | Monthly |

**Lagging Indicators (confirm strategic success):**

| KPI | Target | Frequency |
|---|---|---|
| Active contributor count | 20 (Phase 1) → 100 (Phase 2) → 200+ (Phase 3) | Monthly |
| Quarterly contributor retention | >40% quarter-over-quarter | Quarterly |
| Contribution quality trend | Positive trend in average AI evaluation scores | Quarterly |
| Rose development velocity | Measurable increase in merged PRs, shipped features | Monthly |
| Token distribution health | <5% of reward value consumed by transaction costs | Monthly |
| Fundraising traction | Seed round closed (Phase 1); subsequent funding conversations active (Phase 2) | Quarterly |

## User Journeys

### Journey 1: Lena — Senior Backend Developer Joins the Founding Circle

**Opening Scene:** Lena is scrolling through her feed on a Sunday evening. Twelve years in backend development, two Ethereum EIPs authored, hundreds of hours of open-source contributions — and what does she have to show for it? GitHub stars. Commit counts. Vanity metrics that measure quantity, not craft. She left FAANG to freelance because she wanted to build things that mattered. But the open-source projects she contributes to reward the loudest voices, not the best code. Last month, a thoughtless 200-line PR got more recognition than her architectural refactoring that eliminated an entire class of bugs. She's tired.

**Rising Action:** A message from Marcus, a developer she respects deeply, who's already in Edin's founding circle: "You should look at this. They're building something different." She clicks through to the Edin web portal. The Founding Circle page lists names she recognizes — serious people, not influencers. The domain manifesto for Technology speaks her language: craft matters, quality over quantity, AI that evaluates code the way a senior engineer would. She's skeptical but intrigued. She submits the contribution-based application — a domain-specific micro-task that asks her to review a real piece of Rose infrastructure code and propose improvements. Not a personality quiz. Not a popularity contest. An actual test of her skills.

**Climax:** Forty-eight hours after admission, she's on a welcome call with two existing contributors. They walk her through the contribution menu, and she picks her first task: refactoring a critical module in the Rose clearing engine. She submits the PR through GitHub — her normal workflow, nothing new to learn. Three days later, the AI Evaluation Engine scores her contribution. Her meticulous refactoring — fewer lines, better architecture, comprehensive tests — scores significantly higher than a feature PR submitted the same day with triple the line count. She stares at the evaluation breakdown: complexity reduction, maintainability improvement, test coverage, standards adherence. The AI *saw* what she did. It understood the craft.

**Resolution:** Two months in, Lena is a working group lead in the Technology pillar. Her fingerprints are on the evaluation criteria — she helped calibrate what "quality" means for backend code. She mentors a newer contributor through the buddy system. The scaling-law rewards are compounding — her sustained engagement is earning disproportionately more than someone who dips in and out. She refers a colleague she deeply respects. When asked why she stays, she says: "Because for the first time, the system is as rigorous about evaluating my work as I am about producing it."

### Journey 2: Amir — Financial Engineer Finds His Place

**Opening Scene:** Amir has a PhD in mathematical finance and eight years at a London hedge fund designing algorithmic trading systems. He discovered the ORTFM model through a research paper and was captivated — the scaling laws, the intrinsic time framework, the coastline trading methodology. This is his domain. He wants to contribute to Rose. But he's never contributed to open source. He doesn't know Git workflows. Every contributor platform he's looked at is a wall of code repositories and pull requests. He has no entry point.

**Rising Action:** He finds the Edin web portal through Rose's website. The four-pillar structure catches his eye immediately — Fintech & Financial Engineering is a dedicated domain, not a footnote. The manifesto speaks directly to him: quantitative modeling, token economics design, scaling-law calibration, financial infrastructure architecture. There's a contribution menu with tasks tagged for his expertise: "Analyze scaling exponents for reward distribution across temporal horizons," "Review token economics model for MiCA compliance implications." No Git required. He submits his application with a micro-task: a brief analysis of how Rose's Coastline Law could inform reward sizing. He writes it in a Google Doc — his natural workspace.

**Climax:** During his welcome call, his buddy — another quant who joined a month earlier — walks him through how the Fintech working group operates. His first real contribution is a parameter analysis for the multi-scale reward system. His buddy shows him how to commit a markdown document to GitHub — the basics take 20 minutes to learn. Edin's integration layer ingests it automatically. (In Phase 2, Amir will submit through native document platform integration; in MVP, all contributors use GitHub for contribution submission.) When the contribution appears on the Activity Feed — the Contribution Wall — it sits alongside Lena's code commits with the same visual weight, the same status, the same reward pathway. He's not a second-class citizen. His domain expertise is architecturally equal to code.

**Resolution:** By month three, Amir leads a working group session on calibrating the scaling-law exponents for the reward system. His analysis directly shapes how every contributor in the ecosystem will be compensated. He has governance weight — his sustained engagement has compounded his influence. He starts cross-pollinating, engaging with the Technology working group to ensure the smart contract implementation faithfully represents the mathematical model. When a new financial engineer applies, Amir is on the welcome committee. He tells them: "This is the first place where what I know matters as much as what I can code."

### Journey 3: Sofia — Impact Analyst Proves the Pillar Is Real

**Opening Scene:** Sofia has six years in social impact consulting at a multilateral development bank. She's passionate about financial inclusion and believes decentralized systems can serve underbanked populations — but she's been burned before. In two previous Web3 communities, she was brought in as "the impact person" — a marketing prop. Her input was solicited, published in a blog post, and then completely ignored in technical and governance decisions. She's not doing that again.

**Rising Action:** A colleague shares the Edin Founding Circle page. Sofia is cautious. She reads every detail. Then she sees it: Impact & Sustainability is one of four structural pillars — not a "nice to have" category appended to the bottom of a developer platform. There's a working group, a domain lead position, contribution tasks specifically for impact analysis. The admission micro-task asks her to draft a preliminary social impact assessment framework for decentralized financial infrastructure. This isn't a token gesture — it's a real deliverable that requires her actual expertise.

**Climax:** Six weeks in, Sofia has submitted three contributions: a social impact assessment framework, a financial inclusion metrics proposal, and a governance recommendation on how Rose's 30/70 reserve rule aligns with sustainable development principles. Each received peer feedback within 24 hours. Each appeared on the Contribution Wall. Then the pivotal moment: the governance working group formally proposes adopting her social impact framework as a core criterion for evaluating Rose ecosystem initiatives. It goes to community discussion. Contributors across all four domains engage with it — developers asking how to measure the impact of their code, financial engineers connecting it to token distribution equity. Her framework is adopted.

**Resolution:** Sofia becomes the Impact & Sustainability domain lead. Her assessment framework is embedded in how the entire community measures success — not just for impact work, but as a lens applied across all domains. When she surveys the Contribution Wall, she sees impact analysis contributions earning evaluation scores and rewards on par with code and financial modeling. She stays because her expertise has structural power, not performative visibility.

### Journey 4: Yuki — Governance Specialist Tests the Decentralization Promise

**Opening Scene:** Yuki is a former lawyer turned Web3 governance designer. She's contributed to MakerDAO, Optimism Collective, and Gitcoin governance. She has deep expertise in MiCA regulation, EU digital identity, and DAO legal wrappers. She is also deeply cynical. She has watched three DAOs promise progressive decentralization and deliver autocracy with a governance theater wrapper. She will not lend her reputation to another one.

**Rising Action:** She's introduced to Edin through a governance research network. She reads the entire platform description, specifically hunting for governance red flags. What she finds instead: a published roadmap for progressive decentralization with specific milestones, a founding contributor governance model where early members have genuine influence over governance design itself, and an explicit acknowledgment that Phase 1 governance is "direct, human, and deliberate" — no pretense of DAO governance before the infrastructure exists. The honesty is disarming. She applies with a micro-task: a legal analysis of token classification under MiCA for the proposed reward token.

**Climax:** In her second month, Yuki drafts a governance proposal: a framework for how governance weight should accumulate based on sustained contribution quality (not token holdings) and how decision-making authority should progressively shift from the founding team to the community. The proposal goes through the community discussion process she helped design. Contributors across all domains engage — debating specifics, proposing amendments. The final version is adopted by community consensus. She can trace every step: proposal submission, discussion threads, amendments, final ratification — all recorded, all transparent, all immutable.

**Resolution:** Yuki becomes the de facto governance architect of Edin. Her MiCA analysis shapes the token economics design. Her progressive decentralization framework establishes the actual timeline for power transfer. She stays because she's building the governance system itself — her fingerprints are on the constitution, not just a comment in a forum. When asked about Edin at a governance conference, she says: "It's the first project where progressive decentralization is an engineering specification, not a marketing promise."

### Journey 5: The Applicant — From Discovery to First Contribution

**Opening Scene:** Daniel is a full-stack developer with four years of experience. He's not a senior expert like Lena — he's a solid mid-level contributor looking for a community where he can grow. He discovers Edin through a blog post shared by a friend of a friend. The public project page impresses him: clear mission, visible founding contributors with real credentials, and a contribution model that promises fair evaluation regardless of seniority.

**Rising Action:** He clicks "Apply" and receives a domain-specific micro-task: implement a small feature in the Edin web portal (a contributor profile enhancement) and submit it as a PR to the public repository. It's designed to be completable in 2-4 hours — not trivial, but not overwhelming. He submits his PR. Within 48 hours, two existing contributors review his application — evaluating both the code quality and his communication in the PR description. He's admitted.

**Climax:** The 72-Hour Ignition begins. Within 24 hours, he's on a welcome call with a peer welcome committee (two contributors who volunteer for onboarding duty). They introduce him to the Technology working group, walk through the contribution menu, and help him select a first task matched to his skill level. He's paired with a buddy — an experienced contributor who'll be his go-to person for 30 days. Within 72 hours of admission, he submits his first real contribution. Peer feedback arrives within a day: constructive, specific, encouraging. His contribution appears on the Activity Feed.

**Resolution:** Daniel's first month is structured: buddy check-ins, working group meetings, a curated progression of tasks that stretch his skills without overwhelming him. In week three, his task is a pair contribution with Lena — co-authoring a module refactoring. The system correctly attributes credit to both contributors based on their respective commits, and Daniel confirms the attribution split on his dashboard. By week four, he's reviewing other contributors' work — learning from senior contributors' code through the feedback process. The belonging score survey arrives: he rates "How valued do you feel?" a 5 out of 5. He tells a developer friend: "Apply. Seriously."

### Journey 6: Rose Core Team / Platform Admin — Operating the Engine

**Opening Scene:** Marie is a Rose core team member responsible for community operations. She oversees Edin's day-to-day health: admissions pipeline, contribution menu curation, working group coordination, and platform metrics. Before Edin, she was managing contributor coordination through spreadsheets, Slack messages, and manual tracking. It was unsustainable beyond 10 people.

**Rising Action:** Marie's morning starts on the admin dashboard. She reviews the overnight metrics: 3 new applications in the admission queue, 12 contributions submitted across all domains, 2 peer feedback assignments overdue. She triages the applications — each has a completed micro-task attached. She assigns reviewers from the contributor pool and flags one application for the Fintech working group lead (domain expertise needed for evaluation). She checks the contribution menu: two tasks marked "completed" need replacement. She drafts two new tasks, tags them by domain, difficulty, and estimated effort, and publishes them.

**Climax:** The weekly health dashboard shows a potential issue: the Impact & Sustainability pillar has only one active contributor this week (Sofia is on vacation). Marie uses the cross-domain engagement data to identify two contributors who've shown interest in impact topics and sends them a targeted message about available Impact tasks. She also notices that peer feedback turnaround has slipped from 24 hours to 48 hours — she raises this in the next working group leads meeting and proposes adjusting the feedback assignment algorithm.

**Resolution:** By the end of the quarter, Marie presents the sprint status to the founding team: 24 active contributors, 67% 30-day retention, contributions across all four domains, AI evaluation prototype achieving 72% agreement with human experts. The decision gates are green. She no longer manages contributors through spreadsheets — Edin's dashboard gives her real-time visibility into community health, and the AI evaluation engine has reduced the manual review burden by 60%.

### Journey 7: Investor — Due Diligence Through Transparency

**Opening Scene:** Henrik is a partner at a European impact-focused venture fund. He's evaluating Rose for a seed investment and has been directed to Edin as evidence of execution capacity and community traction.

**Rising Action:** He accesses the public project showcase on the Edin web portal — no login required. He sees: 22 active contributors listed with real names and professional backgrounds spanning technology, financial engineering, impact analysis, and governance. The Activity Feed shows a steady stream of recent contributions across all four domains. Key metrics are displayed: contribution velocity, domain distribution, retention rates. He drills into three contributor profiles to assess the caliber of the team.

**Climax:** What differentiates this from every other Web3 project pitch he's seen: the AI evaluation data. He can see objective quality scores on contributions — not self-reported metrics, not vanity numbers, but algorithmic assessment of actual output. The contributor roster isn't a list of advisors who lent their name for tokens — these are people who produced evaluated, scored work. The scaling-law reward model is explained with a clear visual dashboard showing how compounding rewards incentivize retention. He schedules a deeper diligence call with the core team.

**Resolution:** Henrik's investment memo highlights three differentiators: (1) a working contributor community with measurable output, not a whitepaper promise; (2) an AI evaluation methodology that provides objective quality signals; (3) a mathematically grounded reward model with a genuine intellectual moat. He recommends proceeding to term sheet.

### Journey Requirements Summary

| Journey | Key Capabilities Revealed |
|---|---|
| **Lena (Developer)** | GitHub integration, AI code evaluation, evaluation transparency/explainability, contribution wall, scaling-law reward display |
| **Amir (Financial Engineer)** | GitHub-based document contribution (MVP), non-code contribution ingestion, multi-domain contribution menu, domain-equal visibility on Activity Feed |
| **Sofia (Impact Analyst)** | Peer feedback system, governance proposal workflow, community discussion mechanism, cross-domain contribution visibility |
| **Yuki (Governance)** | Proposal submission and ratification tracking, governance weight accumulation, progressive decentralization milestones, immutable decision records |
| **Daniel (Applicant)** | Application workflow with micro-task, admission review pipeline, 72-Hour Ignition onboarding, buddy assignment, first-task matching, multi-contributor attribution confirmation |
| **Marie (Admin)** | Admin dashboard, admission queue management, contribution menu curation, health metrics monitoring, feedback assignment tracking |
| **Henrik (Investor)** | Public project showcase (no auth), contributor roster with profiles, real-time activity metrics, AI evaluation quality signals |

**Cross-Journey Capability Map:**

- **Integration Layer:** GitHub connector (Lena, Daniel, Amir via markdown), document platform connector (Amir — Phase 2), communication tool connector (Sofia — Phase 2)
- **Web Portal:** Contributor profiles (all), Activity Feed / Contribution Wall (all), public showcase (Henrik), admin dashboard (Marie), application workflow (Daniel)
- **AI Evaluation Engine:** Code quality analysis (Lena, Daniel), documentation evaluation (Amir), evaluation transparency (Lena, Henrik)
- **Peer Feedback System:** Feedback rubric (Daniel, Sofia), review assignment (Marie), feedback visibility (all contributors)
- **Governance Layer:** Admission process (Daniel, Marie), proposal workflow (Yuki, Sofia), working group management (Marie), role management (all)
- **Reward System:** Scaling-law display (Lena, Amir), reward dashboard (all contributors), compounding visualization (Henrik)

## Domain-Specific Requirements

### Compliance & Regulatory

**MiCA (Markets in Crypto-Assets Regulation):**

- Token classification is a first-class design constraint and a decision gate. The reward token's classification — utility token, e-money token, or asset-referenced token — determines the entire compliance framework. If MiCA requires an e-money or asset-referenced license, token economics must be redesigned or non-token reward mechanisms pursued.
- Beyond token classification, MiCA imposes requirements on marketing communications and information disclosures for crypto-assets. Edin's presentation of reward mechanics to contributors — including the scaling-law compounding model, token utility descriptions, and reward projections — must comply with MiCA's fair, clear, and not misleading disclosure standards.
- The IOUR Foundation's Belgian non-profit structure influences how rewards can be distributed and how contributors interact with the token economy. Belgian financial regulatory authority (FSMA) oversight applies.

**eIDAS 2.0 (Digital Identity):**

- Relevant for contributor identity verification within the curated admission model. As EU digital identity wallets mature, Edin should architect identity management to accommodate eIDAS 2.0 compliant verification as an option alongside traditional methods.

**GDPR (General Data Protection Regulation):**

- Edin ingests contributor outputs from GitHub, and in later phases from Google Workspace, Slack, and other tools. This constitutes personal data processing under GDPR — contribution artifacts, evaluation scores, behavioral patterns, and communication metadata are all personal data.
- Data processing agreements (DPAs) must be established with contributors at onboarding, clearly specifying what data is collected, how it's processed, and for what purposes.
- Right to erasure creates a tension with blockchain immutability. Reward distribution records on L2 are permanent by design, but contributor-identifiable data must be separable from on-chain records. Architecture must support pseudonymization: on-chain records reference contributor IDs, while the mapping between IDs and personal identity is stored off-chain and deletable.
- Cross-border data transfer: contributors will be globally distributed. Standard Contractual Clauses (SCCs) or adequacy decisions must cover data transfers outside the EU/EEA.
- Contributor profiles, evaluation histories, and contribution data must have clear retention policies with automated enforcement.

**EU AI Act:**

- Edin's AI Evaluation Engine makes automated assessments that directly affect contributor compensation — this likely falls under the EU AI Act's scope. The evaluation system influences economic outcomes for individuals, which may classify it as a limited-risk or high-risk AI system depending on the degree of human oversight.
- Minimum requirements regardless of risk classification: transparency obligations (contributors must know they are being evaluated by AI and understand the criteria), human oversight mechanisms (contributors should be able to challenge AI evaluations), and documentation of the AI system's purpose, capabilities, and limitations.
- The >70% agreement threshold with human expert assessment serves dual purposes: hypothesis validation and regulatory compliance evidence. Maintaining human expert benchmarking provides the required human oversight documentation.
- If classified as high-risk: technical documentation, conformity assessment, registration in the EU database, and ongoing monitoring obligations apply. Architecture should anticipate these requirements even if initial classification is lower risk.

### Technical Constraints

**Security Requirements:**

- Authentication and authorization: role-based access control (RBAC) for contributors, admins, reviewers, and public viewers. Founding Contributor privileges as a distinct permission tier.
- API security: OAuth 2.0 / OIDC for integration layer connectors (GitHub, Google Workspace, Slack). Secure token storage for third-party API credentials.
- Encryption: TLS for all data in transit. AES-256 or equivalent for sensitive data at rest (contributor personal data, evaluation scores, token balances).
- Audit logging: immutable logs of all admission decisions, evaluation outputs, reward distributions, and governance actions. Required for both regulatory compliance and contributor trust.

**Privacy Requirements:**

- Data minimization: collect only the contribution artifacts needed for evaluation, not full repository access or communication history.
- Purpose limitation: contributor data collected for evaluation and reward purposes must not be repurposed without explicit consent.
- Pseudonymization architecture: separate contributor identity from contribution data in storage and on-chain records.

**Blockchain Technical Constraints:**

- L2 infrastructure selection: transaction costs must remain <5% of reward value (decision gate). This constrains the choice of L2 and the granularity of on-chain reward distribution.
- Smart contract audit: formal third-party security audit required before deploying reward distribution contracts on L2. Budget and timeline must account for audit cycle (typically 4-8 weeks for a reputable auditor).
- Gas optimization: multi-temporal reward distribution (7 scales) generates high transaction volume. Batch processing, merkle distribution, or claim-based patterns may be needed to manage costs.
- Upgrade mechanisms: smart contracts governing reward distribution must support upgradeability (proxy patterns) to accommodate reward model calibration without redeployment.
- Staking/vesting readiness: storage schemas and smart contract interfaces must be designed with extensibility for future staking pools, vesting schedules, and lock-up periods (Phase 2-3 scope). Architecture decisions in Phase 1 must not preclude these mechanisms.

**AI/ML Technical Constraints:**

- Model transparency: evaluation criteria and scoring methodology must be explainable to contributors. Black-box models are incompatible with the trust requirement.
- Bias monitoring: AI evaluation must be monitored for systematic bias across domains, contribution types, and contributor demographics. A code-centric bias (overvaluing code contributions despite multi-domain equality goals) is the most likely failure mode.
- Calibration pipeline: continuous benchmarking against human expert assessment to maintain >70% agreement threshold. Drift detection and retraining triggers.
- Evaluation versioning: contributors must know which version of the evaluation model scored their work. Score comparisons across model versions must be handled transparently.

### Integration Requirements

**Phase 1 (MVP):**

- GitHub: repository connector via GitHub API and webhooks. Ingest commits, pull requests, reviews, CI/CD outputs. Contribution attribution from Git metadata. Rate limiting and pagination handling for large repositories.
- Normalized contribution format: all ingested artifacts must be transformed into a common schema for the Evaluation Engine. Schema must support extensibility for future integration sources.

**Phase 2:**

- Google Workspace: document and spreadsheet ingestion via Google Drive API. Requires contributor OAuth consent for read access to specific shared folders.
- Slack: message and thread ingestion for community participation tracking. Requires Slack app installation with scoped permissions. Must handle rate limits and message history pagination.
- Unified ingestion pipeline: all sources feed through the same normalization layer, ensuring evaluation consistency regardless of source.

**Phase 3:**

- Open connector architecture: documented API and SDK for adding new tool integrations. Community contributors should be able to build and propose new connectors.
- Cross-platform attribution: when a single contribution spans multiple tools (e.g., a GitHub PR linked to a Slack discussion and a Google Doc specification), the system must correlate artifacts and attribute credit appropriately.

### Risk Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| MiCA token classification requires full licensing | Blocks entire token reward system | Design dual-path architecture: token rewards as primary, non-token recognition (reputation points, badges, governance weight) as fallback |
| AI evaluation perceived as unfair or biased | Destroys contributor trust — existential risk | Evaluation transparency by default, human appeal process, continuous calibration against expert benchmarks, bias monitoring dashboard |
| GDPR right-to-erasure conflicts with blockchain immutability | Regulatory non-compliance | Pseudonymization architecture: on-chain records use opaque IDs, identity mapping stored off-chain and deletable |
| Smart contract vulnerability in reward distribution | Financial loss, trust collapse | Mandatory third-party audit, bug bounty program, time-locked upgrades, multi-sig admin controls |
| GitHub API rate limiting disrupts ingestion | Missed contributions, incomplete evaluations | Webhook-first architecture (push, not poll), caching layer, graceful degradation with retry queue |
| EU AI Act classifies Evaluation Engine as high-risk | Significant compliance burden and timeline impact | Architect for high-risk from the start: documentation, human oversight, conformity assessment readiness |
| Contributor data breach | Regulatory penalties, reputation destruction | Encryption at rest and in transit, minimal data collection, access controls, incident response plan |

### Fraud Prevention & Abuse Mitigation

As a fintech platform distributing blockchain-based token rewards, Edin must address fraud vectors specific to contribution economies. The curated admission model provides first-line defense (sybil resistance through human review), and AI evaluation reduces subjective manipulation. These indirect mitigations are insufficient alone — the following explicit safeguards are required, becoming critical in Phase 2 when token rewards go live.

| Fraud Vector | Risk | Mitigation |
|---|---|---|
| Contribution gaming | Fabricated or inflated contributions to earn undeserved rewards | Anomaly detection on contribution patterns: unusually high volume, low-complexity padding, self-merged PRs. AI evaluation inherently penalizes low-quality output; flag statistical outliers for human review |
| Sybil attacks | Fake contributor accounts to accumulate multiple reward streams | Curated admission (first line), identity verification escalation for reward distribution (Phase 2), behavioral analysis for account similarity patterns, single-identity-per-reward-stream enforcement |
| Evaluation manipulation | Adversarial inputs designed to inflate AI evaluation scores | Adversarial input detection in the evaluation pipeline, model robustness testing against gaming patterns, human expert spot-checks on statistical outlier scores, evaluation model versioning with rollback capability |
| Reward system abuse | Exploiting multi-temporal reward distribution mechanics (e.g., contribution timing to maximize compounding) | Reward anomaly detection: unusual accumulation patterns, distribution spikes, temporal gaming indicators. Rate limiting on reward claims. Reward formula transparency reduces attack surface (known rules are auditable) |
| Peer feedback collusion | Contributors coordinating to inflate each other's evaluations or feedback scores | Pattern analysis for reciprocal feedback inflation, network graph analysis for coordinated feedback clusters, randomized reviewer assignment to break collusion patterns, feedback weight normalization |

**Phase approach:** Phase 1 relies on curated admission + AI evaluation + randomized peer feedback assignment as natural defenses. Phase 2 (token distribution) requires active monitoring dashboards for all five fraud vectors, automated anomaly flagging, and admin intervention workflows. Phase 3 adds decentralized fraud detection through multi-model consensus scoring.

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. AI-Objective Contribution Evaluation (Novel Application)**

No existing contributor platform uses AI to objectively evaluate contribution quality at scale. The market relies entirely on human judgment: peer voting (Coordinape), community sentiment (Gitcoin), or maintainer discretion (GitHub). Edin's Evaluation Engine applies AI to assess code complexity, documentation quality, collaboration patterns, and goal alignment — producing transparent, explainable scores that contributors can understand and trust. This is not AI as a feature; it's AI as the foundational mechanism that makes fair compensation possible.

**2. Scaling-Law Economics Applied to Human Contribution (First-of-Kind)**

The multi-temporal reward system using power-law distribution across seven time scales is derived directly from the 12 empirical scaling laws at the heart of Rose's ORTFM. Just as the Coastline Law reveals that tradeable opportunity increases non-linearly as observation thresholds decrease, Edin's reward magnitudes follow a power-law relationship where longer time horizons yield disproportionately larger rewards. This mathematical foundation — applying financial microstructure research to contribution economics — has no precedent in any contributor platform. It constitutes a genuine intellectual moat.

**3. Multi-Domain Equality as Architecture (Structural Innovation)**

Existing platforms treat non-code contributions as second-class citizens — they may acknowledge documentation or community work, but the platform architecture centers on code repositories, commits, and pull requests. Edin's four-pillar structure (Technology, Fintech, Impact, Governance) is not a UI categorization; it's an architectural decision that ensures financial engineering, impact analysis, and governance design have the same integration connectors, evaluation pipelines, reward pathways, and visibility as code contributions. Multi-domain equality is enforced by architecture, not policy.

**4. Curated Community as Economic Mechanism (Counter-Trend Innovation)**

The entire Web3 and open-source ecosystem trends toward open access. Edin deliberately inverts this with a curated admission model that creates a selectivity flywheel: high-quality members attract high-quality applicants, which justifies selectivity, which raises the signal value of membership. This is not elitism — it's a network effect strategy where quality control creates the conditions for fair evaluation and meaningful rewards. The admission micro-task (a domain-specific contribution) is itself an innovation: applicants demonstrate competence through work, not credentials.

**5. Human Empowerment Narrative in AI Era (Uncontested Positioning)**

As AI agents handle increasing amounts of routine development, Edin positions itself as the platform that creates structured space for uniquely human capabilities: mentoring, governance design, creative problem-solving, leadership. This narrative — human empowerment through fair economics in an AI-automated world — is entirely uncontested in the Web3 contributor space. It's not just a differentiator; it's a thesis about the future of work.

### Market Context & Competitive Landscape

| Competitor | What They Do | Innovation Gap vs. Edin |
|---|---|---|
| **Gitcoin** | Community-voted grant rounds | No AI evaluation, no multi-temporal rewards, popularity-driven |
| **Coordinape** | Peer-based epoch rewards | Subjective circle voting, no scaling-law economics, doesn't scale |
| **SourceCred** | Algorithmic graph-based scoring | No multi-domain support, no blockchain rewards, limited adoption |
| **Colony** | Task-based evaluation with reputation | No AI evaluation, no scaling-law compounding, structurally complex |
| **GitHub Sponsors / Open Collective** | Donation-based funding | No evaluation whatsoever, irregular, dependent on individual donors |

The strategic white space — AI-objective evaluation + multi-temporal scaling-law rewards + curated community — is entirely unoccupied. No competitor combines more than one of these three innovations.

*Validation approach and risk mitigation for each innovation area are detailed in the Project Scoping & Phased Development section under MVP Hypothesis Validation and Risk Mitigation Strategy.*

## Web Application Specific Requirements

### Project-Type Overview

Edin is a web application with three distinct interface contexts: a **public-facing portal** (project showcase, contributor roster, metrics — accessible without authentication), a **contributor dashboard** (authenticated experience for profiles, contribution tracking, evaluations, rewards, governance), and an **admin dashboard** (platform operations, admission management, health metrics). The platform is integration-first — it does not replace work tools but connects to them — so the web portal is the primary interface for visibility, community interaction, and platform intelligence, not for content creation.

### Technical Architecture Considerations

**SPA vs MPA:**

- Hybrid approach recommended. The public-facing pages (project showcase, Founding Circle, domain manifestos) benefit from server-side rendering (SSR) or static generation for SEO and fast initial load. The authenticated contributor and admin dashboards are better served as a single-page application (SPA) for responsive, real-time interactions (Activity Feed updates, evaluation score displays, reward dashboard).
- Framework choice should support both SSR and SPA patterns (Next.js, Nuxt, or SvelteKit are strong candidates).

**Browser Support:**

- Modern evergreen browsers: Chrome, Firefox, Safari, Edge (latest 2 versions).
- Mobile browser support is important — contributors will check dashboards, review feedback, and monitor the Activity Feed from mobile devices. Responsive design is mandatory.
- No IE11 or legacy browser support required. Target audience (developers, financial engineers, governance specialists) uses modern browsers.

**SEO Strategy:**

- SEO matters for the public-facing portal: project showcase, contributor roster, domain manifestos, and the Founding Circle page should be indexable and optimized for discovery by potential contributors and investors.
- Authenticated pages (contributor dashboard, admin dashboard) do not require SEO.
- Key SEO targets: "open-source contributor platform," "decentralized contributor rewards," "AI evaluation contributions," project-specific terms.

**Real-Time Requirements:**

- **Activity Feed / Contribution Wall:** Near-real-time updates as contributions are ingested and evaluated. WebSocket or Server-Sent Events (SSE) for live feed updates.
- **Evaluation notifications:** Contributors should receive timely notifications when their contributions are evaluated or when peer feedback is available.
- **Admin health metrics:** Dashboard should update without manual refresh — polling at minimum, real-time preferred.
- **Not required for real-time:** Application workflow, profile editing, governance proposals (these can be standard request-response).

**Accessibility:**

- WCAG 2.1 Level AA compliance as a baseline. The platform's emphasis on inclusivity and multi-domain equality extends to accessibility.
- Key considerations: screen reader compatibility for the Activity Feed and evaluation displays, keyboard navigation for all interactive elements, sufficient color contrast for data visualizations (evaluation scores, reward charts).

### Responsive Design

- Mobile-first responsive design for the contributor dashboard and Activity Feed. Contributors will check evaluations, review feedback, and monitor their reward trajectory from mobile devices.
- Desktop-optimized layouts for the admin dashboard (complex data tables, metrics grids, admission queue management).
- Public showcase pages must render well across all device sizes for investor and applicant access.

### Performance Targets

*Detailed performance targets with measurable thresholds are defined in the Non-Functional Requirements section (NFR-P1 through NFR-P7).*

### Authentication & Authorization

- **Authentication:** OAuth 2.0 / OIDC with support for GitHub OAuth (primary — aligns with integration layer), email/password as fallback, and future eIDAS 2.0 digital identity wallet integration.
- **Authorization (RBAC):**

| Role | Access Scope |
|---|---|
| Public (unauthenticated) | Project showcase, contributor roster, domain manifestos, public metrics |
| Applicant | Application workflow, micro-task submission |
| Contributor | Dashboard, profile, contribution history, evaluations, peer feedback, working group channels, governance participation |
| Founding Contributor | All contributor access + founding privileges (governance weight bonus, early access to new features) |
| Working Group Lead | Contributor access + working group management, contribution menu curation for their domain |
| Admin | Full platform access: admission queue, health metrics, contribution menu management, feedback assignment, system configuration |

### Implementation Considerations

**Skip sections (per CSV):** Native features and CLI commands are not applicable to Edin.

**API Architecture:**

- RESTful API backend serving the web portal and supporting future mobile clients or third-party integrations.
- Separate API endpoints for: contributor management, contribution ingestion, evaluation engine interface, reward system queries, governance operations, admin operations.
- API versioning from day one to support iterative development without breaking existing clients.

**Data Architecture:**

- Primary relational database for contributor profiles, contributions, evaluations, feedback, governance records.
- Time-series or event-sourced storage for the Activity Feed and contribution history (high write volume, append-heavy).
- Caching layer (Redis or equivalent) for frequently accessed data: contributor profiles, evaluation scores, Activity Feed, public metrics.
- Separate data layer for blockchain interaction: token balances, reward distribution records, smart contract event logs.

**Deployment & Infrastructure:**

- Cloud-native deployment (containerized services on managed Kubernetes or equivalent).
- CI/CD pipeline with automated testing, linting, and security scanning.
- Staging environment that mirrors production for pre-release validation.
- Infrastructure-as-code for reproducible environments.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform validation MVP — prove the core thesis that a curated community with AI-powered evaluation can attract and retain high-quality multi-domain contributors.

**MVP Philosophy:** Ship the minimum that makes founding contributors say "this is worth my time" and investors say "this community is real." The MVP is not the product — it's the experiment. Every feature included must directly serve one of the three core hypotheses (H1: contributors join and stay, H2: AI evaluates fairly, H3: reward model is comprehensible and motivating).

**MVP Hypothesis Validation Framework:**

| Hypothesis | Validation Metric | Failure Threshold | Failure Response |
|---|---|---|---|
| H1: Contributors join and stay | >15 active contributors at 60 days; >50% 30-day retention | <15 active contributors after 60 days | STOP. Reassess mission-based attraction strategy. Evaluate whether value proposition resonates with target personas |
| H2: AI evaluates fairly | >70% agreement between AI evaluation and human expert assessment | <60% agreement with human experts | STOP AI-based rewards. Fall back to peer evaluation as primary mechanism. Iterate on model training |
| H3: Reward model is comprehensible and motivating | >80% of contributors can explain the scaling-law model; >50% cite rewards as top-3 engagement factor | <60% comprehension after explanation materials | Simplify. Start with 3 temporal scales instead of 7. Reduce model complexity until comprehension exceeds threshold |

**Resource Requirements:**

- Core team: 2-3 full-stack developers, 1 AI/ML engineer (evaluation prototype), 1 community/operations lead, 1 product lead
- Part-time: UX designer, DevOps engineer, legal/regulatory advisor (MiCA opinion)
- Timeline: Phase 0 (Foundation, Q1 2026) + Phase 1 (MVP, Q2 2026) = ~6 months to live MVP
- Budget alignment: within the €1M seed/MVP fundraising target

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

| Journey | MVP Support Level | Rationale |
|---|---|---|
| Lena (Developer) | Full | Primary contributor type; GitHub integration is the core integration |
| Amir (Financial Engineer) | Partial | Can contribute via GitHub (docs/specs); full document platform integration deferred to Phase 2 |
| Sofia (Impact Analyst) | Partial | Can contribute via GitHub (markdown docs); peer feedback system bridges AI gap |
| Yuki (Governance) | Partial | Governance proposals via GitHub; formal governance workflow deferred |
| Daniel (Applicant) | Full | Complete 72-Hour Ignition onboarding flow |
| Marie (Admin) | Full | Admin dashboard for community operations |
| Henrik (Investor) | Full | Public showcase with contributor roster and metrics |

**Must-Have Capabilities (Phase 1):**

1. **Web Portal** — Public showcase + contributor dashboard + admin dashboard
2. **GitHub Integration** — Repository connector, contribution attribution, ingestion pipeline
3. **AI Evaluation Engine (Prototype)** — Code quality + documentation evaluation with transparent scoring
4. **Peer Feedback System** — Lightweight rubric, assignment mechanism, dashboard visibility
5. **Community Structure** — Four-pillar working groups, contribution menu, buddy system
6. **Admission & Onboarding** — Contribution-based application, 72-Hour Ignition, Founding Contributor designation
7. **Authentication & Authorization** — GitHub OAuth, RBAC (6 roles as defined)

**Explicitly Deferred from MVP:**

- Blockchain token rewards (dependent on MiCA classification and L2 selection)
- Google Workspace, Slack, Discord integrations (GitHub alone provides sufficient data)
- Full multi-temporal reward distribution (start with recognition, not tokens)
- DAO governance / on-chain voting (Phase 1 governance is direct and human). FR53-FR56 define governance proposal workflow capabilities for Phase 2. In Phase 1, governance is direct and human-facilitated without formal proposal infrastructure
- Staking/vesting mechanisms for token rewards (Phase 2-3 scope). Architecture must accommodate future staking pools, vesting schedules, and lock-up periods
- Contributor Portable Reputation (requires mature evaluation data)
- AI Agent contributor class (humans first)
- Evaluation-as-a-Service (validate internally before offering externally)

**Manual Processes Acceptable in MVP:**

- Admission review: manual by existing contributors (no automated screening)
- Working group coordination: human-facilitated (Marie's admin role)
- Contribution menu curation: manually maintained (not algorithmically generated)
- Cross-domain contribution correlation: manual attribution where automated detection is insufficient

### Post-MVP Features

**Phase 2 — Intelligence (Q3-Q4 2026):**

- Blockchain token reward distribution on L2 across 3+ temporal scales
- Google Workspace and Slack integration connectors
- Advanced AI evaluation: multi-domain coverage, collaboration scoring, goal alignment
- Evaluation Engine deployed as modular API service
- Governance proposal workflow with structured discussion and ratification
- Advanced contributor analytics and skill trajectory visualization
- Automated feedback assignment optimization

**Phase 3 — Scale (2027+):**

- Full 7-scale temporal reward distribution with scaling-law compounding
- DAO governance with on-chain voting and progressive decentralization
- Contributor Portable Reputation profiles
- AI Agent contributor class
- Evaluation-as-a-Service / external licensing
- Open connector architecture (community-built integrations)
- Decentralized Evaluation Network (multi-model consensus scoring)
- Cross-ecosystem reputation standard

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| AI evaluation prototype doesn't reach >70% agreement | Blocks H2 validation; undermines core thesis | Start with narrow scope (code quality only); use established code analysis tools as baseline; iterate with human expert calibration loop |
| GitHub integration reliability issues | Missed contributions erode trust | Webhook-first architecture; retry queue; manual submission fallback for edge cases |
| Real-time Activity Feed performance at scale | Degraded contributor experience | Start with polling-based updates; upgrade to WebSocket/SSE when contributor count exceeds polling efficiency threshold |

**Market Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| Founding contributors don't join (H1 fails) | Existential — no community, no platform | Personal outreach by founding team; lead with 3-5 respected names; domain-specific manifestos that speak each persona's language |
| Non-developer contributors don't feel equal | Multi-domain equality thesis fails | Ensure peer feedback covers all domains equally in MVP; visible non-code contributions on Activity Feed from day one |
| Scaling-law reward model incomprehensible | H3 fails; contributors don't understand or trust rewards | Visual reward trajectory dashboard; simplified explanation materials; start presenting model early, iterate on communication |

**Resource Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| Fewer developers than planned | MVP timeline extends | Reduce MVP scope: ship web portal + GitHub integration + peer feedback first; defer AI evaluation prototype by 4-6 weeks |
| No AI/ML engineer available | Cannot validate H2 | Use existing code analysis APIs (SonarQube, CodeClimate) as evaluation proxy; build custom model later |
| Community operations overwhelm single person | Admission and coordination bottleneck | Automate admission pipeline steps; recruit founding contributors into peer review and buddy roles early |

**Absolute Minimum Viable Feature Set (if resources are severely constrained):**

If the team is reduced to 1-2 developers + 1 operations lead, the irreducible MVP is:

1. Static web portal (public showcase + basic contributor profiles)
2. GitHub integration (contribution ingestion only, no evaluation)
3. Peer feedback system (manual, rubric-based)
4. Manual admission process
5. Community channels (Slack/Discord — no custom platform)

This validates H1 (can we attract and retain contributors?) without H2 (AI evaluation) or H3 (reward model), but preserves the minimum experiment to justify further investment.

## Functional Requirements

### Contributor Identity & Profiles

- FR1: Visitors can view public contributor profiles showing name, bio, domain, and contribution history
- FR2: Contributors can create and edit their personal profile with bio, domain expertise, and skill areas
- FR3: Contributors can view their own contribution history, evaluation scores, and peer feedback received
- FR4: Contributors can view other contributors' public profiles and contribution histories
- FR5: The system can assign and display role designations (Contributor, Founding Contributor, Working Group Lead)
- FR6: Contributors can authenticate via GitHub OAuth
- FR7: The system can enforce role-based access control across six permission tiers (Public, Applicant, Contributor, Founding Contributor, Working Group Lead, Admin)
- FR7b: Admins can designate contributors as Founding Contributors based on documented criteria (participation in founding period, contribution threshold). Founding Contributor status is permanent and confers governance weight bonus and early access to new features as defined in the RBAC table

### Admission & Onboarding

- FR8: Applicants can submit a contribution-based application including a domain-specific micro-task
- FR9: Existing contributors can review and evaluate admission applications
- FR10: Admins can manage the admission queue (view, assign reviewers, approve, reject)
- FR11: Admitted contributors can be paired with a buddy for their first 30 days
- FR12: Admitted contributors can access a curated first-task recommendation matched to their domain and skill level
- FR13: Admins can configure domain-specific micro-tasks for the application process
- FR14: The system can track onboarding progress against the 72-Hour Ignition timeline

### Contribution Ingestion & Attribution

- FR15: The system can connect to GitHub repositories and ingest commits, pull requests, code reviews, and CI/CD outputs
- FR16: The system can attribute contributions to specific contributors based on version control metadata
- FR17: The system can normalize ingested artifacts into a consistent evaluation-ready format
- FR18: Contributors can view the status of their ingested contributions on their dashboard
- FR19: The system can detect multi-contributor collaboration on shared deliverables using version control co-author data and linked issues, apply a default equal-split attribution, and allow contributors to confirm or request admin override of attribution. Acceptance criterion: >90% of attributions accepted without override
- FR20: Admins can configure which repositories are monitored by the integration layer

### AI Evaluation Engine

- FR21: The system can automatically evaluate code contributions for complexity, maintainability, test coverage, and standards adherence
- FR22: The system can automatically evaluate documentation contributions using a configurable rubric measuring structural completeness (required sections present), readability (Flesch-Kincaid grade level within target range per document type), and reference integrity (valid links and citations)
- FR23: Contributors can view transparent evaluation breakdowns showing how their work was scored and the criteria applied
- FR24: The system can benchmark AI evaluation outputs against human expert assessments
- FR25: Contributors can view their evaluation score history and trends over time
- FR26: The system can version evaluation models and indicate which model version scored each contribution
- FR27: Contributors can flag an evaluation they believe is incorrect for human review

### Peer Feedback System

- FR28: The system can assign peer reviewers to contributions not yet covered by AI evaluation
- FR29: Reviewers can complete a structured feedback rubric (5-7 questions) for assigned contributions
- FR30: Contributors can view peer feedback received on their dashboard
- FR31: Admins can monitor peer feedback turnaround times and identify overdue assignments
- FR32: The system can track feedback completion rates, timeliness (time from assignment to submission), and rubric coverage (percentage of rubric questions answered with substantive content exceeding minimum character threshold)

### Community Structure & Working Groups

- FR33: Contributors can view and join one of four domain working groups (Technology, Fintech, Impact, Governance)
- FR34: Contributors can browse a curated contribution menu of available tasks tagged by domain, difficulty, and estimated effort
- FR35: Admins and Working Group Leads can create, edit, and retire tasks on the contribution menu
- FR36: Contributors can claim tasks from the contribution menu
- FR37: The system can track task status (available, claimed, in progress, completed, evaluated)
- FR38: Working Group Leads can manage their domain working group including: viewing a WG dashboard (members, active tasks, recent contributions), prioritizing tasks on the contribution menu, posting announcements to WG members, and participating in domain-specific admission review

### Activity Feed & Community Visibility

- FR39: All stakeholders can view an Activity Feed (Contribution Wall) showing contributions across all domains, with updates within the latency threshold defined in NFR-P3
- FR40: The Activity Feed can display contributions from all four domains with equivalent visual prominence, measured by equal default display dimensions, identical status indicators, and no domain-based hierarchical ordering
- FR41: Contributors can receive notifications when their contributions are evaluated or when peer feedback is available
- FR42: The system can update the Activity Feed within <5 seconds of ingestion completion (per NFR-P3) as contributions are ingested and evaluated

### Public Showcase & Investor View

- FR43: Visitors can access a public project showcase page displaying mission, vision, and Founding Circle roster without authentication
- FR44: Visitors can view domain manifestos describing each of the four contribution pillars
- FR45: Visitors can view key platform metrics (active contributors, contribution velocity, domain distribution, retention rates)
- FR46: Visitors can browse the contributor roster with professional backgrounds and domain expertise
- FR47: Visitors can view aggregate AI evaluation data on public contribution pages including: evaluation scores by domain, score distributions, AI-human agreement rate, and total evaluations completed. Individual contribution scores are visible on contributor profiles with contributor consent

### Admin & Platform Operations

- FR48: Admins can view a health metrics dashboard showing community vitals (active contributors, retention, domain balance, feedback turnaround)
- FR49: Admins can manage contributor roles and permissions
- FR50: Admins can configure platform settings (monitored repositories, feedback assignment rules, onboarding parameters)
- FR51: Admins can generate and export platform metrics reports
- FR52: The system can maintain immutable audit logs of admission decisions, evaluation outputs, and governance actions
- FR52b: Admins can send targeted messages to specific contributors or contributor groups through the platform (Phase 2)

### Governance & Proposals

- FR53: Contributors can submit governance proposals for community discussion (Phase 2)
- FR54: Contributors can participate in structured discussions on governance proposals (Phase 2)
- FR55: The system can track governance proposal lifecycle (submitted, discussion, amended, ratified, rejected) with a contributor-visible decision trail showing each state transition and rationale (Phase 2)
- FR55b: Contributors can view a progressive decentralization roadmap displaying specific milestones, current stage, and timeline for governance authority transfer from the founding team to the community (Phase 1: static display; Phase 2: dynamic tracking)
- FR56: Contributors can accumulate governance weight calculated from cumulative contribution score above a defined quality threshold, active engagement duration in months, and domain breadth multiplier. Governance weight affects voting power and is visible to the contributor with full formula transparency (Phase 2)

### Reward System Foundations

- FR57: Contributors can view a reward trajectory visualization showing how scaling-law compounding rewards grow with sustained engagement
- FR58: The system can calculate contribution scores composed of AI evaluation output, peer feedback score, task complexity multiplier, and domain normalization factor, on a 0-100 scale with full provenance stored. Formula is configurable and version-tracked (Phase 1: basic scoring; Phase 2: full multi-temporal model)
- FR59: Contributors can view an explanation of the scaling-law reward methodology with visual representations validated against the >80% comprehension target (per Success Criteria reward comprehension rate). Visitors (unauthenticated) can access the reward methodology explanation on public pages
- FR60: The system can track contribution scores across multiple temporal horizons (session, daily, weekly, monthly, quarterly, yearly) (Phase 1: single-horizon tracking; Phase 2+: multi-temporal horizons)

### Compliance & Data Protection

- FR61: The system can present data processing agreements to contributors during onboarding for explicit consent
- FR62: Contributors can request export of their personal data (GDPR data portability)
- FR63: Contributors can request deletion of their personal data with pseudonymization of on-chain records (GDPR right to erasure)
- FR64: The system can maintain separation between contributor identity data and contribution/evaluation records so that on-chain records contain no directly identifiable data
- FR65: The system can generate EU AI Act compliance documentation including: (a) Model Card per evaluation model version, (b) Evaluation Criteria Specification, (c) Human Oversight Report, and (d) Data Processing Record. Documents are auto-generated from system data; legal review is manual

## Non-Functional Requirements

### Performance

| NFR | Requirement | Measurable Target |
|---|---|---|
| NFR-P1 | Public pages load quickly for first-time visitors (applicants, investors) | First Contentful Paint <1.5s on 4G connection |
| NFR-P2 | Authenticated dashboard interactions feel responsive for contributors monitoring evaluations and rewards | Time to Interactive <3s; user actions complete within 2s |
| NFR-P3 | Activity Feed updates reflect new contributions promptly so contributors see their work acknowledged quickly | <5 seconds from ingestion completion to feed visibility |
| NFR-P4 | API responses support responsive UI interactions across all portal contexts | 95th percentile response time <500ms |
| NFR-P5 | GitHub ingestion pipeline processes contributions without noticeable delay so contributors maintain trust in attribution | <15 minutes from contribution event to dashboard visibility |
| NFR-P6 | AI evaluation completes within a reasonable timeframe so contributors receive feedback before context is lost | <30 minutes for code evaluation; <15 minutes for documentation evaluation |
| NFR-P7 | Search and filtering on contribution menu and contributor roster is responsive for contributors selecting tasks | <1s for filtered results |

### Security

| NFR | Requirement | Measurable Target |
|---|---|---|
| NFR-S1 | All data in transit is encrypted | Current industry-standard transport encryption for all connections; no unencrypted endpoints |
| NFR-S2 | Sensitive data at rest is encrypted to protect contributor PII and financial data from unauthorized access | Current industry-standard encryption at rest for contributor PII, evaluation scores, token balances |
| NFR-S3 | Third-party API credentials are securely stored to prevent integration compromise | No plaintext credentials accessible in codebase, logs, or storage; all secrets encrypted at rest |
| NFR-S4 | Authentication follows industry standards | OAuth 2.0 / OIDC with PKCE; session tokens expire after 24 hours of inactivity; refresh tokens expire after 30 days; token rotation on every refresh |
| NFR-S5 | Authorization enforces role boundaries so contributors, admins, and public viewers see only permitted content | Zero unauthorized access across all six RBAC tiers verified by automated tests |
| NFR-S6 | All security-relevant actions are auditable for regulatory compliance and contributor trust | Immutable audit logs for admission decisions, evaluation outputs, role changes, governance actions; 100% event coverage; minimum 2-year retention; logs queryable within 10 seconds |
| NFR-S7 | The system resists common web application attacks to protect contributor data and platform integrity | OWASP Top 10 mitigations verified; input validation, CSRF protection, XSS prevention, SQL injection prevention |
| NFR-S8 | Contributor personal data is separated from contribution records | On-chain records contain no directly identifiable data; identity-to-contribution mapping is stored separately with access controls |
| NFR-S9 | Smart contracts undergo security validation before deployment (Phase 2+) | Third-party audit completed with no critical or high-severity findings unresolved |

### Scalability

| NFR | Requirement | Measurable Target |
|---|---|---|
| NFR-SC1 | System supports Phase 1 contributor base | 50 concurrent contributors with no performance degradation |
| NFR-SC2 | System supports Phase 2 growth | 200 concurrent contributors with <10% performance degradation vs. Phase 1 baseline |
| NFR-SC3 | Activity Feed scales with contribution volume to maintain contributor engagement as the community grows | Handles 500+ contributions/day without feed latency exceeding 10s |
| NFR-SC4 | GitHub integration handles multi-repository monitoring so contribution data is complete as the ecosystem grows | 20+ monitored repositories with >99% ingestion success rate and <15 min p95 latency per contribution event |
| NFR-SC5 | Database supports growing contribution and evaluation history for long-term contributor analytics | 2+ years of contribution data without query performance degradation beyond 20% |
| NFR-SC6 | Architecture supports horizontal scaling so the platform handles Phase 2 growth without re-architecture | Application services can be scaled to 3x instances with linear throughput increase and no architectural changes required |

### Reliability

| NFR | Requirement | Measurable Target |
|---|---|---|
| NFR-R1 | Web portal is available during active contributor hours | >99.5% uptime (measured monthly, excluding planned maintenance windows) |
| NFR-R2 | GitHub ingestion pipeline recovers from transient failures so no contributor work is lost | Automatic retry with exponential backoff; zero contribution loss from transient GitHub API failures |
| NFR-R3 | Evaluation Engine failures do not block contributor experience so the platform remains usable during AI outages | Graceful degradation: contributions display as "evaluation pending" rather than erroring |
| NFR-R4 | Data is protected against loss to preserve contributor trust and regulatory compliance | Automated daily backups with <4-hour recovery point objective (RPO); <2-hour recovery time objective (RTO) |
| NFR-R5 | Peer feedback assignment maintains high availability so contributors receive timely feedback | >95% assignment success rate; admin manual override available as fallback with <5 minute resolution time |

### Accessibility

| NFR | Requirement | Measurable Target |
|---|---|---|
| NFR-A1 | Web portal meets accessibility standards | WCAG 2.1 Level AA compliance for all public and authenticated pages |
| NFR-A2 | Activity Feed and evaluation displays are screen-reader compatible | All dynamic content changes announced to assistive technology within 2 seconds of update |
| NFR-A3 | All interactive elements are keyboard-navigable so contributors with motor disabilities can use the full platform | Complete task flows achievable via keyboard-only navigation |
| NFR-A4 | Data visualizations (evaluation scores, reward charts) are accessible so all contributors can understand their performance | Sufficient color contrast (4.5:1 minimum); alternative text representations for chart data |
| NFR-A5 | Accessibility compliance is verified continuously | Automated accessibility testing on every deployment; manual audit quarterly |

### Integration

| NFR | Requirement | Measurable Target |
|---|---|---|
| NFR-I1 | GitHub integration reliably captures all contribution artifacts so no contributor work goes unrecognized | >99% artifact ingestion success rate measured weekly |
| NFR-I2 | Integration layer handles GitHub API rate limiting gracefully so ingestion remains reliable under load | Webhook-first architecture; rate-limited requests queued and retried without data loss |
| NFR-I3 | Normalized contribution schema is extensible so Phase 2 integrations (Google Workspace, Slack) can be added efficiently | New integration source can be added by a single developer within 2 weeks without schema migration or breaking existing evaluation pipelines |
| NFR-I4 | API versioning prevents breaking changes for consumers so external integrations and future mobile clients remain compatible | All API endpoints versioned; deprecated endpoints supported for minimum 6 months |
| NFR-I5 | Integration authentication follows least-privilege principle to minimize data exposure risk | Each integration connector requests only documented minimum permissions; verified by automated permission scope audit on each deployment |

### Observability & Operations

| NFR | Requirement | Measurable Target |
|---|---|---|
| NFR-O1 | System health degradation is detected and alerted promptly so operations can respond before contributors are impacted | Alert fired within 60 seconds of threshold breach; monitored thresholds: API error rate >1%, ingestion pipeline failure, evaluation throughput drop >50%, database query p95 >2s |
| NFR-O2 | Production issues can be diagnosed efficiently so contributor-facing incidents are resolved quickly | 100% of contributor-facing requests have correlation IDs; any production issue can be traced from user report to root cause within 30 minutes using logs alone |
| NFR-O3 | Business KPIs are accessible for decision-making so the founding team can make data-driven go/no-go decisions | All leading and lagging KPIs from Success Criteria available on dashboard with <5 minute data lag; data export available for quarterly reporting |
| NFR-O4 | Deployments do not disrupt contributor experience so the platform maintains trust during iteration | Zero-downtime deployments verified; rollback completes within 5 minutes; all production deployments pass staging validation before promotion |
