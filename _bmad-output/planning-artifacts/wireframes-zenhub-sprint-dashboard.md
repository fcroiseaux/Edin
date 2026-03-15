# Zenhub Sprint Dashboard — Wireframe Specification

**Date:** 2026-03-15
**Project:** Edin — Zenhub Integration
**Purpose:** Lightweight wireframes to guide frontend implementation of sprint dashboard views. Complements the architecture and story acceptance criteria.

**Design Principles:**

- Follow existing Edin admin dashboard patterns (layout, spacing, typography)
- ROSE design system tokens and ABC Normal font
- Every chart has a "View as table" toggle for accessibility (NFR-A2)
- Status indicators use text/icons alongside color (NFR-A3)
- Full keyboard navigation (NFR-A4)
- Responsive: desktop-first, tablet-compatible

---

## View 1: Sprint Dashboard Overview

**Route:** `/admin/sprints`
**FRs:** FR20, FR25, FR27
**Role:** Project Lead, Admin

```
┌─────────────────────────────────────────────────────────────────────┐
│  Admin > Sprints                                        [Export ▼]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Domain Filter ───────────────────────────────────────────────┐  │
│  │  [All] [Dev] [Research] [Governance] [Docs]                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Velocity Chart ─────────────────────────────────────────────┐  │
│  │  Story Points Delivered                    [Chart | Table]    │  │
│  │                                                               │  │
│  │   80 ┤                              ╭─╮                       │  │
│  │   60 ┤              ╭─╮    ╭─╮    ╭─╯ ╰─╮   ╭─╮             │  │
│  │   40 ┤    ╭─╮    ╭─╯ ╰─╮╭─╯ ╰────╯     ╰───╯ ╰─╮           │  │
│  │   20 ┤ ╭─╯ ╰────╯      ╰╯                       ╰─╮         │  │
│  │    0 ┤─╯                                            ╰─        │  │
│  │      └──S1───S2───S3───S4───S5───S6───S7───S8───S9──S10──     │  │
│  │                                                               │  │
│  │  Avg velocity: 62 SP/sprint    Trend: ↑ +8% last 3 sprints   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Sprint List ────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Sprint    │ Status   │ Committed │ Delivered │ Accuracy │ →  │  │
│  │  ──────────┼──────────┼───────────┼───────────┼──────────┤    │  │
│  │  Sprint 10 │ ● Active │    85 SP  │    52 SP  │   61%    │ >  │  │
│  │  Sprint 9  │ ✓ Done   │    78 SP  │    82 SP  │  105%    │ >  │  │
│  │  Sprint 8  │ ✓ Done   │    70 SP  │    65 SP  │   93%    │ >  │  │
│  │  Sprint 7  │ ✓ Done   │    75 SP  │    71 SP  │   95%    │ >  │  │
│  │  ...                                                          │  │
│  │                                                               │  │
│  │  ● Active = green dot + text   ✓ Done = checkmark + text     │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component Notes:**

- **Domain filter tabs** — Pill buttons. "All" selected by default. Updates velocity chart and sprint list via `?domain=` query param.
- **Velocity chart** — Recharts `BarChart` or `AreaChart`. X-axis = sprint end dates. Y-axis = delivered story points. Shows up to 12 sprints. Summary stats below chart.
- **Sprint list** — Clickable rows navigate to `/admin/sprints/[sprintId]`. Sortable columns. Status uses icon + text (not color-only).
- **Export button** — Dropdown: "Export as CSV" / "Export as PDF". Triggers `GET /api/v1/sprints/export?format=csv|pdf`.

---

## View 2: Sprint Detail

**Route:** `/admin/sprints/[sprintId]`
**FRs:** FR21, FR22, FR23
**Role:** Project Lead, Admin

```
┌─────────────────────────────────────────────────────────────────────┐
│  Admin > Sprints > Sprint 10                     [← Back to list]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Sprint Summary ─────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Sprint 10    Mar 3 – Mar 14, 2026    ● Active                │  │
│  │                                                               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │  │
│  │  │ Committed│  │Delivered │  │Cycle Time│  │Lead Time │     │  │
│  │  │   85 SP  │  │   52 SP  │  │  4.2 d   │  │  6.8 d   │     │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Burndown Chart ─────────────────────────────────────────────┐  │
│  │  Remaining Story Points                    [Chart | Table]    │  │
│  │                                                               │  │
│  │   85 ┤╲                                                       │  │
│  │   70 ┤  ╲·····                                                │  │
│  │   55 ┤    ╲    ╲···                                           │  │
│  │   40 ┤     ╲      ╲                                           │  │
│  │   25 ┤      ╲·····  ╲                                         │  │
│  │   10 ┤                ╲                                        │  │
│  │    0 ┤─────────────────╲──                                    │  │
│  │      └──D1──D2──D3──D4──D5──D6──D7──D8──D9──D10──            │  │
│  │                                                               │  │
│  │  ─── Ideal burndown (dotted)   ─── Actual (solid)            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Scope Changes ─────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Date     │ Change      │ Issue           │ Story Points     │  │
│  │  ─────────┼─────────────┼─────────────────┼──────────────    │  │
│  │  Mar 6    │ ↑ Added     │ EDIN-142        │  +3 SP           │  │
│  │  Mar 8    │ ↓ Removed   │ EDIN-138        │  -5 SP           │  │
│  │  Mar 11   │ ↑ Added     │ EDIN-156        │  +2 SP           │  │
│  │                                                               │  │
│  │  Net scope change: 0 SP    Total changes: 3                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component Notes:**

