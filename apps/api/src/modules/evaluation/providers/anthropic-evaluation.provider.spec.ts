import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AnthropicEvaluationProvider } from './anthropic-evaluation.provider.js';

const mockCreate = vi.fn();

const mockModelsList = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
      models = {
        list: mockModelsList,
      };
    },
  };
});

const validDocResponse = JSON.stringify({
  structuralCompleteness: { score: 80, explanation: 'Well organized sections' },
  readability: { score: 75, explanation: 'Clear writing style' },
  referenceIntegrity: { score: 90, explanation: 'All links valid' },
  narrative: 'Documentation is well structured and easy to follow.',
});

const docInput = {
  contributionId: 'contrib-doc-1',
  contributionType: 'DOCUMENT',
  repositoryName: 'org/repo',
  documentTitle: 'Getting Started Guide',
  documentContent: '# Getting Started\n\nThis guide explains how to set up the project.',
  documentType: 'guide',
};

const validResponse = JSON.stringify({
  complexity: { score: 85, explanation: 'Clean control flow' },
  maintainability: { score: 90, explanation: 'Well structured' },
  testCoverage: { score: 70, explanation: 'Tests present' },
  standardsAdherence: { score: 88, explanation: 'Follows conventions' },
  narrative: 'Good code quality demonstrated in this contribution.',
});

const codeInput = {
  contributionId: 'contrib-1',
  contributionType: 'COMMIT',
  repositoryName: 'org/repo',
  files: [
    { filename: 'src/auth.ts', status: 'modified', additions: 10, deletions: 5, patch: '+ code' },
  ],
  commitMessage: 'fix: auth flow',
};

