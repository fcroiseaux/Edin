'use client';

import { useState, useRef, useEffect } from 'react';
import { ROLES } from '@edin/shared';

const ROLE_OPTIONS = [
  { value: ROLES.PUBLIC, label: 'Public' },
  { value: ROLES.APPLICANT, label: 'Applicant' },
  { value: ROLES.CONTRIBUTOR, label: 'Contributor' },
  { value: ROLES.EDITOR, label: 'Editor' },
  { value: ROLES.FOUNDING_CONTRIBUTOR, label: 'Founding Contributor' },
  { value: ROLES.WORKING_GROUP_LEAD, label: 'Working Group Lead' },
  { value: ROLES.ADMIN, label: 'Admin' },
];

interface RoleChangeDialogProps {
  isOpen: boolean;
  contributorName: string;
  currentRole: string;
  onClose: () => void;
  onConfirm: (role: string, reason: string) => void;
  isPending: boolean;
}

export function RoleChangeDialog({
  isOpen,
  contributorName,
  currentRole,
  onClose,
  onConfirm,
  isPending,
}: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [reason, setReason] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [prevIsOpen, setPrevIsOpen] = useState(false);

  // Reset form when dialog opens (render-time state adjustment per React docs)
  if (isOpen && !prevIsOpen) {
    setSelectedRole(currentRole);
    setReason('');
  }
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
  }

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === currentRole || !reason.trim()) return;
    onConfirm(selectedRole, reason.trim());
  };

  const isValid = selectedRole !== currentRole && reason.trim().length > 0;

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-[480px] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-xl)] backdrop:bg-black/50"
      onClose={onClose}
      aria-labelledby="role-change-title"
    >
      <h2
        id="role-change-title"
        className="mb-[var(--spacing-md)] font-serif text-[20px] font-bold text-brand-primary"
      >
        Change Role for {contributorName}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-[var(--spacing-md)]">
          <label
            htmlFor="role-select"
            className="mb-[var(--spacing-xs)] block font-sans text-[14px] font-medium text-brand-secondary"
          >
            Current Role: <span className="font-bold text-brand-primary">{currentRole}</span>
          </label>
          <select
            id="role-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary"
            aria-describedby="role-help"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p id="role-help" className="mt-[var(--spacing-xs)] text-[12px] text-brand-secondary">
            Select the new role for this contributor
          </p>
        </div>

        <div className="mb-[var(--spacing-lg)]">
          <label
            htmlFor="role-reason"
            className="mb-[var(--spacing-xs)] block font-sans text-[14px] font-medium text-brand-secondary"
          >
            Reason for change <span className="text-red-500">*</span>
          </label>
          <textarea
            id="role-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary"
            placeholder="Explain the reason for this role change..."
            required
            aria-describedby="reason-help"
          />
          <p id="reason-help" className="mt-[var(--spacing-xs)] text-[12px] text-brand-secondary">
            {reason.length}/500 characters
          </p>
        </div>

        <div className="flex justify-end gap-[var(--spacing-md)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-secondary hover:bg-surface-base"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || isPending}
            className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Updating...' : 'Confirm Role Change'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
