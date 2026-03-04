import type { Metadata } from 'next';
import { MicroTaskList } from '../../../components/features/admission/admin/micro-task-list';
import { ToastProvider } from '../../../components/ui/toast';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Micro-Task Configuration | Edin Admin',
    description: 'Configure domain-specific micro-tasks for the admission process.',
  };
}

export default function MicroTasksPage() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-surface-base">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
          <MicroTaskList />
        </div>
      </main>
    </ToastProvider>
  );
}
