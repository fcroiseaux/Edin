# BMAD Pipeline Report: Story 8-4

**Story:** 8-4-public-article-reading-experience
**Epic:** 8 - Publication Platform
**Pipeline:** bmad-cycle (create-story -> dev-story -> code-review)
**Date:** 2026-03-09
**Model:** Claude Opus 4.6

## Pipeline Steps

### Step 1: Create Story

- **Status:** Completed
- **Output:** `_bmad-output/implementation-artifacts/8-4-public-article-reading-experience.md`
- 10 task groups (5 backend, 5 frontend), 4 acceptance criteria
- Full dev notes with SSR patterns, editorial typography, cursor pagination, JSON-LD structured data, sitemap/robots

### Step 2: Dev Story (Implementation)

- **Status:** Completed
- **Files created:** 16 new files, 7 modified files
- **Backend:** PublicArticleController (3 unauthenticated endpoints), ArticleService extensions (5 public methods: listPublished, getPublishedBySlug, getSitemapArticles, calculateReadingTime, extractTextFromNode), database migration (3 indexes for published article queries)
- **Frontend:** Article listing page (SSR, domain filter buttons, infinite scroll), article reading page (SSR, JSON-LD, OpenGraph/Twitter metadata), ArticleBodyRenderer (Tiptap read-only), AuthorByline (author/editor profile links), editorial typography CSS (.article-prose), sitemap.ts, robots.ts
- **Shared:** Zod schema (publicArticleFilterSchema), TypeScript types (6 DTOs: PublicArticleAuthorDto, PublicArticleEditorDto, PublicArticleListItemDto, PublicArticleDetailDto, ArticleFilterParams, SitemapArticleDto)
- **Hooks:** usePublicArticles (useInfiniteQuery with SSR initialData), usePublicArticle (useQuery)
- **Tests:** 14 backend service tests + 27 frontend component tests, all passing
- **Regressions:** 0

### Step 3: Code Review

- **Status:** Completed (Approved after fixes)
- **Issues found:** 6 HIGH, 1 MEDIUM
- **Issues fixed:** 5 HIGH issues fixed, 1 HIGH documented with TODO, 1 MEDIUM acknowledged as by-design

#### Fixes Applied

| #   | Severity | Issue                                                            | Fix                                                                                      |
| --- | -------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | HIGH     | Route shadowing: `:slug` declared before `sitemap/entries`       | Reordered routes — literal `sitemap/entries` now before parameterized `:slug`            |
| 2   | HIGH     | Cursor+date filter corruption — OR clause overwrites date filter | Restructured with AND clause to safely combine date range and cursor conditions          |
| 3   | HIGH     | Body fetched for listings just to compute readingTimeMinutes     | Documented with TODO — proper fix requires schema migration to store computed field      |
| 4   | MEDIUM   | Tiptap client-only rendering (no SSR for body)                   | By design — story explicitly says "DO NOT use generateHTML() from @tiptap/html"          |
| 5   | HIGH     | No input validation on public controller query params            | Added `publicArticleFilterSchema.safeParse()` with DomainException on validation failure |
| 6   | HIGH     | SSR data discarded when client-side hook fires                   | Passed `initialData` to `useInfiniteQuery` so SSR data is used immediately               |
| 7   | HIGH     | JSON-LD XSS via `</script>` injection in dangerouslySetInnerHTML | Escaped `<` as `\u003c` in JSON-LD output                                                |

#### Tests After Fixes

- Backend: 834/834 passed (0 regressions)
- Frontend: 497/497 passed (0 regressions)
- Lint: Clean (API and web)

## Final Status

- **Story status:** done
- **Sprint status:** 8-4-public-article-reading-experience -> done
- **Epic status:** epic-8 -> in-progress (2 stories remaining: 8-5, 8-6)

## Auto-Approve Criteria

- [x] Green tests (all 1331 tests passing)
- [x] Clean lint (consistent formatting)
- [x] Consistent with existing architecture (module pattern, SSR patterns, TanStack Query hooks, Zod validation, Tiptap rendering)
- [x] No retries needed (all fixes applied successfully on first attempt)
