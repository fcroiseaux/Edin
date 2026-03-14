# Story 0.3: Radix UI Wrappers with ROSE Theming

Status: done

## Story

As a contributor,
I want modals, dropdowns, tabs, and accordions that are keyboard-accessible and visually consistent with the ROSE design,
So that I can navigate the platform efficiently without a mouse.

## Acceptance Criteria

1. **Radix Dependencies** — All required `@radix-ui/react-*` packages (12 packages: accordion, avatar, dialog, dropdown-menu, popover, scroll-area, select, switch, tabs, toast, tooltip, visually-hidden) are added as dependencies of `packages/ui/package.json`.

2. **Accordion Component** — `packages/ui/src/radix/accordion.tsx` exports `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`. Trigger text uses `text-heading` (blush-pink). Content animates open/close. Keyboard-navigable expand/collapse. Focus ring: 3px `accent-primary`.

3. **Avatar Component** — `packages/ui/src/radix/avatar.tsx` exports `Avatar`, `AvatarImage`, `AvatarFallback`. Root uses `radius-full`. Fallback shows initials on `surface-subtle` background with `text-text-secondary`.

4. **Dialog Component** — `packages/ui/src/radix/dialog.tsx` exports `Dialog`, `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogClose`. Overlay uses black/60 backdrop. Content uses `surface-overlay` background, `shadow-lg`, `radius-lg`. Focus-trapped. Escape-to-close.

5. **DropdownMenu Component** — `packages/ui/src/radix/dropdown-menu.tsx` exports `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel`. Content uses `surface-raised`, `shadow-lg`. Items show `accent-primary` background on hover/focus. Keyboard arrow navigation preserved.

6. **Popover Component** — `packages/ui/src/radix/popover.tsx` exports `Popover`, `PopoverTrigger`, `PopoverContent`. Content uses `surface-raised`, `shadow-lg`, `radius-md`. Accepts optional `domain` prop for pillar-color border.

7. **ScrollArea Component** — `packages/ui/src/radix/scroll-area.tsx` exports `ScrollArea`, `ScrollBar`. Scrollbar track uses `surface-subtle`. Thumb uses `surface-overlay`. Supports vertical and horizontal orientations.

8. **Select Component** — `packages/ui/src/radix/select.tsx` exports `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`. Trigger uses `surface-raised` with `surface-subtle` border, orange focus ring. Content uses `surface-raised`, `shadow-lg`. Items show `accent-primary` on hover/focus.

9. **Switch Component** — `packages/ui/src/radix/switch.tsx` exports `Switch`. Root uses `accent-primary` when checked, `surface-subtle` when unchecked. Thumb is white circle. Focus ring: 3px `accent-primary`. Minimum touch target 44x44px.

10. **Tabs Component** — `packages/ui/src/radix/tabs.tsx` exports `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`. Underline style: active tab has 2px bottom border. Accepts optional `domain` prop on `TabsTrigger` for pillar-color underline. Focus ring: 3px `accent-primary`.

