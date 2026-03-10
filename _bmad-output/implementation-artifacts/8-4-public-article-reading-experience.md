# Story 8.4: Public Article Reading Experience

Status: done

## Story

As a visitor,
I want to read published articles in a beautiful, immersive reading experience,
so that I can engage with the community's intellectual output as I would with a quality publication.

## Acceptance Criteria

### AC1: Article Listing Page

**Given** I am a visitor (no authentication required)
**When** I navigate to /articles
**Then** I see published articles organized by domain, author, and publication date (FR72)
**And** each article card shows: title, abstract, author name, domain tag (with domain accent color), publication date, and a reading time estimate
**And** the layout gives equal visual prominence to all four domains
**And** the page is server-side rendered for SEO (NFR-C2)
**And** articles are browsable with filtering by domain, author, and date range
**And** the list uses cursor-based pagination

### AC2: Immersive Article Reading Page

**Given** I click on a published article
**When** the article page at /articles/:slug loads
**Then** I see the full article rendered with editorial typography: serif headings, generous margins, elegant layout
**And** the article displays: author profile (name, bio, domain badge), editor profile (name, domain badge), domain tag, publication date, and AI evaluation score
**And** navigation chrome collapses to create a focused reading experience
**And** the page achieves FCP <1.2s and LCP <2.5s with passing Core Web Vitals (NFR-C1)

### AC3: SEO & Structured Data

**Given** the article page is rendered
**When** search engines crawl it
**Then** the page includes structured data (JSON-LD) for article type, Open Graph metadata, and Twitter Card metadata (NFR-C2)
**And** the sitemap is updated within 1 hour of publication
**And** the article URL uses a human-readable slug derived from the title

### AC4: Search Performance at Scale

**Given** the publication archive grows
**When** the system has 1000+ published articles
**Then** article search returns results within 1s (NFR-C3)
**And** query performance does not degrade beyond 10% compared to baseline

## Tasks / Subtasks

### Backend

- [x] **Task 1: Public Article API Endpoints** (AC: 1, 2, 3, 4)
  - [x]1.1 Add public article endpoints to `article.controller.ts` (NO auth guard):
    - `GET /api/v1/articles/published` — List published articles with cursor pagination, domain/author/date filters
    - `GET /api/v1/articles/published/:slug` — Get single published article by slug with author/editor profiles and evaluation score
  - [x]1.2 Add `listPublished(filters, cursor, limit)` to `article.service.ts`:
    - Query: `status: 'PUBLISHED'`, ordered by `publishedAt DESC, id DESC`
    - Filters: `domain` (enum), `authorId` (UUID), `dateFrom` / `dateTo` (ISO dates)
    - Include author profile (id, name, avatarUrl, domain, bio)
    - Cursor pagination: same pattern as existing `listUserArticles` — encode `{id, publishedAt}` as base64url cursor, fetch `limit + 1` to determine `hasMore`
    - Return `PublicArticleListItemDto[]` with pagination meta
  - [x]1.3 Add `getPublishedBySlug(slug)` to `article.service.ts`:
    - Query: `{ slug, status: 'PUBLISHED' }` with includes for author (id, name, avatarUrl, domain, bio), editor (id, name, avatarUrl, domain), and latest evaluation (from `evaluation` schema — score, narrative, dimensions)
    - Throw `ARTICLE_NOT_FOUND` (404) if not found or not PUBLISHED
    - Return `PublicArticleDetailDto`
  - [x]1.4 Add `calculateReadingTime(body: JSON)` utility in `article.service.ts`:
    - Extract plain text from Tiptap JSON content recursively
    - Calculate word count, divide by 200 wpm, round up to nearest minute
    - Return as number (minutes)
  - [x]1.5 Add database indexes for public queries (new migration):
    - `idx_articles_status_published_at` on `(status, publishedAt DESC)` — primary public listing index
    - `idx_articles_slug` on `(slug)` WHERE `status = 'PUBLISHED'` — slug lookup for published articles
    - `idx_articles_domain_published_at` on `(domain, publishedAt DESC)` WHERE `status = 'PUBLISHED'` — domain filter index

