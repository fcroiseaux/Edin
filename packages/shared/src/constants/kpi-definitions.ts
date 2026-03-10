/**
 * KPI definitions from PRD Success Criteria.
 * Leading indicators = early signals; lagging indicators = confirm success.
 */

export interface KpiDefinition {
  id: string;
  label: string;
  category: 'leading' | 'lagging';
  target: number | null;
  unit: string;
  frequency: string;
  description: string;
}

export const KPI_DEFINITIONS: KpiDefinition[] = [
  // Leading indicators
  {
    id: 'application-rate',
    label: 'Application Rate',
    category: 'leading',
    target: 5,
    unit: 'apps/week',
    frequency: 'Weekly',
    description: '5+ qualified applications per week by end of Phase 1',
  },
  {
    id: '30-day-retention',
    label: '30-Day Retention',
    category: 'leading',
    target: 50,
    unit: '%',
    frequency: 'Monthly',
    description: '>50% 30-day contributor retention (Phase 1)',
  },
  {
    id: 'contribution-frequency',
    label: 'Contribution Frequency',
    category: 'leading',
    target: 2,
    unit: 'contributions/week',
    frequency: 'Weekly',
    description: '>2 meaningful contributions per week per active contributor',
  },
  {
    id: 'cross-domain-engagement',
    label: 'Cross-Domain Engagement',
    category: 'leading',
    target: 30,
    unit: '%',
    frequency: 'Monthly',
    description: '>30% of contributors engage beyond their primary domain',
  },
  {
    id: 'referral-rate',
    label: 'Referral Rate',
    category: 'leading',
    target: 20,
    unit: '%',
    frequency: 'Monthly',
    description: '>20% of new contributors from organic referrals',
  },
  {
    id: 'publication-submission-rate',
    label: 'Publication Submission Rate',
    category: 'leading',
    target: 3,
    unit: 'submissions/week',
    frequency: 'Weekly',
    description: '>3 article submissions per week by end of Phase 1',
  },
  {
    id: 'editorial-turnaround',
    label: 'Editorial Turnaround',
    category: 'leading',
    target: 7,
    unit: 'days',
    frequency: 'Weekly',
    description: '<7 days from submission to publication decision',
  },
  // Lagging indicators
  {
    id: 'active-contributor-count',
    label: 'Active Contributor Count',
    category: 'lagging',
    target: 20,
    unit: 'contributors',
    frequency: 'Monthly',
    description: '20 active contributors in Phase 1',
  },
  {
    id: 'quarterly-retention',
    label: 'Quarterly Retention',
    category: 'lagging',
    target: 40,
    unit: '%',
    frequency: 'Quarterly',
    description: '>40% quarter-over-quarter retention',
  },
  {
    id: 'contribution-quality-trend',
    label: 'Contribution Quality Trend',
    category: 'lagging',
    target: null,
    unit: 'avg score',
    frequency: 'Quarterly',
    description: 'Positive trend in average AI evaluation scores',
  },
  {
    id: 'publication-external-reach',
    label: 'Publication External Reach',
    category: 'lagging',
    target: null,
    unit: 'readers/article',
    frequency: 'Monthly',
    description: 'Unique external readers per published article',
  },
  {
    id: 'author-to-editor-conversion',
    label: 'Author-to-Editor Conversion',
    category: 'lagging',
    target: null,
    unit: '%',
    frequency: 'Quarterly',
    description: '% of contributors who transition from Author to Editor role',
  },
];