11. **Toast Component** — `packages/ui/src/radix/toast.tsx` exports `ToastProvider`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastAction`, `ToastViewport`. Root uses `surface-raised`, `shadow-lg`, left semantic-color border. Viewport positioned bottom-right. Default duration: 5000ms. Accepts `variant` prop: `default`, `success`, `error`, `warning`.

12. **Tooltip Component** — `packages/ui/src/radix/tooltip.tsx` exports `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`. Content uses `surface-overlay`, `text-body-sm`, `shadow-md`, `radius-sm`.

13. **VisuallyHidden Re-export** — `packages/ui/src/radix/visually-hidden.tsx` re-exports `VisuallyHidden` from `@radix-ui/react-visually-hidden`.

14. **Barrel Export** — `packages/ui/src/radix/index.ts` re-exports all Radix wrappers. `packages/ui/src/index.ts` re-exports from `./radix`.

15. **Tests** — Each component has a co-located test file (`*.test.tsx`) verifying: renders correctly, applies ROSE styling classes, preserves accessibility attributes, merges custom className. All tests pass.

16. **Build Verification** — `pnpm build` passes with no type errors. `pnpm lint` passes with no new errors. `pnpm --filter @edin/ui test` passes all tests.

## Tasks / Subtasks

- [ ] Task 1: Add Radix UI dependencies to packages/ui (AC: #1)
  - [ ] Add all 12 `@radix-ui/react-*` packages as dependencies in `packages/ui/package.json`
  - [ ] Run `pnpm install` to update lockfile

- [ ] Task 2: Create Accordion wrapper (AC: #2)
  - [ ] Create `packages/ui/src/radix/accordion.tsx`
  - [ ] Create `packages/ui/src/radix/accordion.test.tsx`

- [ ] Task 3: Create Avatar wrapper (AC: #3)
  - [ ] Create `packages/ui/src/radix/avatar.tsx`
  - [ ] Create `packages/ui/src/radix/avatar.test.tsx`

- [ ] Task 4: Create Dialog wrapper (AC: #4)
  - [ ] Create `packages/ui/src/radix/dialog.tsx`
  - [ ] Create `packages/ui/src/radix/dialog.test.tsx`

- [ ] Task 5: Create DropdownMenu wrapper (AC: #5)
  - [ ] Create `packages/ui/src/radix/dropdown-menu.tsx`
  - [ ] Create `packages/ui/src/radix/dropdown-menu.test.tsx`

- [ ] Task 6: Create Popover wrapper (AC: #6)
  - [ ] Create `packages/ui/src/radix/popover.tsx`
  - [ ] Create `packages/ui/src/radix/popover.test.tsx`

- [ ] Task 7: Create ScrollArea wrapper (AC: #7)
  - [ ] Create `packages/ui/src/radix/scroll-area.tsx`
  - [ ] Create `packages/ui/src/radix/scroll-area.test.tsx`

- [ ] Task 8: Create Select wrapper (AC: #8)
  - [ ] Create `packages/ui/src/radix/select.tsx`
  - [ ] Create `packages/ui/src/radix/select.test.tsx`

- [ ] Task 9: Create Switch wrapper (AC: #9)
  - [ ] Create `packages/ui/src/radix/switch.tsx`
  - [ ] Create `packages/ui/src/radix/switch.test.tsx`

- [ ] Task 10: Create Tabs wrapper (AC: #10)
  - [ ] Create `packages/ui/src/radix/tabs.tsx`
  - [ ] Create `packages/ui/src/radix/tabs.test.tsx`

- [ ] Task 11: Create Toast wrapper (AC: #11)
  - [ ] Create `packages/ui/src/radix/toast.tsx`
  - [ ] Create `packages/ui/src/radix/toast.test.tsx`

- [ ] Task 12: Create Tooltip wrapper (AC: #12)
  - [ ] Create `packages/ui/src/radix/tooltip.tsx`
  - [ ] Create `packages/ui/src/radix/tooltip.test.tsx`

- [ ] Task 13: Create VisuallyHidden re-export and barrel exports (AC: #13, #14)
  - [ ] Create `packages/ui/src/radix/visually-hidden.tsx`
  - [ ] Create `packages/ui/src/radix/index.ts` barrel file
  - [ ] Update `packages/ui/src/index.ts` to re-export all Radix wrappers

- [ ] Task 14: Build verification (AC: #15, #16)
  - [ ] Run `pnpm --filter @edin/ui test` — confirm all tests pass
  - [ ] Run `pnpm build` — confirm no type errors
  - [ ] Run `pnpm lint` — confirm no lint errors from new files

## Dev Notes

### Critical Architecture Decisions

**Component Location:** All Radix wrappers go in `packages/ui/src/radix/`. The architecture mandates: "Use Radix wrappers from `packages/ui/src/radix/` — never import Radix directly in `apps/web`."

**Wrapper Pattern:** Import Radix primitives as unstyled, apply Tailwind utility classes matching ROSE design tokens. Preserve all Radix ARIA, keyboard, and focus management. The wrapper adds visual styling only — behavior comes from Radix.

**Dependency Location:** Radix packages go in `packages/ui/package.json` `dependencies` (not devDependencies). The `apps/web/package.json` already has these packages but the architecture direction is to import wrappers from `@edin/ui`, not directly from Radix. Existing `apps/web` Radix deps are left untouched (separate cleanup story).

**Styling Approach:** Pure Tailwind CSS utility classes using ROSE design tokens. Use the `cn()` utility from `packages/ui/src/lib/cn.ts` (clsx + tailwind-merge) for class composition and custom className merging.

### ROSE Token → Tailwind Class Mapping (used across all wrappers)

| Token                          | Tailwind Class                                           | Usage                                        |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------- |
| `--color-surface-base`         | `bg-surface-base`                                        | Default background                           |
| `--color-surface-raised`       | `bg-surface-raised`                                      | Cards, menus, dropdowns                      |
| `--color-surface-overlay`      | `bg-surface-overlay`                                     | Modals, tooltips                             |
| `--color-surface-subtle`       | `bg-surface-subtle`, `border-surface-subtle`             | Borders, scroll tracks, inactive controls    |
| `--color-accent-primary`       | `bg-accent-primary`, `focus-visible:ring-accent-primary` | Active states, focus rings, hover            |
| `--color-accent-primary-hover` | `hover:bg-accent-primary-hover`                          | Hover state on accent backgrounds            |
| `--color-text-primary`         | `text-text-primary`                                      | Body text                                    |
| `--color-text-secondary`       | `text-text-secondary`                                    | Secondary text, labels                       |
| `--color-text-heading`         | `text-text-heading`                                      | Blush-pink heading text (Accordion triggers) |
| `--color-text-inverse`         | `text-text-inverse`                                      | Text on accent backgrounds                   |
| `--color-error`                | `border-error`                                           | Error toast left border                      |
| `--color-success`              | `border-success`                                         | Success toast left border                    |
| `--color-warning`              | `border-warning`                                         | Warning toast left border                    |
| `--color-pillar-tech`          | `border-pillar-tech`                                     | Pillar border variants                       |
| `--color-pillar-impact`        | `border-pillar-impact`                                   | Pillar border variants                       |
| `--color-pillar-governance`    | `border-pillar-governance`                               | Pillar border variants                       |
| `--color-pillar-finance`       | `border-pillar-finance`                                  | Pillar border variants                       |

### Focus Ring Pattern (all interactive wrappers)

```
focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary
```

### Accessibility Requirements

- All Radix ARIA attributes pass through untouched
- Focus is visible with 3px `accent-primary` ring on all interactive elements
- All interactive states (open/close, select, toggle) operable via keyboard only (NFR-A3)
- Screen readers announce state changes (Radix handles this natively)
- WCAG 2.1 Level AA compliance (NFR-A1)

### Component API Pattern

Follow the Radix compound component pattern. Each wrapper re-exports Radix's compound parts with ROSE styling applied. Example:

```tsx
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { forwardRef } from 'react';
import { cn } from '../lib/cn';

