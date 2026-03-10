import type { RewardMethodology } from '../types/metrics.types.js';

export const REWARD_METHODOLOGY: RewardMethodology = {
  overview:
    'Edin uses a scaling-law reward model inspired by the compounding patterns found in nature. ' +
    'Like a garden that grows richer with sustained care, your contributions compound over time — ' +
    'early and consistent engagement creates an accelerating trajectory of recognition and reward. ' +
    'The model rewards depth over breadth: sustained, quality contributions within your domain ' +
    'generate exponentially greater returns than sporadic activity across many areas.\n\n' +
    'This approach reflects a fundamental belief: meaningful work takes time to mature. ' +
    'A contributor who dedicates months of thoughtful effort to a domain builds institutional knowledge, ' +
    'mentors others, and creates lasting value that deserves recognition beyond simple task counting. ' +
    'The scaling law ensures that the community rewards those who invest deeply in its long-term health.\n\n' +
    'Your contribution score is computed from multiple dimensions — the quality of your work as assessed ' +
    'by both AI and peer review, the complexity of tasks you take on, and normalization across domains ' +
    'to ensure fair comparison. These dimensions combine into a holistic score that reflects your true ' +
    'impact on the community.',

  scalingCurve: [
    { month: 1, label: '1 month', multiplier: 1.0 },
    { month: 3, label: '3 months', multiplier: 1.8 },
    { month: 6, label: '6 months', multiplier: 3.2 },
    { month: 12, label: '1 year', multiplier: 6.5 },
    { month: 24, label: '2 years', multiplier: 14.0 },
  ],

  formulaComponents: [
    {
      name: 'AI Evaluation',
      description:
        'Each contribution is analyzed by our AI evaluation engine, which assesses code quality, ' +
        'documentation clarity, test coverage, and architectural alignment. The AI provides a ' +
        'transparent narrative explaining its assessment, ensuring contributors understand exactly ' +
        'how their work is evaluated.',
      qualitativeWeight: 'Significant factor',
    },
    {
      name: 'Peer Feedback',
      description:
        "Community members review each other's work using structured rubrics. Peer feedback captures " +
        'dimensions that AI cannot — collaboration quality, mentorship impact, and creative problem-solving. ' +
        'This human perspective ensures the scoring system values the full spectrum of contribution.',
      qualitativeWeight: 'Significant factor',
    },
    {
      name: 'Task Complexity',
      description:
        'Not all tasks are equal. The complexity multiplier recognizes that architecting a new system ' +
        'requires different effort than fixing a typo. Tasks are categorized by scope, technical difficulty, ' +
        'and impact, ensuring that ambitious work is rewarded proportionally.',
      qualitativeWeight: 'Moderate factor',
    },
    {
      name: 'Domain Normalization',
      description:
        'Different domains — Technology, Fintech, Impact, and Governance — have different contribution ' +
        'patterns and volumes. Domain normalization ensures fair comparison across domains, so a governance ' +
        'policy contribution is valued fairly alongside a code commit.',
      qualitativeWeight: 'Balancing adjustment',
    },
  ],

  glossary: [
    {
      term: 'Domain Normalization',
      definition:
        'A statistical adjustment that accounts for differences in contribution volume and patterns across ' +
        'the four domains (Technology, Fintech, Impact, Governance). Without normalization, domains with ' +
        'higher contribution frequency would dominate reward distributions.',
    },
    {
      term: 'Complexity Multiplier',
      definition:
        'A scaling factor applied to contributions based on their scope, technical difficulty, and community ' +
        'impact. Higher complexity tasks receive proportionally greater recognition in the scoring formula.',
    },
    {
      term: 'Temporal Aggregation',
      definition:
        'The process of combining contribution scores across different time windows — weekly, monthly, and ' +
        'quarterly — to capture both sustained engagement and recent activity. This multi-temporal view ' +
        'prevents gaming through short bursts of activity.',
    },
    {
      term: 'Scaling-Law Compounding',
      definition:
        "The mathematical principle underlying Edin's reward model. Like compound interest, sustained " +
        'engagement produces exponentially growing returns. A contributor active for 12 months accumulates ' +
        'significantly more than 12 times what a one-month contributor earns, reflecting the deepening ' +
        'value of institutional knowledge and community trust.',
    },
  ],

  workedExamples: [
    {
      name: 'The Steady Gardener',
      description:
        'A contributor who maintains consistent, quality engagement over a full year. ' +
        'Steady output compounds significantly through the scaling-law multiplier.',
      monthlyContributions: 5,
      avgQualityScore: 72,
      months: 12,
      domain: 'technology',
    },
    {
      name: 'The Intensive Sprint',
      description:
        'A contributor who delivers a high volume of work over a short period. ' +
        'Volume alone produces lower compounding because tenure drives the multiplier.',
      monthlyContributions: 20,
      avgQualityScore: 65,
      months: 3,
      domain: 'fintech',
    },
    {
      name: 'The Quality Cultivator',
      description:
        'A contributor who focuses on fewer, exceptional contributions over two years. ' +
        'High quality combined with long tenure maximizes the compounding effect.',
      monthlyContributions: 3,
      avgQualityScore: 92,
      months: 24,
      domain: 'impact',
    },
  ],
};
