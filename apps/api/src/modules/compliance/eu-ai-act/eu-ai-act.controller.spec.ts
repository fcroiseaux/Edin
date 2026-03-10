import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EuAiActController } from './eu-ai-act.controller.js';
import { EuAiActService } from './eu-ai-act.service.js';
import { CaslAbilityFactory } from '../../auth/casl/ability.factory.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';

const adminUser: CurrentUserPayload = {
  id: 'admin-1',
  githubId: 12345,
  name: 'Admin User',
  email: 'admin@test.com',
  avatarUrl: null,
  role: 'ADMIN',
};

const mockEuAiActService = {
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  generateDocument: vi.fn(),
  reviewDocument: vi.fn(),
};

describe('EuAiActController', () => {
  let controller: EuAiActController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [EuAiActController],
      providers: [
        { provide: EuAiActService, useValue: mockEuAiActService },
        { provide: CaslAbilityFactory, useValue: {} },
      ],
    }).compile();

    controller = module.get(EuAiActController);
  });

  it('GET / calls listDocuments', async () => {
    const mockResult = {
      items: [{ id: 'doc-1', documentType: 'MODEL_CARD', version: 1 }],
      nextCursor: null,
    };
    mockEuAiActService.listDocuments.mockResolvedValue(mockResult);

    const result = await controller.listDocuments(undefined, '20');

    expect(mockEuAiActService.listDocuments).toHaveBeenCalledWith(undefined, 20);
    expect(result.data).toEqual(mockResult.items);
  });

  it('GET /:docId calls getDocument', async () => {
    const mockDoc = {
      id: 'doc-1',
      documentType: 'MODEL_CARD',
      version: 1,
      content: { models: [] },
    };
    mockEuAiActService.getDocument.mockResolvedValue(mockDoc);

    const result = await controller.getDocument('doc-1');

    expect(mockEuAiActService.getDocument).toHaveBeenCalledWith('doc-1');
    expect(result.data).toEqual(mockDoc);
  });

  it('POST /generate calls generateDocument', async () => {
    const mockDoc = {
      id: 'doc-new',
      documentType: 'EVALUATION_CRITERIA',
      version: 1,
      content: {},
    };
    mockEuAiActService.generateDocument.mockResolvedValue(mockDoc);

    const result = await controller.generateDocument(
      { documentType: 'EVALUATION_CRITERIA' },
      adminUser,
    );

    expect(mockEuAiActService.generateDocument).toHaveBeenCalledWith(
      'EVALUATION_CRITERIA',
      expect.any(String),
    );
    expect(result.data).toEqual(mockDoc);
  });

  it('POST /:docId/review calls reviewDocument', async () => {
    const mockDoc = {
      id: 'doc-1',
      documentType: 'MODEL_CARD',
      version: 1,
      legalReviewedBy: 'admin-1',
      reviewNotes: 'Approved',
    };
    mockEuAiActService.reviewDocument.mockResolvedValue(mockDoc);

    const result = await controller.reviewDocument('doc-1', { reviewNotes: 'Approved' }, adminUser);

    expect(mockEuAiActService.reviewDocument).toHaveBeenCalledWith(
      'doc-1',
      'admin-1',
      'Approved',
      expect.any(String),
    );
    expect(result.data).toEqual(mockDoc);
  });
});