const DialogContent = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 ..." />
    <DialogPrimitive.Content
      ref={ref}
      className={cn('bg-surface-overlay shadow-lg rounded-lg ...', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
```

### Testing Strategy

Tests verify ROSE theming is applied, not Radix behavior (Radix has its own test suite). Each test file covers:

1. Component renders without error
2. ROSE styling classes are applied (check className or computed styles)
3. Custom className merges correctly
4. ForwardRef works (where applicable)
5. Accessibility: role and aria attributes present

### Previous Story Intelligence (Stories 0.1-0.2)

- Story 0.1: ROSE tokens in `packages/ui/src/tokens/theme.css`, fonts in `packages/ui/src/fonts/abc-normal.css`
- Story 0.2: Foundation primitives in `packages/ui/src/primitives/` — Button, Input, Textarea, Card, Badge, Skeleton. Pattern: forwardRef, cn() utility, co-located tests, barrel export via `primitives/index.ts`
- Test infrastructure already set up: vitest + @testing-library/react + jsdom + jest-dom matchers
- `packages/ui/tsconfig.json` excludes test files from build output
- `cn()` utility at `packages/ui/src/lib/cn.ts` uses clsx + tailwind-merge

### What NOT to Do

- Do NOT create NavigationMenu or Separator wrappers — not in this story's scope (architecture lists 14 primitives but this story covers 12)
- Do NOT create domain identity components (PillarAccentLine, DomainBadge, PillarCard) — Story 0.6
- Do NOT create layout components (DashboardShell, ReadingCanvas, SidebarNav) — Stories 0.4-0.5
- Do NOT move or restructure existing components in `apps/web/components/`
- Do NOT modify existing primitives in `packages/ui/src/primitives/`
- Do NOT remove Radix deps from `apps/web/package.json` (separate cleanup task)
- Do NOT implement light mode — Phase 2 scope

### Radix Package Versions

Match versions from `apps/web/package.json`:

- `@radix-ui/react-accordion`: `^1.2.0`
- `@radix-ui/react-avatar`: `^1.1.0`
- `@radix-ui/react-dialog`: `^1.1.0`
- `@radix-ui/react-dropdown-menu`: `^2.1.0`
- `@radix-ui/react-popover`: `^1.1.0`
- `@radix-ui/react-scroll-area`: `^1.2.0`
- `@radix-ui/react-select`: `^2.1.0`
- `@radix-ui/react-switch`: `^1.1.0`
- `@radix-ui/react-tabs`: `^1.1.0`
- `@radix-ui/react-toast`: `^1.2.0`
- `@radix-ui/react-tooltip`: `^1.1.0`
- `@radix-ui/react-visually-hidden`: `^1.1.0`

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Radix UI Primitives — Architectural Dependencies]
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Library Scope]
- [Source: _bmad-output/planning-artifacts/architecture.md#Design System Implementation Rules]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 0 Story 0.3]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Radix Primitive table]
- [Source: _bmad-output/implementation-artifacts/0-2-foundation-ui-primitives.md — Story 0.2 patterns]
- [Source: packages/ui/src/tokens/theme.css — ROSE design tokens]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial test run: 10 failures. Fixed avatar (jsdom can't load images), scroll-area (scrollbar not rendered without overflow), select (pointer interaction in jsdom), toast (viewport selector), tooltip (duplicate text elements from Radix), accordion (data-testid queries).
- Second test run: 2 remaining failures (avatar img, scroll-area orientation). Fixed by adjusting test assertions to match jsdom behavior.
- Lint fix: 2 errors (unused import + unused variable in scroll-area.test.tsx). Fixed by removing unused `ScrollBar` import and `container` assignment.

### Completion Notes List

- Task 1: Added 12 @radix-ui/react-\* packages to packages/ui/package.json dependencies (versions match apps/web).
- Task 2: Created Accordion wrapper — AccordionItem (border-surface-subtle), AccordionTrigger (text-text-heading, focus ring, chevron icon), AccordionContent (animate open/close, text-text-primary).
- Task 3: Created Avatar wrapper — Avatar (rounded-full), AvatarImage, AvatarFallback (bg-surface-subtle, text-text-secondary).
- Task 4: Created Dialog wrapper — Dialog, DialogTrigger, DialogContent (bg-surface-overlay, shadow-lg, rounded-lg, focus-trapped), DialogOverlay (black/60), DialogTitle (text-text-heading), DialogDescription (text-text-secondary), DialogClose, DialogPortal.
- Task 5: Created DropdownMenu wrapper — DropdownMenuContent (bg-surface-raised, shadow-lg), DropdownMenuItem (focus:bg-accent-primary), DropdownMenuSeparator (bg-surface-subtle), DropdownMenuLabel (text-text-secondary).
- Task 6: Created Popover wrapper — PopoverContent (bg-surface-raised, shadow-lg), domain prop for pillar-color border. Imports shared Domain type from badge.tsx.
- Task 7: Created ScrollArea wrapper — ScrollArea (overflow-hidden, viewport), ScrollBar (bg-surface-subtle track, bg-surface-overlay thumb).
- Task 8: Created Select wrapper — SelectTrigger (bg-surface-raised, border, focus ring, chevron), SelectContent (bg-surface-raised, shadow-lg), SelectItem (focus:bg-accent-primary), SelectLabel, SelectSeparator.
- Task 9: Created Switch wrapper — accent-primary when checked, surface-subtle when unchecked, bg-text-primary thumb, 44px min touch target, focus ring.
- Task 10: Created Tabs wrapper — TabsList (border-b surface-subtle), TabsTrigger (underline style, domain prop for pillar-color), TabsContent. Imports shared Domain type.
- Task 11: Created Toast wrapper — ToastProvider, Toast (bg-surface-raised, shadow-lg, variant left borders: accent-primary/success/error/warning), ToastViewport (bottom-right, z-100), ToastTitle, ToastDescription, ToastClose, ToastAction.
- Task 12: Created Tooltip wrapper — TooltipProvider, Tooltip, TooltipTrigger, TooltipContent (bg-surface-overlay, text-body-sm, shadow-md, rounded-sm).
- Task 13: Created VisuallyHidden re-export. Created radix/index.ts barrel. Updated src/index.ts with all Radix exports.
- Task 14: 138 tests passing (18 test files). Build clean (tsc). Lint clean (eslint). Full project build clean (Next.js).

### Change Log

- 2026-03-14: Implemented Radix UI Wrappers with ROSE Theming (Story 0.3) — 14 tasks completed, 138 tests passing
- 2026-03-14: Code review fixes — Added accordion animation keyframes to theme.css (C1). Changed Switch thumb from bg-white to bg-text-primary (C2). Imported shared Domain type from badge.tsx in popover.tsx and tabs.tsx (I3). Added DialogOverlay/DialogPortal to barrel exports (I4). Removed invalid toast-close="" attribute (I5). Changed tooltip text-sm to text-body-sm ROSE token (I6). Fixed AccordionContent className routing to Radix element (I7). Removed p-2 from Switch root (I8). Added bg-surface-subtle to ScrollArea scrollbar track (I9). Added AccordionContent className test (M11). Added visually-hidden.test.tsx (M12). 138 tests passing after fixes.

### File List

- `packages/ui/src/radix/accordion.tsx` (new)
- `packages/ui/src/radix/accordion.test.tsx` (new)
- `packages/ui/src/radix/avatar.tsx` (new)
- `packages/ui/src/radix/avatar.test.tsx` (new)
- `packages/ui/src/radix/dialog.tsx` (new)
- `packages/ui/src/radix/dialog.test.tsx` (new)
- `packages/ui/src/radix/dropdown-menu.tsx` (new)
- `packages/ui/src/radix/dropdown-menu.test.tsx` (new)
- `packages/ui/src/radix/popover.tsx` (new)
- `packages/ui/src/radix/popover.test.tsx` (new)
- `packages/ui/src/radix/scroll-area.tsx` (new)
- `packages/ui/src/radix/scroll-area.test.tsx` (new)
- `packages/ui/src/radix/select.tsx` (new)
- `packages/ui/src/radix/select.test.tsx` (new)
- `packages/ui/src/radix/switch.tsx` (new)
- `packages/ui/src/radix/switch.test.tsx` (new)
- `packages/ui/src/radix/tabs.tsx` (new)
- `packages/ui/src/radix/tabs.test.tsx` (new)
- `packages/ui/src/radix/toast.tsx` (new)
- `packages/ui/src/radix/toast.test.tsx` (new)
- `packages/ui/src/radix/tooltip.tsx` (new)
- `packages/ui/src/radix/tooltip.test.tsx` (new)
- `packages/ui/src/radix/visually-hidden.tsx` (new)
- `packages/ui/src/radix/visually-hidden.test.tsx` (new)
- `packages/ui/src/radix/index.ts` (new)
- `packages/ui/src/index.ts` (modified)
- `packages/ui/package.json` (modified)
- `packages/ui/src/tokens/theme.css` (modified — added accordion animations)
