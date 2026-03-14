# BMAD Pipeline Report: Story 0.5

**Story:** 0-5-reading-canvas-and-public-portal
**Epic:** 0 — ROSE Design System Foundation
**Pipeline:** bmad-cycle (create-story -> dev-story -> code-review)
**Date:** 2026-03-14
**Model:** Claude Opus 4.6

## Pipeline Steps

### Step 1: Create Story

- **Status:** Completed
- **Output:** `_bmad-output/implementation-artifacts/0-5-reading-canvas-and-public-portal.md`
- 5 task groups, 6 acceptance criteria
- Full dev notes with ReadingCanvas, HeroSection, PublicLayout TypeScript APIs, ROSE token mapping, accessibility requirements

### Step 2: Dev Story (Implementation)

- **Status:** Completed
- **Files created:** 6 new files, 2 modified files

**New Component Files (6):**

- `packages/ui/src/layout/reading-canvas.tsx` — Immersive article reading: surface-reading bg, 680px centered article, body-lg text, 1.7 line-height, 1.5em paragraph spacing, blush-pink headings, topBar slot
- `packages/ui/src/layout/reading-canvas.test.tsx` — 13 tests
- `packages/ui/src/layout/hero-section.tsx` — Cinematic gradient hero: radial orange/pink glow (CSS custom properties), overline/headline/subtitle/CTA slots, full/compact variants
- `packages/ui/src/layout/hero-section.test.tsx` — 12 tests
- `packages/ui/src/layout/public-layout.tsx` — Public portal frame: top nav with logo/items/auth, mobile hamburger + full-screen overlay with focus trap, renderLink prop
- `packages/ui/src/layout/public-layout.test.tsx` — 15 tests

**Modified Files (2):**

- `packages/ui/src/layout/index.ts` — Added ReadingCanvas, HeroSection, PublicLayout exports
- `packages/ui/src/index.ts` — Added layout re-exports

**Tests:** 215 tests passing (23 test files)

### Step 3: Code Review

- **Status:** Completed (Approved after fixes)
- **Issues found:** 3 Critical, 5 Important
- **Issues fixed:** 7 (all Critical + actionable Important)
- **Issues deferred:** 1 Important (renderNavLink useCallback — functional but inconsistent)

#### Fixes Applied

| #   | Severity  | Issue                                                         | Fix                                                                |
| --- | --------- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | CRITICAL  | HeroSection headline missing font-weight 900                  | Added `font-black` class to headline div                           |
| 2   | CRITICAL  | ReadingCanvas paragraph spacing (1.5em) not implemented       | Added `[&_p+p]:mt-[1.5em]` to article element                      |
| 3   | CRITICAL  | `React` namespace used without import in test file            | Added `import type React from 'react'`                             |
| 4   | IMPORTANT | Gradient uses hardcoded RGBA values                           | Switched to `rgb(from var(--color-accent-primary) ...)` CSS syntax |
| 5   | IMPORTANT | Missing tests for paragraph spacing, line-height, font-weight | Added 3 tests: paragraph spacing, line-height, headline font-black |

#### Tests After Fixes

- @edin/ui: 215/215 passed (23 test files)
- Build: Clean (tsc)
- Lint: Clean (eslint — 0 errors)
- Web app build: Clean (Next.js)
- 0 retries needed

## Final Status

- **Story status:** done
- **Sprint status:** 0-5-reading-canvas-and-public-portal -> done
- **Epic status:** epic-0 -> in-progress (5/6 stories completed)

## Auto-Approve Criteria

- [x] Green tests (215 @edin/ui tests passing)
- [x] Clean lint (0 errors)
- [x] Clean build (tsc + Next.js)
- [x] Consistent with existing architecture (ROSE tokens, forwardRef, cn(), barrel exports, framework-agnostic, ReactNode import pattern)
- [x] Code review issues fixed (7/8 resolved, 1 deferred)
- [x] No retries needed
