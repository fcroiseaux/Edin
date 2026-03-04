'use client';

import { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createMicroTaskSchema } from '@edin/shared';
import type { MicroTask } from '@edin/shared';
import { useCreateMicroTask, useUpdateMicroTask } from '../../../../hooks/use-micro-task-admin';
import { renderRichText } from '../../../../lib/rich-text';
import { useToast } from '../../../ui/toast';

const DOMAINS = ['Technology', 'Fintech', 'Impact', 'Governance'] as const;

interface FormValues {
  domain: (typeof DOMAINS)[number];
  title: string;
  description: string;
  expectedDeliverable: string;
  estimatedEffort: string;
  submissionFormat: string;
}

interface MicroTaskFormPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTask: MicroTask | null;
}

export function MicroTaskFormPanel({ open, onOpenChange, editTask }: MicroTaskFormPanelProps) {
  const createMutation = useCreateMicroTask();
  const updateMutation = useUpdateMicroTask();
  const { toast } = useToast();

  const isEditMode = editTask !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createMicroTaskSchema),
    defaultValues: {
      domain: 'Technology',
      title: '',
      description: '',
      expectedDeliverable: '',
      estimatedEffort: '',
      submissionFormat: '',
    },
  });

  useEffect(() => {
    if (editTask) {
      reset({
        domain: editTask.domain as FormValues['domain'],
        title: editTask.title,
        description: editTask.description,
        expectedDeliverable: editTask.expectedDeliverable,
        estimatedEffort: editTask.estimatedEffort,
        submissionFormat: editTask.submissionFormat,
      });
    } else {
      reset({
        domain: 'Technology',
        title: '',
        description: '',
        expectedDeliverable: '',
        estimatedEffort: '',
        submissionFormat: '',
      });
    }
  }, [editTask, reset]);

  const descriptionPreview = renderRichText(watch('description') || '');

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({
          id: editTask.id,
          title: data.title,
          description: data.description,
          expectedDeliverable: data.expectedDeliverable,
          estimatedEffort: data.estimatedEffort,
          submissionFormat: data.submissionFormat,
        });
        toast({ title: 'Micro-task updated' });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: 'Micro-task created' });
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to save micro-task',
        variant: 'error',
      });
    }
  };

  const inputClassName =
    'w-full rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 motion-safe:transition-opacity motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-0 right-0 z-40 flex h-full w-full max-w-[640px] flex-col border-l border-surface-border bg-surface-raised shadow-[var(--shadow-modal)] focus:outline-none motion-safe:transition-transform motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:slide-out-to-right motion-safe:data-[state=open]:slide-in-from-right"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-surface-border p-[var(--spacing-lg)]">
            <Dialog.Title className="font-sans text-[20px] font-semibold text-brand-primary">
              {isEditMode ? 'Edit Micro-Task' : 'Create Micro-Task'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[var(--radius-sm)] p-[var(--spacing-xs)] text-brand-secondary transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-accent"
                aria-label="Close panel"
              >
                <CloseIcon />
              </button>
            </Dialog.Close>
          </div>

          {/* Form - scrollable */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex-1 space-y-[var(--spacing-md)] p-[var(--spacing-lg)]">
              {/* Domain */}
              <div>
                <label
                  htmlFor="domain"
                  className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-brand-secondary"
                >
                  Domain
                </label>
                <select
                  id="domain"
                  {...register('domain')}
                  disabled={isEditMode}
                  className={`${inputClassName} ${isEditMode ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                {errors.domain && (
                  <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
                    {errors.domain.message}
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-brand-secondary"
                >
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title')}
                  placeholder="e.g., Build a REST API endpoint"
                  className={inputClassName}
                />
                {errors.title && (
                  <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-brand-secondary"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={5}
                  placeholder="Describe the micro-task requirements..."
                  className={`${inputClassName} resize-none`}
                  style={{ fieldSizing: 'content', minHeight: '120px' } as React.CSSProperties}
                />
                {errors.description && (
                  <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
                    {errors.description.message}
                  </p>
                )}
                <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
                  Supports rich formatting with Markdown: <code>**bold**</code>,{' '}
                  <code>*italic*</code>, <code>- list items</code>, and <code>`inline code`</code>.
                </p>
                {descriptionPreview ? (
                  <div className="mt-[var(--spacing-sm)] rounded-[var(--radius-md)] border border-surface-border bg-surface-sunken p-[var(--spacing-sm)]">
                    <p className="mb-[var(--spacing-xs)] font-sans text-[12px] font-medium text-brand-secondary">
                      Preview
                    </p>
                    <div
                      className="space-y-[var(--spacing-xs)] font-serif text-[14px] leading-[1.6] text-brand-primary [&_code]:rounded-[4px] [&_code]:bg-surface-raised [&_code]:px-[4px] [&_code]:py-[2px] [&_ul]:list-disc [&_ul]:pl-[var(--spacing-lg)]"
                      dangerouslySetInnerHTML={{ __html: descriptionPreview }}
                    />
                  </div>
                ) : null}
              </div>

              {/* Expected Deliverable */}
              <div>
                <label
                  htmlFor="expectedDeliverable"
                  className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-brand-secondary"
                >
                  Expected Deliverable
                </label>
                <textarea
                  id="expectedDeliverable"
                  {...register('expectedDeliverable')}
                  rows={3}
                  placeholder="What should the applicant submit?"
                  className={`${inputClassName} resize-none`}
                  style={{ fieldSizing: 'content', minHeight: '80px' } as React.CSSProperties}
                />
                {errors.expectedDeliverable && (
                  <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
                    {errors.expectedDeliverable.message}
                  </p>
                )}
              </div>

              {/* Estimated Effort */}
              <div>
                <label
                  htmlFor="estimatedEffort"
                  className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-brand-secondary"
                >
                  Estimated Effort
                </label>
                <input
                  id="estimatedEffort"
                  type="text"
                  {...register('estimatedEffort')}
                  placeholder="e.g., 2-4 hours"
                  className={inputClassName}
                />
                {errors.estimatedEffort && (
                  <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
                    {errors.estimatedEffort.message}
                  </p>
                )}
              </div>

              {/* Submission Format */}
              <div>
                <label
                  htmlFor="submissionFormat"
                  className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-brand-secondary"
                >
                  Submission Format
                </label>
                <input
                  id="submissionFormat"
                  type="text"
                  {...register('submissionFormat')}
                  placeholder="e.g., GitHub repository link or gist"
                  className={inputClassName}
                />
                {errors.submissionFormat && (
                  <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error">
                    {errors.submissionFormat.message}
                  </p>
                )}
              </div>
            </div>

            {/* Submit button */}
            <div className="border-t border-surface-border p-[var(--spacing-lg)]">
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-[background-color,opacity] duration-[var(--transition-fast)] hover:bg-brand-accent/90 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? 'Saving...' : isEditMode ? 'Update Micro-Task' : 'Create Micro-Task'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 6L14 14M14 6L6 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
