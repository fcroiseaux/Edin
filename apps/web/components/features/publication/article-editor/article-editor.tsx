'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TiptapEditor } from './tiptap-editor';
import { AutoSaveIndicator } from './auto-save-indicator';
import { FileDropZone } from './file-drop-zone';
import { ImportConflictDialog } from './import-conflict-dialog';
import type { SaveStatus } from './auto-save-indicator';
import {
  useCreateArticle,
  useUpdateArticle,
  useSubmitArticle,
  useImportArticleFile,
} from '../../../../hooks/use-article';
import { submitArticleSchema, ARTICLE_DOMAINS } from '@edin/shared';
import type { ArticleDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../domain-colors';
import { useToast } from '../../../ui/toast';

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds
const ACCEPTED_EXTENSIONS = ['.md', '.txt', '.docx'];
const MAX_FILE_SIZE_MB = 5;

interface ArticleEditorProps {
  initialArticle?: ArticleDto | null;
  resubmitMode?: boolean;
  onResubmit?: (body: string) => Promise<void>;
  isResubmitting?: boolean;
}

export function ArticleEditor({
  initialArticle,
  resubmitMode,
  onResubmit,
  isResubmitting,
}: ArticleEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [articleId, setArticleId] = useState<string | undefined>(initialArticle?.id);
  const [title, setTitle] = useState(initialArticle?.title ?? '');
  const [abstract, setAbstract] = useState(initialArticle?.abstract ?? '');
  const [body, setBody] = useState(initialArticle?.body ?? '');
  const [domain, setDomain] = useState<string>(initialArticle?.domain ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [wordCount, setWordCount] = useState({ words: 0, characters: 0 });
  const [isDirty, setIsDirty] = useState(false);

  // File import state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  const isDirtyRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle(articleId);
  const submitArticle = useSubmitArticle();
  const importFile = useImportArticleFile();

  // Mark as dirty when any field changes
  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    setIsDirty(true);
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
          domain: domain as 'Technology' | 'Finance' | 'Impact' | 'Governance',
        });
        setArticleId(created.id);
        // Update URL to edit mode without full navigation
        window.history.replaceState(null, '', `/publication/${created.id}/edit`);
      } else {
        // Subsequent saves — update
        await updateArticle.mutateAsync({
          title,
          abstract,
          body,
          domain: domain as 'Technology' | 'Finance' | 'Impact' | 'Governance',
        });
      }
      isDirtyRef.current = false;
      setIsDirty(false);
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

  // Check if editor has content
  const editorHasContent = title.trim() !== '' || abstract.trim() !== '' || body.trim() !== '';

  // Perform the actual import
  const performImport = async (file: File, mode: 'replace' | 'append') => {
    try {
      const result = await importFile.mutateAsync(file);

      if (mode === 'replace') {
        setTitle(result.title);
        setAbstract(result.abstract);
        setBody(result.body);
      } else {
        // Append: keep title/abstract, merge body content arrays
        try {
          const existingDoc = body ? JSON.parse(body) : { type: 'doc', content: [] };
          const importedDoc = JSON.parse(result.body);
          const mergedContent = [...(existingDoc.content || []), ...(importedDoc.content || [])];
          setBody(JSON.stringify({ type: 'doc', content: mergedContent }));
        } catch {
          setBody(result.body);
        }
      }

      markDirty();
      toast({ title: 'File imported successfully' });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Failed to import file',
        variant: 'error',
      });
    }
  };

  // Handle file selection (from button or drop)
  const handleFileSelected = (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      toast({
        title: `Unsupported file type: ${ext}. Allowed: ${ACCEPTED_EXTENSIONS.join(', ')}`,
        variant: 'error',
      });
      return;
    }

    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: `File too large. Maximum size: ${MAX_FILE_SIZE_MB}MB`,
        variant: 'error',
      });
      return;
    }

    if (editorHasContent) {
      setPendingFile(file);
      setShowConflictDialog(true);
    } else {
      performImport(file, 'replace');
    }
  };

  // Handle conflict dialog action
  const handleImportAction = (action: 'replace' | 'append' | 'cancel') => {
    setShowConflictDialog(false);

    if (action === 'cancel' || !pendingFile) {
      setPendingFile(null);
      return;
    }

    performImport(pendingFile, action);
    setPendingFile(null);
  };

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
          onClick={() => router.push('/publication')}
          className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90"
        >
          Back to Publication
        </button>
      </div>
    );
  }

  const domainAccent = domain ? DOMAIN_COLORS[domain] : undefined;
  const isImporting = importFile.isPending;

  return (
    <div
      className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      style={domainAccent ? { borderTop: `3px solid ${domainAccent}` } : undefined}
    >
      {/* Save indicator + Import button + Save Draft button */}
      <div className="mb-[var(--spacing-lg)] flex items-center justify-end gap-[var(--spacing-md)]">
        <AutoSaveIndicator status={saveStatus} />
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelected(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] font-medium text-brand-secondary transition-colors hover:bg-surface-sunken hover:text-brand-primary disabled:opacity-50"
        >
          {isImporting ? 'Importing...' : 'Import from file'}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saveStatus === 'saving' || !domain || !isDirty}
          className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] font-medium text-brand-secondary transition-colors hover:bg-surface-sunken hover:text-brand-primary disabled:opacity-50"
        >
          Save Draft
        </button>
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
        disabled={isImporting}
        className="mb-[var(--spacing-lg)] w-full border-none bg-transparent font-serif text-[2.5rem] font-bold leading-[1.2] text-brand-primary outline-none placeholder:text-brand-secondary/40 disabled:opacity-50"
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
          disabled={isImporting}
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none focus:border-brand-accent disabled:opacity-50"
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
          disabled={isImporting}
          className="w-full resize-none rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none focus:border-brand-accent disabled:opacity-50"
          aria-label="Article abstract"
        />
        <span className="mt-[var(--spacing-xs)] block text-right font-sans text-[12px] text-brand-secondary">
          {abstract.length} / 300
        </span>
      </div>

      {/* Editor with drop zone */}
      <div className="relative mb-[var(--spacing-xl)]">
        <FileDropZone
          onFileDrop={handleFileSelected}
          disabled={isImporting}
          accept={ACCEPTED_EXTENSIONS}
          maxSizeMB={MAX_FILE_SIZE_MB}
        >
          <TiptapEditor
            content={body}
            onChange={(newBody) => {
              setBody(newBody);
              markDirty();
            }}
            onWordCountChange={setWordCount}
            editable={!isImporting}
          />
        </FileDropZone>
        {isImporting && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[var(--radius-md)] bg-surface-raised/80">
            <span className="font-sans text-[15px] font-medium text-brand-secondary">
              Importing file...
            </span>
          </div>
        )}
        <div className="mt-[var(--spacing-sm)] flex items-center justify-end gap-[var(--spacing-md)] font-sans text-[12px] text-brand-secondary">
          <span>{wordCount.words.toLocaleString()} words</span>
          <span>{wordCount.characters.toLocaleString()} characters</span>
        </div>
      </div>

      {/* Submit */}
      {submitError && (
        <p className="mb-[var(--spacing-md)] font-sans text-[14px] text-semantic-error">
          {submitError}
        </p>
      )}
      <div className="flex items-center justify-end gap-[var(--spacing-md)]">
        <button
          onClick={() => router.push('/publication')}
          className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-secondary transition-colors hover:bg-surface-sunken"
        >
          Back to Drafts
        </button>
        {resubmitMode && onResubmit ? (
          <button
            onClick={async () => {
              if (isDirtyRef.current) await save();
              await onResubmit(body);
            }}
            disabled={isResubmitting}
            className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90 disabled:opacity-50"
          >
            {isResubmitting ? 'Resubmitting...' : 'Resubmit for Review'}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitArticle.isPending}
            className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90 disabled:opacity-50"
          >
            {submitArticle.isPending ? 'Submitting...' : 'Submit for Review'}
          </button>
        )}
      </div>

      {/* Import conflict dialog */}
      <ImportConflictDialog
        open={showConflictDialog}
        onAction={handleImportAction}
        fileName={pendingFile?.name ?? ''}
      />
    </div>
  );
}