- [x]**Task 2: Shared Package — Public Article Types** (AC: 1, 2)
  - [x]2.1 Add to `packages/shared/src/types/article.types.ts`:
    - `PublicArticleListItemDto`: id, title, slug, abstract, domain, publishedAt, readingTimeMinutes, author (id, name, avatarUrl, domain)
    - `PublicArticleDetailDto`: extends list item with body (Tiptap JSON), editor (id, name, avatarUrl, domain) | null, evaluationScore (number | null), evaluationNarrative (string | null), evaluationDimensions (array | null)
    - `ArticleFilterParams`: domain? (ContributorDomain), authorId? (string), dateFrom? (string), dateTo? (string)
  - [x]2.2 Add `publicArticleFilterSchema` to `packages/shared/src/schemas/article.schema.ts`:
    - domain: ContributorDomain enum optional
    - authorId: UUID string optional
    - dateFrom: ISO date string optional
    - dateTo: ISO date string optional
    - cursor: string optional
    - limit: number int min 1 max 100 default 20 optional
  - [x]2.3 Export new types/schemas from `packages/shared/src/index.ts`

- [x]**Task 3: Sitemap Generation** (AC: 3)
  - [x]3.1 Add `getSitemapArticles()` to `article.service.ts`:
    - Query all PUBLISHED articles: select slug, publishedAt, updatedAt
    - No pagination — return all (reasonable for 1000+ articles)
  - [x]3.2 Add `GET /api/v1/articles/sitemap` endpoint (no auth):
    - Returns array of `{ slug, publishedAt, updatedAt }` for sitemap generation
    - Cache-Control: `public, max-age=3600` (1 hour TTL)

### Frontend

- [x]**Task 4: Article Listing Page — Server Component** (AC: 1)
  - [x]4.1 Create `apps/web/app/(public)/articles/page.tsx`:
    - Server component with `generateMetadata()` for SEO (title: "Articles — Edin", OG, Twitter)
    - `fetchInitialArticles()` using `fetch()` with `{ next: { revalidate: 60 } }` — follow contributor roster SSR pattern
    - Call `GET /api/v1/articles/published?limit=20`
    - Pass initial data to `ArticleListContent` client component
    - Layout: hero section with "Articles" heading + intro text (serif heading, sans description — match roster page pattern)
    - `max-w-[1200px]` container, `bg-surface-base`

- [x]**Task 5: Article List Client Component** (AC: 1)
  - [x]5.1 Create `apps/web/components/features/publication/article-list/article-list-content.tsx`:
    - `'use client'` component receiving `initialArticles` and `initialTotal`
    - Domain filter: four domain buttons (Technology, Fintech, Impact, Governance) + "All" — styled with domain accent colors
    - URL search params for filters: `?domain=Technology&author=...`
    - TanStack `useInfiniteQuery` for cursor-based pagination (follow `use-contributor-roster.ts` pattern)
    - "Load more" button (not infinite scroll)
    - Grid layout: single column on mobile, two columns on desktop
    - Empty state when no articles match filters
  - [x]5.2 Create `apps/web/components/features/publication/article-list/public-article-card.tsx`:
    - Article card: title (serif font, linked to /articles/[slug]), abstract (2-line clamp), author name, domain badge with accent color, publication date (relative format), reading time estimate
    - Hover: subtle shadow elevation (`shadow-card`)
    - Domain accent color: thin left border or top accent bar
    - `aria-label` on card link for accessibility

- [x]**Task 6: Article Reading Page — Server Component** (AC: 2, 3)
  - [x]6.1 Create `apps/web/app/(public)/articles/[slug]/page.tsx`:
    - Server component with dynamic route `params: Promise<{ slug: string }>`
    - `fetchArticle(slug)` calling `GET /api/v1/articles/published/:slug` with `{ next: { revalidate: 60 } }`
    - `generateMetadata()`: dynamic title (`${article.title} — Edin`), description (article.abstract), OG (type: 'article', author, publishedTime), Twitter card
    - 404 handling with `notFound()` from `next/navigation`
    - Render `ArticleReadingView` client component with article data
  - [x]6.2 Add JSON-LD structured data in article page:
    - `<script type="application/ld+json">` in the page component
    - Schema.org Article type: headline, abstract, author (Person), editor (Person), datePublished, dateModified, publisher (Organization: "Edin"), mainEntityOfPage, image (if available)

