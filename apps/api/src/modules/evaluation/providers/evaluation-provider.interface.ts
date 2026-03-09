import type {
  EvaluationDimensionKey,
  DocEvaluationDimensionKey,
  EvaluationRubricParameters,
} from '@edin/shared';

export interface CodeEvaluationInput {
  contributionId: string;
  contributionType: string;
  repositoryName: string;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
  commitMessage?: string;
  pullRequestTitle?: string;
  pullRequestDescription?: string;
}

export interface CodeEvaluationOutput {
  dimensions: Record<EvaluationDimensionKey, { score: number; explanation: string }>;
  narrative: string;
  rawModelOutput: string;
}

export interface DocEvaluationInput {
  contributionId: string;
  contributionType: string;
  repositoryName: string;
  documentTitle: string;
  documentContent: string;
  documentType?: string;
  rubricParameters?: EvaluationRubricParameters;
}

export interface DocEvaluationOutput {
  dimensions: Record<DocEvaluationDimensionKey, { score: number; explanation: string }>;
  narrative: string;
  rawModelOutput: string;
}

export interface EvaluationProvider {
  evaluateCode(input: CodeEvaluationInput): Promise<CodeEvaluationOutput>;
  evaluateDocumentation(input: DocEvaluationInput): Promise<DocEvaluationOutput>;
}

export const EVALUATION_PROVIDER = 'EVALUATION_PROVIDER';
