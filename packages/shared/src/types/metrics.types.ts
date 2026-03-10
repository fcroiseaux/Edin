/**
 * Platform metrics types for public showcase endpoints.
 */

export interface DomainDistribution {
  domain: string;
  count: number;
  percentage: number;
}

export interface PlatformMetrics {
  activeContributors: number;
  contributionVelocity: number;
  domainDistribution: DomainDistribution[];
  retentionRate: number;
}

export interface ScalingDataPoint {
  month: number;
  label: string;
  multiplier: number;
}

export interface FormulaComponent {
  name: string;
  description: string;
  qualitativeWeight: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface WorkedExample {
  name: string;
  description: string;
  monthlyContributions: number;
  avgQualityScore: number;
  months: number;
  domain: string;
}

export interface RewardMethodology {
  overview: string;
  scalingCurve: ScalingDataPoint[];
  formulaComponents: FormulaComponent[];
  glossary: GlossaryTerm[];
  workedExamples: WorkedExample[];
}