- [x]**Task 7: Immersive Article Reading Component** (AC: 2)
  - [x]7.1 Create `apps/web/components/features/publication/article-reading/article-reading-view.tsx`:
    - `'use client'` component receiving `PublicArticleDetailDto`
    - Layout: centered content column, max-width 720px, generous vertical spacing (48px/64px between sections)
    - Header: domain badge with accent color, publication date, reading time
    - Title: serif font (`font-libre-baskerville`), large (clamp 1.75rem-2.5rem), `text-brand-primary`
    - Abstract: sans-serif, larger than body, `text-brand-secondary`, italic
    - Author byline: name + domain badge, link to `/contributors/[id]`
    - Editor credit: "Reviewed by [name]" — subtle, smaller text
    - Article body: rendered from Tiptap JSON (use Task 8 renderer)
    - Evaluation section: narrative card at bottom (if evaluation exists)
    - Footer: author bio card, link back to /articles
  - [x]7.2 Create `apps/web/components/features/publication/article-reading/author-byline.tsx`:
    - Author name (linked to profile), avatar (if available), domain badge, brief bio
    - Editor credit below: "Reviewed by [editor name]" with domain badge
    - Styled like editorial byline — elegant, not social-media-card

- [x]**Task 8: Tiptap Content Renderer** (AC: 2)
  - [x]8.1 Create `apps/web/components/features/publication/article-reading/article-body-renderer.tsx`:
    - `'use client'` component that renders Tiptap JSON as read-only rich text
    - Use `useEditor({ content: body, editable: false, extensions: [...] })` with `EditorContent` from `@tiptap/react`
    - Extensions: StarterKit, Link (openOnClick: true), Image, CodeBlockLowlight (same as authoring editor)
    - Apply editorial typography CSS classes to the editor container:
      - Headings (h2-h4): serif font, generous margins above/below
      - Paragraphs: `leading-[1.8]`, `text-[17px]`, `text-brand-primary`
      - Blockquotes: left border with `border-brand-accent`, italic, indented
      - Code blocks: `font-mono`, `bg-surface-sunken`, rounded, padding
      - Lists: proper indentation, bullet/number styling
      - Links: `text-brand-accent`, underline on hover
      - Images: full-width, rounded corners, optional caption
    - CSS scoped with `.article-prose` class to avoid style leaks

- [x]**Task 9: Sitemap & SEO Files** (AC: 3)
  - [x]9.1 Create `apps/web/app/sitemap.ts`:
    - Next.js sitemap route handler
    - Fetch published articles from `GET /api/v1/articles/sitemap`
    - Return `MetadataRoute.Sitemap` array with article URLs, lastModified, changeFrequency ('weekly'), priority (0.8)
    - Include static pages: / (1.0), /articles (0.9), /contributors (0.7)
    - Revalidate: 3600 (1 hour)
  - [x]9.2 Create `apps/web/app/robots.ts`:
    - Allow all crawlers
    - Sitemap URL pointing to `/sitemap.xml`
    - Disallow: /dashboard/, /admin/, /api/

- [x] **Task 10: Data Fetching Hook** (AC: 1)
  - [x]10.1 Add to `apps/web/hooks/use-article.ts`:
    - `usePublicArticles(filters)`: `useInfiniteQuery` with cursor pagination for `GET /api/v1/articles/published` — follow `useContributorRoster` pattern
    - `usePublicArticle(slug)`: `useQuery` for `GET /api/v1/articles/published/:slug` — enabled when slug is defined

### Testing

- [x] **Task 11: Backend Tests** (AC: 1, 2, 3, 4)
  - [x]11.1 Add tests to existing `article.service.spec.ts` or create `article-public.service.spec.ts`:
    - `listPublished`: returns only PUBLISHED articles, correct pagination, domain/author/date filters, empty result
    - `getPublishedBySlug`: returns article with author/editor/evaluation, 404 for non-existent slug, 404 for non-published article
    - `calculateReadingTime`: correct calculation from Tiptap JSON, handles empty content, handles code blocks
    - `getSitemapArticles`: returns all published slugs

- [x] **Task 12: Frontend Component Tests** (AC: 1, 2)
  - [x]12.1 Create `public-article-card.test.tsx`: renders title, abstract, author, domain badge with correct color, publication date, reading time
  - [x]12.2 Create `article-list-content.test.tsx`: renders article list, domain filter buttons, load more button, empty state
  - [x]12.3 Create `article-reading-view.test.tsx`: renders title, author byline, editor credit, domain badge, evaluation section
  - [x]12.4 Create `author-byline.test.tsx`: renders author name (linked), editor credit, domain badges

