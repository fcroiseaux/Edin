const DOMAINS = [
  {
    name: 'Technology',
    description:
      'Code, architecture, infrastructure, and developer tooling that powers the ecosystem.',
    color: 'var(--color-domain-technology)',
    bgClass: 'bg-domain-technology/10',
  },
  {
    name: 'Finance',
    description:
      'Financial modeling, DeFi protocols, risk analysis, and economic mechanism design.',
    color: 'var(--color-domain-finance)',
    bgClass: 'bg-domain-finance/10',
  },
  {
    name: 'Impact',
    description: 'Sustainability research, social impact measurement, and environmental reporting.',
    color: 'var(--color-domain-impact)',
    bgClass: 'bg-domain-impact/10',
  },
  {
    name: 'Governance',
    description:
      'Policy design, decentralized governance proposals, and organizational frameworks.',
    color: 'var(--color-domain-governance)',
    bgClass: 'bg-domain-governance/10',
  },
];

export function DomainsSection() {
  return (
    <section className="px-6 py-20" aria-label="Four domains">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-center font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.25] font-bold text-brand-primary">
          Four Equal Domains
        </h2>
        <p className="mx-auto mt-[var(--spacing-sm)] max-w-[520px] text-center font-sans text-[15px] leading-[1.6] text-brand-secondary">
          Unlike code-centric platforms, Edin values financial modeling, sustainability research,
          and governance design just as much as engineering.
        </p>
        <p className="mx-auto mt-[var(--spacing-sm)] max-w-[520px] text-center font-sans text-[15px] leading-[1.6] text-brand-secondary">
          Rose is built by contributors across four complementary domains. Every contribution,
          regardless of domain, advances the Rose mission.
        </p>

        <div className="mt-[var(--spacing-xl)] grid grid-cols-1 gap-[var(--spacing-md)] sm:grid-cols-2 lg:grid-cols-4">
          {DOMAINS.map((domain) => (
            <div
              key={domain.name}
              className="relative overflow-hidden rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
            >
              <div
                className="absolute top-0 left-0 h-[3px] w-full"
                style={{ backgroundColor: domain.color }}
              />
              <h3 className="font-sans text-[16px] font-semibold" style={{ color: domain.color }}>
                {domain.name}
              </h3>
              <p className="mt-[var(--spacing-xs)] font-sans text-[13px] leading-[1.6] text-brand-secondary">
                {domain.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
