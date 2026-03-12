---
title: 'Delete Draft Publication'
slug: 'delete-draft-publication'
created: '2026-03-12'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 15', 'React 19', 'TanStack Query v5', 'NestJS', 'Prisma', 'Tailwind CSS']
files_to_modify:
  [
    'apps/web/hooks/use-article.ts',
    'apps/web/components/features/publication/article-list/draft-card.tsx',
  ]
code_patterns:
  [
    'DraftCard is a <Link> wrapper — delete button must use e.preventDefault()/e.stopPropagation()',
    'DraftCard is used from both draft-list.tsx and publication/page.tsx',
    'useDeleteArticle invalidates ["articles","drafts"] but useAllArticles uses ["articles","list",status] — must also invalidate ["articles","list"]',
    'Existing pattern: e.stopPropagation() on nested interactive elements inside Link (see View Metrics link)',
  ]
test_patterns: ['No existing tests for draft-card.tsx']
---

# Tech-Spec: Delete Draft Publication

**Created:** 2026-03-12

## Overview

### Problem Statement

Authors cannot delete their draft articles from the UI. The backend DELETE endpoint (`DELETE /api/v1/articles/:id`) and the frontend mutation hook (`useDeleteArticle()`) are fully implemented, but no delete button exists in the draft card component. Users have no way to remove unwanted drafts.

### Solution

Add a delete button with confirmation dialog to the draft card component (`draft-card.tsx`), wiring it to the existing `useDeleteArticle()` hook. Only show the button for articles in DRAFT status. Fix the `useDeleteArticle` hook to also invalidate the `['articles', 'list']` query cache so the main publication page updates after deletion.

### Scope

**In Scope:**

- Delete button on draft article cards (DRAFT status only)
- Confirmation dialog before deletion
- Loading state during deletion
- Fix cache invalidation in useDeleteArticle hook

**Out of Scope:**

- Deleting non-draft articles (submitted, published, etc.)
- Bulk delete functionality
- Admin delete capabilities
- Soft-delete or trash/restore workflow

## Context for Development

### Codebase Patterns

- `DraftCard` is wrapped in a `<Link>` — the entire card is clickable. Nested interactive elements must use `e.preventDefault()` and `e.stopPropagation()` (existing pattern: "View Metrics" link on line 60-65 of draft-card.tsx)
- `DraftCard` receives `article: ArticleListItemDto` prop — includes `id`, `status`, `title`
- `DraftCard` is used from both `draft-list.tsx` (drafts tab) and `publication/page.tsx` (all tabs)
- `useDeleteArticle()` hook (use-article.ts:120-131) invalidates `['articles', 'drafts']` but NOT `['articles', 'list']` — the main publication page uses `useAllArticles` with query key `['articles', 'list', status]`
- Buttons follow min-h-[44px] touch target convention
- Semantic error color: `text-semantic-error` for destructive actions

### Files to Reference

| File                                                                   | Purpose                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `apps/web/components/features/publication/article-list/draft-card.tsx` | Draft article card — add delete button here                            |
| `apps/web/components/features/publication/article-list/draft-list.tsx` | Renders DraftCard list (drafts tab)                                    |
| `apps/web/app/(dashboard)/publication/page.tsx`                        | Main publication page — also renders DraftCard (all tabs)              |
| `apps/web/hooks/use-article.ts`                                        | `useDeleteArticle()` hook (line 120) and `useAllArticles()` (line 259) |
| `apps/api/src/modules/publication/article.controller.ts`               | DELETE endpoint (line 105) — already implemented                       |
| `apps/api/src/modules/publication/article.service.ts`                  | Delete service with ownership + DRAFT-only checks (line 280)           |

### Technical Decisions

- Call `useDeleteArticle()` directly inside `DraftCard` — avoids duplicating wiring across both parents (`draft-list.tsx` and `publication/page.tsx`)
- Use `window.confirm()` for deletion confirmation — simple, native, reliable
- Show delete button only when `article.status === 'DRAFT'`
- Broaden `useDeleteArticle` cache invalidation to `['articles']` so both `['articles', 'drafts']` and `['articles', 'list', ...]` queries are refreshed

## Implementation Plan

### Tasks

