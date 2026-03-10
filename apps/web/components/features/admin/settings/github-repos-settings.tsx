'use client';

import { useState } from 'react';
import type { PlatformSettingsSection } from '@edin/shared';

interface GithubReposSettingsProps {
  section: PlatformSettingsSection;
  onSave: (updates: Record<string, unknown>) => void;
  isPending: boolean;
}

interface MonitoredRepo {
  repoUrl: string;
  isActive: boolean;
}

export function GithubReposSettings({ section, onSave, isPending }: GithubReposSettingsProps) {
  const repos = (section.settings['github.monitored_repos'] as MonitoredRepo[]) ?? [];
  const [pendingToggle, setPendingToggle] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setPendingToggle(index);
  };

  const confirmToggle = () => {
    if (pendingToggle === null) return;
    const updated = repos.map((repo, i) =>
      i === pendingToggle ? { ...repo, isActive: !repo.isActive } : repo,
    );
    onSave({ 'github.monitored_repos': updated });
    setPendingToggle(null);
  };

  return (
    <div>
      <h3 className="mb-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary">
        Monitored Repositories
      </h3>
      {repos.length === 0 ? (
        <p className="text-[13px] text-brand-secondary">
          No repositories configured. Repositories are added via the GitHub integration settings.
        </p>
      ) : (
        <ul className="space-y-[var(--spacing-sm)]">
          {repos.map((repo, index) => (
            <li
              key={repo.repoUrl}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]"
            >
              <span className="font-mono text-[13px] text-brand-primary">{repo.repoUrl}</span>
              <button
                onClick={() => handleToggle(index)}
                disabled={isPending}
                className={`rounded-full px-[var(--spacing-sm)] py-[2px] text-[12px] font-medium ${
                  repo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {repo.isActive ? 'Active' : 'Paused'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Confirmation dialog for toggle */}
      {pendingToggle !== null && repos[pendingToggle] && (
        <div className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 p-[var(--spacing-md)]">
          <p className="text-[13px] text-amber-800">
            {repos[pendingToggle].isActive
              ? `Pause monitoring for ${repos[pendingToggle].repoUrl}?`
              : `Resume monitoring for ${repos[pendingToggle].repoUrl}?`}
          </p>
          <div className="mt-[var(--spacing-sm)] flex gap-[var(--spacing-sm)]">
            <button
              onClick={confirmToggle}
              disabled={isPending}
              className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[2px] text-[12px] font-medium text-white hover:bg-brand-accent/90 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Confirm'}
            </button>
            <button
              onClick={() => setPendingToggle(null)}
              disabled={isPending}
              className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[2px] text-[12px] text-brand-secondary hover:bg-surface-base"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
