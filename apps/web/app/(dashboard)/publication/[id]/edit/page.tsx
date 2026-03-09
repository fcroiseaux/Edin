'use client';

import { use } from 'react';
import { ArticleEditor } from '../../../../../components/features/publication/article-editor/article-editor';
import { useArticle } from '../../../../../hooks/use-article';

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { article, isLoading } = useArticle(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="space-y-[var(--spacing-lg)]">
          <div className="h-[48px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-[32px] w-[200px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-[80px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-[400px] animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
        </div>
      </div>
    );
  }

  return <ArticleEditor initialArticle={article} />;
}
