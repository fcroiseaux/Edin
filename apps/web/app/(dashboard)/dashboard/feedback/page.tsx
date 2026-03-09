'use client';

import { PendingReviewList } from '../../../../components/features/feedback/pending-review-list';
import { ReceivedFeedbackList } from '../../../../components/features/feedback/received-feedback-list';

export default function FeedbackDashboardPage() {
  return (
    <div className="p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
        Feedback
      </h1>

      {/* Pending Reviews Section */}
      <section className="mb-[var(--spacing-xl)]">
        <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-brand-primary">
          Pending Reviews
        </h2>
        <PendingReviewList />
      </section>

      {/* Received Feedback Section */}
      <section>
        <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-brand-primary">
          Feedback Received
        </h2>
        <ReceivedFeedbackList />
      </section>
    </div>
  );
}
