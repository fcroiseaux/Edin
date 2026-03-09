import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockDrafts = [
  {
    id: '1',
    title: 'Draft Article One',
    slug: 'draft-article-one',
    abstract: 'First draft abstract',
    domain: 'Technology',
    status: 'DRAFT' as const,
    version: 1,
    updatedAt: '2026-03-09T10:00:00Z',
  },
  {
    id: '2',
    title: 'Draft Article Two',
    slug: 'draft-article-two',
    abstract: 'Second draft abstract',
    domain: 'Fintech',
    status: 'DRAFT' as const,
    version: 1,
    updatedAt: '2026-03-08T10:00:00Z',
  },
];

vi.mock('../../../../hooks/use-article', () => ({
  useArticleDrafts: () => ({
    drafts: mockDrafts,
    isPending: false,
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

import { DraftList } from './draft-list';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('DraftList', () => {
  it('renders draft cards', () => {
    renderWithProviders(<DraftList />);

    expect(screen.getByText('Draft Article One')).toBeInTheDocument();
    expect(screen.getByText('Draft Article Two')).toBeInTheDocument();
  });

  it('displays domain badges', () => {
    renderWithProviders(<DraftList />);

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Fintech')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    renderWithProviders(<DraftList />);

    const badges = screen.getAllByText('DRAFT');
    expect(badges.length).toBe(2);
  });
});
