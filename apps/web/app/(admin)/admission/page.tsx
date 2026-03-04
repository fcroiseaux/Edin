import type { Metadata } from 'next';
import { AdmissionQueue } from '../../../components/features/admission/admin/admission-queue';
import { ToastProvider } from '../../../components/ui/toast';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Admission Queue | Edin Admin',
    description: 'Review and manage contributor admission applications.',
  };
}

export default function AdmissionPage() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-surface-base">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
          <AdmissionQueue />
        </div>
      </main>
    </ToastProvider>
  );
}