- **Sprint summary cards** — Four metric cards in a row. Each shows label + value. Responsive: 2x2 grid on tablet.
- **Burndown chart** — Recharts `LineChart`. Two lines: ideal (dotted) and actual (solid). X-axis = sprint days. Y-axis = remaining SP. Renders <500ms (NFR-P3).
- **Scope changes table** — Chronological list. ↑/↓ arrows + text for direction. Links to Zenhub issue IDs.
- **Back navigation** — Breadcrumb or back button to sprint list.

---

## View 3: Contributors Analytics

**Route:** `/admin/sprints/contributors`
**FRs:** FR24, FR25, FR26, FR27
**Role:** Project Lead, Admin

```
┌─────────────────────────────────────────────────────────────────────┐
│  Admin > Sprints > Contributors                     [Export ▼]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Domain Filter ───────────────────────────────────────────────┐  │
│  │  [All] [Dev] [Research] [Governance] [Docs]                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Estimation Accuracy Chart ──────────────────────────────────┐  │
│  │  Planned vs Delivered (last 6 sprints)     [Chart | Table]    │  │
│  │                                                               │  │
│  │         S5    S6    S7    S8    S9    S10                      │  │
│  │  Nadia  ██▓▓  ██▓   ██▓▓  ██▓   ██▓▓  ██▓                    │  │
│  │  Omar   ██▓   ██▓▓  ██▓   ██▓▓  ██▓   ██                     │  │
│  │  Lena   ██▓▓  ██▓▓  ██▓   ██▓   ██▓▓  ██▓▓                   │  │
│  │                                                               │  │
│  │  ██ = Committed    ▓▓ = Delivered   (over/under shown)        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Combined Performance Table ─────────────────────────────────┐  │
│  │                                                               │  │
│  │  Contributor │ Domain │ Velocity │ Est.Acc │ Plan.Rel │ Eval  │  │
│  │  ────────────┼────────┼──────────┼─────────┼──────────┼─────  │  │
│  │  Nadia       │ Dev    │  13 SP   │   87%   │   95%    │ 8.2   │  │
│  │  Omar        │ Rsch   │  11 SP   │   78%   │   88%    │ 7.9   │  │
│  │  Lena        │ Gov    │   8 SP   │   72%   │   82%    │ 7.5   │  │
│  │  Alex        │ Dev    │  15 SP   │   91%   │   97%    │ 8.6   │  │
│  │  ...                                                          │  │
│  │                                                               │  │
│  │  Velocity = avg SP/sprint  │  Est.Acc = planned vs delivered  │  │
│  │  Plan.Rel = delivery ratio │  Eval = AI evaluation score      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component Notes:**

- **Estimation accuracy chart** — Recharts `BarChart` grouped by contributor. Paired bars (committed vs delivered) per sprint. Color + pattern for accessibility.
- **Combined performance table** — Sortable by any column. "Eval" column shows existing AI evaluation score. Domain filter updates both chart and table.
- **Sprint range selector** — Optional: allow selecting sprint range for the chart (last 3, 6, 12 sprints).

---

## View 4: Integration Configuration & Monitoring

**Route:** `/admin/sprints/configuration`
**FRs:** FR29-FR36
**Role:** Admin only

```
┌─────────────────────────────────────────────────────────────────────┐
│  Admin > Sprints > Configuration                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Tabs ────────────────────────────────────────────────────────┐  │
│  │  [Connection]  [Monitoring]  [Alerts]  [Conflicts]            │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ── Tab: Connection ─────────────────────────────────────────────   │
│                                                                     │
│  ┌─ Zenhub API Configuration ───────────────────────────────────┐  │
│  │                                                               │  │
│  │  API Key          [••••••••••••••••••••] [Show] [Test]        │  │
│  │  Workspace ID     [ws_abc123__________]                       │  │
│  │  Working Group    [▼ Select Edin group ]                      │  │
│  │                                                               │  │
│  │  Webhook URL      https://edin.io/api/v1/webhooks/zenhub     │  │
│  │  Webhook Secret   [••••••••••••••••••••] [Rotate]             │  │
│  │                                                               │  │
│  │  Polling Interval [15] minutes (min: 5, max: 60)             │  │
│  │                                                               │  │
│  │                                    [Save Configuration]       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Integration Health ─────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Status: ● Connected        Last poll: 3 min ago             │  │
│  │  Webhook success rate: 99.8% (last 24h)                      │  │
│  │  Polling success rate: 100% (last 24h)                       │  │
│  │  Sync lag: 2.1 min avg                                       │  │
│  │                                                               │  │
│  │  [Trigger Manual Backfill]                                    │  │
│  │  Date range: [2026-03-01] to [2026-03-15]  [Start Backfill]  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ── Tab: Monitoring ─────────────────────────────────────────────   │
│                                                                     │
│  ┌─ Webhook Delivery Logs ──────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Filter: [▼ Status] [▼ Event Type] [Date From] [Date To]     │  │
│  │                                                               │  │
│  │  Timestamp        │ Event Type      │ Status  │ Corr. ID     │  │
│  │  ─────────────────┼─────────────────┼─────────┼──────────    │  │
│  │  Mar 15 14:32:01  │ issue_moved     │ ✓ OK    │ abc-123      │  │
│  │  Mar 15 14:31:45  │ estimate_set    │ ✓ OK    │ def-456      │  │
│  │  Mar 15 14:28:12  │ sprint_started  │ ✗ Fail  │ ghi-789      │  │
│  │  Mar 15 14:28:12  │ sprint_started  │ ↻ Retry │ ghi-789      │  │
│  │  ...                                           [Load more]    │  │
│  │                                                               │  │
│  │  ✓ = success (green + checkmark)                              │  │
│  │  ✗ = failure (red + X)                                        │  │
│  │  ↻ = retry (amber + arrow)                                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ API Polling Logs ───────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Timestamp        │ Status  │ Records │ Duration │ Error      │  │
│  │  ─────────────────┼─────────┼─────────┼──────────┼────────   │  │
│  │  Mar 15 14:30:00  │ ✓ OK    │  47     │  12.3s   │ —          │  │
│  │  Mar 15 14:15:00  │ ✓ OK    │  23     │   8.7s   │ —          │  │
│  │  Mar 15 14:00:00  │ ✗ Fail  │   0     │  60.0s   │ Timeout    │  │
│  │  ...                                              [Load more]  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ── Tab: Alerts ─────────────────────────────────────────────────   │
│                                                                     │
│  ┌─ Alert Configuration ────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Webhook failure rate threshold:  [1] %         [Save]        │  │
│  │  Zenhub unreachable alert after:  [60] minutes  [Save]        │  │
│  │                                                               │  │
│  │  Alert History:                                               │  │
│  │  Mar 14 09:12  ⚠ Webhook failure rate exceeded 1% (2.3%)     │  │
│  │  Mar 10 03:45  ⚠ Zenhub API unreachable for 72 minutes       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ── Tab: Conflicts ──────────────────────────────────────────────   │
│                                                                     │
│  ┌─ Sync Conflict Events ───────────────────────────────────────┐  │
│  │                                                               │  │
│  │  Timestamp       │ Type           │ Entity   │ Resolution     │  │
│  │  ────────────────┼────────────────┼──────────┼────────────    │  │
│  │  (No conflicts recorded yet — will populate in Phase 2)       │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component Notes:**