- [x] Task 1: Fix `useDeleteArticle` cache invalidation
  - File: `apps/web/hooks/use-article.ts`
  - Action: In the `useDeleteArticle` hook (line 120-131), change `onSuccess` to invalidate `{ queryKey: ['articles'] }` instead of `{ queryKey: ['articles', 'drafts'] }`. This ensures both the drafts tab query (`['articles', 'drafts']`) and the main publication list query (`['articles', 'list', status]`) are invalidated after deletion.
  - Current code (line 127-128):
    ```typescript
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', 'drafts'] });
    },
    ```
  - New code:
    ```typescript
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    ```

- [x] Task 2: Add delete button to `DraftCard` component
  - File: `apps/web/components/features/publication/article-list/draft-card.tsx`
  - Action: Import `useDeleteArticle` from the hooks file. Inside `DraftCard`, call the hook and add a delete button that:
    1. Only renders when `article.status === 'DRAFT'`
    2. Uses `e.preventDefault()` and `e.stopPropagation()` to prevent the parent `<Link>` navigation (following the existing "View Metrics" pattern on line 61)
    3. Shows a `window.confirm()` dialog with the article title before proceeding
    4. Calls `deleteMutation.mutate(article.id)` on confirmation
    5. Shows "Deleting..." text while the mutation is pending
    6. Is styled as a subtle destructive action: `text-semantic-error` color, small font, positioned in the bottom-right metadata row alongside existing badges
  - Notes: The button should be placed inside the existing `<div>` at line 50 (metadata row) alongside the "Last edited" date and status badge.

### Acceptance Criteria

- [ ] AC 1: Given a user viewing the publication page with a DRAFT article, when they see the draft card, then a "Delete" button is visible on the card.
- [ ] AC 2: Given a user clicking the "Delete" button on a draft card, when the confirmation dialog appears and they confirm, then the article is deleted and the card disappears from the list.
- [ ] AC 3: Given a user clicking the "Delete" button on a draft card, when the confirmation dialog appears and they cancel, then nothing happens and the article remains.
- [ ] AC 4: Given a user viewing the publication page with a non-DRAFT article (SUBMITTED, PUBLISHED, etc.), when they see the article card, then no "Delete" button is visible.
- [ ] AC 5: Given a user deleting a draft from the "Drafts" tab, when the deletion succeeds, then the article also disappears from the "All" tab without requiring a page refresh.
- [ ] AC 6: Given a user clicking the "Delete" button, when the deletion is in progress, then the button shows "Deleting..." and is disabled to prevent double-clicks.
- [ ] AC 7: Given a user clicking the "Delete" button on a draft card, when they click it, then the card link navigation does NOT trigger (the user stays on the current page).

## Additional Context

### Dependencies

- No new dependencies required — all existing:
  - `useDeleteArticle()` hook from `apps/web/hooks/use-article.ts`
  - Backend `DELETE /api/v1/articles/:id` endpoint (already implemented)
  - `window.confirm()` (native browser API)

### Testing Strategy

- **Manual testing**:
  1. Create a draft article, verify delete button appears
  2. Click delete, cancel confirmation — verify article remains
  3. Click delete, confirm — verify article disappears from both Drafts and All tabs
  4. Verify delete button does NOT appear on submitted/published/revision-requested articles
  5. Verify clicking delete does not navigate to the edit page
  6. Test rapid double-click on delete while mutation is pending — verify no duplicate requests

### Notes

- The backend already enforces author-only and DRAFT-only constraints, so even if the UI had a bug showing the button for wrong statuses, the API would reject the request with 403/409.
- Future consideration: a "trash" or "undo" pattern could replace `window.confirm()` for a smoother UX, but that's out of scope.

## Review Notes

- Adversarial review completed
- Findings: 5 total, 2 fixed, 3 skipped (2 spec design decisions, 1 noise)
- Resolution approach: auto-fix
- F1 (High, fixed): Added inline "Delete failed" error feedback when mutation fails
- F2 (Medium, skipped): One mutation per card is spec's intentional design choice
- F3 (Medium, skipped): `window.confirm()` is spec's intentional design choice
- F4 (Medium, fixed): Added `useDeleteArticle` mock to existing `draft-list.test.tsx`
- F5 (Low, skipped): Broad cache invalidation matches existing codebase pattern
