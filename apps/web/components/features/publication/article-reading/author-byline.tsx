'use client';

import Link from 'next/link';
import type { PublicArticleAuthorDto, PublicArticleEditorDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../../../../lib/domain-colors';

interface AuthorBylineProps {
  author: PublicArticleAuthorDto;
  editor: PublicArticleEditorDto | null;
}

export function AuthorByline({ author, editor }: AuthorBylineProps) {
  const authorDomainColor = author.domain ? DOMAIN_COLORS[author.domain] : undefined;
  const editorDomainColor = editor?.domain ? DOMAIN_COLORS[editor.domain] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {author.avatarUrl && (
          <img src={author.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/contributors/${author.id}`}
              className="text-[15px] font-medium text-brand-primary hover:text-brand-accent"
            >
              {author.name}
            </Link>
            {authorDomainColor && (
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${authorDomainColor.bg} ${authorDomainColor.text}`}
              >
                {author.domain}
              </span>
            )}
          </div>
          {editor && (
            <p className="text-[13px] text-brand-secondary">
              Reviewed by{' '}
              <Link
                href={`/contributors/${editor.id}`}
                className="font-medium hover:text-brand-accent"
              >
                {editor.name}
              </Link>
              {editorDomainColor && (
                <span
                  className={`ml-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${editorDomainColor.bg} ${editorDomainColor.text}`}
                >
                  {editor.domain}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
