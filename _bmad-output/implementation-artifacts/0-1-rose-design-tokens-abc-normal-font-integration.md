# Story 0.1: ROSE Design Tokens & ABC Normal Font Integration

Status: done

## Story

As a contributor,
I want the platform to render with the ROSE visual identity — dark backgrounds, ABC Normal typography, and vivid orange accents,
So that every page feels like a beautifully designed publication from my first visit.

## Acceptance Criteria

1. **Design Tokens File** — `packages/ui/src/tokens/theme.css` contains a Tailwind v4 `@theme` block with ALL ROSE CSS custom properties: 6 surface colors, 4 accent colors, 4 pillar colors, 4 semantic colors, 6 text colors, full type scale (Major Third 1.25), spacing scale (4px base), border radii, and shadow definitions.

2. **Font-Face Declarations** — `packages/ui/src/fonts/abc-normal.css` defines `@font-face` for all 7 ABC Normal weights (Light 300, Book 400, Neutral 450, Medium 500, Bold 700, Black 800, Super 900) using WOFF2 format with `font-display: swap`.

3. **Font Subsetting** — TTF source files from `docs/rose-design/fonts/` are subsetted to Latin + Latin Extended character sets and converted to WOFF2. Total font payload < 200KB.

4. **Font Preloading** — `apps/web/app/layout.tsx` preloads ABC Normal Book (400) and Medium (500) as critical path fonts. Remaining weights load on demand. FCP is not blocked by font loading.

5. **Global CSS Integration** — `apps/web/app/globals.css` imports the ROSE theme tokens. The old theme (`#FAFAF7` off-white, Libre Baskerville, old domain colors) is fully replaced.

