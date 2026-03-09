export default function EvaluationsLoading() {
  return (
    <div className="mx-auto max-w-[1000px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="animate-pulse">
        <div className="h-[28px] w-[160px] rounded bg-surface-sunken" />
        <div className="mt-[var(--spacing-xs)] h-[16px] w-[240px] rounded bg-surface-sunken" />

        <div className="mt-[var(--spacing-lg)] flex gap-[var(--spacing-md)]">
          <div className="h-[32px] w-[200px] rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-[32px] w-[120px] rounded-[var(--radius-md)] bg-surface-sunken" />
        </div>

        <div className="mt-[var(--spacing-lg)] h-[250px] rounded-[var(--radius-lg)] bg-surface-sunken" />

        <div className="mt-[var(--spacing-xl)] flex flex-col gap-[var(--spacing-sm)]">
          <div className="h-[80px] rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-[80px] rounded-[var(--radius-md)] bg-surface-sunken" />
          <div className="h-[80px] rounded-[var(--radius-md)] bg-surface-sunken" />
        </div>
      </div>
    </div>
  );
}
