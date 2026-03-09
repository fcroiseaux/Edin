'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from './tiptap-editor';
import { AutoSaveIndicator } from './auto-save-indicator';
import type { SaveStatus } from './auto-save-indicator';
import {
  useCreateArticle,
  useUpdateArticle,
  useSubmitArticle,
} from '../../../../hooks/use-article';
import { submitArticleSchema, ARTICLE_DOMAINS } from '@edin/shared';
import type { ArticleDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../domain-colors';

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

interface ArticleEditorProps {
  initialArticle?: ArticleDto | null;
}

export function ArticleEditor({ initialArticle }: ArticleEditorProps) {
  const router = useRouter();
  const [articleId, setArticleId] = useState<string | undefined>(initialArticle?.id);
  const [title, setTitle] = useState(initialArticle?.title ?? '');
  const [abstract, setAbstract] = useState(initialArticle?.abstract ?? '');
  const [body, setBody] = useState(initialArticle?.body ?? '');
  const [domain, setDomain] = useState<string>(initialArticle?.domain ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isDirtyRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle(articleId);
  const submitArticle = useSubmitArticle();

  // Mark as dirty when any field changes
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
  }, []);

  // Save function — creates article on first save, updates on subsequent
  const save = useCallback(async () => {
    if (!isDirtyRef.current || !domain) return;

    setSaveStatus('saving');
    try {
      if (!articleId) {
        // First save — create the article
        const created = await createArticle.mutateAsync({
          title: title || 'Untitled',
          abstract,
          body,
          domain: domain as 'Technology' | 'Fintech' | 'Impact' | 'Governance',
        });
        setArticleId(created.id);
        // Update URL to edit mode without full navigation
        window.history.replaceState(null, '', `/dashboard/publication/${created.id}/edit`);
      } else {
        // Subsequent saves — update
        await updateArticle.mutateAsync({
          title,
          abstract,
          body,
          domain: domain as 'Technology' | 'Fintech' | 'Impact' | 'Governance',
        });
      }
      isDirtyRef.current = false;
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [articleId, title, abstract, body, domain, createArticle, updateArticle]);

  // Auto-save timer
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (isDirtyRef.current) {
        save();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [save]);

  // Ctrl/Cmd+S manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [save]);

  // Handle submission
  const handleSubmit = async () => {
    setSubmitError(null);

    // Client-side validation
    const validation = submitArticleSchema.safeParse({ title, abstract, body, domain });
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setSubmitError(firstIssue.message);
      return;
    }

    // Save any pending changes first
    if (isDirtyRef.current) {
      await save();
    }

    if (!articleId) {
      setSubmitError('Please save the article before submitting');
      return;
    }

    try {
      await submitArticle.mutateAsync(articleId);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission failed');
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-[var(--spacing-lg)] py-[var(--spacing-4xl)]">
        <h2 className="font-serif text-[24px] font-bold text-brand-primary">Article Submitted</h2>
        <p className="max-w-[480px] text-center font-sans text-[15px] text-brand-secondary">
          Your article has been submitted for editorial review. You&apos;ll receive a notification
          when an editor has been assigned.
        </p>
        <button
          onClick={() => router.push('/dashboard/publication')}
          className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90"
        >
          Back to Publication
        </button>
      </div>
    );
  }

  const domainAccent = domain ? DOMAIN_COLORS[domain] : undefined;

  return (
    <div
      className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      style={domainAccent ? { borderTop: `3px solid ${domainAccent}` } : undefined}
    >
      {/* Save indicator */}
      <div className="mb-[var(--spacing-lg)] flex items-center justify-end">
        <AutoSaveIndicator status={saveStatus} />
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          markDirty();
        }}
        placeholder="Article title"
        className="mb-[var(--spacing-lg)] w-full border-none bg-transparent font-serif text-[2.5rem] font-bold leading-[1.2] text-brand-primary outline-none placeholder:text-brand-secondary/40"
        aria-label="Article title"
      />

      {/* Domain selector */}
      <div className="mb-[var(--spacing-lg)]">
        <label className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-brand-secondary">
          Domain
        </label>
        <select
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value);
            markDirty();
          }}
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none focus:border-brand-accent"
          aria-label="Article domain"
        >
          <option value="">Select domain...</option>
          {ARTICLE_DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Abstract */}
      <div className="mb-[var(--spacing-xl)]">
        <label className="mb-[var(--spacing-sm)] block font-sans text-[13px] font-medium text-brand-secondary">
          Abstract
        </label>
        <textarea
          value={abstract}
          onChange={(e) => {
            if (e.target.value.length <= 300) {
              setAbstract(e.target.value);
              markDirty();
            }
          }}
          placeholder="Brief summary of your article (50-300 characters)"
          rows={3}
          className="w-full resize-none rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none focus:border-brand-accent"
          aria-label="Article abstract"
        />
        <span className="mt-[var(--spacing-xs)] block text-right font-sans text-[12px] text-brand-secondary">
          {abstract.length} / 300
        </span>
      </div>

      {/* Editor */}
      <div className="mb-[var(--spacing-xl)]">
        <TiptapEditor
          content={body}
          onChange={(newBody) => {
            setBody(newBody);
            markDirty();
          }}
        />
      </div>

      {/* Submit */}
      {submitError && (
        <p className="mb-[var(--spacing-md)] font-sans text-[14px] text-semantic-error">
          {submitError}
        </p>
      )}
      <div className="flex items-center justify-end gap-[var(--spacing-md)]">
        <button
          onClick={() => router.push('/dashboard/publication')}
          className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-secondary transition-colors hover:bg-surface-sunken"
        >
          Back to Drafts
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitArticle.isPending}
          className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90 disabled:opacity-50"
        >
          {submitArticle.isPending ? 'Submitting...' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
}
