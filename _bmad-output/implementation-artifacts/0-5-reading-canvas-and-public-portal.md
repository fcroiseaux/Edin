# Story 0.5: Layout Containers — ReadingCanvas & Public Portal

Status: done

## Story

As a reader,
I want published articles to feel like opening a beautifully designed magazine — immersive, focused, with no platform chrome competing for attention,
So that I can engage with the community's intellectual output in comfort.

## Acceptance Criteria

1. **ReadingCanvas Component** — `packages/ui/src/layout/reading-canvas.tsx` renders a full-width `surface-reading` background with a centered content column at max-width 680px. The content column targets ABC Normal Book at 18px, line-height 1.7. Paragraph spacing is 1.5em. Headings use `text-heading` (blush-pink). A minimal top navigation bar slot provides a back link and article metadata area. NO sidebar, NO dashboard navigation. The `<article>` landmark wraps the content.

2. **HeroSection Component** — `packages/ui/src/layout/hero-section.tsx` renders a cinematic ROSE gradient background (radial orange/pink glow on `surface-base`). Centered content: overline slot (ABC Normal Medium, uppercase, letter-spacing 0.1em), headline slot (font-weight 900, 48px), subtitle slot (ABC Normal Book), and a CTA slot. Two variants: `full` (min-height 80vh) and `compact` (auto height, more padding). Text meets WCAG AA contrast against the darkest background value.

3. **PublicLayout Component** — `packages/ui/src/layout/public-layout.tsx` renders a top navigation bar and content area for unauthenticated pages. The nav accepts a logo slot, nav items, and auth actions slot. Mobile navigation uses a hamburger menu with full-screen overlay on `surface-base`. The content area is full-width.

4. **Barrel Export** — `packages/ui/src/layout/index.ts` re-exports all new layout components. `packages/ui/src/index.ts` re-exports from `./layout`.

5. **Tests** — Each component has a co-located test file covering rendering, landmark structure, styling classes, responsive behavior, and className merging.

6. **Build Verification** — `pnpm build` passes. `pnpm lint` passes. `pnpm --filter @edin/ui test` passes.

## Tasks / Subtasks