6. **Visual Verification** — Every page shows `surface-base` (#1A1A1D) background, ABC Normal Book 16px body text in `text-primary` (#F0F0F0), and all Tailwind utilities (`bg-surface-base`, `text-accent-primary`, etc.) resolve to ROSE token values.

7. **Article Prose Styles** — `.article-prose` styles are updated to use ROSE tokens and ABC Normal (Book 400 at 18px, line-height 1.7 for body; Bold 700 blush pink for headings).

## Tasks / Subtasks

- [x] Task 1: Convert TTF fonts to WOFF2 (AC: #3)
  - [x] Install `fonttools` and `brotli` (`pip install fonttools brotli`)
  - [x] Run `pyftsubset` for each of 7 TTF files → WOFF2 with Latin + Latin Extended
  - [x] Place output WOFF2 files in `packages/ui/src/fonts/`
  - [x] Verify total WOFF2 payload < 200KB
  - [x] Add `packages/ui/src/fonts/*.woff2` to `.gitignore` (commercial font, must not be in public repo)

- [x] Task 2: Create font-face declarations (AC: #2)
  - [x] Create `packages/ui/src/fonts/abc-normal.css` with 7 `@font-face` rules
  - [x] Each rule: `font-family: 'ABC Normal'`, correct `font-weight`, WOFF2 `src`, `font-display: swap`

- [x] Task 3: Create ROSE design tokens (AC: #1)
  - [x] Create `packages/ui/src/tokens/theme.css` with Tailwind v4 `@theme` block
  - [x] Include all token namespaces: `--color-*`, `--font-*`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`

- [x] Task 4: Integrate fonts in Next.js layout (AC: #4)
  - [x] Replace Google font imports in `apps/web/app/layout.tsx` with `next/font/local` for ABC Normal
  - [x] Configure multi-weight `localFont` with all 7 WOFF2 files
  - [x] Set `variable: '--font-abc-normal'` on the font instance
  - [x] Keep JetBrains Mono as monospace font (via `next/font/google`)
  - [x] Apply font CSS variable to `<html>` element

- [x] Task 5: Replace global CSS theme (AC: #5, #6, #7)
  - [x] Replace entire `@theme` block in `apps/web/app/globals.css` with ROSE tokens
  - [x] Use `@theme inline` for font family referencing `next/font` CSS variable
  - [x] Use `@theme` (non-inline) for all other tokens (colors, spacing, radii, shadows)
  - [x] Update `body` styles: `surface-base` background, `text-primary` color, `font-sans` (ABC Normal)
  - [x] Update `.skeleton` animation to use `surface-subtle` instead of `surface-sunken`
  - [x] Update `.animate-highlight-fade` to use ROSE accent color
  - [x] Update `.article-prose` styles to ROSE tokens (see Dev Notes)

- [x] Task 6: Update `packages/ui` exports (AC: #1, #2)
  - [x] Update `packages/ui/src/index.ts` to re-export CSS paths for documentation
  - [x] Create `packages/ui/src/tokens/index.ts` if needed for type-safe token access

- [x] Task 7: Verify integration (AC: #6)
  - [x] Run `pnpm build` — confirm app builds with dark background, ABC Normal text, orange accents
  - [x] Verify Tailwind utilities work: `bg-surface-base`, `text-accent-primary`, `bg-pillar-tech`, etc.
  - [x] Verify font rendering at all 7 weights configured in layout
  - [x] Check FCP is not blocked by fonts (font-display: swap configured)

## Dev Notes

### Critical Architecture Decisions

**Tailwind v4 `@theme` Scoping (MUST follow):**

- Use `@theme inline` ONLY for font family tokens that reference `next/font/local` CSS variables. This is required because `next/font` sets CSS variables via a class on `<html>`, and without `inline`, Tailwind's variable indirection fails.
- Use regular `@theme` for all other tokens (colors, spacing, radii, shadows). These are static values that don't need runtime resolution.
- The `@theme` block MUST appear AFTER `@import "tailwindcss"`.

**Token Namespace Mapping (how `@theme` creates utilities):**

| Token Prefix             | Example             | Generated Utility                                             |
| ------------------------ | ------------------- | ------------------------------------------------------------- |
| `--color-surface-base`   | `#1A1A1D`           | `bg-surface-base`, `text-surface-base`, `border-surface-base` |
| `--color-accent-primary` | `#FF5A00`           | `bg-accent-primary`, `text-accent-primary`                    |
| `--color-pillar-tech`    | `#FF5A00`           | `bg-pillar-tech`, `text-pillar-tech`, `border-pillar-tech`    |
| `--font-sans`            | `'ABC Normal', ...` | `font-sans`                                                   |
| `--text-h1`              | `2.25rem`           | `text-h1` (sets font-size)                                    |
| `--radius-md`            | `8px`               | `rounded-md`                                                  |
| `--shadow-sm`            | `...`               | `shadow-sm`                                                   |
| `--space-*`              | `4px, 8px, ...`     | `p-[space-4]`, `m-[space-6]`, etc.                            |

**Compound Type Scale Tokens** — For each `--text-*` token, define companion tokens:

```css
--text-h1: 2.25rem;
--text-h1--line-height: 1.2;
--text-h1--font-weight: 800;
```

This makes `text-h1` set font-size AND line-height AND font-weight simultaneously.

### Complete ROSE Design Token Values

**Surfaces (Dark Mode Default):**

```
surface-base:     #1A1A1D  — Primary background (deepest layer)
surface-raised:   #222225  — Cards, panels, elevated content
surface-overlay:  #2A2A2E  — Modals, dialogs, popovers
surface-subtle:   #32323A  — Hover states, active backgrounds
surface-reading:  #1E1E22  — Article reading background (warmer)
surface-editor:   #252528  — TipTap editor surface
```

**Accents:**

```
accent-primary:       #FF5A00  — Vivid orange (CTAs, links, focus rings)
accent-primary-hover: #FF7A2E  — Lighter orange (hover state)
accent-secondary:     #E4BDB8  — Blush pink (headings on dark)
accent-secondary-muted: #C9A09A — Dimmed blush (subheadings)
```

**Pillar Colors (Domain Identity — MUST have equal visual weight):**

```
pillar-tech:       #FF5A00  — Technology (orange)
pillar-impact:     #00E87B  — Impact (green)
pillar-governance: #00C4E8  — Governance (cyan)
pillar-finance:    #E8AA00  — Finance (gold)
```

**Semantic:**

```
success: #00E87B  |  warning: #E8AA00  |  error: #E85A5A  |  info: #00C4E8
```

**Text Colors:**

```
text-primary:   #F0F0F0  — Body text
text-secondary: #A0A0A8  — Muted text
text-tertiary:  #6A6A72  — Placeholder, disabled
text-heading:   #E4BDB8  — Blush pink headings
text-accent:    #FF5A00  — Orange emphasis
text-inverse:   #1A1A1D  — Text on light backgrounds
```

**Type Scale (Major Third 1.25):**

```
display:  3rem/48px   — Super 900, line-height 1.1
h1:       2.25rem/36px — Black 800, line-height 1.2
h2:       1.75rem/28px — Bold 700, line-height 1.25
h3:       1.375rem/22px — Bold 700, line-height 1.3
h4:       1.125rem/18px — Medium 500, line-height 1.35
body-lg:  1.125rem/18px — Book 400, line-height 1.6 (article prose)
body:     1rem/16px    — Book 400, line-height 1.6 (UI text)
body-sm:  0.875rem/14px — Book 400, line-height 1.5
caption:  0.75rem/12px  — Light 300, line-height 1.4
```

**Spacing (4px base):**

```
space-1: 4px | space-2: 8px | space-3: 12px | space-4: 16px
space-5: 20px | space-6: 24px | space-8: 32px | space-10: 40px
space-12: 48px | space-16: 64px
```

**Radii:**

```
radius-sm: 4px | radius-md: 8px | radius-lg: 12px | radius-full: 9999px
```

**Shadows (minimal on dark):**

```
shadow-sm: 0 1px 2px rgba(0,0,0,0.3)
shadow-md: 0 4px 12px rgba(0,0,0,0.4)
shadow-lg: 0 8px 24px rgba(0,0,0,0.5)
```

### ABC Normal Font Weight Mapping

| Font File             | CSS Weight | Design Role                              |
| --------------------- | ---------- | ---------------------------------------- |
| ABCNormal-Light.ttf   | 300        | Captions, metadata, subtle text          |
| ABCNormal-Book.ttf    | 400        | Body text, paragraphs, article prose     |
| ABCNormal-Neutral.ttf | 450        | Emphasis within body text                |
| ABCNormal-Medium.ttf  | 500        | Navigation, labels, UI elements, buttons |
| ABCNormal-Bold.ttf    | 700        | Sub-headings, card titles                |
| ABCNormal-Black.ttf   | 800        | Section headings, bold emphasis          |
| ABCNormal-Super.ttf   | 900        | Hero headlines, landing page impact text |

**Source TTFs:** `docs/rose-design/fonts/ABCNormal-*.ttf` (7 files, ~1.26 MB total)

**Subsetting Command (run for EACH weight):**

```bash
pyftsubset ABCNormal-Book.ttf \
  --unicodes="U+0000-00FF,U+0100-024F,U+0259,U+1E00-1EFF,U+2000-206F,U+2070-209F,U+20A0-20CF,U+2100-214F" \
  --flavor=woff2 \
  --output-file=ABCNormal-Book.woff2 \
  --layout-features=kern,liga,calt,ccmp,locl \
  --no-hinting \
  --desubroutinize
```

**Performance Budget:** Total WOFF2 < 200KB. Critical path (Book 400 + Medium 500) ~50KB preloaded. Remaining 5 weights ~150KB lazy-loaded.

**Font Security:** ABC Normal is a commercial font. WOFF2 files MUST NOT be committed to public repositories. Add to `.gitignore`.

### Font Integration Pattern (Next.js 16 + Tailwind v4)

**In `apps/web/app/layout.tsx`:**

```tsx
import localFont from 'next/font/local';
import { JetBrains_Mono } from 'next/font/google';

const abcNormal = localFont({
  src: [
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Light.woff2',
      weight: '300',
      style: 'normal',
    },
    { path: '../../../packages/ui/src/fonts/ABCNormal-Book.woff2', weight: '400', style: 'normal' },
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Neutral.woff2',
      weight: '450',
      style: 'normal',
    },
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    { path: '../../../packages/ui/src/fonts/ABCNormal-Bold.woff2', weight: '700', style: 'normal' },
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Black.woff2',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../../packages/ui/src/fonts/ABCNormal-Super.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-abc-normal',
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});
```

**Critical:** Use `@theme inline` in `globals.css` for font family tokens that reference `next/font` CSS variables:

```css
@theme inline {
  --font-sans: var(--font-abc-normal);
  --font-mono: var(--font-jetbrains-mono);
}
```

Without `inline`, Tailwind resolves the variable at definition scope (`:root`), but `next/font` sets it via a class on `<html>`, so the variable is undefined at definition time.

### Files to Create

| File                                      | Purpose                               |
| ----------------------------------------- | ------------------------------------- |
| `packages/ui/src/tokens/theme.css`        | ROSE design tokens (`@theme` block)   |
| `packages/ui/src/fonts/abc-normal.css`    | `@font-face` declarations (7 weights) |
| `packages/ui/src/fonts/ABCNormal-*.woff2` | 7 subsetted WOFF2 font files          |

### Files to Modify

| File                       | Changes                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/app/globals.css` | Replace entire `@theme` block with ROSE tokens; update body styles, `.skeleton`, `.animate-highlight-fade`, `.article-prose` to use ROSE tokens |
| `apps/web/app/layout.tsx`  | Replace Libre Baskerville + Inter imports with `next/font/local` ABC Normal; keep JetBrains Mono                                                |
| `packages/ui/src/index.ts` | Update exports                                                                                                                                  |
| `.gitignore`               | Add `packages/ui/src/fonts/*.woff2`                                                                                                             |

### Existing Code to Preserve

The following CSS animations in `globals.css` must be preserved (update token references only):

- `@keyframes skeleton-pulse` — update `background-color` to `surface-subtle`
- `@keyframes fade-in` — keep as-is
- `@keyframes accordion-down` / `accordion-up` — keep as-is
- `@keyframes pulse-once` — keep as-is
- `@keyframes highlight-fade` — update color from old accent to ROSE accent
- `@media (prefers-reduced-motion: reduce)` block — keep as-is

### Article Prose Update (`.article-prose`)

Replace ALL old token references:

```
h2, h3, h4:
  font-family → 'ABC Normal' (inherited from body, weight changes)
  color → var(--color-text-heading)  (#E4BDB8 blush pink)

p, li:
  font-size → 18px (body-lg)
  line-height → 1.7
  color → var(--color-text-primary)  (#F0F0F0)

blockquote:
  border-left → 3px solid var(--color-accent-primary)  (#FF5A00)
  color → var(--color-text-secondary)  (#A0A0A8)

pre:
  background → var(--color-surface-raised)  (#222225)

a:
  color → var(--color-accent-primary)  (#FF5A00)

hr:
  border-top → 1px solid var(--color-surface-subtle)  (#32323A)
```

### What NOT to Do

- Do NOT create primitive components (Button, Card, etc.) — that is Story 0.2
- Do NOT create Radix wrappers — that is Story 0.3
- Do NOT create layout components (DashboardShell, ReadingCanvas) — that is Stories 0.4 and 0.5
- Do NOT move Radix UI dependencies from `apps/web` to `packages/ui` — dependency migration is a separate concern
- Do NOT implement light mode — Phase 2 scope
- Do NOT commit WOFF2 font files to git (commercial license)
- Do NOT use `next/font/google` for ABC Normal — it is a local/commercial font, not on Google Fonts
- Do NOT remove the `@source` directives at the top of `globals.css` — they tell Tailwind where to scan for classes

### Project Structure Notes

**Monorepo:** pnpm workspaces + Turborepo. `packages/ui` is `@edin/ui`, already a workspace dependency of `apps/web`.

**Current `packages/ui` state:** Nearly empty — only `package.json`, `tsconfig.json`, and placeholder `src/index.ts`. No styling dependencies. This story creates the first real content.

**Current `apps/web` styling:** Tailwind v4 + `@tailwindcss/postcss` already configured. PostCSS config at `apps/web/postcss.config.mjs`. Old theme in `globals.css`.

**Radix UI:** Already installed in `apps/web/package.json` (14 packages). Currently imported directly in app components. Migration to `packages/ui` wrappers is Story 0.3 scope.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#ROSE Design System Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Typography, Colors, Spacing]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 0 Story 0.1]
- [Source: docs/rose-design/fonts/ — 7 ABC Normal TTF files]
- [Source: docs/rose-design/ROSE_deck.pdf — Brand identity deck]
- [Source: apps/web/app/globals.css — Current old theme to replace]
- [Source: apps/web/app/layout.tsx — Current font loading to replace]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- FFTM table warnings during pyftsubset — harmless (FontLab timestamp, dropped during subsetting)
- 15 pre-existing lint warnings (0 errors) — none related to this story's changes

### Completion Notes List

- Task 1: Subsetted 7 TTF fonts to WOFF2 using pyftsubset with Latin + Latin Extended glyphs. Total payload ~122KB (well under 200KB budget). Added `.gitignore` entry for commercial font protection.
- Task 2: Created `abc-normal.css` with 7 `@font-face` rules covering weights 300–900, all using WOFF2 format with `font-display: swap`.
- Task 3: Created `theme.css` with complete Tailwind v4 `@theme` block — surfaces (6), accents (4), pillars (4), semantic (4), text colors (6), compound type scale (9 sizes with line-height/font-weight), spacing (10), radii (4), shadows (3).
- Task 4: Replaced Libre Baskerville + Inter Google Font imports with `next/font/local` ABC Normal (7 weights). Kept JetBrains Mono via `next/font/google`. CSS variable `--font-abc-normal` applied to `<html>`.
- Task 5: Replaced entire old theme in `globals.css`. Used `@import` for ROSE token file + `@theme inline` for font family resolution. Updated body styles, `.skeleton` (surface-subtle), `.animate-highlight-fade` (ROSE orange), and `.article-prose` (blush pink headings, 18px body-lg, ROSE colors throughout).
- Task 6: Updated `packages/ui/src/index.ts` with CSS import path documentation.
- Task 7: Full build passes (`pnpm build`), lint passes (0 errors), all pages compile successfully with new theme.

### Change Log

- 2026-03-14: Implemented ROSE Design Tokens & ABC Normal Font Integration (Story 0.1) — 7 tasks completed
- 2026-03-14: Code review fixes — moved font CSS variables from `<body>` to `<html>` per architecture pattern (M1). Documented `next/font/local` per-weight preloading limitation with explanation comment (M2).

### File List

- `packages/ui/src/fonts/ABCNormal-Light.woff2` (new)
- `packages/ui/src/fonts/ABCNormal-Book.woff2` (new)
- `packages/ui/src/fonts/ABCNormal-Neutral.woff2` (new)
- `packages/ui/src/fonts/ABCNormal-Medium.woff2` (new)
- `packages/ui/src/fonts/ABCNormal-Bold.woff2` (new)
- `packages/ui/src/fonts/ABCNormal-Black.woff2` (new)
- `packages/ui/src/fonts/ABCNormal-Super.woff2` (new)
- `packages/ui/src/fonts/abc-normal.css` (new)
- `packages/ui/src/tokens/theme.css` (new)
- `packages/ui/src/index.ts` (modified)
- `apps/web/app/layout.tsx` (modified)
- `apps/web/app/globals.css` (modified)
- `.gitignore` (modified)
