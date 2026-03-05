import type { Metadata } from 'next';
import { RepositoryList } from '../../../components/features/ingestion/admin/repository-list';
import { ToastProvider } from '../../../components/ui/toast';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Repository Monitoring | Edin Admin',
    description: 'Configure which GitHub repositories are monitored for contributor activity.',
  };
}

export default function RepositoriesPage() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-surface-base">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
          <RepositoryList />
        </div>
      </main>
    </ToastProvider>
  );
}