- [ ] Task 1: Create ReadingCanvas component (AC: #1)
  - [ ] Create `packages/ui/src/layout/reading-canvas.tsx`
  - [ ] Full-width surface-reading background
  - [ ] Centered content column (max-w-[680px])
  - [ ] Typography: text-body-lg (18px), line-height 1.7
  - [ ] Prose styling: headings blush-pink, paragraph spacing
  - [ ] Top bar slot for back link + metadata
  - [ ] `<article>` landmark
  - [ ] Create `packages/ui/src/layout/reading-canvas.test.tsx`

- [ ] Task 2: Create HeroSection component (AC: #2)
  - [ ] Create `packages/ui/src/layout/hero-section.tsx`
  - [ ] Radial gradient background (orange/pink glow on surface-base)
  - [ ] Overline, headline, subtitle, CTA slots
  - [ ] `full` and `compact` variants
  - [ ] Create `packages/ui/src/layout/hero-section.test.tsx`

- [ ] Task 3: Create PublicLayout component (AC: #3)
  - [ ] Create `packages/ui/src/layout/public-layout.tsx`
  - [ ] Top navigation bar with logo, nav items, auth actions
  - [ ] Mobile hamburger + full-screen overlay
  - [ ] Escape-to-close and focus trap for mobile
  - [ ] Create `packages/ui/src/layout/public-layout.test.tsx`

- [ ] Task 4: Update barrel exports (AC: #4)
  - [ ] Update `packages/ui/src/layout/index.ts`
  - [ ] Update `packages/ui/src/index.ts`

- [ ] Task 5: Build verification (AC: #5, #6)
  - [ ] Run tests, build, lint

## Dev Notes

### Critical Architecture Decisions

**Component Location:** All go in `packages/ui/src/layout/` alongside DashboardShell and SidebarNav from Story 0.4.

**Framework-Agnostic:** NO Next.js dependencies. ReadingCanvas's back link and PublicLayout's navigation use `renderLink` prop pattern (same as SidebarNav in Story 0.4). HeroSection accepts children/slots for CTA buttons.

**ReadingCanvas is NOT a DashboardShell variant.** The architecture explicitly states: "This is a separate layout component, NOT a variant of DashboardShell. Articles render without any sidebar or dashboard navigation."

### ReadingCanvas API

```tsx
interface ReadingCanvasProps {
  topBar?: ReactNode;
  children: ReactNode;
  className?: string;
}
```

**Structure:**

```
<div> (full-width, surface-reading bg)
  <header> (topBar slot — back link + metadata)
  <article> (centered, max-w-[680px], prose styling)
    {children}
  </article>
</div>
```

### HeroSection API

```tsx
interface HeroSectionProps {
  variant?: 'full' | 'compact';
  overline?: ReactNode;
  headline: ReactNode;
  subtitle?: ReactNode;
  cta?: ReactNode;
  className?: string;
}
```

### PublicLayout API

```tsx
interface PublicNavItem {
  href: string;
  label: string;
  isActive?: boolean;
}

interface PublicLayoutProps {
  logo: ReactNode;
  navItems?: PublicNavItem[];
  authActions?: ReactNode;
  renderLink?: (props: {
    href: string;
    className: string;
    children: ReactNode;
    'aria-current'?: 'page';
  }) => ReactNode;
  children: ReactNode;
  className?: string;
}
```

### ROSE Token Usage

| Element            | Token                                | Tailwind Class        |
| ------------------ | ------------------------------------ | --------------------- |
| ReadingCanvas bg   | `surface-reading`                    | `bg-surface-reading`  |
| Content text       | `text-primary`                       | `text-text-primary`   |
| Headings           | `text-heading`                       | `text-text-heading`   |
| Hero bg            | `surface-base`                       | `bg-surface-base`     |
| Hero gradient glow | `accent-primary`, `accent-secondary` | CSS radial-gradient   |
| Hero overline      | `accent-primary`                     | `text-accent-primary` |
| Public nav bg      | `surface-base`                       | `bg-surface-base`     |
| Nav text           | `text-primary`                       | `text-text-primary`   |
| Nav active         | `accent-primary`                     | `text-accent-primary` |
| Mobile overlay     | `surface-base`                       | `bg-surface-base`     |

### Accessibility

- ReadingCanvas: `<article>` landmark with proper heading hierarchy
- HeroSection: `<section>` with aria-label, decorative gradient (no info loss)
- PublicLayout: `<nav>` with aria-label, mobile hamburger with aria-label + aria-expanded, escape-to-close
- All focus rings: `focus-visible:ring-3 focus-visible:ring-accent-primary`

### What NOT to Do

- Do NOT create domain identity components — Story 0.6
- Do NOT use Next.js APIs in packages/ui
- Do NOT add sidebar navigation to ReadingCanvas
- Do NOT modify DashboardShell or SidebarNav from Story 0.4
- Do NOT implement scroll-based nav transparency (consumer concern, not component)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Layout Container Architecture]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 0 Story 0.5]
- [Source: apps/web/components/features/showcase/hero-section.tsx — Existing hero]
- [Source: apps/web/components/features/navigation/public-nav.tsx — Existing public nav]
- [Source: packages/ui/src/tokens/theme.css — ROSE design tokens]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial test run: 1 failure — logo rendered in both desktop nav and mobile header causing `getByTestId` to find multiple elements. Fixed with `getAllByTestId`.

### Completion Notes List

- Task 1: Created ReadingCanvas — full-width surface-reading bg, centered 680px article, text-body-lg, leading-[1.7] paragraphs, 1.5em paragraph spacing, blush-pink headings (h1-h3), topBar slot in header, `<article>` landmark.
- Task 2: Created HeroSection — surface-base bg with radial gradient overlay (accent-primary 12% + accent-secondary 6% via CSS custom properties), overline (uppercase, 0.1em tracking, accent-primary), headline (text-display, font-black/900), subtitle (body-lg, text-secondary), CTA slot. Full (min-h-80vh) and compact (py-20) variants. `<section>` with aria-label.
- Task 3: Created PublicLayout — top nav with logo, nav items (accent-primary active), auth actions slot. Mobile hamburger + full-screen overlay with focus trap, escape-to-close, dialog role. renderLink prop for framework-agnostic links. `<nav>` + `<main>` landmarks.
- Task 4: Updated barrel exports in layout/index.ts and src/index.ts.
- Task 5: 215 tests passing (23 test files). Build clean. Lint clean. Full project build clean.

### Change Log

- 2026-03-14: Implemented ReadingCanvas, HeroSection, PublicLayout (Story 0.5) — 5 tasks completed, 215 tests passing
- 2026-03-14: Code review fixes — Added font-black to HeroSection headline (C1). Added paragraph spacing [&_p+p]:mt-[1.5em] to ReadingCanvas (C2). Added React type import to public-layout.test.tsx (C3). Used CSS custom properties for gradient instead of hardcoded RGBA (I6). Added tests for paragraph spacing, line-height, and headline font-weight (I8). 215 tests passing after fixes.

### File List

- `packages/ui/src/layout/reading-canvas.tsx` (new)
- `packages/ui/src/layout/reading-canvas.test.tsx` (new)
- `packages/ui/src/layout/hero-section.tsx` (new)
- `packages/ui/src/layout/hero-section.test.tsx` (new)
- `packages/ui/src/layout/public-layout.tsx` (new)
- `packages/ui/src/layout/public-layout.test.tsx` (new)
- `packages/ui/src/layout/index.ts` (modified)
- `packages/ui/src/index.ts` (modified)
