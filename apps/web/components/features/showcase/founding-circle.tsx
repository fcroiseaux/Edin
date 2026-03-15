import type { PublicContributorProfile } from '@edin/shared';
import { FoundingContributorCard } from './founding-contributor-card';

interface FoundingCircleProps {
  contributors: PublicContributorProfile[];
}

export function FoundingCircle({ contributors }: FoundingCircleProps) {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20" aria-label="Founding Circle">
      <h2 className="text-center font-serif text-[2rem] leading-[1.25] font-bold text-brand-primary">
        Founding Circle
      </h2>

      {contributors.length === 0 ? (
        <div className="mx-auto mt-[var(--spacing-lg)] max-w-[400px] text-center">
          <p className="font-sans text-[15px] leading-[1.5] text-brand-secondary">
            The Founding Circle is forming. Serious contributors are building something different.
          </p>
        </div>
      ) : (
        <div className="mt-[var(--spacing-lg)] grid grid-cols-1 gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
          {contributors.map((contributor) => (
            <FoundingContributorCard key={contributor.id} contributor={contributor} />
          ))}
        </div>
      )}
    </section>
  );
}

export function FoundingCircleSkeleton() {
  return (
    <section
      className="mx-auto max-w-[1200px] px-6 py-20"
      role="status"
      aria-label="Loading founding circle"
    >
      <div className="skeleton mx-auto h-[32px] w-[250px]" />
      <div className="mt-[var(--spacing-lg)] grid grid-cols-1 gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[12px] border border-[#E8E6E1] bg-surface-raised p-[var(--spacing-md)]"
          >
            <div className="flex justify-center">
              <div className="skeleton h-[80px] w-[80px] rounded-full" />
            </div>
            <div className="skeleton mx-auto mt-[var(--spacing-sm)] h-[24px] w-[120px]" />
            <div className="skeleton mx-auto mt-[var(--spacing-xs)] h-[20px] w-[80px] rounded-full" />
            <div className="skeleton mx-auto mt-[var(--spacing-sm)] h-[40px] w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
