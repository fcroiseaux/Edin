# Story 0.6: Domain Identity & Content Display Components

Status: done

## Story

As a contributor,
I want every piece of content to show which domain it belongs to through consistent visual markers,
So that I can immediately see Technology, Impact, Governance, and Finance work treated with equal dignity.

## Acceptance Criteria

1. **PillarAccentLine** — `packages/ui/src/domain/pillar-accent-line.tsx` renders a 3px-wide vertical color bar spanning the full height of its parent container. Color determined by `domain` prop: `tech` (pillar-tech), `impact` (pillar-impact), `governance` (pillar-governance), `finance` (pillar-finance). Rounded ends via `radius-full`. Color is NEVER the sole information carrier — always paired with text (NFR-A4).

2. **DomainBadge** — `packages/ui/src/domain/domain-badge.tsx` renders uppercase text at 11px, font-medium, `letter-spacing: 0.05em`, in the domain's pillar color. Two variants: `text-only` and `filled` (8% opacity pillar-color background + pillar-color border). All four domain badges have identical dimensions and visual weight.

3. **NarrativeCard** — `packages/ui/src/content/narrative-card.tsx` renders with `PillarAccentLine` left border, header (title + `DomainBadge`), narrative paragraph (15px body text), and metadata row. Hover state: subtle border/shadow shift. Evaluation variant: "See detail" Radix Accordion for progressive disclosure. Feedback variant: resolve action buttons slot. Card is a clickable region with descriptive `aria-label`.

4. **ArticleByline** — `packages/ui/src/content/article-byline.tsx` displays Author (avatar + name + role) and Editor (avatar + name + role) side by side, separated by spacer. Names are linkable. Variants: `single` (author only), `dual` (author + editor), `multi` (multiple authors).

5. **PullQuote** — `packages/ui/src/content/pull-quote.tsx` renders 3px `accent-primary` left border with quote text (ABC Normal Light, 24px, `text-heading` blush pink) and left padding. Wrapped in `<blockquote>` with proper semantics.

6. **ActivityFeedItem** — `packages/ui/src/content/activity-feed-item.tsx` renders `PillarAccentLine` + title + summary + metadata row (DomainBadge, contributor name, timestamp). All four domains use identical layout — no domain has more visual weight (FR40). Uses `<li>` semantics with linked title.

7. **StatusIndicator** — `packages/ui/src/content/status-indicator.tsx` shows status text in active voice with optional subtle spinner. Text: `text-secondary`. States: `processing`, `completed`, `needs-attention`. Uses ARIA live region (`aria-live="polite"`) for screen reader announcements.

8. **Barrel Exports** — `packages/ui/src/domain/index.ts` and `packages/ui/src/content/index.ts` re-export all components. `packages/ui/src/index.ts` re-exports from `./domain` and `./content`.

9. **Tests** — Each component has co-located test file covering: rendering, variants, ROSE styling classes, accessibility attributes, className merging.

10. **Build Verification** — `pnpm build`, `pnpm lint`, `pnpm --filter @edin/ui test` all pass.

## Tasks / Subtasks

