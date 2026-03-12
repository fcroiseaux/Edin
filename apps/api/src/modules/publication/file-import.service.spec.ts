import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileImportService } from './file-import.service.js';
import { ERROR_CODES } from '@edin/shared';
import { DomainException } from '../../common/exceptions/domain.exception.js';

interface TiptapTestNode {
  type: string;
  text?: string;
  attrs?: { level?: number };
  marks?: Array<{ type: string }>;
  content?: TiptapTestNode[];
}

interface TiptapTestDoc {
  type: string;
  content: TiptapTestNode[];
}

const mockCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: 'text',
      text: '{"title": "Generated Title", "abstract": "Generated abstract for the article content."}',
    },
  ],
  usage: { input_tokens: 100, output_tokens: 50 },
});

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = function () {
    return {
      messages: { create: mockCreate },
    };
  };
  return { default: MockAnthropic };
});

// Mock mammoth
vi.mock('mammoth', () => ({
  convertToHtml: vi.fn().mockResolvedValue({
    value: '<p>Hello from Word document</p>',
    messages: [],
  }),
}));

function makeFile(
  content: string | Buffer,
  originalname: string,
  mimetype = 'application/octet-stream',
): Express.Multer.File {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    buffer,
    size: buffer.length,
    stream: null as never,
    destination: '',
    filename: '',
    path: '',
  };
}

