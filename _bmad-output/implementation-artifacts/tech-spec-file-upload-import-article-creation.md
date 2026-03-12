---
title: 'File Upload Import for Article Creation'
slug: 'file-upload-import-article-creation'
created: '2026-03-12'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  [
    'Next.js 16',
    'NestJS 11',
    'TypeScript',
    'Tiptap 3.20',
    'Prisma 7.4',
    'PostgreSQL',
    'Anthropic SDK 0.39',
    'Radix UI',
    'React Query 5',
    'Tailwind CSS 4',
    'Vitest 4',
    'Zod',
  ]
files_to_modify:
  [
    'packages/shared/src/constants/error-codes.ts',
    'packages/shared/src/types/article.types.ts',
    'packages/shared/src/schemas/article.schema.ts',
    'packages/shared/src/index.ts',
    'apps/api/package.json',
    'apps/api/src/modules/publication/file-import.service.ts',
    'apps/api/src/modules/publication/article.controller.ts',
    'apps/api/src/modules/publication/publication.module.ts',
    'apps/web/hooks/use-article.ts',
    'apps/web/components/features/publication/article-editor/import-conflict-dialog.tsx',
    'apps/web/components/features/publication/article-editor/file-drop-zone.tsx',
    'apps/web/components/features/publication/article-editor/article-editor.tsx',
  ]
code_patterns:
  [
    'Controller → Service → Prisma (NestJS)',
    'DomainException for error handling with ErrorCode enum',
    'Zod schema validation in controllers',
    'Named function exports (no default exports)',
    'React Query useMutation for API calls',
    'Radix UI Dialog for modals',
    'CSS variables for spacing (var(--spacing-lg))',
    'Tiptap content stored as JSON string',
    'Auto-save with isDirtyRef pattern',
  ]
test_patterns:
  [
    'Vitest with describe/it/expect/vi',
    'NestJS Test.createTestingModule for services',
    'React Testing Library render/screen/fireEvent',
    'vi.mock for module mocking',
    'vi.fn() for dependency mocking',
  ]
---

# Tech-Spec: File Upload Import for Article Creation

**Created:** 2026-03-12

## Overview

### Problem Statement

Users must manually type all content in the Tiptap editor when creating articles. Those who already have articles written in Markdown, plain text, or Word documents have no way to import them, forcing unnecessary re-typing and copy-paste workflows.

### Solution

Add a file upload button and drag-and-drop zone to the article editor that sends the file to the NestJS backend for conversion to Tiptap JSON. The backend also calls Anthropic to generate a title and abstract from the uploaded content. The frontend populates all fields (title, abstract, body) with the result. If the editor already has content, the user is prompted to replace, append, or cancel.

### Scope

**In Scope:**

- Upload button in the article editor metadata section ("Import from file")
- Drag-and-drop upload on the editor area with visual drop zone feedback
- Server-side file processing endpoint (accepts `.md`, `.txt`, `.docx`)
- Markdown → Tiptap JSON conversion
- Plain text → Tiptap JSON conversion
- Word (.docx) → HTML → Tiptap JSON conversion (using `mammoth`)
- AI-generated title and abstract via existing Anthropic integration
- Replace / Append / Cancel dialog when editor has existing content
- 5MB file size limit with validation (client-side + server-side)

**Out of Scope:**

- Other file formats (PDF, HTML, etc.)
- Image extraction from uploaded documents
- Bulk/batch file upload

## Context for Development

### Codebase Patterns

