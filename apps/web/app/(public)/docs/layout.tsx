import { DocsSidebar } from '../../../components/features/docs/docs-sidebar';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1200px] gap-[var(--spacing-xl)] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
      <DocsSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
