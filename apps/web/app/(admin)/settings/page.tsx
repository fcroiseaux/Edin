import type { Metadata } from 'next';
import { RepositoryList } from '../../../components/features/ingestion/admin/repository-list';
import { ToastProvider } from '../../../components/ui/toast';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Settings | Edin Admin',
    description: 'Admin settings for Edin platform integrations and configuration.',
  };
}

export default function SettingsPage() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-surface-base">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
          <h1 className="mb-[var(--spacing-xl)] font-serif text-[32px] font-bold text-brand-primary">
            Settings
          </h1>

          {/* Integrations section (AC1: /admin/settings integration section) */}
          <section>
            <h2 className="mb-[var(--spacing-md)] font-serif text-[22px] font-semibold text-brand-primary">
              Integrations
            </h2>
            <RepositoryList />
          </section>
        </div>
      </main>
    </ToastProvider>
  );
}