describe('AnthropicEvaluationProvider', () => {
  let provider: AnthropicEvaluationProvider;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              ANTHROPIC_API_KEY: 'test-key',
              EVALUATION_MODEL_ID: 'claude-test-model',
            }),
          ],
        }),
      ],
      providers: [AnthropicEvaluationProvider],
    }).compile();

    provider = module.get(AnthropicEvaluationProvider);
  });

  it('returns codePromptVersion', () => {
    expect(provider.codePromptVersion).toBe('code-eval-v1');
  });

  it('returns docPromptVersion', () => {
    expect(provider.docPromptVersion).toBe('doc-eval-v1');
  });

  it('calls Anthropic API and returns parsed dimensions', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await provider.evaluateCode(codeInput);

    expect(result.dimensions.complexity.score).toBe(85);
    expect(result.dimensions.maintainability.score).toBe(90);
    expect(result.dimensions.testCoverage.score).toBe(70);
    expect(result.dimensions.standardsAdherence.score).toBe(88);
    expect(result.narrative).toBe('Good code quality demonstrated in this contribution.');
    expect(result.rawModelOutput).toBe(validResponse);
  });

  it('clamps scores to 0-100 range', async () => {
    const outOfRange = JSON.stringify({
      complexity: { score: 150, explanation: 'Over' },
      maintainability: { score: -10, explanation: 'Under' },
      testCoverage: { score: 50.7, explanation: 'Rounded' },
      standardsAdherence: { score: 100, explanation: 'Max' },
      narrative: 'Score clamping test.',
    });

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: outOfRange }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await provider.evaluateCode(codeInput);

    expect(result.dimensions.complexity.score).toBe(100);
    expect(result.dimensions.maintainability.score).toBe(0);
    expect(result.dimensions.testCoverage.score).toBe(51);
    expect(result.dimensions.standardsAdherence.score).toBe(100);
  });

  it('throws on invalid JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot evaluate this.' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    await expect(provider.evaluateCode(codeInput)).rejects.toThrow(
      'Model response did not contain valid JSON',
    );
  });

  it('throws on missing dimension scores', async () => {
    const incomplete = JSON.stringify({
      complexity: { score: 80, explanation: 'OK' },
      narrative: 'Missing dimensions.',
    });

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: incomplete }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    await expect(provider.evaluateCode(codeInput)).rejects.toThrow(
      'Missing or invalid dimension score: maintainability',
    );
  });

  it('defaults narrative when missing', async () => {
    const noNarrative = JSON.stringify({
      complexity: { score: 80, explanation: 'Good' },
      maintainability: { score: 85, explanation: 'Good' },
      testCoverage: { score: 70, explanation: 'Good' },
      standardsAdherence: { score: 90, explanation: 'Good' },
    });

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: noNarrative }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    const result = await provider.evaluateCode(codeInput);

    expect(result.narrative).toBe('Evaluation completed.');
  });

  it('extracts JSON from response with surrounding text', async () => {
    const wrappedResponse = `Here is the evaluation:\n${validResponse}\nEnd of evaluation.`;

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: wrappedResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await provider.evaluateCode(codeInput);

    expect(result.dimensions.complexity.score).toBe(85);
  });

  it('builds user prompt with PR fields for pull request contributions', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await provider.evaluateCode({
      ...codeInput,
      contributionType: 'PULL_REQUEST',
      commitMessage: undefined,
      pullRequestTitle: 'Fix auth flow',
      pullRequestDescription: 'Resolves auth bug',
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('PR Title: Fix auth flow'),
          },
        ],
      }),
    );
  });

  it('evaluateDocumentation returns parsed doc dimensions', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validDocResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await provider.evaluateDocumentation(docInput);

    expect(result.dimensions.structuralCompleteness.score).toBe(80);
    expect(result.dimensions.structuralCompleteness.explanation).toBe('Well organized sections');
    expect(result.dimensions.readability.score).toBe(75);
    expect(result.dimensions.readability.explanation).toBe('Clear writing style');
    expect(result.dimensions.referenceIntegrity.score).toBe(90);
    expect(result.dimensions.referenceIntegrity.explanation).toBe('All links valid');
    expect(result.narrative).toBe('Documentation is well structured and easy to follow.');
    expect(result.rawModelOutput).toBe(validDocResponse);
  });

  it('evaluateDocumentation clamps doc scores to 0-100 range', async () => {
    const outOfRange = JSON.stringify({
      structuralCompleteness: { score: 120, explanation: 'Over' },
      readability: { score: -5, explanation: 'Under' },
      referenceIntegrity: { score: 73.6, explanation: 'Rounded' },
      narrative: 'Doc score clamping test.',
    });

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: outOfRange }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    const result = await provider.evaluateDocumentation(docInput);

    expect(result.dimensions.structuralCompleteness.score).toBe(100);
    expect(result.dimensions.readability.score).toBe(0);
    expect(result.dimensions.referenceIntegrity.score).toBe(74);
  });

  it('evaluateDocumentation throws on invalid JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot evaluate this document.' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    await expect(provider.evaluateDocumentation(docInput)).rejects.toThrow(
      'Model response did not contain valid JSON',
    );
  });

  it('evaluateDocumentation throws on missing doc dimension', async () => {
    const incomplete = JSON.stringify({
      structuralCompleteness: { score: 80, explanation: 'OK' },
      narrative: 'Missing dimensions.',
    });

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: incomplete }],
      usage: { input_tokens: 100, output_tokens: 100 },
    });

    await expect(provider.evaluateDocumentation(docInput)).rejects.toThrow(
      'Missing or invalid dimension score: readability',
    );
  });

  it('evaluateDocumentation includes rubric parameters in system prompt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validDocResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await provider.evaluateDocumentation({
      ...docInput,
      rubricParameters: {
        targetFleschKincaidRange: { min: 8, max: 12 },
        requiredSections: ['Introduction', 'Installation', 'Usage'],
        maxSentenceLength: 25,
      },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Target Flesch-Kincaid grade level: 8-12'),
      }),
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Required sections: Introduction, Installation, Usage'),
      }),
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Maximum recommended sentence length: 25 words'),
      }),
    );
  });

  it('uses input.modelId when provided instead of default', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await provider.evaluateCode({ ...codeInput, modelId: 'claude-opus-4-20250514' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-opus-4-20250514',
      }),
    );
  });

  it('uses default model ID when input.modelId is not provided', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await provider.evaluateCode(codeInput);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-test-model',
      }),
    );
  });

  it('includes planning context in user prompt when provided', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await provider.evaluateCode({
      ...codeInput,
      planningContext: {
        storyPoints: 5,
        sprintVelocity: 42,
        estimationAccuracy: 0.85,
        commitmentRatio: 0.92,
        sprintId: 'sprint-1',
      },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Planning Context'),
          },
        ],
      }),
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Story Points: 5'),
          },
        ],
      }),
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Sprint Velocity: 42'),
          },
        ],
      }),
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Estimation Accuracy: 85.0%'),
          },
        ],
      }),
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Commitment Ratio: 92.0%'),
          },
        ],
      }),
    );
  });

  it('does NOT include planning context section when absent', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await provider.evaluateCode(codeInput);

    const callArg = mockCreate.mock.calls[0][0];
    expect(callArg.messages[0].content).not.toContain('Planning Context');
  });

  it('returns code-eval-v2 prompt version when planning context is provided', () => {
    expect(
      provider.getEffectiveCodePromptVersion({
        ...codeInput,
        planningContext: {
          storyPoints: 3,
          sprintVelocity: 30,
          estimationAccuracy: null,
          commitmentRatio: null,
          sprintId: 'sprint-1',
        },
      }),
    ).toBe('code-eval-v2');
  });

  it('returns code-eval-v1 prompt version when no planning context', () => {
    expect(provider.getEffectiveCodePromptVersion(codeInput)).toBe('code-eval-v1');
  });

  it('omits null planning context fields from prompt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: validResponse }],
      usage: { input_tokens: 100, output_tokens: 200 },
    });

    await provider.evaluateCode({
      ...codeInput,
      planningContext: {
        storyPoints: 3,
        sprintVelocity: null,
        estimationAccuracy: null,
        commitmentRatio: null,
        sprintId: 'sprint-1',
      },
    });

    const callArg = mockCreate.mock.calls[0][0];
    const userContent = callArg.messages[0].content;
    expect(userContent).toContain('Story Points: 3');
    expect(userContent).not.toContain('Sprint Velocity:');
    expect(userContent).not.toContain('Estimation Accuracy:');
    expect(userContent).not.toContain('Commitment Ratio:');
  });

  it('listAvailableModels returns models from Anthropic API', async () => {
    const mockModels = [
      {
        id: 'claude-sonnet-4-5-20250514',
        display_name: 'Claude Sonnet 4.5',
        created_at: '2025-05-14T00:00:00Z',
      },
      {
        id: 'claude-opus-4-20250514',
        display_name: 'Claude Opus 4',
        created_at: '2025-05-14T00:00:00Z',
      },
    ];

    mockModelsList.mockReturnValue({
      [Symbol.asyncIterator]: function* () {
        for (const model of mockModels) {
          yield model;
        }
      },
    });

    const result = await provider.listAvailableModels();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'claude-sonnet-4-5-20250514',
      displayName: 'Claude Sonnet 4.5',
      createdAt: '2025-05-14T00:00:00Z',
    });
  });
});
