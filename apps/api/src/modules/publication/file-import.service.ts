import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { marked } from 'marked';
import * as mammoth from 'mammoth';
import { extname } from 'path';
import { z } from 'zod';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type { FileImportResultDto } from '@edin/shared';

const ALLOWED_EXTENSIONS = ['.md', '.txt', '.docx'];
const MAX_TITLE_LENGTH = 200;
const MAX_ABSTRACT_LENGTH = 300;

const metadataSchema = z.object({
  title: z.string(),
  abstract: z.string(),
});

@Injectable()
export class FileImportService {
  private readonly logger = new Logger(FileImportService.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not configured — AI metadata generation will use fallback',
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async importFile(file: Express.Multer.File): Promise<FileImportResultDto> {
    const ext = extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new DomainException(
        ERROR_CODES.FILE_IMPORT_UNSUPPORTED_TYPE,
        `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new DomainException(
        ERROR_CODES.FILE_IMPORT_EMPTY_CONTENT,
        'The uploaded file is empty',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log('Processing file import', {
      module: 'publication',
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      extension: ext,
    });

    let tiptapJsonString: string;

    try {
      switch (ext) {
        case '.md':
          tiptapJsonString = await this.convertMarkdown(file.buffer);
          break;
        case '.txt':
          tiptapJsonString = this.convertPlainText(file.buffer);
          break;
        case '.docx':
          tiptapJsonString = await this.convertDocx(file.buffer);
          break;
        default:
          throw new DomainException(
            ERROR_CODES.FILE_IMPORT_UNSUPPORTED_TYPE,
            `Unsupported file type: ${ext}`,
            HttpStatus.BAD_REQUEST,
          );
      }
    } catch (error) {
      if (error instanceof DomainException) throw error;
      this.logger.error('File conversion failed', {
        module: 'publication',
        fileName: file.originalname,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DomainException(
        ERROR_CODES.FILE_IMPORT_CONVERSION_FAILED,
        'Failed to convert the uploaded file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const plainText = this.extractPlainText(tiptapJsonString);

    if (!plainText.trim()) {
      throw new DomainException(
        ERROR_CODES.FILE_IMPORT_EMPTY_CONTENT,
        'The uploaded file contains no text content',
        HttpStatus.BAD_REQUEST,
      );
    }

    const metadata = await this.generateMetadata(plainText);

    this.logger.log('File import completed successfully', {
      module: 'publication',
      fileName: file.originalname,
      titleLength: metadata.title.length,
      abstractLength: metadata.abstract.length,
    });

    return {
      title: metadata.title,
      abstract: metadata.abstract,
      body: tiptapJsonString,
    };
  }

  private async convertMarkdown(buffer: Buffer): Promise<string> {
    const markdown = buffer.toString('utf-8');
    const html = await marked(markdown);
    return this.htmlToTiptapJson(html);
  }

  private convertPlainText(buffer: Buffer): string {
    const text = buffer.toString('utf-8');
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());

    const content = paragraphs.map((p) => ({
      type: 'paragraph' as const,
      content: [{ type: 'text' as const, text: p.trim() }],
    }));

    if (content.length === 0) {
      content.push({
        type: 'paragraph' as const,
        content: [{ type: 'text' as const, text: text.trim() }],
      });
    }

    return JSON.stringify({ type: 'doc', content });
  }

  private async convertDocx(buffer: Buffer): Promise<string> {
    const result = await mammoth.convertToHtml({ buffer });

    if (result.messages.length > 0) {
      this.logger.log('Mammoth conversion warnings', {
        module: 'publication',
        warnings: result.messages.map((m) => m.message),
      });
    }

    return this.htmlToTiptapJson(result.value);
  }

  private htmlToTiptapJson(html: string): string {
    const content: TiptapNode[] = [];
    let remaining = html;

    while (remaining.length > 0) {
      remaining = remaining.replace(/^\s+/, '');
      if (!remaining) break;

      const parsed = this.parseNextElement(remaining);
      if (parsed) {
        if (parsed.node) content.push(parsed.node);
        remaining = remaining.slice(parsed.consumed);
      } else {
        // Skip unrecognized content character by character
        const nextTagIndex = remaining.indexOf('<', 1);
        if (nextTagIndex === -1) {
          // No more tags — treat remaining as text paragraph
          const text = this.stripHtml(remaining).trim();
          if (text) {
            content.push({ type: 'paragraph', content: [{ type: 'text', text }] });
          }
          break;
        }
        const textBefore = remaining.slice(0, nextTagIndex).trim();
        if (textBefore) {
          const strippedText = this.stripHtml(textBefore).trim();
          if (strippedText) {
            content.push({ type: 'paragraph', content: [{ type: 'text', text: strippedText }] });
          }
        }
        remaining = remaining.slice(nextTagIndex);
      }
    }

    return JSON.stringify({ type: 'doc', content });
  }

  private parseNextElement(html: string): { node: TiptapNode | null; consumed: number } | null {
    // Horizontal rule
    const hrMatch = html.match(/^<hr\s*\/?>/i);
    if (hrMatch) {
      return { node: { type: 'horizontalRule' }, consumed: hrMatch[0].length };
    }

    // Headings h1-h6
    const headingMatch = html.match(/^<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/i);
    if (headingMatch) {
      const rawLevel = parseInt(headingMatch[1], 10);
      // Clamp: h1 → h2, h5/h6 → h4
      const level = Math.max(2, Math.min(4, rawLevel));
      const inlineContent = this.parseInlineContent(headingMatch[2]);
      return {
        node: { type: 'heading', attrs: { level }, content: inlineContent },
        consumed: headingMatch[0].length,
      };
    }

    // Code block
    const codeBlockMatch = html.match(/^<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
    if (codeBlockMatch) {
      const codeText = this.decodeHtmlEntities(codeBlockMatch[1]);
      return {
        node: { type: 'codeBlock', content: [{ type: 'text', text: codeText }] },
        consumed: codeBlockMatch[0].length,
      };
    }

    // Blockquote
    const blockquoteMatch = html.match(/^<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i);
    if (blockquoteMatch) {
      const innerContent = this.parseBlockContent(blockquoteMatch[1]);
      return {
        node: { type: 'blockquote', content: innerContent },
        consumed: blockquoteMatch[0].length,
      };
    }

    // Unordered list
    const ulMatch = html.match(/^<ul[^>]*>([\s\S]*?)<\/ul>/i);
    if (ulMatch) {
      const items = this.parseListItems(ulMatch[1]);
      return {
        node: { type: 'bulletList', content: items },
        consumed: ulMatch[0].length,
      };
    }

    // Ordered list
    const olMatch = html.match(/^<ol[^>]*>([\s\S]*?)<\/ol>/i);
    if (olMatch) {
      const items = this.parseListItems(olMatch[1]);
      return {
        node: { type: 'orderedList', content: items },
        consumed: olMatch[0].length,
      };
    }

    // Paragraph
    const pMatch = html.match(/^<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      const inlineContent = this.parseInlineContent(pMatch[1]);
      if (inlineContent.length === 0) return { node: null, consumed: pMatch[0].length };
      return {
        node: { type: 'paragraph', content: inlineContent },
        consumed: pMatch[0].length,
      };
    }

    return null;
  }

  private parseBlockContent(html: string): TiptapNode[] {
    const content: TiptapNode[] = [];
    let remaining = html.trim();

    while (remaining.length > 0) {
      remaining = remaining.replace(/^\s+/, '');
      if (!remaining) break;

      const parsed = this.parseNextElement(remaining);
      if (parsed) {
        if (parsed.node) content.push(parsed.node);
        remaining = remaining.slice(parsed.consumed);
      } else {
        // Treat as inline text in a paragraph
        const nextTagIndex = remaining.indexOf('<');
        if (nextTagIndex === -1 || nextTagIndex > 0) {
          const textEnd = nextTagIndex === -1 ? remaining.length : nextTagIndex;
          const text = remaining.slice(0, textEnd).trim();
          if (text) {
            content.push({ type: 'paragraph', content: [{ type: 'text', text }] });
          }
          remaining = remaining.slice(textEnd);
        } else {
          // Unknown tag — skip it
          const closingBracket = remaining.indexOf('>', 1);
          if (closingBracket === -1) break;
          remaining = remaining.slice(closingBracket + 1);
        }
      }
    }

    // If no block-level content found, wrap as paragraph
    if (content.length === 0) {
      const inlineContent = this.parseInlineContent(html);
      if (inlineContent.length > 0) {
        content.push({ type: 'paragraph', content: inlineContent });
      }
    }

    return content;
  }

  private parseListItems(html: string): TiptapNode[] {
    const items: TiptapNode[] = [];
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;

    while ((match = liRegex.exec(html)) !== null) {
      const innerHtml = match[1].trim();

      // Check if list item contains block-level elements
      const hasBlocks = /<(?:p|ul|ol|blockquote|pre|h[1-6])[^>]*>/i.test(innerHtml);

      if (hasBlocks) {
        const blockContent = this.parseBlockContent(innerHtml);
        items.push({ type: 'listItem', content: blockContent });
      } else {
        const inlineContent = this.parseInlineContent(innerHtml);
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: inlineContent }],
        });
      }
    }

    return items;
  }

  private parseInlineContent(html: string): TiptapNode[] {
    const nodes: TiptapNode[] = [];
    let remaining = html;

    while (remaining.length > 0) {
      // Find next tag
      const tagIndex = remaining.indexOf('<');

      if (tagIndex === -1) {
        // No more tags — rest is plain text
        const text = this.decodeHtmlEntities(remaining).trim();
        if (text) nodes.push({ type: 'text', text });
        break;
      }

      if (tagIndex > 0) {
        // Text before the tag
        const text = this.decodeHtmlEntities(remaining.slice(0, tagIndex));
        if (text) nodes.push({ type: 'text', text });
        remaining = remaining.slice(tagIndex);
        continue;
      }

      // Handle inline tags
      const strongMatch = remaining.match(/^<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/i);
      if (strongMatch) {
        const innerNodes = this.parseInlineContent(strongMatch[1]);
        for (const node of innerNodes) {
          if (node.type === 'text') {
            nodes.push({
              type: 'text',
              text: node.text!,
              marks: [...(node.marks || []), { type: 'bold' }],
            });
          } else {
            nodes.push(node);
          }
        }
        remaining = remaining.slice(strongMatch[0].length);
        continue;
      }

      const emMatch = remaining.match(/^<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/i);
      if (emMatch) {
        const innerNodes = this.parseInlineContent(emMatch[1]);
        for (const node of innerNodes) {
          if (node.type === 'text') {
            nodes.push({
              type: 'text',
              text: node.text!,
              marks: [...(node.marks || []), { type: 'italic' }],
            });
          } else {
            nodes.push(node);
          }
        }
        remaining = remaining.slice(emMatch[0].length);
        continue;
      }

      const codeMatch = remaining.match(/^<code>([\s\S]*?)<\/code>/i);
      if (codeMatch) {
        const text = this.decodeHtmlEntities(codeMatch[1]);
        if (text) {
          nodes.push({ type: 'text', text, marks: [{ type: 'code' }] });
        }
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      const linkMatch = remaining.match(/^<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (linkMatch) {
        const href = linkMatch[1];
        const innerNodes = this.parseInlineContent(linkMatch[2]);
        // Only include safe URL schemes — reject javascript:, data:, vbscript:
        const isSafeHref = /^(?:https?:|mailto:|\/|#)/i.test(href);
        for (const node of innerNodes) {
          if (node.type === 'text') {
            const marks = [...(node.marks || [])];
            if (isSafeHref) {
              marks.push({ type: 'link', attrs: { href } });
            }
            nodes.push({ type: 'text', text: node.text!, marks });
          } else {
            nodes.push(node);
          }
        }
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Self-closing tags (br, img, etc.)
      const selfClosingMatch = remaining.match(/^<(?:br|img|hr)\s*[^>]*\/?>/i);
      if (selfClosingMatch) {
        remaining = remaining.slice(selfClosingMatch[0].length);
        continue;
      }

      // Unknown tag — try to skip it
      const unknownMatch = remaining.match(/^<\/?[a-z][a-z0-9]*[^>]*>/i);
      if (unknownMatch) {
        remaining = remaining.slice(unknownMatch[0].length);
        continue;
      }

      // No match — consume one character
      const char = this.decodeHtmlEntities(remaining[0]);
      if (char.trim()) {
        nodes.push({ type: 'text', text: char });
      }
      remaining = remaining.slice(1);
    }

    return nodes;
  }

  private extractPlainText(tiptapJson: string): string {
    const doc = JSON.parse(tiptapJson) as { content?: TiptapNode[] };
    return this.extractTextFromNodes(doc.content || []);
  }

  private extractTextFromNodes(nodes: TiptapNode[]): string {
    const parts: string[] = [];

    for (const node of nodes) {
      if (node.type === 'text' && node.text) {
        parts.push(node.text);
      } else if (node.content) {
        parts.push(this.extractTextFromNodes(node.content));
      }
    }

    return parts.join(' ');
  }

  private async generateMetadata(plainText: string): Promise<{ title: string; abstract: string }> {
    try {
      this.logger.log('Generating AI metadata for imported file', {
        module: 'publication',
        textLength: plainText.length,
      });

      const truncatedText = plainText.slice(0, 10000);

      const modelId = this.configService.get<string>(
        'EVALUATION_MODEL_ID',
        'claude-sonnet-4-5-20250514',
      );

      const response = await this.client.messages.create({
        model: modelId,
        max_tokens: 512,
        system: `You are an assistant that generates article metadata. Given the text content of an article, generate:
1. A concise, compelling title (maximum ${MAX_TITLE_LENGTH} characters)
2. A brief abstract summarizing the article (maximum ${MAX_ABSTRACT_LENGTH} characters)

Return ONLY valid JSON in this exact format:
{"title": "...", "abstract": "..."}`,
        messages: [{ role: 'user', content: truncatedText }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const rawOutput = textBlock ? textBlock.text : '';

      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON');
      }

      const parsed = metadataSchema.parse(JSON.parse(jsonMatch[0]));

      this.logger.log('AI metadata generation successful', {
        module: 'publication',
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      });

      return {
        title: parsed.title.slice(0, MAX_TITLE_LENGTH),
        abstract: parsed.abstract.slice(0, MAX_ABSTRACT_LENGTH),
      };
    } catch (error) {
      this.logger.warn('AI metadata generation failed, using fallback', {
        module: 'publication',
        error: error instanceof Error ? error.message : String(error),
      });

      return this.generateFallbackMetadata(plainText);
    }
  }

  private generateFallbackMetadata(plainText: string): { title: string; abstract: string } {
    const lines = plainText.split(/[\n.!?]/).filter((l) => l.trim());
    const title = (lines[0] || 'Imported Article').trim().slice(0, MAX_TITLE_LENGTH);
    const abstract = plainText.trim().slice(0, MAX_ABSTRACT_LENGTH);

    return { title, abstract };
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
}

interface TiptapNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: TiptapNode[];
}
