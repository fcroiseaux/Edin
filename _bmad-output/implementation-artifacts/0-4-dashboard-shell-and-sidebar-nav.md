# Story 0.4: Layout Containers — DashboardShell & SidebarNav

Status: done

## Story

As a contributor,
I want a clean sidebar navigation that shows me where I am and what needs attention,
So that I can move between evaluations, contributions, publications, and settings without losing context.

## Acceptance Criteria

1. **DashboardShell Component** — `packages/ui/src/layout/dashboard-shell.tsx` renders a fixed left sidebar (240px wide) alongside a main content area on `surface-base`. The sidebar has a `surface-raised` background. The content area fills the remaining viewport width. Proper HTML landmarks: `<nav>` for sidebar, `<main>` for content. A skip-to-content link is the first focusable element.

2. **Sidebar Collapse** — Clicking the collapse button or triggering the callback collapses the sidebar to 64px (icon-only mode). The collapse preference is persisted in `localStorage` (key: `edin-sidebar-collapsed`). The transition is 200ms ease-out. The transition is skipped when `prefers-reduced-motion` is active.

3. **Mobile Responsive** — Below 768px viewport, the sidebar is hidden by default. A hamburger menu button appears in a top bar. Tapping the hamburger opens the sidebar as a full-screen overlay on `surface-base`. The overlay can be dismissed by tapping outside, pressing escape, or tapping the close button.

4. **SidebarNav Component** — `packages/ui/src/layout/sidebar-nav.tsx` renders: a logo slot at the top, nav sections with section titles, and nav items with labels. Each nav item can display a pillar-color dot for domain context. Navigation is fully keyboard-navigable with visible focus indicators.

5. **Active State** — The active nav item shows `accent-primary` text + 2px right border + subtle `accent-primary` background tint (8% opacity). The component accepts `isActive` per nav item and sets `aria-current="page"` on the active item.

6. **Notification Dot** — When a nav item has `hasNotification: true`, a 6px `accent-primary` dot appears — no count badge, no urgency. The `aria-label` announces "new updates available" for screen readers.

7. **Barrel Export** — `packages/ui/src/layout/index.ts` re-exports all layout components. `packages/ui/src/index.ts` re-exports from `./layout`.

8. **Tests** — Each component has a co-located test file (`*.test.tsx`) covering rendering, landmark structure, collapse behavior, active states, notification dots, responsive behavior, and className merging.

9. **Build Verification** — `pnpm build` passes with no type errors. `pnpm lint` passes with no new errors. `pnpm --filter @edin/ui test` passes all tests.

## Tasks / Subtasks