- **NestJS Architecture**: Controller → Service → Prisma. Controllers handle HTTP, validation (Zod), and guards (JwtAuthGuard). Services contain business logic.
- **Error Handling**: `DomainException` class with `ErrorCode` enum, `HttpStatus`, and optional `details` array. Article-specific codes: `ARTICLE_NOT_FOUND`, `ARTICLE_NOT_OWNED`, etc.
- **API Response**: `createSuccessResponse(data, correlationId)` wrapper for all responses.
- **Frontend Components**: Named function exports, no default exports. Components use CSS variables (`var(--spacing-lg)`) and Tailwind CSS.
- **State Management**: React Query `useMutation` for API calls, `useState` + `useRef` for local state, `isDirtyRef` pattern for auto-save.
- **Dialog Pattern**: Radix UI Dialog with `Dialog.Root`, `Dialog.Portal`, `Dialog.Overlay`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description`, `Dialog.Close`. Backdrop: `bg-black/30`. Focus management included.
- **Tiptap Content**: Stored as JSON string via `JSON.stringify(editor.getJSON())`. Content set via `editor.commands.setContent(parsed)`.
- **Anthropic Integration**: Existing `AnthropicEvaluationProvider` in evaluation module. Uses `new Anthropic({ apiKey })` with `client.messages.create()`. Config: `ANTHROPIC_API_KEY` env var.
- **File Uploads**: No existing file upload infrastructure. `@nestjs/platform-express` installed but Multer not configured.

### Files to Reference

| File                                                                         | Purpose                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `apps/api/src/modules/publication/article.controller.ts`                     | Article API endpoints — add upload route here                       |
| `apps/api/src/modules/publication/article.service.ts`                        | Article business logic — reference for patterns                     |
| `apps/api/src/modules/publication/publication.module.ts`                     | Module registration — register new service                          |
| `apps/api/src/modules/evaluation/providers/anthropic-evaluation.provider.ts` | Reference for Anthropic SDK usage pattern                           |
| `apps/api/src/common/exceptions/domain.exception.ts`                         | Error handling pattern                                              |
| `apps/api/src/common/types/api-response.type.ts`                             | Response wrapper pattern                                            |
| `packages/shared/src/constants/error-codes.ts`                               | Error code definitions — add new codes                              |
| `packages/shared/src/schemas/article.schema.ts`                              | Zod schemas — add import response schema                            |
| `packages/shared/src/types/article.types.ts`                                 | TypeScript types — add import response type                         |
| `apps/web/components/features/publication/article-editor/article-editor.tsx` | Main editor — add upload button, drop zone, import logic            |
| `apps/web/components/features/publication/article-editor/tiptap-editor.tsx`  | Tiptap editor — `editor.commands.setContent()` for imported content |
| `apps/web/hooks/use-article.ts`                                              | React Query hooks — add upload mutation                             |
| `apps/web/components/features/admission/admin/admission-action-dialog.tsx`   | Reference for Radix UI Dialog pattern                               |

### Technical Decisions

- **Server-side conversion**: All file parsing happens on the backend (NestJS) to support .docx (requires `mammoth` library) and to keep the frontend lightweight.
- **Multer for file uploads**: Use `@nestjs/platform-express` `FileInterceptor` with Multer for multipart form handling. 5MB limit enforced server-side.
- **mammoth for .docx**: Convert Word documents to clean semantic HTML, then to Tiptap JSON.
- **marked for .md**: Convert Markdown to HTML, then reuse the same HTML → Tiptap JSON conversion path as .docx.
- **Unified HTML → Tiptap JSON pipeline**: Both .docx and .md go through HTML as intermediate format, then a shared HTML → Tiptap JSON converter. Plain text gets wrapped in paragraph nodes directly.
- **Anthropic AI for metadata**: New dedicated method in `FileImportService` to generate title (max 200 chars) and abstract (max 300 chars) from the document's plain text content.
- **Radix UI Dialog for conflict resolution**: Consistent with 6+ existing dialogs in the codebase.
- **New `FileImportService`**: Dedicated service to isolate file processing logic (conversion + AI generation) from the main `ArticleService`.
- **Frontend sends file via FormData**: The upload mutation sends the file as `multipart/form-data` (not JSON). The API returns the converted Tiptap JSON body, AI-generated title, and AI-generated abstract.

## Implementation Plan

### Tasks

- [x] Task 1: Add shared types, schemas, and error codes
  - File: `packages/shared/src/constants/error-codes.ts`
  - Action: Add new error codes to the Publication section:
    - `FILE_IMPORT_UNSUPPORTED_TYPE: 'FILE_IMPORT_UNSUPPORTED_TYPE'`
    - `FILE_IMPORT_TOO_LARGE: 'FILE_IMPORT_TOO_LARGE'`
    - `FILE_IMPORT_CONVERSION_FAILED: 'FILE_IMPORT_CONVERSION_FAILED'`
    - `FILE_IMPORT_AI_GENERATION_FAILED: 'FILE_IMPORT_AI_GENERATION_FAILED'`
    - `FILE_IMPORT_EMPTY_CONTENT: 'FILE_IMPORT_EMPTY_CONTENT'`
  - File: `packages/shared/src/types/article.types.ts`
  - Action: Add new interface:
    ```typescript
    export interface FileImportResultDto {
      title: string;
      abstract: string;
      body: string; // Tiptap JSON string
    }
    ```
  - File: `packages/shared/src/schemas/article.schema.ts`
  - Action: Add Zod schema for the import result:
    ```typescript
    export const fileImportResultSchema = z.object({
      title: z.string().max(200),
      abstract: z.string().max(300),
      body: z.string(),
    });
    ```
  - File: `packages/shared/src/index.ts`
  - Action: Ensure new types and schemas are re-exported.

- [x] Task 2: Install backend dependencies
  - File: `apps/api/package.json`
  - Action: Add dependencies:
    - `mammoth` (docx → HTML conversion)
    - `marked` (Markdown → HTML conversion)
  - Action: Add devDependency:
    - `@types/multer` (TypeScript types for file upload)
  - Notes: Run `pnpm install` from workspace root after updating.

- [x] Task 3: Create `FileImportService` (backend)
  - File: `apps/api/src/modules/publication/file-import.service.ts` (NEW)
  - Action: Create injectable NestJS service with the following methods:
    - `importFile(file: Express.Multer.File): Promise<FileImportResultDto>`
      - Validates file extension (`.md`, `.txt`, `.docx`) — throws `FILE_IMPORT_UNSUPPORTED_TYPE`
      - Validates non-empty content — throws `FILE_IMPORT_EMPTY_CONTENT`
      - Routes to the appropriate converter based on extension
      - Extracts plain text from the converted content for AI generation
      - Calls `generateMetadata()` for title and abstract
      - Returns `{ title, abstract, body }` where body is Tiptap JSON string
    - `private convertMarkdown(buffer: Buffer): string`
      - Uses `marked` to convert Markdown → HTML
      - Passes HTML through `htmlToTiptapJson()`
      - Returns Tiptap JSON string
    - `private convertPlainText(buffer: Buffer): string`
      - Splits text by double newlines into paragraphs
      - Wraps each paragraph in Tiptap paragraph node: `{ type: 'paragraph', content: [{ type: 'text', text: '...' }] }`
      - Returns Tiptap JSON string with `{ type: 'doc', content: [...paragraphs] }`
    - `private convertDocx(buffer: Buffer): Promise<string>`
      - Uses `mammoth.convertToHtml()` to get HTML
      - Passes HTML through `htmlToTiptapJson()`
      - Returns Tiptap JSON string
    - `private htmlToTiptapJson(html: string): string`
      - Parses HTML and converts to Tiptap-compatible JSON structure
      - Maps HTML elements to Tiptap node types:
        - `<p>` → `{ type: 'paragraph' }`
        - `<h2>`, `<h3>`, `<h4>` → `{ type: 'heading', attrs: { level: N } }` (clamp h1 to h2, h5/h6 to h4 per editor config)
        - `<strong>` / `<b>` → mark `{ type: 'bold' }`
        - `<em>` / `<i>` → mark `{ type: 'italic' }`
        - `<code>` → mark `{ type: 'code' }`
        - `<ul>`, `<ol>`, `<li>` → `bulletList`, `orderedList`, `listItem`
        - `<blockquote>` → `{ type: 'blockquote' }`
        - `<pre><code>` → `{ type: 'codeBlock' }`
        - `<hr>` → `{ type: 'horizontalRule' }`
      - Uses a lightweight HTML parser (e.g., built-in DOMParser via `jsdom`, or simple regex-based for the limited set of tags)
      - Returns JSON string
    - `private extractPlainText(tiptapJson: string): string`
      - Recursively walks Tiptap JSON nodes, extracting all text content
      - Returns plain text string for AI consumption
    - `private async generateMetadata(plainText: string): Promise<{ title: string; abstract: string }>`
      - Uses Anthropic SDK (`new Anthropic({ apiKey })` from ConfigService)
      - System prompt: instructs Claude to generate a title (max 200 chars) and abstract (max 300 chars) from the article content
      - Parses JSON response, validates with Zod
      - Falls back to first line as title and first 300 chars as abstract if AI fails (logs warning)
      - Throws `FILE_IMPORT_AI_GENERATION_FAILED` only if both AI and fallback fail
  - Notes: Inject `ConfigService` for `ANTHROPIC_API_KEY`. Use `Logger` for structured logging following existing patterns.

- [x] Task 4: Add upload endpoint to `ArticleController`
  - File: `apps/api/src/modules/publication/article.controller.ts`
  - Action: Add new route handler:
    ```typescript
    @Post('import')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        const allowed = ['.md', '.txt', '.docx'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(new DomainException(
            ERROR_CODES.FILE_IMPORT_UNSUPPORTED_TYPE,
            `Unsupported file type: ${ext}. Allowed: .md, .txt, .docx`,
            HttpStatus.BAD_REQUEST,
          ), false);
        }
      },
    }))
    async importFile(
      @UploadedFile() file: Express.Multer.File,
      @CurrentUser('id') userId: string,
      @Req() req: Request & { correlationId?: string },
    ) {
      if (!file) {
        throw new DomainException(
          ERROR_CODES.VALIDATION_ERROR,
          'No file provided',
          HttpStatus.BAD_REQUEST,
        );
      }
      const result = await this.fileImportService.importFile(file);
      return createSuccessResponse(result, req.correlationId ?? '');
    }
    ```
  - Action: Add required imports: `UseInterceptors`, `UploadedFile` from `@nestjs/common`, `FileInterceptor` from `@nestjs/platform-express`, `extname` from `path`.
  - Action: Inject `FileImportService` into controller constructor.
  - Notes: The `import` route must be defined BEFORE the `:id` route to avoid NestJS treating "import" as an ID parameter. Move it above `@Get(':id')`.

- [x] Task 5: Register `FileImportService` in module
  - File: `apps/api/src/modules/publication/publication.module.ts`
  - Action: Import `FileImportService` and add to `providers` array.
  - Notes: No need to export — only used by `ArticleController` within the same module.

- [x] Task 6: Add `useImportArticleFile` mutation hook (frontend)
  - File: `apps/web/hooks/use-article.ts`
  - Action: Add new mutation hook in the Mutations section:
    ```typescript
    export function useImportArticleFile() {
      return useMutation<FileImportResultDto, Error, File>({
        mutationFn: async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const response = await apiClient<ApiSuccessResponse<FileImportResultDto>>(
            '/api/v1/articles/import',
            {
              method: 'POST',
              body: formData,
              // Do NOT set Content-Type header — browser sets multipart boundary automatically
            },
          );
          return response.data;
        },
      });
    }
    ```
  - Action: Add `FileImportResultDto` to the import list from `@edin/shared`.
  - Notes: Check if `apiClient` automatically sets `Content-Type: application/json`. If so, the upload call must either bypass that header or use raw `fetch`. Inspect `apps/web/lib/api-client.ts` to determine the correct approach. If `apiClient` sets `Content-Type`, pass `headers: {}` or use `fetch` directly with credentials.

- [x] Task 7: Create `ImportConflictDialog` component
  - File: `apps/web/components/features/publication/article-editor/import-conflict-dialog.tsx` (NEW)
  - Action: Create Radix UI Dialog component following existing dialog patterns (reference: `admission-action-dialog.tsx`):
    ```typescript
    interface ImportConflictDialogProps {
      open: boolean;
      onAction: (action: 'replace' | 'append' | 'cancel') => void;
      fileName: string;
    }
    export function ImportConflictDialog({ open, onAction, fileName }: ImportConflictDialogProps);
    ```
  - Content:
    - Title: "Import File"
    - Description: "The editor already has content. How would you like to import '{fileName}'?"
    - Three buttons:
      - "Replace" — replaces all editor content with imported content
      - "Append" — appends imported content after existing content
      - "Cancel" — cancels the import
  - Styling: Follow existing dialog patterns — `bg-black/30` overlay, CSS variables for spacing/radius, focus management.

- [x] Task 8: Create `FileDropZone` wrapper component
  - File: `apps/web/components/features/publication/article-editor/file-drop-zone.tsx` (NEW)
  - Action: Create a wrapper component that handles drag-and-drop:
    ```typescript
    interface FileDropZoneProps {
      onFileDrop: (file: File) => void;
      disabled?: boolean;
      children: React.ReactNode;
      accept: string[]; // e.g., ['.md', '.txt', '.docx']
      maxSizeMB: number;
    }
    export function FileDropZone({
      onFileDrop,
      disabled,
      children,
      accept,
      maxSizeMB,
    }: FileDropZoneProps);
    ```
  - Behavior:
    - Wraps children in a `div` with drag event handlers (`onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`)
    - Shows visual overlay when file is dragged over (dashed border, semi-transparent background, "Drop file here" text)
    - Validates file type and size on drop — shows toast error for invalid files
    - Calls `onFileDrop(file)` with the first valid file
    - Ignores non-file drag events (e.g., text selection)
  - State: `isDragging` boolean for visual feedback.

- [x] Task 9: Integrate upload into `ArticleEditor`
  - File: `apps/web/components/features/publication/article-editor/article-editor.tsx`
  - Action: Add the following to the component:
    1. **Import button**: Add an "Import from file" button in the top-right area next to the "Save Draft" button. Style with an upload icon (inline SVG or Unicode ↑). Include a hidden `<input type="file" accept=".md,.txt,.docx">` triggered by button click.
    2. **File drop zone**: Wrap the editor section (below the save bar) in `<FileDropZone>` component.
    3. **File handling logic**:
       - `handleFileSelected(file: File)`:
         - Client-side validation: check file size ≤ 5MB, check extension in `.md`, `.txt`, `.docx`
         - If editor has content (title, abstract, or body is non-empty): open `ImportConflictDialog`
         - If editor is empty: proceed directly to upload
       - `handleImportAction(action: 'replace' | 'append' | 'cancel')`:
         - `cancel`: close dialog, clear pending file
         - `replace` or `append`: call `importFile.mutateAsync(pendingFile)`
           - On success: update `title`, `abstract`, `body` state
             - `replace`: `setTitle(result.title)`, `setAbstract(result.abstract)`, `setBody(result.body)`
             - `append`: keep existing title/abstract, append body — merge Tiptap JSON by concatenating the `content` arrays of both documents
           - On error: show toast with error message
         - Mark dirty after successful import
    4. **Loading state**: Show a loading overlay or disable the editor while the upload is in progress (`importFile.isPending`).
    5. **State additions**:
       - `pendingFile: File | null` — file waiting for conflict resolution
       - `showConflictDialog: boolean` — controls dialog visibility
  - Notes: The `body` state update must also trigger Tiptap's `editor.commands.setContent()` to sync the visual editor. This happens automatically via the existing `useEffect` in `tiptap-editor.tsx` that watches the `content` prop.

### Acceptance Criteria

- [ ] AC 1: Given a user on the article editor page with an empty editor, when they click "Import from file" and select a `.md` file under 5MB, then the file is uploaded, converted to Tiptap JSON, and the title, abstract, and body fields are populated with the AI-generated title, AI-generated abstract, and converted content respectively.
- [ ] AC 2: Given a user on the article editor page with an empty editor, when they click "Import from file" and select a `.txt` file under 5MB, then the file is uploaded, the plain text is converted to Tiptap paragraph nodes, and all fields are populated.
- [ ] AC 3: Given a user on the article editor page with an empty editor, when they click "Import from file" and select a `.docx` file under 5MB, then the file is uploaded, the Word document is converted via mammoth to HTML then to Tiptap JSON, and all fields are populated.
- [ ] AC 4: Given a user on the article editor page with existing content in any field, when they select or drop a file, then a dialog appears asking them to Replace, Append, or Cancel.
- [ ] AC 5: Given the conflict dialog is shown, when the user clicks "Replace", then all editor fields (title, abstract, body) are replaced with the imported content.
- [ ] AC 6: Given the conflict dialog is shown, when the user clicks "Append", then the imported body content is appended to the existing body, and title/abstract remain unchanged.
- [ ] AC 7: Given the conflict dialog is shown, when the user clicks "Cancel", then the dialog closes and no changes are made to the editor.
- [ ] AC 8: Given a user drags a valid file over the editor area, when they hover, then a visual drop zone indicator appears (dashed border, overlay text). When they drop the file, it triggers the same import flow as the button.
- [ ] AC 9: Given a user selects a file larger than 5MB, when they attempt to upload, then a client-side error message is shown and the upload is blocked. The server also enforces the 5MB limit via Multer and returns a 400 error.
- [ ] AC 10: Given a user selects a file with an unsupported extension (e.g., `.pdf`, `.html`), when they attempt to upload, then a client-side error message is shown. The server also rejects unsupported types with `FILE_IMPORT_UNSUPPORTED_TYPE`.
- [ ] AC 11: Given the Anthropic API is unavailable or returns an error, when a file is imported, then the system falls back to extracting the first line as title and first 300 characters as abstract, and logs a warning. The import still succeeds.
- [ ] AC 12: Given a user uploads an empty file, when the server processes it, then a `FILE_IMPORT_EMPTY_CONTENT` error is returned with HTTP 400.
- [ ] AC 13: Given a file upload is in progress, when the user looks at the editor, then a loading indicator is visible and the editor is not interactive until the import completes.

## Additional Context

### Dependencies

**New npm packages (backend — `apps/api/package.json`):**

- `mammoth` — .docx to HTML conversion. Well-maintained, no native dependencies, produces clean semantic HTML.
- `marked` — Markdown to HTML conversion. Fast, widely used, supports GFM (GitHub-Flavored Markdown).
- `@types/multer` (devDependency) — TypeScript types for Express Multer file objects.

**Existing packages leveraged:**

- `@nestjs/platform-express` — already installed, provides `FileInterceptor` and `UploadedFile` decorators for Multer integration.
- `@anthropic-ai/sdk` — already installed, used for AI title/abstract generation.
- `@radix-ui/react-dialog` — already installed in web app, used for conflict resolution dialog.

**No new frontend packages needed.**

### Testing Strategy

**Backend unit tests:**

- File: `apps/api/src/modules/publication/file-import.service.spec.ts` (NEW)
- Test `importFile()` with mock files for each format (.md, .txt, .docx)
- Test `convertMarkdown()` produces correct Tiptap JSON structure
- Test `convertPlainText()` wraps paragraphs correctly
- Test `convertDocx()` with mock mammoth output
- Test `htmlToTiptapJson()` maps all supported HTML elements correctly
- Test `generateMetadata()` with mocked Anthropic client
- Test fallback when Anthropic fails (returns first-line title, truncated abstract)
- Test error cases: unsupported file type, empty file, oversized file
- Mock `Anthropic` client and `ConfigService` using existing vi.fn() patterns

**Backend controller tests:**

- File: `apps/api/src/modules/publication/article.controller.spec.ts` (UPDATE)
- Add tests for `POST /articles/import` endpoint
- Test successful upload returns 200 with FileImportResultDto
- Test missing file returns 400
- Test unsupported file type returns 400
- Test file too large returns 400

**Frontend component tests:**

- File: `apps/web/components/features/publication/article-editor/import-conflict-dialog.test.tsx` (NEW)
- Test dialog renders with three action buttons
- Test each button calls onAction with correct value
- Test dialog shows file name

- File: `apps/web/components/features/publication/article-editor/file-drop-zone.test.tsx` (NEW)
- Test drop zone renders children
- Test drag over shows visual indicator
- Test drag leave hides indicator
- Test valid file drop calls onFileDrop
- Test invalid file type shows error
- Test oversized file shows error

**Manual testing steps:**

1. Create new article → click "Import from file" → select .md file → verify all fields populated
2. Create new article → click "Import from file" → select .txt file → verify fields populated
3. Create new article → click "Import from file" → select .docx file → verify fields populated
4. Start writing → import file → verify Replace/Append/Cancel dialog appears
5. Test Replace: verify all fields overwritten
6. Test Append: verify body appended, title/abstract unchanged
7. Test Cancel: verify no changes
8. Drag and drop a file onto the editor → verify same import flow
9. Try uploading a 6MB file → verify error
10. Try uploading a .pdf file → verify error
11. Upload file, then save draft → verify auto-save works with imported content
12. Upload file, then submit → verify submission validation passes

### Notes

**High-risk items:**

- **HTML → Tiptap JSON conversion accuracy**: The custom HTML-to-Tiptap converter must handle all elements that Tiptap's StarterKit supports. Mismatched structure will cause the editor to silently drop content. Thorough testing with diverse documents is critical.
- **Anthropic API latency**: AI metadata generation adds latency to the import flow (typically 2-5 seconds). The loading indicator must clearly communicate progress to the user.
- **Multer memory storage**: Files are buffered in memory (default Multer behavior). The 5MB limit prevents memory abuse, but monitor if many concurrent uploads occur.

**Known limitations:**

- Images in uploaded documents are ignored (out of scope). Word documents with embedded images will have the images stripped.
- Complex Word formatting (tables, footnotes, columns) may not convert perfectly — mammoth produces simplified semantic HTML.
- H1 headings in uploaded documents are converted to H2 (Tiptap editor only supports H2-H4).

**Future considerations:**

- PDF import could be added later with `pdf-parse` library.
- Image extraction from .docx could upload images to object storage and embed URLs.
- Drag-and-drop could be extended to support dropping multiple files for batch import.
- A preview step before importing could let users review the converted content.

## Review Notes

- Adversarial review completed
- Findings: 15 total, 8 fixed, 7 skipped (noise/low-impact)
- Resolution approach: auto-fix
- Fixed: dragCounterRef useRef bug, rate limiting, model ID from config, link URI sanitization, Multer fileFilter simplification, duplicate import, controller spec provider, unused import cleanup