- [x] Task 1: Create PillarAccentLine (AC: #1)
  - [x] Create `packages/ui/src/domain/pillar-accent-line.tsx` — 3px bar, domain prop, radius-full
  - [x] Create `packages/ui/src/domain/pillar-accent-line.test.tsx`

- [x] Task 2: Create DomainBadge (AC: #2)
  - [x] Create `packages/ui/src/domain/domain-badge.tsx` — uppercase 11px, text-only/filled variants
  - [x] Create `packages/ui/src/domain/domain-badge.test.tsx`

- [x] Task 3: Create NarrativeCard (AC: #3)
  - [x] Create `packages/ui/src/content/narrative-card.tsx` — PillarAccentLine + DomainBadge + prose + metadata
  - [x] Implement evaluation variant with Radix Accordion
  - [x] Implement feedback variant with action buttons slot
  - [x] Create `packages/ui/src/content/narrative-card.test.tsx`

- [x] Task 4: Create ArticleByline (AC: #4)
  - [x] Create `packages/ui/src/content/article-byline.tsx` — author/editor display with Avatar
  - [x] Create `packages/ui/src/content/article-byline.test.tsx`

- [x] Task 5: Create PullQuote (AC: #5)
  - [x] Create `packages/ui/src/content/pull-quote.tsx` — blockquote with accent-primary border
  - [x] Create `packages/ui/src/content/pull-quote.test.tsx`

- [x] Task 6: Create ActivityFeedItem (AC: #6)
  - [x] Create `packages/ui/src/content/activity-feed-item.tsx` — PillarAccentLine + metadata
  - [x] Create `packages/ui/src/content/activity-feed-item.test.tsx`

- [x] Task 7: Create StatusIndicator (AC: #7)
  - [x] Create `packages/ui/src/content/status-indicator.tsx` — ARIA live region, 3 states
  - [x] Create `packages/ui/src/content/status-indicator.test.tsx`

- [x] Task 8: Barrel exports and build verification (AC: #8, #9, #10)
  - [x] Create `packages/ui/src/domain/index.ts`
  - [x] Create `packages/ui/src/content/index.ts`
  - [x] Update `packages/ui/src/index.ts`
  - [x] Run tests, build, lint

## Dev Notes

### Critical Architecture Decisions

**New Directories:** This story creates two new subdirectories under `packages/ui/src/`:

- `domain/` — Domain identity components (PillarAccentLine, DomainBadge)
- `content/` — Content display components (NarrativeCard, ArticleByline, PullQuote, ActivityFeedItem, StatusIndicator)

This matches the architecture's directory tree: `packages/ui/src/domain/` and `packages/ui/src/content/`.

**Component Composition:** NarrativeCard and ActivityFeedItem compose PillarAccentLine and DomainBadge internally. Import them from the `../domain/` directory.

**Existing Badge vs DomainBadge:** The existing `Badge` component in `primitives/badge.tsx` already has a `domain` prop with pillar colors. `DomainBadge` is a DIFFERENT component: uppercase 11px, letter-spacing 0.05em, medium weight — designed specifically for domain identification headers. Do NOT reuse or extend Badge; create a distinct component.

**Radix Accordion for NarrativeCard:** The Accordion wrapper already exists in `packages/ui/src/radix/accordion.tsx` (Story 0.3). Import `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` from `../radix/accordion` for the evaluation variant.

**Avatar for ArticleByline:** The Avatar wrapper exists in `packages/ui/src/radix/avatar.tsx` (Story 0.3). Import `Avatar`, `AvatarImage`, `AvatarFallback` from `../radix/avatar`.

**Framework-Agnostic Links:** ArticleByline and ActivityFeedItem have linkable elements. Use `renderLink` prop pattern (same as SidebarNav from Story 0.4).

### Pillar Color Rule — CRITICAL

All four domain pillar colors MUST have equal visual weight. No domain appears more prominent or positioned higher by default.

| Domain     | Token               | Tailwind bg            | Tailwind text            | Tailwind border            |
| ---------- | ------------------- | ---------------------- | ------------------------ | -------------------------- |
| Technology | `pillar-tech`       | `bg-pillar-tech`       | `text-pillar-tech`       | `border-pillar-tech`       |
| Impact     | `pillar-impact`     | `bg-pillar-impact`     | `text-pillar-impact`     | `border-pillar-impact`     |
| Governance | `pillar-governance` | `bg-pillar-governance` | `text-pillar-governance` | `border-pillar-governance` |
| Finance    | `pillar-finance`    | `bg-pillar-finance`    | `text-pillar-finance`    | `border-pillar-finance`    |

Pillar color is NEVER used as background fill (too noisy). Only as accents: borders, lines, dots, text.
When domain is mixed/cross-domain: use `accent-secondary` (blush pink) as neutral accent.

### Component API Designs

**PillarAccentLine:**

```tsx
interface PillarAccentLineProps {
  domain: Domain;
  className?: string;
}
```

**DomainBadge:**

```tsx
interface DomainBadgeProps {
  domain: Domain;
  variant?: 'text-only' | 'filled';
  className?: string;
}
```

**NarrativeCard:**

```tsx
type NarrativeCardVariant = 'default' | 'evaluation' | 'feedback';

interface NarrativeCardProps {
  domain: Domain;
  title: string;
  narrative: string;
  metadata?: ReactNode;
  variant?: NarrativeCardVariant;
  expandedContent?: ReactNode; // For evaluation variant accordion
  actions?: ReactNode; // For feedback variant action buttons
  onClick?: () => void;
  href?: string;
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  'aria-label'?: string;
  className?: string;
}
```

**ArticleByline:**

```tsx
interface BylineProfile {
  name: string;
  role: string;
  avatarUrl?: string;
  avatarFallback?: string;
  profileHref?: string;
}

interface ArticleBylineProps {
  author: BylineProfile;
  editor?: BylineProfile;
  additionalAuthors?: BylineProfile[];
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  className?: string;
}
```

**PullQuote:**

```tsx
interface PullQuoteProps {
  children: ReactNode;
  className?: string;
}
```

**ActivityFeedItem:**

```tsx
interface ActivityFeedItemProps {
  domain: Domain;
  title: string;
  titleHref?: string;
  summary?: string;
  contributorName?: string;
  timestamp?: string;
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  className?: string;
}
```

**StatusIndicator:**

```tsx
type StatusState = 'processing' | 'completed' | 'needs-attention';

interface StatusIndicatorProps {
  state: StatusState;
  message: string;
  className?: string;
}
```

### Typography Mapping

| Component       | Text Element | Font       | Size           | Weight       | Color          |
| --------------- | ------------ | ---------- | -------------- | ------------ | -------------- |
| DomainBadge     | Label        | ABC Normal | 11px           | Medium (500) | Pillar color   |
| NarrativeCard   | Narrative    | ABC Normal | 15px (body-sm) | Book (400)   | text-primary   |
| NarrativeCard   | Metadata     | ABC Normal | 13px (caption) | Light (300)  | text-tertiary  |
| PullQuote       | Quote        | ABC Normal | 24px           | Light (300)  | text-heading   |
| StatusIndicator | Status       | ABC Normal | body           | Book (400)   | text-secondary |
| ArticleByline   | Name         | ABC Normal | body-sm        | Medium (500) | text-primary   |
| ArticleByline   | Role         | ABC Normal | caption        | Light (300)  | text-secondary |

### Accessibility Requirements

- PillarAccentLine: `aria-hidden="true"` (decorative, always paired with text label)
- DomainBadge: Text provides domain info (no additional aria needed)
- NarrativeCard: Clickable region with `aria-label` describing card content
- NarrativeCard evaluation: Accordion follows Radix Accordion a11y
- ArticleByline: Names as links with role context
- PullQuote: `<blockquote>` semantic element
- ActivityFeedItem: `<li>` semantics within a list, linked title
- StatusIndicator: `aria-live="polite"` live region for dynamic status announcements

### Previous Story Intelligence (Stories 0.1-0.5)

Established patterns:

- `forwardRef` on all components, `displayName` set
- `cn()` from `../lib/cn` for className composition (clsx + tailwind-merge)
- `import type { ReactNode } from 'react'` — NOT `React.ReactNode`
- NO `'use client'` directive in packages/ui (removed in Story 0.4 review)
- Co-located tests: `*.test.tsx` next to `*.tsx`
- Barrel exports: directory `index.ts` → main `src/index.ts`
- Domain type imported from `../primitives/badge` (shared type, Story 0.3 pattern)
- `renderLink` prop pattern for framework-agnostic links (Stories 0.4-0.5)

### What NOT to Do

- Do NOT use `'use client'` — removed in Story 0.4 code review
- Do NOT use `React.ReactNode` — use `import type { ReactNode }` (Story 0.4 fix)
- Do NOT reuse the existing `Badge` component for `DomainBadge` — they have different specs
- Do NOT add PillarCard (mentioned in architecture but not in Story 0.6 ACs — possibly future)
- Do NOT create EvaluationBreakdown as a separate component here — it's listed in architecture but NOT in Story 0.6 ACs. NarrativeCard's evaluation variant covers the progressive disclosure pattern
- Do NOT create Profile & Rewards components — separate story scope
- Do NOT hardcode hex colors — use ROSE design tokens
- Do NOT use pillar colors as background fill — only accents (borders, lines, dots, text)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 0.6]
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Library Scope]
- [Source: _bmad-output/planning-artifacts/architecture.md#Design System Implementation Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pillar Color Usage]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Specifications]
- [Source: packages/ui/src/primitives/badge.tsx — Existing Badge with Domain type]
- [Source: packages/ui/src/radix/accordion.tsx — Radix Accordion wrapper]
- [Source: packages/ui/src/radix/avatar.tsx — Radix Avatar wrapper]
- [Source: packages/ui/src/tokens/theme.css — ROSE design tokens]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial test run: 2 failures in status-indicator.test.tsx — SVG `className` returns SVGAnimatedString in jsdom, not a string. Fixed by using `getAttribute('class')` instead.

### Completion Notes List

- Task 1: Created PillarAccentLine — 3px vertical bar, domain-colored, radius-full, aria-hidden. 6 tests.
- Task 2: Created DomainBadge — uppercase 11px, font-medium, tracking-[0.05em], text-only/filled variants with 8% pillar-color bg. Identical dimensions across domains verified. 8 tests.
- Task 3: Created NarrativeCard — PillarAccentLine left border, DomainBadge in header, narrative text, metadata slot. Evaluation variant with Radix Accordion ("See detail" progressive disclosure). Feedback variant with actions slot. Clickable region with keyboard support and aria-label. 11 tests.
- Task 4: Created ArticleByline — Author + Editor display with Avatar (from Radix wrappers), initials fallback, linkable names via renderLink prop, single/dual/multi variants, separator between author and editor. 9 tests.
- Task 5: Created PullQuote — blockquote semantic element, 3px accent-primary left border, 24px font-light text in blush-pink (text-heading). 8 tests.
- Task 6: Created ActivityFeedItem — li element semantics, PillarAccentLine + linked title + summary + metadata row (DomainBadge + contributor name + timestamp). All domains identical layout. renderLink prop. 11 tests.
- Task 7: Created StatusIndicator — role="status" with aria-live="polite" live region. Processing state with spinner (animate-spin + motion-reduce:animate-none). Completed state (text-success). Needs-attention state (text-warning). 10 tests.
- Task 8: Created barrel exports (domain/index.ts, content/index.ts). Updated src/index.ts. 278 tests passing, build clean, lint clean, full project build clean.

### Change Log

- 2026-03-14: Implemented Domain Identity & Content Display Components (Story 0.6) — 8 tasks completed, 278 tests passing
- 2026-03-14: Code review fixes — Removed React.JSX.Element type assertion in narrative-card.tsx (H1), wrapped renderLink return in Fragment. Added ReactNode type import to article-byline.test.tsx (M1) and activity-feed-item.test.tsx (M2). 278 tests passing after fixes.

### File List

- `packages/ui/src/domain/pillar-accent-line.tsx` (new)
- `packages/ui/src/domain/pillar-accent-line.test.tsx` (new)
- `packages/ui/src/domain/domain-badge.tsx` (new)
- `packages/ui/src/domain/domain-badge.test.tsx` (new)
- `packages/ui/src/domain/index.ts` (new)
- `packages/ui/src/content/narrative-card.tsx` (new)
- `packages/ui/src/content/narrative-card.test.tsx` (new)
- `packages/ui/src/content/article-byline.tsx` (new)
- `packages/ui/src/content/article-byline.test.tsx` (new)
- `packages/ui/src/content/pull-quote.tsx` (new)
- `packages/ui/src/content/pull-quote.test.tsx` (new)
- `packages/ui/src/content/activity-feed-item.tsx` (new)
- `packages/ui/src/content/activity-feed-item.test.tsx` (new)
- `packages/ui/src/content/status-indicator.tsx` (new)
- `packages/ui/src/content/status-indicator.test.tsx` (new)
- `packages/ui/src/content/index.ts` (new)
- `packages/ui/src/index.ts` (modified)
