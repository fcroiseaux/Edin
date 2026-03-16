import type {
  EvaluationDimensionKey,
  DocEvaluationDimensionKey,
  EvaluationRubricParameters,
  PlanningContextEnrichment,
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
  modelId?: string;
  planningContext?: PlanningContextEnrichment;
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
  modelId?: string;
}

export interface DocEvaluationOutput {
  dimensions: Record<DocEvaluationDimensionKey, { score: number; explanation: string }>;
  narrative: string;
  rawModelOutput: string;
}

export interface AvailableModel {
  id: string;
  displayName: string;
  createdAt: string;
}

export interface EvaluationProvider {
  evaluateCode(input: CodeEvaluationInput): Promise<CodeEvaluationOutput>;
  evaluateDocumentation(input: DocEvaluationInput): Promise<DocEvaluationOutput>;
  listAvailableModels(): Promise<AvailableModel[]>;
}

export const EVALUATION_PROVIDER = 'EVALUATION_PROVIDER';