describe('FileImportService', () => {
  let service: FileImportService;

  beforeEach(async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '{"title": "Generated Title", "abstract": "Generated abstract for the article content."}',
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileImportService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('test-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<FileImportService>(FileImportService);
  });

  describe('importFile', () => {
    it('should import a markdown file successfully', async () => {
      const file = makeFile(
        '# Hello World\n\nThis is a test article with enough content.',
        'test.md',
      );
      const result = await service.importFile(file);

      expect(result).toBeDefined();
      expect(result.title).toBe('Generated Title');
      expect(result.abstract).toBe('Generated abstract for the article content.');
      expect(result.body).toContain('"type":"doc"');
    });

    it('should import a plain text file successfully', async () => {
      const file = makeFile('First paragraph of text.\n\nSecond paragraph of text.', 'test.txt');
      const result = await service.importFile(file);

      expect(result).toBeDefined();
      expect(result.body).toContain('"type":"doc"');

      const parsed = JSON.parse(result.body) as TiptapTestDoc;
      expect(parsed.type).toBe('doc');
      expect(parsed.content.length).toBe(2);
      expect(parsed.content[0].type).toBe('paragraph');
      expect(parsed.content[0].content[0].text).toBe('First paragraph of text.');
      expect(parsed.content[1].content[0].text).toBe('Second paragraph of text.');
    });

    it('should import a docx file successfully', async () => {
      const file = makeFile(Buffer.from('fake-docx-content'), 'test.docx');
      const result = await service.importFile(file);

      expect(result).toBeDefined();
      expect(result.body).toContain('"type":"doc"');
    });

    it('should throw FILE_IMPORT_UNSUPPORTED_TYPE for invalid extensions', async () => {
      const file = makeFile('content', 'test.pdf');

      try {
        await service.importFile(file);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(ERROR_CODES.FILE_IMPORT_UNSUPPORTED_TYPE);
        expect((error as DomainException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('should throw FILE_IMPORT_EMPTY_CONTENT for empty files', async () => {
      const file = makeFile('', 'empty.md');

      try {
        await service.importFile(file);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(ERROR_CODES.FILE_IMPORT_EMPTY_CONTENT);
      }
    });

    it('should throw FILE_IMPORT_EMPTY_CONTENT for whitespace-only files', async () => {
      const file = makeFile('   \n\n   \n\n  ', 'whitespace.txt');

      try {
        await service.importFile(file);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainException);
        expect((error as DomainException).errorCode).toBe(ERROR_CODES.FILE_IMPORT_EMPTY_CONTENT);
      }
    });
  });

  describe('convertPlainText (via importFile)', () => {
    it('should split on double newlines into paragraphs', async () => {
      const file = makeFile('Para one.\n\nPara two.\n\nPara three.', 'test.txt');
      const result = await service.importFile(file);
      const parsed = JSON.parse(result.body) as TiptapTestDoc;

      expect(parsed.content.length).toBe(3);
      expect(parsed.content[0].content[0].text).toBe('Para one.');
      expect(parsed.content[1].content[0].text).toBe('Para two.');
      expect(parsed.content[2].content[0].text).toBe('Para three.');
    });
  });

  describe('convertMarkdown (via importFile)', () => {
    it('should convert markdown headings to tiptap headings', async () => {
      const md = '## Section Title\n\nSome content here.';
      const file = makeFile(md, 'test.md');
      const result = await service.importFile(file);
      const parsed = JSON.parse(result.body) as TiptapTestDoc;

      const heading = parsed.content.find((n) => n.type === 'heading');
      expect(heading).toBeDefined();
      expect(heading.attrs.level).toBe(2);
    });

    it('should clamp h1 to h2', async () => {
      const md = '# Top Level\n\nSome content.';
      const file = makeFile(md, 'test.md');
      const result = await service.importFile(file);
      const parsed = JSON.parse(result.body) as TiptapTestDoc;

      const heading = parsed.content.find((n) => n.type === 'heading');
      expect(heading).toBeDefined();
      expect(heading.attrs.level).toBe(2);
    });

    it('should convert bold and italic marks', async () => {
      const md = 'This has **bold** and *italic* text.\n';
      const file = makeFile(md, 'test.md');
      const result = await service.importFile(file);
      const parsed = JSON.parse(result.body) as TiptapTestDoc;

      const paragraph = parsed.content.find((n) => n.type === 'paragraph');
      expect(paragraph).toBeDefined();

      const boldNode = paragraph.content.find((n) => n.marks?.some((m) => m.type === 'bold'));
      expect(boldNode).toBeDefined();

      const italicNode = paragraph.content.find((n) => n.marks?.some((m) => m.type === 'italic'));
      expect(italicNode).toBeDefined();
    });

    it('should convert bullet lists', async () => {
      const md = 'Some intro text.\n\n- Item 1\n- Item 2\n- Item 3\n';
      const file = makeFile(md, 'test.md');
      const result = await service.importFile(file);
      const parsed = JSON.parse(result.body) as TiptapTestDoc;

      const bulletList = parsed.content.find((n) => n.type === 'bulletList');
      expect(bulletList).toBeDefined();
      expect(bulletList.content.length).toBe(3);
      expect(bulletList.content[0].type).toBe('listItem');
    });

    it('should convert code blocks', async () => {
      const md = 'Some text.\n\n```\nconst x = 1;\n```\n';
      const file = makeFile(md, 'test.md');
      const result = await service.importFile(file);
      const parsed = JSON.parse(result.body) as TiptapTestDoc;

      const codeBlock = parsed.content.find((n) => n.type === 'codeBlock');
      expect(codeBlock).toBeDefined();
    });

    it('should convert blockquotes', async () => {
      const md = '> This is a quote\n\nNormal text.';
      const file = makeFile(md, 'test.md');
      const result = await service.importFile(file);
      const parsed = JSON.parse(result.body) as TiptapTestDoc;

      const blockquote = parsed.content.find((n) => n.type === 'blockquote');
      expect(blockquote).toBeDefined();
    });
  });

  describe('generateMetadata fallback', () => {
    it('should use fallback when AI fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API unavailable'));

      const file = makeFile(
        'First line of the document.\n\nSecond paragraph with more content.',
        'test.txt',
      );
      const result = await service.importFile(file);

      expect(result).toBeDefined();
      expect(result.title).toBeTruthy();
      expect(result.abstract).toBeTruthy();
      expect(result.body).toContain('"type":"doc"');
    });

    it('should truncate fallback title to 200 chars', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API unavailable'));

      const longLine = 'A'.repeat(300);
      const file = makeFile(longLine, 'test.txt');
      const result = await service.importFile(file);

      expect(result.title.length).toBeLessThanOrEqual(200);
    });

    it('should truncate fallback abstract to 300 chars', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API unavailable'));

      const longText = 'B'.repeat(500);
      const file = makeFile(longText, 'test.txt');
      const result = await service.importFile(file);

      expect(result.abstract.length).toBeLessThanOrEqual(300);
    });
  });
});