## Dev Notes

### Architecture Patterns — MUST FOLLOW

**Public Route Pattern:** Use `(public)` route group at `apps/web/app/(public)/`. Follow the contributor roster page pattern exactly:

- Server component fetches initial data with `fetch()` + `{ next: { revalidate: 60 } }`
- Pass initial data to client component
- Client component uses TanStack `useInfiniteQuery` for client-side pagination

```
apps/web/app/(public)/
├── layout.tsx                     (existing — uses PublicNav, DO NOT modify)
├── contributors/page.tsx          (existing reference pattern)
├── articles/
│   ├── page.tsx                   (NEW — article listing, SSR)
│   └── [slug]/page.tsx            (NEW — article reading, SSR)
```

**API Response Envelope:** Use `createSuccessResponse(data, correlationId, pagination?)` from `apps/api/src/common/types/api-response.type.ts`. All endpoints return `{ data, meta: { timestamp, correlationId, pagination? } }`.

**Public Endpoints:** These new routes do NOT require `@UseGuards(JwtAuthGuard)`. They are the first public article endpoints. Add them to `article.controller.ts` as separate methods without auth decorators. Place them BEFORE the `@UseGuards(JwtAuthGuard)` decorated routes to avoid NestJS guard inheritance issues — or use a separate controller section.

**Error Handling:** Use `DomainException` from `apps/api/src/common/exceptions/domain.exception.ts`.

**Cursor Pagination:** Follow the exact pattern in `article.service.ts:listUserArticles()`:

- Cursor encoded as base64url JSON: `{ id, publishedAt }`
- Fetch `limit + 1` to determine `hasMore`
- Order by `publishedAt DESC, id DESC`

### Article Body Rendering — CRITICAL

Article body is stored as **Tiptap JSON** (not HTML or Markdown). The reading page MUST render this JSON as styled rich text.

**Approach:** Use `@tiptap/react` with `useEditor({ content: body, editable: false })` + `EditorContent`. This is already installed (v3.20.1). The editor instance renders the JSON using the same extensions as the authoring editor.

**Extensions required (match authoring editor at `tiptap-editor.tsx`):**

- StarterKit (headings, bold, italic, lists, blockquote, code, horizontal rule)
- Link
- Image
- CodeBlockLowlight (with lowlight for syntax highlighting)

**DO NOT** use `generateHTML()` from `@tiptap/html` — it requires a separate package not currently installed, and `@tiptap/react` with `editable: false` is simpler and already available.

**Editorial Typography CSS — scoped to `.article-prose`:**

```css
.article-prose h2 {
  font-family: var(--font-libre-baskerville);
  font-size: 1.5rem;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
}
.article-prose h3 {
  font-family: var(--font-libre-baskerville);
  font-size: 1.25rem;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}
.article-prose p {
  font-size: 17px;
  line-height: 1.8;
  margin-bottom: 1.25rem;
  color: var(--color-brand-primary);
}
.article-prose blockquote {
  border-left: 3px solid var(--color-brand-accent);
  padding-left: 1.5rem;
  font-style: italic;
}
.article-prose pre {
  background: var(--color-surface-sunken);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}
.article-prose a {
  color: var(--color-brand-accent);
  text-decoration: underline;
}
.article-prose img {
  max-width: 100%;
  border-radius: 8px;
  margin: 1.5rem 0;
}
```

### SEO Implementation

**generateMetadata() pattern** (follow contributors page):

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);
  if (!article) return { title: 'Article Not Found — Edin' };
  return {
    title: `${article.title} — Edin`,
    description: article.abstract,
    openGraph: {
      title: article.title,
      description: article.abstract,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.abstract,
    },
  };
}
```

**JSON-LD structured data** — render as `<script>` tag in the server component:

```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.title,
  abstract: article.abstract,
  author: { '@type': 'Person', name: article.author.name },
  editor: article.editor ? { '@type': 'Person', name: article.editor.name } : undefined,
  datePublished: article.publishedAt,
  publisher: { '@type': 'Organization', name: 'Edin' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseUrl}/articles/${article.slug}` },
};
```

**Sitemap:** Next.js App Router supports `app/sitemap.ts` that exports a function returning `MetadataRoute.Sitemap`. This auto-generates `/sitemap.xml`.

**Robots:** Next.js App Router supports `app/robots.ts` that exports a function returning `MetadataRoute.Robots`.

