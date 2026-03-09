import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard/publication/new',
}));

// Mock Tiptap editor (heavy dependency)
vi.mock('./tiptap-editor', () => ({
  TiptapEditor: ({ onChange }: { content: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="mock-editor"
      onChange={(e) => onChange(e.target.value)}
      aria-label="Article body"
    />
  ),
}));

// Mock hooks
vi.mock('../../../../hooks/use-article', () => ({
  useCreateArticle: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-id' }),
    isPending: false,
  }),
  useUpdateArticle: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useSubmitArticle: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

import { ArticleEditor } from './article-editor';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ArticleEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title input, domain selector, abstract, and editor', () => {
    renderWithProviders(<ArticleEditor />);

    expect(screen.getByLabelText('Article title')).toBeInTheDocument();
    expect(screen.getByLabelText('Article domain')).toBeInTheDocument();
    expect(screen.getByLabelText('Article abstract')).toBeInTheDocument();
    expect(screen.getByTestId('mock-editor')).toBeInTheDocument();
  });

  it('renders Submit for Review button', () => {
    renderWithProviders(<ArticleEditor />);

    expect(screen.getByText('Submit for Review')).toBeInTheDocument();
  });

  it('displays character counter for abstract', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ArticleEditor />);

    const abstractInput = screen.getByLabelText('Article abstract');
    await user.type(abstractInput, 'Hello world');

    expect(screen.getByText('11 / 300')).toBeInTheDocument();
  });

  it('shows domain options', () => {
    renderWithProviders(<ArticleEditor />);

    const select = screen.getByLabelText('Article domain');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Fintech')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('pre-populates fields when initialArticle is provided', () => {
    const initialArticle = {
      id: 'test-id',
      title: 'Existing Article',
      slug: 'existing-article',
      abstract: 'An existing abstract',
      body: '{"type":"doc","content":[]}',
      domain: 'Technology',
      status: 'DRAFT' as const,
      version: 1,
      authorId: 'author-1',
      editorId: null,
      createdAt: '2026-03-09T10:00:00Z',
      updatedAt: '2026-03-09T10:00:00Z',
      submittedAt: null,
      publishedAt: null,
    };

    renderWithProviders(<ArticleEditor initialArticle={initialArticle} />);

    expect(screen.getByLabelText('Article title')).toHaveValue('Existing Article');
    expect(screen.getByLabelText('Article abstract')).toHaveValue('An existing abstract');
  });
});
