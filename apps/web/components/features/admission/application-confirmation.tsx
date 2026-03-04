'use client';

interface ApplicationConfirmationProps {
  status?: string;
  declineReason?: string | null;
}

export function ApplicationConfirmation({
  status,
  declineReason,
}: ApplicationConfirmationProps = {}) {
  if (status === 'DECLINED') {
    return (
      <div
        className="mx-auto max-w-[600px] text-center"
        role="status"
        aria-label="Application declined"
      >
        <h2 className="font-serif text-[clamp(1.5rem,4vw,2rem)] leading-[1.2] font-bold text-brand-primary">
          Application Update
        </h2>
        <p className="mt-[var(--spacing-lg)] font-sans text-[15px] leading-[1.6] text-brand-secondary">
          After careful review, we are unable to move forward with your application at this time.
        </p>
        {declineReason && (
          <div className="mx-auto mt-[var(--spacing-md)] max-w-[480px] rounded-[var(--radius-md)] border border-surface-border bg-surface-sunken p-[var(--spacing-md)]">
            <p className="font-sans text-[14px] leading-[1.6] text-brand-primary">
              {declineReason}
            </p>
          </div>
        )}
        <p className="mt-[var(--spacing-md)] font-sans text-[14px] leading-[1.5] text-brand-secondary">
          We encourage you to continue exploring our community. You are welcome to apply again in
          the future.
        </p>
      </div>
    );
  }

  if (status === 'APPROVED') {
    return (
      <div
        className="mx-auto max-w-[600px] text-center"
        role="status"
        aria-label="Application approved"
      >
        <h2 className="font-serif text-[clamp(1.5rem,4vw,2rem)] leading-[1.2] font-bold text-brand-primary">
          Welcome to Edin
        </h2>
        <p className="mt-[var(--spacing-lg)] font-sans text-[15px] leading-[1.6] text-brand-secondary">
          Your application has been approved. You are now a Contributor. Your 72-Hour Ignition
          onboarding has begun.
        </p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-[600px] text-center"
      role="status"
      aria-label="Application submitted"
    >
      <h2 className="font-serif text-[clamp(1.5rem,4vw,2rem)] leading-[1.2] font-bold text-brand-primary">
        Application Received
      </h2>
      <p className="mt-[var(--spacing-lg)] font-sans text-[15px] leading-[1.6] text-brand-secondary">
        We&apos;ll review your application within 48 hours. You will receive an update at the email
        address you provided.
      </p>
      <p className="mt-[var(--spacing-md)] font-sans text-[14px] leading-[1.5] text-brand-secondary">
        In the meantime, feel free to explore our community and learn more about the domains we work
        in.
      </p>
    </div>
  );
}
