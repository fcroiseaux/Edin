# Story 0.2: Foundation UI Primitives

Status: done

## Story

As a contributor,
I want consistent, accessible interactive elements across the platform,
So that buttons, inputs, cards, and badges feel cohesive and respond predictably.

## Acceptance Criteria

1. **Button Component** — `packages/ui/src/primitives/button.tsx` exports a `Button` with three variants: Primary (`accent-primary` fill #FF5A00, white text), Secondary (`surface-subtle` border, `text-primary` text, transparent fill), Ghost (no border, no fill, `text-accent` or `text-secondary` text). Button text uses ABC Normal Medium (font-weight 500) at 14-16px. Minimum touch target 44x44px. Hover: Primary lightens to `accent-primary-hover`, Secondary shows `surface-subtle` fill, Ghost shows underline. Focus: 3px `accent-primary` ring on all variants. Disabled: 40% opacity, `cursor: not-allowed`, no hover effect.

2. **Input and Textarea Components** — `packages/ui/src/primitives/input.tsx` and `textarea.tsx` render on `surface-raised` background with 1px `surface-subtle` border, `text-primary` text, ABC Normal Book 16px. Focus: 3px orange focus ring (`accent-primary`), border shifts to `accent-primary`. Error state: `error` (#E85A5A) border with inline error message. Placeholder text uses `text-tertiary`, ABC Normal Light (300). Labels always above inputs (ABC Normal Medium, 14px, `text-secondary`).

3. **Card Component** — `packages/ui/src/primitives/card.tsx` renders with `surface-raised` background, `radius-md` (8px), `shadow-sm`, 16px internal padding, 1px `surface-subtle` border. Hover state shows subtle border/shadow shift.

4. **Badge Component** — `packages/ui/src/primitives/badge.tsx` renders with `radius-sm` (4px), ABC Normal Medium, 12px. Domain variant accepts a `domain` prop (tech/impact/governance/finance) and renders with the corresponding pillar color. Badges can be text-only or filled (8% opacity pillar color background + pillar-color border).

5. **Skeleton Component** — `packages/ui/src/primitives/skeleton.tsx` renders on `surface-subtle` with animated shimmer effect. Animation respects `prefers-reduced-motion` (disables shimmer when reduced motion is preferred).

6. **Barrel Export** — `packages/ui/src/index.ts` re-exports all primitives. Components are importable via `import { Button, Input, Textarea, Card, Badge, Skeleton } from '@edin/ui'`.

7. **Tests** — Each component has a co-located test file (`*.test.tsx`) covering variant rendering, accessibility attributes, and interactive states.

## Tasks / Subtasks

- [ ] Task 1: Create Button component (AC: #1)
  - [ ] Create `packages/ui/src/primitives/button.tsx` with Primary, Secondary, Ghost variants
  - [ ] Implement all interactive states (hover, focus, disabled)
  - [ ] Support `size` prop (sm, md, lg) with 44px minimum touch target
  - [ ] Forward ref and accept standard button HTML attributes
  - [ ] Create `packages/ui/src/primitives/button.test.tsx`

- [ ] Task 2: Create Input component (AC: #2)
  - [ ] Create `packages/ui/src/primitives/input.tsx` with label, error, placeholder states
  - [ ] Implement focus ring (3px accent-primary) and error state (error border + message)
  - [ ] Forward ref and accept standard input HTML attributes
  - [ ] Create `packages/ui/src/primitives/input.test.tsx`

- [ ] Task 3: Create Textarea component (AC: #2)
  - [ ] Create `packages/ui/src/primitives/textarea.tsx` matching Input patterns
  - [ ] Create `packages/ui/src/primitives/textarea.test.tsx`

- [ ] Task 4: Create Card component (AC: #3)
  - [ ] Create `packages/ui/src/primitives/card.tsx` with surface-raised, radius-md, shadow-sm
  - [ ] Implement hover state with subtle border/shadow shift
  - [ ] Accept children and optional className
  - [ ] Create `packages/ui/src/primitives/card.test.tsx`

- [ ] Task 5: Create Badge component (AC: #4)
  - [ ] Create `packages/ui/src/primitives/badge.tsx` with domain variant (tech/impact/governance/finance)
  - [ ] Implement text-only and filled (8% opacity background) modes
  - [ ] Create `packages/ui/src/primitives/badge.test.tsx`

- [ ] Task 6: Create Skeleton component (AC: #5)
  - [ ] Create `packages/ui/src/primitives/skeleton.tsx` using existing `.skeleton` CSS class from globals.css
  - [ ] Accept width, height, className props for flexible placeholder shapes
  - [ ] Create `packages/ui/src/primitives/skeleton.test.tsx`

- [ ] Task 7: Set up barrel exports and test infrastructure (AC: #6, #7)
  - [ ] Create `packages/ui/src/primitives/index.ts` barrel file
  - [ ] Update `packages/ui/src/index.ts` to re-export all primitives
  - [ ] Add `clsx` dependency to `packages/ui/package.json`
  - [ ] Add vitest + testing-library to `packages/ui/package.json` devDependencies
  - [ ] Create `packages/ui/vitest.config.ts`
  - [ ] Run all tests and verify they pass

- [ ] Task 8: Build verification (AC: all)
  - [ ] Run `pnpm build` — confirm no type errors
  - [ ] Run `pnpm lint` — confirm no lint errors from new files
  - [ ] Run `pnpm --filter @edin/ui test` — confirm all tests pass

## Dev Notes

### Critical Architecture Decisions

**Component Location:** All primitives go in `packages/ui/src/primitives/`. This is the `@edin/ui` shared package, NOT `apps/web/components/`. The architecture mandates: "Shared UI components in `packages/ui`" and "Use Radix wrappers from `packages/ui/src/radix/` — never import Radix directly in `apps/web`." Same principle applies to primitives.

**Styling Approach:** Pure Tailwind CSS utility classes. These primitives do NOT use Radix UI — they are Tailwind-only components. Radix wrappers are Story 0.3 scope.

**Utility Function:** The project uses `clsx` for class merging (see `apps/web/lib/utils.ts`). Since primitives live in `packages/ui`, add `clsx` as a dependency of `@edin/ui` and create a local `cn` utility at `packages/ui/src/lib/cn.ts` (or use clsx directly). Do NOT import from `apps/web/lib/utils.ts`.

**ROSE Design Tokens:** All styling MUST use Tailwind utility classes that map to ROSE tokens defined in `packages/ui/src/tokens/theme.css`. NEVER hardcode hex values. Token → utility mapping:

| Token                          | Tailwind Class                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `--color-surface-base`         | `bg-surface-base`                                                                          |
| `--color-surface-raised`       | `bg-surface-raised`                                                                        |
| `--color-surface-subtle`       | `bg-surface-subtle`, `border-surface-subtle`                                               |
| `--color-accent-primary`       | `bg-accent-primary`, `text-accent-primary`, `ring-accent-primary`, `border-accent-primary` |
| `--color-accent-primary-hover` | `hover:bg-accent-primary-hover`                                                            |
| `--color-text-primary`         | `text-text-primary`                                                                        |
| `--color-text-secondary`       | `text-text-secondary`                                                                      |
| `--color-text-tertiary`        | `text-text-tertiary`                                                                       |
| `--color-text-inverse`         | `text-text-inverse`                                                                        |
| `--color-error`                | `border-error`, `text-error`                                                               |
| `--color-pillar-tech`          | `text-pillar-tech`, `bg-pillar-tech`, `border-pillar-tech`                                 |
| `--color-pillar-impact`        | `text-pillar-impact`, `bg-pillar-impact`, `border-pillar-impact`                           |
| `--color-pillar-governance`    | `text-pillar-governance`, `bg-pillar-governance`, `border-pillar-governance`               |
| `--color-pillar-finance`       | `text-pillar-finance`, `bg-pillar-finance`, `border-pillar-finance`                        |
| `--radius-sm`                  | `rounded-sm`                                                                               |
| `--radius-md`                  | `rounded-md`                                                                               |
| `--shadow-sm`                  | `shadow-sm`                                                                                |

**Font Weight Usage:** ABC Normal weights map to `font-light` (300), `font-normal` (400), `font-medium` (500), `font-bold` (700). For 450 (Neutral) and 800 (Black), use `font-[450]` and `font-[800]`.

**Accessibility:** Every interactive component MUST have visible focus ring (3px `accent-primary`). Use `focus-visible:ring-3 focus-visible:ring-accent-primary` pattern. All inputs need associated labels. Disabled states must use `aria-disabled` or native `disabled` attribute.

### Testing Setup for `packages/ui`

The `packages/ui` package currently has no test infrastructure. Set up:

1. Add to `packages/ui/package.json` devDependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`
2. Create `packages/ui/vitest.config.ts` following the same pattern as `apps/web/vitest.config.ts`
3. Add `"test": "vitest run"` script to `packages/ui/package.json`
4. Each test file tests: rendering, variants, accessibility attributes, and user interactions

### Component API Design

**Button:**

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
```

**Input:**

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
```

**Textarea:**

```tsx
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
```

**Card:**

```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}
```

**Badge:**

```tsx
type Domain = 'tech' | 'impact' | 'governance' | 'finance';
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'filled';
  domain?: Domain;
  className?: string;
}
```

**Skeleton:**

```tsx
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}
```

### Pillar Color Mapping for Badge Domain Variant

```
tech       → pillar-tech       (#FF5A00)  — orange
impact     → pillar-impact     (#00E87B)  — green
governance → pillar-governance (#00C4E8)  — cyan
finance    → pillar-finance    (#E8AA00)  — gold
```

Filled mode: 8% opacity background. In Tailwind, use `bg-pillar-tech/8` (Tailwind v4 opacity modifier syntax).

### Previous Story Intelligence (Story 0.1)

- Story 0.1 established the ROSE token file at `packages/ui/src/tokens/theme.css` and font faces at `packages/ui/src/fonts/abc-normal.css`
- The `packages/ui/src/index.ts` currently only has CSS path documentation comments — no actual TypeScript exports yet
- The `packages/ui/package.json` has React as a peerDependency and devDependency, plus TypeScript and ESLint
- The `.skeleton` CSS class already exists in `apps/web/app/globals.css` (lines 22-36) with `surface-subtle` background and pulse animation + reduced motion support
- The skeleton CSS animation is global — the `Skeleton` React component should apply the `skeleton` class

### What NOT to Do

- Do NOT create Radix UI wrapper components — that is Story 0.3
- Do NOT create layout components (DashboardShell, ReadingCanvas, SidebarNav) — that is Stories 0.4-0.5
- Do NOT create domain identity components (PillarAccentLine, DomainBadge, PillarCard) — that is Story 0.6
- Do NOT move or restructure existing components in `apps/web/components/`
- Do NOT modify `apps/web/app/globals.css` or `apps/web/app/layout.tsx`
- Do NOT implement light mode — Phase 2 scope
- Do NOT use Radix UI in any primitive component
- Do NOT import from `apps/web` in `packages/ui` (wrong dependency direction)

### Project Structure Notes

**Monorepo:** pnpm workspaces + Turborepo. `packages/ui` is `@edin/ui`, already a workspace dependency of `apps/web`.

**Current `packages/ui` state:** Contains `package.json`, `tsconfig.json`, `src/index.ts` (CSS path comments only), `src/tokens/theme.css`, and `src/fonts/` directory. No React components exist yet.

**TypeScript config:** Extends `../config/tsconfig/base.json`, `jsx: "react-jsx"`, output to `./dist`.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#ROSE Design System Architecture — Component Library Scope]
- [Source: _bmad-output/planning-artifacts/architecture.md#Design System Implementation Rules]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 0 Story 0.2]
- [Source: _bmad-output/implementation-artifacts/0-1-rose-design-tokens-abc-normal-font-integration.md — Story 0.1 learnings]
- [Source: packages/ui/src/tokens/theme.css — ROSE design tokens]
- [Source: apps/web/app/globals.css — Existing skeleton animation]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial test run: 3 failures due to missing vitest.setup.ts (jest-dom matchers not loaded). Fixed by adding setup file.
- Initial build: 3 TS errors from test files included in build. Fixed by excluding test files in tsconfig.json.

### Completion Notes List

- Task 1: Created Button component with Primary/Secondary/Ghost variants, sm/md/lg sizes (44px min touch target on md), forwardRef, disabled state with opacity-40 + cursor-not-allowed.
- Task 2: Created Input component with label (above-input, Medium 500, 14px, text-secondary), error state (error border + inline message with role="alert"), focus ring (3px accent-primary), aria-invalid/aria-describedby for accessibility.
- Task 3: Created Textarea component following same patterns as Input (label, error, focus ring, accessibility).
- Task 4: Created Card component with surface-raised background, radius-md, shadow-sm, 16px padding, surface-subtle border. Optional hoverable prop adds hover:shadow-md transition.
- Task 5: Created Badge component with domain variant (tech/impact/governance/finance) using pillar colors. Default and filled modes (8% opacity background via Tailwind v4 opacity modifier syntax).
- Task 6: Created Skeleton component using existing `.skeleton` CSS class from globals.css. Accepts width/height/className. Sets aria-hidden="true".
- Task 7: Set up barrel exports (primitives/index.ts → src/index.ts). Added clsx dependency. Added vitest + testing-library devDependencies. Created vitest.config.ts + vitest.setup.ts. Created cn utility in packages/ui/src/lib/cn.ts.
- Task 8: All 50 tests pass. Build passes (tsc). Lint passes (eslint). Web app build passes.

### Change Log

- 2026-03-14: Implemented Foundation UI Primitives (Story 0.2) — 8 tasks completed, 50 tests passing
- 2026-03-14: Code review fixes — Added tailwind-merge to cn utility (M1). Fixed Button sm size from 36px to 44px min touch target (M2). Changed Input/Textarea from focus: to focus-visible: for consistency with Button (M3). Improved Card hover state to use accent-primary/30 border instead of near-invisible surface-overlay (M4). Made Skeleton self-contained with animate-pulse + motion-reduce:animate-none instead of depending on globals.css (M5). Added aria-describedby absence tests for Input/Textarea (M6). 53 tests passing after fixes.

### File List

- `packages/ui/src/primitives/button.tsx` (new)
- `packages/ui/src/primitives/button.test.tsx` (new)
- `packages/ui/src/primitives/input.tsx` (new)
- `packages/ui/src/primitives/input.test.tsx` (new)
- `packages/ui/src/primitives/textarea.tsx` (new)
- `packages/ui/src/primitives/textarea.test.tsx` (new)
- `packages/ui/src/primitives/card.tsx` (new)
- `packages/ui/src/primitives/card.test.tsx` (new)
- `packages/ui/src/primitives/badge.tsx` (new)
- `packages/ui/src/primitives/badge.test.tsx` (new)
- `packages/ui/src/primitives/skeleton.tsx` (new)
- `packages/ui/src/primitives/skeleton.test.tsx` (new)
- `packages/ui/src/primitives/index.ts` (new)
- `packages/ui/src/lib/cn.ts` (new)
- `packages/ui/src/index.ts` (modified)
- `packages/ui/package.json` (modified)
- `packages/ui/tsconfig.json` (modified)
- `packages/ui/vitest.config.ts` (new)
- `packages/ui/vitest.setup.ts` (new)