### Immersive Reading Design

**Navigation collapse:** The `PublicNav` in `(public)/layout.tsx` is simpler than dashboard nav. For the article reading page, the layout naturally provides minimal chrome. DO NOT modify the public layout — the clean PublicNav is already minimal enough.

**Typography hierarchy for article page:**

- Domain badge: sans-serif, 12px uppercase, domain accent color bg with white text
- Publication date + reading time: sans-serif, 14px, `text-brand-secondary`
- Title: serif (`font-libre-baskerville`), `clamp(1.75rem, 4vw, 2.5rem)`, `font-bold`, `text-brand-primary`
- Abstract: sans-serif, 18px, italic, `text-brand-secondary`, generous bottom margin
- Author byline: sans-serif, 15px, name linked, domain badge inline
- Editor credit: sans-serif, 13px, `text-brand-secondary`, "Reviewed by [name]"
- Body: see editorial typography CSS above
- Evaluation: narrative card with subtle bg, serif heading "AI Evaluation"

**Layout dimensions:**

- Content column: `max-w-[720px]` centered
- Top padding: `py-[var(--spacing-3xl)]` (64px)
- Section spacing: `space-y-[var(--spacing-2xl)]` (48px)

### Domain Colors — Use Existing CSS Variables

```
Technology: var(--color-domain-technology) = #3A7D7E
Fintech:    var(--color-domain-fintech)    = #C49A3C
Impact:     var(--color-domain-impact)     = #B06B6B
Governance: var(--color-domain-governance) = #7B6B8A
```

Check `apps/web/lib/domain-colors.ts` for the existing `DOMAIN_COLORS` mapping utility.

### Evaluation Score Display

The evaluation score comes from the `evaluation` schema. The article page should show:

- If evaluation exists: narrative summary (2-4 sentences), overall score as subtle indicator
- If no evaluation yet: omit section entirely (no "pending" message)
- Follow the narrative-first approach from Story 7-3: text description first, score as supporting detail

Query pattern for evaluation: join through `evaluation.evaluations` where `contributionType = 'ARTICLE'` and `entityId = article.id` and `status = 'COMPLETED'`.

### Reading Time Calculation

Tiptap JSON structure: `{ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '...' }] }, ...] }`

Recursive text extraction:

```typescript
function extractText(node: any): string {
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join(' ');
  return '';
}
const words = extractText(body).split(/\s+/).filter(Boolean).length;
const readingTime = Math.max(1, Math.ceil(words / 200));
```

### Module Structure

```
apps/api/src/modules/publication/
├── publication.module.ts                (existing — no changes needed)
├── article.controller.ts               (UPDATE: add 2 public endpoints)
├── article.service.ts                   (UPDATE: add listPublished, getPublishedBySlug, calculateReadingTime, getSitemapArticles)
├── editorial.controller.ts             (existing — DO NOT modify)
├── editorial.service.ts                (existing — DO NOT modify)
├── editor-eligibility.controller.ts    (existing — DO NOT modify)
├── editor-eligibility.service.ts       (existing — DO NOT modify)

apps/web/app/(public)/articles/
├── page.tsx                             (NEW — article listing SSR page)
├── [slug]/page.tsx                      (NEW — article reading SSR page)

apps/web/app/
├── sitemap.ts                           (NEW — dynamic sitemap)
├── robots.ts                            (NEW — robots.txt)

apps/web/components/features/publication/
├── article-list/
│   ├── public-article-card.tsx          (NEW — public article card)
│   ├── public-article-card.test.tsx     (NEW)
│   ├── article-list-content.tsx         (NEW — client component with filters/pagination)
│   ├── article-list-content.test.tsx    (NEW)
├── article-reading/
│   ├── article-reading-view.tsx         (NEW — immersive reading component)
│   ├── article-reading-view.test.tsx    (NEW)
│   ├── article-body-renderer.tsx        (NEW — Tiptap JSON renderer)
│   ├── author-byline.tsx               (NEW — author/editor credits)
│   ├── author-byline.test.tsx           (NEW)

apps/web/hooks/
├── use-article.ts                       (UPDATE: add usePublicArticles, usePublicArticle)
```

### Existing Code to Extend