- **Tab layout** — Single page with tab navigation. Only "Connection" tab shown by default; others revealed after configuration is saved.
- **API Key field** — Masked by default. "Show" toggles visibility. "Test" makes a lightweight API call to verify credentials. Never sent to client-side logs.
- **Webhook secret rotation** — "Rotate" generates new secret, old secret remains valid for 24h transition window (NFR-S5).
- **Health panel** — Real-time status. Uses icon + text for status (not color-only). Auto-refreshes via TanStack Query.
- **Manual backfill** — Date range selector + action button. Shows progress indicator while running.
- **Log tables** — Cursor-based pagination ("Load more" button). Filterable by status, event type, date range. Correlation IDs displayed for tracing.
- **Conflicts tab** — Empty state in MVP with explanatory text.

---

## View 5: Personal Contributor Sprint Metrics

**Route:** `/dashboard/sprint-metrics`
**FRs:** FR28
**Role:** Contributor (own data only)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Dashboard > My Sprint Metrics                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─ Summary Cards ──────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │ Avg Velocity │  │ Est.Accuracy │  │ Plan.Reliab. │       │  │
│  │  │   13 SP/spr  │  │     87%      │  │     95%      │       │  │
│  │  │   ↑ +2 trend │  │   ↑ +5% imp. │  │   → stable   │       │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ My Velocity ────────────────────────────────────────────────┐  │
│  │  Story Points Delivered                    [Chart | Table]    │  │
│  │                                                               │  │
│  │   20 ┤                    ╭─╮                                 │  │
│  │   15 ┤         ╭─╮    ╭──╯ ╰──╮   ╭─╮                       │  │
│  │   10 ┤    ╭────╯ ╰────╯       ╰───╯ ╰──                     │  │
│  │    5 ┤ ╭──╯                                                   │  │
│  │    0 ┤─╯                                                      │  │
│  │      └──S4────S5────S6────S7────S8────S9────S10──             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ My Estimation Accuracy ─────────────────────────────────────┐  │
│  │  Planned vs Delivered Per Sprint            [Chart | Table]   │  │
│  │                                                               │  │
│  │       S5     S6     S7     S8     S9     S10                  │  │
│  │  P:  10 SP  12 SP  13 SP  13 SP  14 SP  15 SP                │  │
│  │  D:   9 SP  13 SP  12 SP  11 SP  15 SP  13 SP                │  │
│  │  %:   90%   108%   92%    85%   107%    87%                   │  │
│  │                                                               │  │
│  │  P = Planned (committed)   D = Delivered                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ── Empty State (shown when no sprint history) ──────────────────   │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │           📊  No sprint metrics yet                           │  │
│  │                                                               │  │
│  │   Your sprint performance metrics will appear here after      │  │
│  │   your first completed sprint. Check with your project lead   │  │
│  │   about upcoming sprint planning.                             │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Component Notes:**

