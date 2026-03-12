'use client';

import * as Dialog from '@radix-ui/react-dialog';

interface ImportConflictDialogProps {
  open: boolean;
  onAction: (action: 'replace' | 'append' | 'cancel') => void;
  fileName: string;
}

export function ImportConflictDialog({ open, onAction, fileName }: ImportConflictDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onAction('cancel');
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-modal)] focus:outline-none"
          aria-describedby="import-conflict-description"
        >
          <Dialog.Title className="font-sans text-[18px] font-semibold text-brand-primary">
            Import File
          </Dialog.Title>
          <Dialog.Description
            id="import-conflict-description"
            className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.5] text-brand-secondary"
          >
            The editor already has content. How would you like to import &lsquo;{fileName}&rsquo;?
          </Dialog.Description>

          <div className="mt-[var(--spacing-lg)] flex justify-end gap-[var(--spacing-sm)]">
            <button
              type="button"
              onClick={() => onAction('cancel')}
              className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onAction('append')}
              className="rounded-[var(--radius-md)] border border-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-accent transition-colors duration-[var(--transition-fast)] hover:bg-brand-accent/5 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2"
            >
              Append
            </button>
            <button
              type="button"
              onClick={() => onAction('replace')}
              className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-colors duration-[var(--transition-fast)] hover:bg-brand-accent/90 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2"
            >
              Replace
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
