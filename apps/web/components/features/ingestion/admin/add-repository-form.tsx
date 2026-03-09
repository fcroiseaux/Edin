'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { useAddRepository } from '../../../../hooks/use-repositories';
import { useToast } from '../../../ui/toast';

const addRepoFormSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Repository name is required')
    .regex(
      /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/,
      'Enter in owner/repo format (e.g., edin-foundation/edin-core)',
    ),
});

type AddRepoFormValues = z.infer<typeof addRepoFormSchema>;

interface AddRepositoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRepositoryForm({ open, onOpenChange }: AddRepositoryFormProps) {
  const { toast } = useToast();
  const addRepository = useAddRepository();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddRepoFormValues>({
    resolver: zodResolver(addRepoFormSchema),
    defaultValues: { fullName: '' },
  });

  const onSubmit = async (values: AddRepoFormValues) => {
    const [owner, repo] = values.fullName.split('/');

    try {
      await addRepository.mutateAsync({ owner, repo });
      toast({ title: 'Repository added successfully', variant: 'success' });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Failed to add repository',
        variant: 'error',
      });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[640px] flex-col bg-surface-raised shadow-[var(--shadow-modal)]">
          <div className="flex items-center justify-between border-b border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-md)]">
            <Dialog.Title className="font-serif text-[20px] font-bold text-brand-primary">
              Add Repository
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Add a GitHub repository to monitor for contributor activity
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[var(--radius-sm)] p-[var(--spacing-xs)] text-brand-secondary transition-colors hover:bg-surface-sunken"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </Dialog.Close>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-[var(--spacing-lg)] overflow-y-auto px-[var(--spacing-lg)] py-[var(--spacing-lg)]"
          >
            <div className="flex flex-col gap-[var(--spacing-xs)]">
              <label
                htmlFor="fullName"
                className="font-sans text-[14px] font-medium text-brand-primary"
              >
                Repository
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="owner/repo (e.g., edin-foundation/edin-core)"
                {...register('fullName')}
                className="rounded-[var(--radius-md)] border border-surface-border-input bg-surface-base px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[15px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] placeholder:text-brand-secondary/50 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              />
              {errors.fullName && (
                <p className="font-sans text-[13px] text-[#B07545]">{errors.fullName.message}</p>
              )}
            </div>

            <p className="font-sans text-[13px] text-brand-secondary">
              The system will register a webhook on this repository to monitor push, pull request,
              and pull request review events.
            </p>

            <div className="mt-auto flex justify-end gap-[var(--spacing-sm)] border-t border-surface-border pt-[var(--spacing-md)]">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors hover:bg-surface-sunken"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addRepository.isPending}
                className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-[background-color] duration-[var(--transition-fast)] hover:bg-brand-accent/90 disabled:opacity-50"
              >
                {addRepository.isPending ? 'Adding...' : 'Add Repository'}
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