- **Summary cards** — Three cards with key metrics + trend indicator (↑ improving, → stable, ↓ declining). Trend compares last 3 sprints to prior 3.
- **Velocity chart** — Personal velocity only. Simpler than admin view (no domain filter, no export).
- **Estimation accuracy** — Grouped bar chart or side-by-side comparison per sprint. Shows both values + percentage.
- **Empty state** — Friendly message with guidance. No error styling.
- **CASL enforcement** — Page only shows the authenticated contributor's own data. Attempting to access another contributor's metrics via URL returns 403.

---

## Navigation Structure

```
Admin Sidebar
├── ... (existing admin items)
└── Sprints                          → /admin/sprints
    ├── Overview (velocity + list)   → /admin/sprints
    ├── Sprint Detail                → /admin/sprints/[sprintId]
    ├── Contributors                 → /admin/sprints/contributors
    └── Configuration                → /admin/sprints/configuration

Contributor Dashboard Sidebar
├── ... (existing dashboard items)
└── Sprint Metrics                   → /dashboard/sprint-metrics
```

---

## Responsive Behavior

| Breakpoint          | Layout Changes                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Desktop (>1200px)   | Full layout as wireframed. Charts full-width. Tables with all columns.                                                          |
| Tablet (768-1200px) | Summary cards: 2x2 grid. Charts: full-width, slightly reduced height. Tables: horizontal scroll for excess columns.             |
| Mobile (<768px)     | Not primary target. Summary cards: stacked. Charts: full-width, reduced height. Tables: card-based layout or horizontal scroll. |

---

## Loading & Error States

| State              | Behavior                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial load       | Skeleton placeholders for charts and tables. TanStack Query manages loading state.                                                                |
| Stale data         | Data shown with subtle "Last updated X minutes ago" indicator. Background refetch at 5-minute intervals.                                          |
| API error          | Inline error message below affected component: "Unable to load velocity data. Retrying..." with retry button. Other components remain functional. |
| Zenhub unreachable | Banner at top of sprint pages: "Zenhub data may be stale — last synced [timestamp]." Dashboard continues serving cached data (NFR-R3).            |
| No data yet        | Per-component empty states with helpful guidance text. Not error styling.                                                                         |