- [ ] Task 1: Create DashboardShell component (AC: #1, #2, #3)
  - [ ] Create `packages/ui/src/layout/dashboard-shell.tsx` with sidebar + content layout
  - [ ] Implement skip-to-content link (visually hidden, visible on focus)
  - [ ] Implement sidebar collapse (240px → 64px) with localStorage persistence
  - [ ] Implement 200ms ease-out transition with prefers-reduced-motion support
  - [ ] Implement mobile hamburger + full-screen sidebar overlay (<768px)
  - [ ] Implement escape-to-close and click-outside-to-close for mobile overlay
  - [ ] Create `packages/ui/src/layout/dashboard-shell.test.tsx`

- [ ] Task 2: Create SidebarNav component (AC: #4, #5, #6)
  - [ ] Create `packages/ui/src/layout/sidebar-nav.tsx` with logo, sections, items
  - [ ] Implement active state styling (accent-primary text, 2px right border, 8% opacity bg)
  - [ ] Implement pillar-color dot for domain context
  - [ ] Implement notification dot (6px accent-primary, aria-label)
  - [ ] Implement collapsed mode (icon-only or initials)
  - [ ] Implement keyboard navigation with focus-visible ring
  - [ ] Accept `renderLink` prop for framework-agnostic link rendering
  - [ ] Create `packages/ui/src/layout/sidebar-nav.test.tsx`

- [ ] Task 3: Create barrel exports (AC: #7)
  - [ ] Create `packages/ui/src/layout/index.ts` barrel file
  - [ ] Update `packages/ui/src/index.ts` to re-export layout components

- [ ] Task 4: Build verification (AC: #8, #9)
  - [ ] Run `pnpm --filter @edin/ui test` — confirm all tests pass
  - [ ] Run `pnpm build` — confirm no type errors
  - [ ] Run `pnpm lint` — confirm no lint errors from new files

## Dev Notes

### Critical Architecture Decisions

**Component Location:** All layout components go in `packages/ui/src/layout/`. The architecture defines: "Three layout containers, each a React component in `packages/ui/src/layout/`."

**Framework-Agnostic:** These components live in `packages/ui` — they must NOT depend on Next.js (no `next/link`, `next/image`, `usePathname`, `useRouter`). They are purely presentational. Consumers in `apps/web` provide routing integration via props.

**Link Rendering:** SidebarNav accepts an optional `renderLink` prop for custom link rendering (e.g., Next.js `<Link>`). Default: renders `<a>` elements.

**State Management:** DashboardShell manages collapse state internally using `useState` + `useEffect` for localStorage. No Zustand dependency in packages/ui. The collapse state is also exposed via `onCollapseChange` callback for parent synchronization.

**SSR Safety:** All browser APIs (`localStorage`, `window`, `matchMedia`) are accessed only inside `useEffect` or event handlers. Default state renders expanded sidebar (240px) on SSR.

### DashboardShell API

```tsx
interface DashboardShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  className?: string;
}
```

**Layout Structure:**

```
<div> (flex wrapper, min-h-screen)
  <a href="#main-content"> (skip-to-content, sr-only, visible on focus)
  <header> (mobile top bar, hidden on lg+)
    <hamburger button>
  </header>
  <aside> (sidebar, 240px/64px, surface-raised)
    <nav aria-label="Sidebar navigation">
      {sidebar}
    </nav>
    <collapse button> (at bottom of sidebar)
  </aside>
  <main id="main-content"> (content area, flex-1, surface-base)
    {children}
  </main>
  <div> (mobile overlay backdrop, black/60)
</div>
```

### SidebarNav API

```tsx
type Domain = 'tech' | 'impact' | 'governance' | 'finance';

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  domain?: Domain;
  hasNotification?: boolean;
  isActive?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarNavProps {
  logo: React.ReactNode;
  subtitle?: string;
  sections: NavSection[];
  collapsed?: boolean;
  renderLink?: (props: {
    href: string;
    className: string;
    children: React.ReactNode;
    'aria-current'?: 'page';
    'aria-label'?: string;
  }) => React.ReactNode;
  className?: string;
}
```

### ROSE Token Usage

| Element            | Token               | Tailwind Class                                           |
| ------------------ | ------------------- | -------------------------------------------------------- |
| Content area bg    | `surface-base`      | `bg-surface-base`                                        |
| Sidebar bg         | `surface-raised`    | `bg-surface-raised`                                      |
| Active item bg     | `accent-primary` 8% | `bg-accent-primary/8`                                    |
| Active item text   | `accent-primary`    | `text-accent-primary`                                    |
| Active item border | `accent-primary`    | `border-r-2 border-accent-primary`                       |
| Section title      | `text-secondary`    | `text-text-secondary`                                    |
| Nav item text      | `text-primary`      | `text-text-primary`                                      |
| Nav item hover     | `surface-subtle`    | `hover:bg-surface-subtle`                                |
| Notification dot   | `accent-primary`    | `bg-accent-primary`                                      |
| Focus ring         | `accent-primary`    | `focus-visible:ring-3 focus-visible:ring-accent-primary` |
| Mobile overlay bg  | `surface-base`      | `bg-surface-base`                                        |
| Mobile backdrop    | black/60            | `bg-black/60`                                            |
| Pillar dots        | pillar colors       | `bg-pillar-tech`, `bg-pillar-impact`, etc.               |

### Sidebar Dimensions

- Expanded: 240px (`w-60`)
- Collapsed: 64px (`w-16`)
- Mobile breakpoint: 768px (`md:` in Tailwind, but spec says 768px which is `md`)
- Transition: `transition-[width] duration-200 ease-out`
- Reduced motion: `motion-reduce:transition-none`

### Accessibility Requirements

- Skip-to-content link: first focusable element, visually hidden, visible on focus
- `<nav aria-label="Sidebar navigation">` for sidebar
- `<main id="main-content">` for content area
- `aria-current="page"` on active nav item
- Notification dot: `aria-label="new updates available"` (on the parent link)
- All nav items keyboard-navigable with `focus-visible:ring-3 focus-visible:ring-accent-primary`
- Mobile hamburger: `aria-label="Open navigation"`, `aria-expanded`
- Mobile overlay: escape key to close, focus trap

### Existing Dashboard Layout Reference

The existing `apps/web/app/(dashboard)/layout.tsx` and `(admin)/layout.tsx` have sidebar patterns that will eventually consume these components. Key observations:

- Both use 240px sidebar width on desktop (`lg:w-[240px]`)
- Both use `bg-surface-base` for the main wrapper
- Both have notification dots and active state patterns
- Neither has collapse functionality or skip-to-content links
- Neither has mobile hamburger menu (they use `lg:flex`)

### What NOT to Do

- Do NOT create ReadingCanvas, HeroSection, or PublicLayout — Story 0.5
- Do NOT create domain identity components — Story 0.6
- Do NOT use Next.js APIs in packages/ui (no next/link, next/image, usePathname)
- Do NOT add Zustand to packages/ui
- Do NOT modify existing route layouts in apps/web (separate migration story)
- Do NOT implement light mode — Phase 2 scope

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Layout Container Architecture]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 0 Story 0.4]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction 1 — Dashboard Shell]
- [Source: apps/web/app/(dashboard)/layout.tsx — Existing sidebar pattern]
- [Source: apps/web/app/(admin)/layout.tsx — Existing admin sidebar pattern]
- [Source: packages/ui/src/tokens/theme.css — ROSE design tokens]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial implementation: all tests passed on first run (172 tests total: 138 existing + 34 new).
- Code review found 3 critical, 5 important, 4 minor issues. All critical and important fixed.

### Completion Notes List

- Task 1: Created DashboardShell — sidebar (240px/64px) + content area, skip-to-content link, collapse button with localStorage persistence (key: edin-sidebar-collapsed), 200ms ease-out transition with motion-reduce:transition-none, mobile hamburger + full-screen overlay with focus trap, escape-to-close, click-outside-to-close, dialog role on mobile overlay.
- Task 2: Created SidebarNav — logo slot, subtitle, nav sections with titles, nav items with labels/icons/domain dots/notification dots, active state (accent-primary text + 2px right border + 8% opacity bg), collapsed mode (icons only, domain dots repositioned absolutely), renderLink prop for framework-agnostic link rendering, keyboard-navigable with focus-visible ring.
- Task 3: Created layout/index.ts barrel. Updated src/index.ts with layout re-exports.
- Task 4: 175 tests passing (20 test files). Build clean (tsc). Lint clean (eslint). Full project build clean (Next.js).

### Change Log

- 2026-03-14: Implemented DashboardShell & SidebarNav (Story 0.4) — 4 tasks completed, 175 tests passing
- 2026-03-14: Code review fixes — Removed 'use client' directive from dashboard-shell.tsx (C1). Changed React.ReactNode to imported ReactNode type (C2). Fixed notification aria-label to include item label (C3). Show domain dot in collapsed mode with absolute positioning (I1). Removed max-w-xs from mobile overlay for full-screen spec compliance (I2). Used useRef for onCollapseChange to fix stale closure (I3). Added focus trap to mobile overlay with dialog role + aria-modal (I4). Removed onCollapseChange call from mount effect (I5). Used section.title as key instead of array index (M3). Added localStorage read test + mobile overlay dialog role test (M4). 175 tests passing after fixes.

### File List

- `packages/ui/src/layout/dashboard-shell.tsx` (new)
- `packages/ui/src/layout/dashboard-shell.test.tsx` (new)
- `packages/ui/src/layout/sidebar-nav.tsx` (new)
- `packages/ui/src/layout/sidebar-nav.test.tsx` (new)
- `packages/ui/src/layout/index.ts` (new)
- `packages/ui/src/index.ts` (modified)
