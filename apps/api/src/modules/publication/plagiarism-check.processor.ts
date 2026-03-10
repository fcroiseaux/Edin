import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PlagiarismCheckJobData } from './moderation.service.js';
import type { FlaggedPassage, ArticleModerationCompletedEvent } from '@edin/shared';

const DEFAULT_PLAGIARISM_THRESHOLD = 0.3;
const DEFAULT_AI_CONTENT_THRESHOLD = 0.6;
const NGRAM_SIZE = 3;

@Processor('plagiarism-check')
export class PlagiarismCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(PlagiarismCheckProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('plagiarism-check-dlq')
    private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<PlagiarismCheckJobData>): Promise<void> {
    const { articleId, authorId, body, correlationId } = job.data;

    this.logger.log('Processing plagiarism check', {
      module: 'publication',
      jobId: job.id,
      articleId,
      correlationId,
    });

    try {
      // Load thresholds from settings
      const plagiarismThresholdSetting = await this.prisma.platformSetting.findUnique({
        where: { key: 'moderation.plagiarismThreshold' },
      });
      const aiContentThresholdSetting = await this.prisma.platformSetting.findUnique({
        where: { key: 'moderation.aiContentThreshold' },
      });

      const plagiarismThreshold = plagiarismThresholdSetting
        ? Number(plagiarismThresholdSetting.value)
        : DEFAULT_PLAGIARISM_THRESHOLD;
      const aiContentThreshold = aiContentThresholdSetting
        ? Number(aiContentThresholdSetting.value)
        : DEFAULT_AI_CONTENT_THRESHOLD;

      // Run plagiarism check
      const { score: plagiarismScore, passages: plagiarismPassages } = await this.checkPlagiarism(
        articleId,
        body,
      );

      // Run AI-content detection
      const { score: aiContentScore, passages: aiContentPassages } = this.detectAiContent(body);

      // Combine flagged passages
      const allPassages: FlaggedPassage[] = [...plagiarismPassages, ...aiContentPassages];

      // Determine flag status
      const isPlagiarismFlagged = plagiarismScore >= plagiarismThreshold;
      const isAiContentFlagged = aiContentScore >= aiContentThreshold;
      const isFlagged = isPlagiarismFlagged || isAiContentFlagged;

      let flagType: string | null = null;
      if (isPlagiarismFlagged && isAiContentFlagged) {
        flagType = 'BOTH';
      } else if (isPlagiarismFlagged) {
        flagType = 'PLAGIARISM';
      } else if (isAiContentFlagged) {
        flagType = 'AI_CONTENT';
      }

      // Update the moderation report
      const report = await this.prisma.moderationReport.findFirst({
        where: { articleId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });

      if (!report) {
        throw new Error(`No PENDING moderation report found for article ${articleId}`);
      }

      await this.prisma.moderationReport.update({
        where: { id: report.id },
        data: {
          plagiarismScore,
          aiContentScore,
          flagType,
          isFlagged,
          flaggedPassages:
            allPassages.length > 0
              ? (JSON.parse(JSON.stringify(allPassages)) as Record<string, unknown>[])
              : undefined,
          status: isFlagged ? 'FLAGGED' : 'CLEAN',
        },
      });

      // Emit completion event
      const completedEvent: ArticleModerationCompletedEvent = {
        articleId,
        authorId,
        isFlagged,
        flagType: flagType as ArticleModerationCompletedEvent['flagType'],
        plagiarismScore,
        aiContentScore,
        timestamp: new Date().toISOString(),
        correlationId,
      };

      this.eventEmitter.emit('publication.moderation.completed', completedEvent);

      this.logger.log('Plagiarism check completed', {
        module: 'publication',
        jobId: job.id,
        articleId,
        plagiarismScore,
        aiContentScore,
        isFlagged,
        flagType,
        correlationId,
      });
    } catch (error) {
      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts || 3;

      if (attemptsMade >= maxAttempts) {
        await this.dlqQueue.add(
          'dead-letter-plagiarism-check',
          {
            ...job.data,
            failedAt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        this.logger.warn('Plagiarism check failed after all retries', {
          module: 'publication',
          jobId: job.id,
          articleId,
          attempts: attemptsMade,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        this.logger.warn('Plagiarism check attempt failed, will retry', {
          module: 'publication',
          jobId: job.id,
          articleId,
          attempt: attemptsMade,
          maxAttempts,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      throw error;
    }
  }

  // ─── Plagiarism Detection (n-gram similarity) ─────────────────────────────

  async checkPlagiarism(
    articleId: string,
    body: string,
  ): Promise<{ score: number; passages: FlaggedPassage[] }> {
    const articleNgrams = this.extractNgrams(body);
    if (articleNgrams.size === 0) {
      return { score: 0, passages: [] };
    }

    // Load published articles (excluding the current one's author duplicate)
    const publishedArticles = await this.prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: articleId },
      },
      select: { id: true, title: true, body: true, slug: true },
      take: 500,
    });

    let maxSimilarity = 0;
    const passages: FlaggedPassage[] = [];

    for (const published of publishedArticles) {
      const publishedNgrams = this.extractNgrams(published.body);
      const similarity = this.jaccardSimilarity(articleNgrams, publishedNgrams);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }

      if (similarity >= 0.15) {
        // Find matching passages
        const matchedPassages = this.findMatchingPassages(body, published.body, published.title);
        passages.push(...matchedPassages);
      }
    }

    return {
      score: Math.round(maxSimilarity * 100) / 100,
      passages: passages.slice(0, 10), // Limit to top 10 passages
    };
  }

  // ─── AI-Content Detection (heuristic) ─────────────────────────────────────

  detectAiContent(body: string): { score: number; passages: FlaggedPassage[] } {
    const plainText = this.stripMarkdown(body);
    const sentences = this.splitSentences(plainText);

    if (sentences.length < 5) {
      return { score: 0, passages: [] };
    }

    // Feature 1: Sentence length uniformity (AI tends toward uniform lengths)
    const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance =
      sentenceLengths.reduce((sum, len) => sum + (len - avgLength) ** 2, 0) /
      sentenceLengths.length;
    const stdDev = Math.sqrt(variance);
    const coeffOfVariation = avgLength > 0 ? stdDev / avgLength : 0;
    // Low coefficient of variation = more uniform = more likely AI
    const uniformityScore = Math.max(0, 1 - coeffOfVariation * 2);

    // Feature 2: Vocabulary richness (type-token ratio)
    const words = plainText
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const uniqueWords = new Set(words);
    const ttr = words.length > 0 ? uniqueWords.size / words.length : 1;
    // Lower TTR can indicate AI (but also depends on content)
    const vocabScore = Math.max(0, 1 - ttr * 1.5);

    // Feature 3: Repetition patterns (bigram repetition rate)
    const bigrams = this.extractWordNgrams(words, 2);
    const bigramCounts = new Map<string, number>();
    for (const bg of bigrams) {
      bigramCounts.set(bg, (bigramCounts.get(bg) || 0) + 1);
    }
    const repeatedBigrams = Array.from(bigramCounts.values()).filter((c) => c > 2).length;
    const repetitionRate = bigrams.length > 0 ? repeatedBigrams / bigrams.length : 0;
    const repetitionScore = Math.min(1, repetitionRate * 10);

    // Composite score (weighted average)
    const compositeScore = uniformityScore * 0.4 + vocabScore * 0.3 + repetitionScore * 0.3;

    const score = Math.round(compositeScore * 100) / 100;

    const passages: FlaggedPassage[] = [];
    if (score >= 0.5) {
      passages.push({
        start: 0,
        end: Math.min(plainText.length, 500),
        text: plainText.slice(0, 500),
        type: 'AI_CONTENT',
      });
    }

    return { score, passages };
  }

  // ─── Utility Methods ──────────────────────────────────────────────────────

  private extractNgrams(text: string): Set<string> {
    const plainText = this.stripMarkdown(text).toLowerCase();
    const words = plainText.split(/\s+/).filter((w) => w.length > 0);
    const ngrams = new Set<string>();

    for (let i = 0; i <= words.length - NGRAM_SIZE; i++) {
      ngrams.add(words.slice(i, i + NGRAM_SIZE).join(' '));
    }

    return ngrams;
  }

  private extractWordNgrams(words: string[], n: number): string[] {
    const result: string[] = [];
    for (let i = 0; i <= words.length - n; i++) {
      result.push(words.slice(i, i + n).join(' '));
    }
    return result;
  }

  private jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) return 0;

    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) intersection++;
    }

    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private findMatchingPassages(
    text: string,
    sourceText: string,
    sourceTitle: string,
  ): FlaggedPassage[] {
    const passages: FlaggedPassage[] = [];
    const textSentences = this.splitSentences(text);
    const sourceSentences = new Set(
      this.splitSentences(sourceText).map((s) => s.toLowerCase().trim()),
    );

    for (const sentence of textSentences) {
      if (sentence.length < 30) continue;
      if (sourceSentences.has(sentence.toLowerCase().trim())) {
        const start = text.indexOf(sentence);
        passages.push({
          start,
          end: start + sentence.length,
          text: sentence,
          source: sourceTitle,
          type: 'PLAGIARISM',
        });
      }
    }

    return passages.slice(0, 5);
  }

  private splitSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/#{1,6}\s+/g, '') // headings
      .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1') // bold/italic
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // code blocks
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links
      .replace(/[>\-*_~]/g, '') // misc markdown
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();
  }
}
