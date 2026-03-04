'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useUpdateMicroTask, useDeactivateMicroTask } from '../../../../hooks/use-micro-task-admin';
import { useToast } from '../../../ui/toast';

interface MicroTaskStatusToggleProps {
  microTaskId: string;
  isActive: boolean;
  domain: string;
}

export function MicroTaskStatusToggle({
  microTaskId,
  isActive,
  domain,
}: MicroTaskStatusToggleProps) {
  const [open, setOpen] = useState(false);
  const updateMicroTask = useUpdateMicroTask();
  const deactivateMicroTask = useDeactivateMicroTask();
  const { toast } = useToast();

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      if (isActive) {
        await deactivateMicroTask.mutateAsync(microTaskId);
        toast({ title: 'Micro-task deactivated' });
      } else {
        await updateMicroTask.mutateAsync({ id: microTaskId, isActive: true });
        toast({ title: 'Micro-task activated' });
      }
      setOpen(false);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to update micro-task status',
        variant: 'error',
      });
    }
  };

  const isPending = updateMicroTask.isPending || deactivateMicroTask.isPending;

  const title = isActive ? `Deactivate this micro-task?` : `Activate this micro-task?`;

  const description = isActive
    ? `Applicants will no longer see this task for the ${domain} domain.`
    : `The current active task for ${domain} will be deactivated.`;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium transition-colors duration-[var(--transition-fast)] focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2 ${
            isActive
              ? 'bg-semantic-success/10 text-semantic-success hover:bg-semantic-success/20'
              : 'bg-surface-sunken text-brand-secondary hover:bg-surface-sunken/80'
          }`}
          aria-label={isActive ? 'Deactivate micro-task' : 'Activate micro-task'}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-modal)] focus:outline-none"
          aria-describedby="status-toggle-description"
          onClick={(e) => e.stopPropagation()}
        >
          <Dialog.Title className="font-sans text-[18px] font-semibold text-brand-primary">
            {title}
          </Dialog.Title>
          <Dialog.Description
            id="status-toggle-description"
            className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.5] text-brand-secondary"
          >
            {description}
          </Dialog.Description>

          <div className="mt-[var(--spacing-lg)] flex justify-end gap-[var(--spacing-sm)]">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-[background-color,opacity] duration-[var(--transition-fast)] hover:bg-brand-accent/90 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Processing...' : isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
