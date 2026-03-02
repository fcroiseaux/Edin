export const DOMAINS = {
  Technology: 'Technology',
  Fintech: 'Fintech',
  Impact: 'Impact',
  Governance: 'Governance',
} as const;

export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];
