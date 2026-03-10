'use client';

import { useState, useEffect } from 'react';
import {
  useAdminContributors,
  useUpdateContributorRole,
} from '../../../../hooks/use-admin-contributors';
import { RoleChangeDialog } from './role-change-dialog';
import { ROLES } from '@edin/shared';

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: ROLES.PUBLIC, label: 'Public' },
  { value: ROLES.APPLICANT, label: 'Applicant' },
  { value: ROLES.CONTRIBUTOR, label: 'Contributor' },
  { value: ROLES.EDITOR, label: 'Editor' },
  { value: ROLES.FOUNDING_CONTRIBUTOR, label: 'Founding Contributor' },
  { value: ROLES.WORKING_GROUP_LEAD, label: 'Working Group Lead' },
  { value: ROLES.ADMIN, label: 'Admin' },
];

const DOMAIN_OPTIONS = [
  { value: '', label: 'All Domains' },
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'FINTECH', label: 'Fintech' },
  { value: 'IMPACT', label: 'Impact' },
  { value: 'GOVERNANCE', label: 'Governance' },
];

export function ContributorList() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();

  const debouncedSearch = useDebouncedValue(search, 300);

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    contributorId: string;
    contributorName: string;
    currentRole: string;
  }>({ isOpen: false, contributorId: '', contributorName: '', currentRole: '' });

  const { contributors, pagination, isLoading, error } = useAdminContributors({
    search: debouncedSearch || undefined,
    role: roleFilter || undefined,
    domain: domainFilter || undefined,
    cursor,
    limit: 20,
  });

  const updateRole = useUpdateContributorRole();

  const handleRoleChange = (contributorId: string, name: string, currentRole: string) => {
    setDialogState({ isOpen: true, contributorId, contributorName: name, currentRole });
  };

  const handleConfirmRoleChange = (role: string, reason: string) => {
    updateRole.mutate(
      { contributorId: dialogState.contributorId, role, reason },
      {
        onSuccess: () => {
          setDialogState((s) => ({ ...s, isOpen: false }));
        },
      },
    );
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setCursor(undefined);
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-[var(--spacing-lg)] flex flex-wrap items-center gap-[var(--spacing-md)]">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="min-w-[250px] flex-1 rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary placeholder:text-brand-secondary/50"
          aria-label="Search contributors"
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setCursor(undefined);
          }}
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary"
          aria-label="Filter by role"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={domainFilter}
          onChange={(e) => {
            setDomainFilter(e.target.value);
            setCursor(undefined);
          }}
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary"
          aria-label="Filter by domain"
        >
          {DOMAIN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-[var(--spacing-md)] rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-md)] text-[14px] text-red-700">
          Failed to load contributors: {error.message}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-surface-border">
        <table className="w-full text-left font-sans text-[14px]">
          <thead>
            <tr className="border-b border-surface-border bg-surface-raised">
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
                Name
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
                Email
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
                Role
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
                Domain
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
                Joined
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
                Last Active
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-[var(--spacing-md)] py-[var(--spacing-xl)] text-center text-brand-secondary"
                >
                  Loading contributors...
                </td>
              </tr>
            )}
            {!isLoading && contributors.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-[var(--spacing-md)] py-[var(--spacing-xl)] text-center text-brand-secondary"
                >
                  No contributors found
                </td>
              </tr>
            )}
            {contributors.map((c) => (
              <tr
                key={c.id}
                className="border-b border-surface-border last:border-b-0 hover:bg-surface-raised/50"
              >
                <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-primary">
                  {c.name}
                </td>
                <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-brand-secondary">
                  {c.email ?? '—'}
                </td>
                <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                  <span className="inline-block rounded-full bg-brand-accent/10 px-[var(--spacing-sm)] py-[2px] text-[12px] font-medium text-brand-accent">
                    {c.role}
                  </span>
                </td>
                <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-brand-secondary">
                  {c.domain ?? '—'}
                </td>
                <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-brand-secondary">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-brand-secondary">
                  {new Date(c.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                  <button
                    onClick={() => handleRoleChange(c.id, c.name, c.role)}
                    className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-sm)] py-[2px] text-[12px] font-medium text-brand-accent hover:bg-brand-accent/10"
                  >
                    Manage Role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination?.hasMore && (
        <div className="mt-[var(--spacing-md)] flex justify-center">
          <button
            onClick={() => setCursor(pagination.cursor ?? undefined)}
            className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-accent hover:bg-brand-accent/10"
          >
            Next Page
          </button>
        </div>
      )}

      {/* Role Change Dialog */}
      <RoleChangeDialog
        isOpen={dialogState.isOpen}
        contributorName={dialogState.contributorName}
        currentRole={dialogState.currentRole}
        onClose={() => setDialogState((s) => ({ ...s, isOpen: false }))}
        onConfirm={handleConfirmRoleChange}
        isPending={updateRole.isPending}
      />
    </div>
  );
}