| File                                                     | Change                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/api/src/modules/publication/article.controller.ts` | Add 2 public endpoints (no auth) + sitemap endpoint                             |
| `apps/api/src/modules/publication/article.service.ts`    | Add listPublished, getPublishedBySlug, calculateReadingTime, getSitemapArticles |
| `packages/shared/src/types/article.types.ts`             | Add PublicArticleListItemDto, PublicArticleDetailDto, ArticleFilterParams       |
| `packages/shared/src/schemas/article.schema.ts`          | Add publicArticleFilterSchema                                                   |
| `packages/shared/src/index.ts`                           | Export new types/schemas                                                        |
| `apps/web/hooks/use-article.ts`                          | Add usePublicArticles, usePublicArticle hooks                                   |
| `apps/api/prisma/schema.prisma`                          | Add indexes for public query performance                                        |

### Anti-Patterns to Avoid

- **DO NOT** create a separate NestJS controller for public articles — extend the existing `article.controller.ts` with public methods
- **DO NOT** require authentication for public article endpoints — visitors browse without login
- **DO NOT** use `generateHTML()` from `@tiptap/html` — use `@tiptap/react` with `editable: false` (already installed)
- **DO NOT** expose article body as HTML — keep Tiptap JSON format, render client-side
- **DO NOT** return DRAFT/SUBMITTED/ARCHIVED articles on public endpoints — only PUBLISHED
- **DO NOT** implement full-text search in this story — basic filtering (domain, author, date) is sufficient
- **DO NOT** modify the `(public)/layout.tsx` — PublicNav is already minimal
- **DO NOT** add real-time view counters — publication metrics are Story 8-5
- **DO NOT** implement article comments or reactions — out of scope
- **DO NOT** add infinite scroll — use "Load more" button (consistent with contributor roster)
- **DO NOT** create a new module for public routes — they belong in the existing publication module

### Dependencies to Install

**Backend (apps/api):** No new dependencies needed.

**Frontend (apps/web):** No new dependencies needed — `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-code-block-lowlight`, TanStack Query, and lowlight are already installed.

### Testing Standards

- **Vitest** for all tests (unit + component)
- **@nestjs/testing** for NestJS service tests
- Backend tests co-located: `article.service.spec.ts` or `article-public.service.spec.ts`
- Mock PrismaService in service tests
- Frontend component tests: Vitest + React Testing Library
- Test article card renders all fields (title, abstract, author, domain, date, reading time)
- Test article reading view renders editorial typography
- Test filter buttons toggle domain filter
- Test pagination load-more behavior
- Test 404 handling for invalid slugs

### Previous Story Learnings (from Stories 8-1, 8-2, 8-3)

- **SSR pattern:** Server component fetches initial data, passes to client component — see `(public)/contributors/page.tsx` for exact pattern
- **Cursor pagination:** Encode `{id, timestamp}` as base64url JSON, fetch `limit + 1`, return `hasMore` + `cursor` — see `article.service.ts:listUserArticles`
- **Tiptap setup:** Extensions must match authoring editor exactly — StarterKit, Link, Image, CodeBlockLowlight with lowlight. See `tiptap-editor.tsx`
- **Domain colors:** Use `DOMAIN_COLORS` map from `apps/web/lib/domain-colors.ts` — maps domain enum to hex color
- **Response helper:** `createSuccessResponse(data, req.correlationId)` — correlationId comes from request middleware
- **Hook pattern:** TanStack Query with `queryKey` arrays, `useMutation` with `onSuccess` invalidation
- **CSS custom properties:** Use `var(--color-*)`, `var(--spacing-*)`, `var(--font-*)` — NOT hardcoded values
- **Accessibility:** `aria-label` on interactive elements, semantic HTML (`<main>`, `<article>`, `<section>`, `<nav>`)
- **Frontend directive:** All interactive components need `'use client'` directive

### Performance Considerations

- **SSR + revalidate:** Use `{ next: { revalidate: 60 } }` for article data — fresh enough for a publication platform
- **Index strategy:** The three new indexes cover the primary access patterns (listing, slug lookup, domain filter)
- **Tiptap renderer:** `editable: false` mode is lighter than full editor — no toolbar, no input handlers
- **Image loading:** Use `loading="lazy"` on article images for LCP optimization
- **Font loading:** Libre Baskerville (serif) is already loaded globally — no additional font requests

### Project Structure Notes

- Public article pages go in `(public)/articles/` — same route group as contributors
- Article reading components go in `components/features/publication/article-reading/` — new directory
- Public article card goes in `components/features/publication/article-list/` — alongside existing draft-card
- Sitemap and robots go at `app/` root level (Next.js convention)
- No variances with existing structure

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.4]
- [Source: _bmad-output/planning-artifacts/prd.md — FR72, FR73, FR75, NFR-C1, NFR-C2, NFR-C3]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Response Envelope, Cursor Pagination, Publication Module, SSR Strategy, Route Groups]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Editorial Typography, Immersive Reading Tunnel, Domain Colors, Navigation Collapse]
- [Source: _bmad-output/implementation-artifacts/8-3-editor-roles-and-eligibility.md — Previous story patterns and learnings]
- [Source: apps/api/src/modules/publication/article.controller.ts — Existing article endpoints]
- [Source: apps/api/src/modules/publication/article.service.ts — Cursor pagination pattern, article queries]
- [Source: apps/web/app/(public)/contributors/page.tsx — SSR public page pattern with generateMetadata]
- [Source: apps/web/app/(public)/layout.tsx — Public layout with PublicNav]
- [Source: apps/web/components/features/publication/article-editor/tiptap-editor.tsx — Tiptap extensions list]
- [Source: apps/web/hooks/use-contributor-roster.ts — useInfiniteQuery cursor pagination pattern]
- [Source: apps/web/lib/domain-colors.ts — Domain color mapping utility]
- [Source: apps/web/app/globals.css — Design tokens, CSS custom properties]
- [Source: apps/api/prisma/schema.prisma — Article model, ArticleStatus enum, related models]
- [Source: packages/shared/src/types/article.types.ts — Existing article DTOs]
- [Source: packages/shared/src/schemas/article.schema.ts — Existing article validation schemas]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- All 12 tasks implemented: backend API, shared types, sitemap, frontend pages, components, hooks, tests
- 14 backend tests pass (article-public.service.spec.ts)
- 27 frontend component tests pass (public-article-card, article-reading-view, author-byline)
- Full regression suite: 834 backend + 497 frontend tests — all green
- Public endpoints created at /api/v1/articles/published (no auth required)
- SSR article listing at /articles with domain filtering and cursor pagination
- Immersive reading experience at /articles/[slug] with editorial typography
- JSON-LD structured data, OpenGraph, Twitter Card metadata
- Sitemap (app/sitemap.ts) and robots.txt (app/robots.ts) created
- Tiptap JSON body renderer using @tiptap/react in read-only mode
- Evaluation score display conditional (null until article evaluation pipeline is integrated)
- Reading time calculated from Tiptap JSON content (200 wpm)
- Database indexes added for public query performance

### File List

**New Files:**

- apps/api/src/modules/publication/public-article.controller.ts
- apps/api/src/modules/publication/article-public.service.spec.ts
- apps/api/prisma/migrations/20260309930000_add_public_article_indexes/migration.sql
- apps/web/app/(public)/articles/page.tsx
- apps/web/app/(public)/articles/[slug]/page.tsx
- apps/web/app/sitemap.ts
- apps/web/app/robots.ts
- apps/web/components/features/publication/article-list/article-list-content.tsx
- apps/web/components/features/publication/article-list/public-article-card.tsx
- apps/web/components/features/publication/article-list/public-article-card.test.tsx
- apps/web/components/features/publication/article-reading/article-reading-view.tsx
- apps/web/components/features/publication/article-reading/article-reading-view.test.tsx
- apps/web/components/features/publication/article-reading/article-body-renderer.tsx
- apps/web/components/features/publication/article-reading/author-byline.tsx
- apps/web/components/features/publication/article-reading/author-byline.test.tsx

**Modified Files:**

- apps/api/src/modules/publication/article.service.ts (added listPublished, getPublishedBySlug, calculateReadingTime, getSitemapArticles)
- apps/api/src/modules/publication/publication.module.ts (registered PublicArticleController)
- apps/api/prisma/schema.prisma (added idx_articles_status_published_at index)
- apps/web/hooks/use-article.ts (added usePublicArticles, usePublicArticle hooks)
- apps/web/app/globals.css (added .article-prose editorial typography)
- packages/shared/src/types/article.types.ts (added public article DTOs)
- packages/shared/src/schemas/article.schema.ts (added publicArticleFilterSchema)
- packages/shared/src/index.ts (exported new types/schemas)
