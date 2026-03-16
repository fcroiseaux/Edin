import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { EvaluationDimensionKey, DocEvaluationDimensionKey } from '@edin/shared';
import { MAX_PATCH_LENGTH, MAX_EVALUATION_FILES } from '@edin/shared';
import type {
  EvaluationProvider,
  CodeEvaluationInput,
  CodeEvaluationOutput,
  DocEvaluationInput,
  DocEvaluationOutput,
} from './evaluation-provider.interface.js';

const CODE_PROMPT_VERSION = 'code-eval-v1';
const CODE_PROMPT_VERSION_V2 = 'code-eval-v2';
const DOC_PROMPT_VERSION = 'doc-eval-v1';

const SYSTEM_PROMPT = `You are a code quality evaluator for the Edin platform. Evaluate the following code contribution across 4 dimensions. Return a JSON object with scores (0-100) and brief explanations for each dimension.

Evaluation Dimensions:
1. Complexity (0-100): Lower cyclomatic complexity, shallow nesting, clear control flow = higher score
2. Maintainability (0-100): Clear naming, good modularity, separation of concerns = higher score
3. Test Coverage (0-100): Test files present, good assertions, edge cases covered = higher score
4. Standards Adherence (0-100): Consistent style, linting compliance, project conventions = higher score

Also provide a 2-4 sentence narrative summary describing what quality was demonstrated.

Return ONLY valid JSON in this format:
{
  "complexity": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "maintainability": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "testCoverage": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "standardsAdherence": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "narrative": "<2-4 sentence narrative>"
}`;

const DOC_SYSTEM_PROMPT = `You are a documentation quality evaluator for the Edin platform. Evaluate the following documentation contribution across 3 dimensions. Return a JSON object with scores (0-100) and brief explanations for each dimension.

Evaluation Dimensions:
1. Structural Completeness (0-100): Required sections present for the document type, logical organization, table of contents, proper heading hierarchy = higher score
2. Readability (0-100): Appropriate reading level (Flesch-Kincaid grade), clear sentence structure, good paragraph organization, minimal jargon = higher score
3. Reference Integrity (0-100): All links are valid, citations are complete, internal cross-references are accurate, no orphaned references = higher score

Also provide a 2-4 sentence narrative summary describing the quality of the documentation.

Return ONLY valid JSON in this format:
{
  "structuralCompleteness": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "readability": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "referenceIntegrity": { "score": <0-100>, "explanation": "<1-2 sentences>" },
  "narrative": "<2-4 sentence narrative>"
}`;

interface EvaluationResponse {
  complexity: { score: number; explanation: string };
  maintainability: { score: number; explanation: string };
  testCoverage: { score: number; explanation: string };
  standardsAdherence: { score: number; explanation: string };
  narrative: string;
}

interface DocEvaluationResponse {
  structuralCompleteness: { score: number; explanation: string };
  readability: { score: number; explanation: string };
  referenceIntegrity: { score: number; explanation: string };
  narrative: string;
}

