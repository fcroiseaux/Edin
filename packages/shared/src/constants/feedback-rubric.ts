export const MIN_COMMENT_LENGTH = 20;
export const MAX_COMMENT_LENGTH = 5000;
export const RUBRIC_VERSION = '1.0';

export const RATING_LABELS: Record<number, string> = {
  1: 'Needs significant improvement',
  2: 'Has room for growth',
  3: 'Meets expectations',
  4: 'Shows strong proficiency',
  5: 'Demonstrates exceptional quality',
};

export const RUBRIC_QUESTIONS = [
  {
    id: 'code-quality',
    text: 'Code Quality & Clarity',
    description: 'How well-written, readable, and maintainable is the code?',
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
  {
    id: 'technical-approach',
    text: 'Technical Approach',
    description: 'Is the technical solution appropriate, efficient, and well-reasoned?',
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
  {
    id: 'testing',
    text: 'Testing & Reliability',
    description: 'Does the contribution include adequate tests and error handling?',
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
  {
    id: 'documentation',
    text: 'Documentation & Communication',
    description: 'Are code comments, commit messages, and documentation clear and helpful?',
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
  {
    id: 'impact',
    text: 'Impact & Value',
    description: "How significant is this contribution's impact on the project?",
    contributionTypes: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'],
  },
] as const;
