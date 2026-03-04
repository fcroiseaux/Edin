import type { Metadata } from 'next';
import { ReviewList } from '../../../components/features/admission/reviewer/review-list';

export const metadata: Metadata = {
  title: 'My Reviews | Edin',
  description: 'Review applications assigned to you.',
};

export default function ReviewsPage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <ReviewList />
      </div>
    </main>
  );
}