@Injectable()
export class AnthropicEvaluationProvider implements EvaluationProvider {
  private readonly logger = new Logger(AnthropicEvaluationProvider.name);
  private readonly client: Anthropic;
  private readonly defaultModelId: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not configured — evaluation and model listing will fail',
      );
    }
    this.client = new Anthropic({ apiKey });
    this.defaultModelId = this.configService.get<string>(
      'EVALUATION_MODEL_ID',
      'claude-sonnet-4-5-20250514',
    );
  }

  get codePromptVersion(): string {
    return CODE_PROMPT_VERSION;
  }

  get docPromptVersion(): string {
    return DOC_PROMPT_VERSION;
  }

  getEffectiveCodePromptVersion(input: CodeEvaluationInput): string {
    return input.planningContext ? CODE_PROMPT_VERSION_V2 : CODE_PROMPT_VERSION;
  }

  async evaluateCode(input: CodeEvaluationInput): Promise<CodeEvaluationOutput> {
    const userPrompt = this.buildUserPrompt(input);
    const effectiveModelId = input.modelId ?? this.defaultModelId;

    this.logger.log('Calling Anthropic API for code evaluation', {
      module: 'evaluation',
      contributionId: input.contributionId,
      modelId: effectiveModelId,
      fileCount: input.files.length,
      planningContextIncluded: !!input.planningContext,
    });

    const response = await this.client.messages.create({
      model: effectiveModelId,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const rawOutput = textBlock ? textBlock.text : '';

    this.logger.log('Anthropic API response received', {
      module: 'evaluation',
      contributionId: input.contributionId,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    });

    const parsed = this.parseResponse(rawOutput);

    return {
      dimensions: {
        complexity: parsed.complexity,
        maintainability: parsed.maintainability,
        testCoverage: parsed.testCoverage,
        standardsAdherence: parsed.standardsAdherence,
      },
      narrative: parsed.narrative,
      rawModelOutput: rawOutput,
    };
  }

  private buildUserPrompt(input: CodeEvaluationInput): string {
    const parts: string[] = [];

    parts.push(`Repository: ${input.repositoryName}`);
    parts.push(`Contribution Type: ${input.contributionType}`);

    if (input.commitMessage) {
      parts.push(`Commit Message: ${input.commitMessage}`);
    }
    if (input.pullRequestTitle) {
      parts.push(`PR Title: ${input.pullRequestTitle}`);
    }
    if (input.pullRequestDescription) {
      parts.push(`PR Description: ${input.pullRequestDescription}`);
    }

    parts.push(`\nFiles Changed (${input.files.length}):`);

    const filesToEvaluate = input.files.slice(0, MAX_EVALUATION_FILES);

    for (const file of filesToEvaluate) {
      parts.push(`\n--- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`);
      if (file.patch) {
        const truncatedPatch =
          file.patch.length > MAX_PATCH_LENGTH
            ? file.patch.slice(0, MAX_PATCH_LENGTH) + '\n... [truncated]'
            : file.patch;
        parts.push(truncatedPatch);
      }
    }

    if (input.files.length > MAX_EVALUATION_FILES) {
      parts.push(`\n... and ${input.files.length - MAX_EVALUATION_FILES} more files (not shown)`);
    }

    if (input.planningContext) {
      const ctx = input.planningContext;
      parts.push(
        '\nPlanning Context (for informational context only — do not add new scoring dimensions):',
      );
      if (ctx.storyPoints !== null) {
        parts.push(`Story Points: ${ctx.storyPoints}`);
      }
      if (ctx.sprintVelocity !== null) {
        parts.push(`Sprint Velocity: ${ctx.sprintVelocity}`);
      }
      if (ctx.estimationAccuracy !== null) {
        parts.push(`Estimation Accuracy: ${(ctx.estimationAccuracy * 100).toFixed(1)}%`);
      }
      if (ctx.commitmentRatio !== null) {
        parts.push(`Commitment Ratio: ${(ctx.commitmentRatio * 100).toFixed(1)}%`);
      }
    }

    return parts.join('\n');
  }

  async evaluateDocumentation(input: DocEvaluationInput): Promise<DocEvaluationOutput> {
    const userPrompt = this.buildDocUserPrompt(input);
    const effectiveModelId = input.modelId ?? this.defaultModelId;

    this.logger.log('Calling Anthropic API for documentation evaluation', {
      module: 'evaluation',
      contributionId: input.contributionId,
      modelId: effectiveModelId,
      documentType: input.documentType,
    });

    const systemPrompt = input.rubricParameters
      ? this.buildDocSystemPromptWithRubric(input.rubricParameters)
      : DOC_SYSTEM_PROMPT;

    const response = await this.client.messages.create({
      model: effectiveModelId,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const rawOutput = textBlock ? textBlock.text : '';

    this.logger.log('Anthropic API response received for doc evaluation', {
      module: 'evaluation',
      contributionId: input.contributionId,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    });

    const parsed = this.parseDocResponse(rawOutput);

    return {
      dimensions: {
        structuralCompleteness: parsed.structuralCompleteness,
        readability: parsed.readability,
        referenceIntegrity: parsed.referenceIntegrity,
      },
      narrative: parsed.narrative,
      rawModelOutput: rawOutput,
    };
  }

  private buildDocUserPrompt(input: DocEvaluationInput): string {
    const parts: string[] = [];

    parts.push(`Repository: ${input.repositoryName}`);
    parts.push(`Document Title: ${input.documentTitle}`);

    if (input.documentType) {
      parts.push(`Document Type: ${input.documentType}`);
    }

    parts.push(`\nDocument Content:`);
    parts.push(input.documentContent);

    return parts.join('\n');
  }

  private buildDocSystemPromptWithRubric(rubric: DocEvaluationInput['rubricParameters']): string {
    const rubricDetails: string[] = [];

    if (rubric?.targetFleschKincaidRange) {
      rubricDetails.push(
        `Target Flesch-Kincaid grade level: ${rubric.targetFleschKincaidRange.min}-${rubric.targetFleschKincaidRange.max}`,
      );
    }
    if (rubric?.requiredSections?.length) {
      rubricDetails.push(`Required sections: ${rubric.requiredSections.join(', ')}`);
    }
    if (rubric?.maxSentenceLength) {
      rubricDetails.push(`Maximum recommended sentence length: ${rubric.maxSentenceLength} words`);
    }

    const rubricSuffix = rubricDetails.length
      ? `\n\nAdditional rubric parameters:\n${rubricDetails.join('\n')}`
      : '';

    return DOC_SYSTEM_PROMPT + rubricSuffix;
  }

  private parseResponse(raw: string): EvaluationResponse {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.error('Failed to extract JSON from model response', {
        module: 'evaluation',
        rawLength: raw.length,
      });
      throw new Error('Model response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]) as EvaluationResponse;

    const dimensionKeys: EvaluationDimensionKey[] = [
      'complexity',
      'maintainability',
      'testCoverage',
      'standardsAdherence',
    ];
    for (const key of dimensionKeys) {
      if (!parsed[key] || typeof parsed[key].score !== 'number') {
        throw new Error(`Missing or invalid dimension score: ${key}`);
      }
      parsed[key].score = Math.max(0, Math.min(100, Math.round(parsed[key].score)));
    }

    if (!parsed.narrative || typeof parsed.narrative !== 'string') {
      parsed.narrative = 'Evaluation completed.';
    }

    return parsed;
  }

  private parseDocResponse(raw: string): DocEvaluationResponse {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.error('Failed to extract JSON from doc model response', {
        module: 'evaluation',
        rawLength: raw.length,
      });
      throw new Error('Model response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]) as DocEvaluationResponse;

    const dimensionKeys: DocEvaluationDimensionKey[] = [
      'structuralCompleteness',
      'readability',
      'referenceIntegrity',
    ];
    for (const key of dimensionKeys) {
      if (!parsed[key] || typeof parsed[key].score !== 'number') {
        throw new Error(`Missing or invalid dimension score: ${key}`);
      }
      parsed[key].score = Math.max(0, Math.min(100, Math.round(parsed[key].score)));
    }

    if (!parsed.narrative || typeof parsed.narrative !== 'string') {
      parsed.narrative = 'Documentation evaluation completed.';
    }

    return parsed;
  }

  async listAvailableModels(): Promise<
    Array<{ id: string; displayName: string; createdAt: string }>
  > {
    this.logger.log('Fetching available models from Anthropic API', {
      module: 'evaluation',
    });

    const models: Array<{ id: string; displayName: string; createdAt: string }> = [];

    for await (const model of this.client.models.list({ limit: 100 })) {
      models.push({
        id: model.id,
        displayName: model.display_name,
        createdAt: model.created_at,
      });
    }

    this.logger.log('Available models fetched', {
      module: 'evaluation',
      count: models.length,
    });

    return models;
  }
}
