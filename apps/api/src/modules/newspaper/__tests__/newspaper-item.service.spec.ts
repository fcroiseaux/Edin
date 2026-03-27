import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewspaperItemService } from '../newspaper-item.service.js';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockEvent(
  overrides: Partial<{
    id: string;
    eventType: string;
    domain: string;
    contributorId: string;
    createdAt: Date;
    metadata: Record<string, unknown> | null;
    title: string;
    description: string | null;
  }> = {},
) {
  return {
    id: overrides.id ?? 'evt-1',
    eventType: overrides.eventType ?? 'PRIZE_AWARDED',
    title: overrides.title ?? 'Test event',
    description: overrides.description ?? null,
    contributorId: overrides.contributorId ?? 'contrib-1',
    domain: overrides.domain ?? 'Technology',
    contributionType: null,
    entityId: 'entity-1',
    metadata: overrides.metadata ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-03-25T12:00:00Z'),
  };
}

function createMockPrisma() {
  return {
    channel: {
      findMany: vi.fn().mockResolvedValue([
        { id: 'ch-tech', name: 'Technology' },
        { id: 'ch-fin', name: 'Finance' },
      ]),
      findFirst: vi.fn().mockResolvedValue({ id: 'ch-cross' }),
    },
    newspaperEdition: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    newspaperItem: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
}

function createMockChathamHouseService() {
  return {
    generateLabelsForBatch: vi
      .fn()
      .mockResolvedValue(new Map([['contrib-1', 'a technology expert']])),
    generateLabel: vi.fn().mockResolvedValue('a technology expert'),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NewspaperItemService', () => {
  let service: NewspaperItemService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let chathamHouseService: ReturnType<typeof createMockChathamHouseService>;

  beforeEach(() => {
    prisma = createMockPrisma();
    chathamHouseService = createMockChathamHouseService();
    service = new NewspaperItemService(prisma as never, chathamHouseService as never);
  });

  describe('generateItemsForEdition', () => {
    it('creates items from activity events with correct field mapping', async () => {
      const events = [
        createMockEvent({
          id: 'evt-1',
          eventType: 'PRIZE_AWARDED',
          metadata: { significanceLevel: 2, chathamHouseLabel: 'a technology expert' },
        }),
        createMockEvent({
          id: 'evt-2',
          eventType: 'PEER_NOMINATION_RECEIVED',
          metadata: { prizeCategoryName: 'Community Recognition' },
          createdAt: new Date('2026-03-25T13:00:00Z'),
        }),
      ];

      await service.generateItemsForEdition('edition-1', events as never[]);

      expect(chathamHouseService.generateLabelsForBatch).toHaveBeenCalledWith([
        'contrib-1',
        'contrib-1',
      ]);
      expect(prisma.newspaperItem.createMany).toHaveBeenCalledTimes(1);
      const callArgs = prisma.newspaperItem.createMany.mock.calls[0][0];
      expect(callArgs.data).toHaveLength(2);

      // First item should be PRIZE_AWARDED (higher significance)
      expect(callArgs.data[0].sourceEventType).toBe('PRIZE_AWARDED');
      expect(callArgs.data[0].significanceScore).toBe(4); // level 2 + 2 = 4
      expect(callArgs.data[0].algorithmicRank).toBe(1);
      expect(callArgs.data[0].chathamHouseLabel).toBe('a technology expert');

      // Second item should be PEER_NOMINATION_RECEIVED (lower significance)
      expect(callArgs.data[1].sourceEventType).toBe('PEER_NOMINATION_RECEIVED');
      expect(callArgs.data[1].significanceScore).toBe(2);
      expect(callArgs.data[1].algorithmicRank).toBe(2);
    });

    it('skips items with no channel resolved', async () => {
      prisma.channel.findMany.mockResolvedValue([]); // No channels
      prisma.channel.findFirst.mockResolvedValue(null); // No cross-domain channel

      const events = [createMockEvent({ domain: 'Unknown' })];

      await service.generateItemsForEdition('edition-1', events as never[]);

      // Should not call createMany if all items were filtered out
      expect(prisma.newspaperItem.createMany).not.toHaveBeenCalled();
    });

    it('does nothing for empty events list', async () => {
      await service.generateItemsForEdition('edition-1', []);
      expect(prisma.newspaperItem.createMany).not.toHaveBeenCalled();
    });
  });

  describe('mapSourceEventType', () => {
    it('maps ActivityEventType to NewspaperItemSourceType', () => {
      expect(service.mapSourceEventType('PRIZE_AWARDED')).toBe('PRIZE_AWARDED');
      expect(service.mapSourceEventType('TRACK_RECORD_MILESTONE_CROSSED')).toBe(
        'TRACK_RECORD_MILESTONE',
      );
      expect(service.mapSourceEventType('PEER_NOMINATION_RECEIVED')).toBe(
        'PEER_NOMINATION_RECEIVED',
      );
      expect(service.mapSourceEventType('CROSS_DOMAIN_COLLABORATION_DETECTED')).toBe(
        'CROSS_DOMAIN_COLLABORATION',
      );
      expect(service.mapSourceEventType('HIGH_SIGNIFICANCE_CONTRIBUTION')).toBe(
        'CONTRIBUTION_EVALUATED',
      );
    });

    it('returns CUSTOM for unknown event types', () => {
      expect(service.mapSourceEventType('SOMETHING_ELSE')).toBe('CUSTOM');
    });
  });

  describe('deriveSignificanceScore', () => {
    it('returns discrete integer 1-5 for all mapped event types', () => {
      const testCases = [
        { eventType: 'PRIZE_AWARDED', metadata: { significanceLevel: 1 }, expected: 3 },
        { eventType: 'PRIZE_AWARDED', metadata: { significanceLevel: 2 }, expected: 4 },
        { eventType: 'PRIZE_AWARDED', metadata: { significanceLevel: 3 }, expected: 5 },
        { eventType: 'HIGH_SIGNIFICANCE_CONTRIBUTION', metadata: null, expected: 4 },
        { eventType: 'CROSS_DOMAIN_COLLABORATION_DETECTED', metadata: null, expected: 3 },
        { eventType: 'TRACK_RECORD_MILESTONE_CROSSED', metadata: null, expected: 3 },
        { eventType: 'PEER_NOMINATION_RECEIVED', metadata: null, expected: 2 },
      ];

      for (const { eventType, metadata, expected } of testCases) {
        const event = createMockEvent({ eventType, metadata });
        const score = service.deriveSignificanceScore(event as never);
        expect(score).toBe(expected);
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('generateHeadline', () => {
    it('generates cross-domain headline for cross-domain prizes', () => {
      const event = createMockEvent({
        eventType: 'PRIZE_AWARDED',
        metadata: { prizeCategoryName: 'Cross-Domain Collaboration' },
      });
      expect(service.generateHeadline(event as never)).toBe(
        'Cross-domain collaboration recognized',
      );
    });

    it('generates breakthrough headline with domain', () => {
      const event = createMockEvent({
        eventType: 'PRIZE_AWARDED',
        metadata: { prizeCategoryName: 'Breakthrough', domain: 'Finance' },
      });
      expect(service.generateHeadline(event as never)).toContain('Breakthrough');
      expect(service.generateHeadline(event as never)).toContain('Finance');
    });

    it('generates milestone headline with threshold name', () => {
      const event = createMockEvent({
        eventType: 'TRACK_RECORD_MILESTONE_CROSSED',
        metadata: { thresholdName: '6-month consistent contributor' },
      });
      expect(service.generateHeadline(event as never)).toBe(
        '6-month consistent contributor achieved',
      );
    });

    it('generates nomination headline', () => {
      const event = createMockEvent({
        eventType: 'PEER_NOMINATION_RECEIVED',
        metadata: { prizeCategoryName: 'Community Recognition' },
      });
      expect(service.generateHeadline(event as never)).toBe(
        'Community nomination for Community Recognition',
      );
    });

    it('generates collaboration headline with domain names', () => {
      const event = createMockEvent({
        eventType: 'CROSS_DOMAIN_COLLABORATION_DETECTED',
        metadata: { domains: ['Technology', 'Finance'] },
      });
      expect(service.generateHeadline(event as never)).toBe(
        'Collaboration bridges Technology and Finance',
      );
    });

    it('generates high-impact headline with domain', () => {
      const event = createMockEvent({
        eventType: 'HIGH_SIGNIFICANCE_CONTRIBUTION',
        domain: 'Impact',
      });
      expect(service.generateHeadline(event as never)).toBe('High-impact contribution in Impact');
    });
  });

  describe('extractChathamHouseLabel', () => {
    it('extracts label from metadata', () => {
      expect(service.extractChathamHouseLabel({ chathamHouseLabel: 'a technology expert' })).toBe(
        'a technology expert',
      );
    });

    it('returns default for missing metadata', () => {
      expect(service.extractChathamHouseLabel(null)).toBe('a community contributor');
    });

    it('returns default for non-string chathamHouseLabel', () => {
      expect(service.extractChathamHouseLabel({ chathamHouseLabel: 123 })).toBe(
        'a community contributor',
      );
    });
  });

  describe('ranking', () => {
    it('ranks items by significance DESC, then timestamp ASC', async () => {
      const events = [
        createMockEvent({
          id: 'evt-1',
          eventType: 'PEER_NOMINATION_RECEIVED', // tier 2
          createdAt: new Date('2026-03-25T10:00:00Z'),
        }),
        createMockEvent({
          id: 'evt-2',
          eventType: 'PRIZE_AWARDED', // tier 3 (default level 1)
          metadata: { significanceLevel: 1 },
          createdAt: new Date('2026-03-25T14:00:00Z'),
        }),
        createMockEvent({
          id: 'evt-3',
          eventType: 'HIGH_SIGNIFICANCE_CONTRIBUTION', // tier 4
          createdAt: new Date('2026-03-25T12:00:00Z'),
        }),
        createMockEvent({
          id: 'evt-4',
          eventType: 'PRIZE_AWARDED', // tier 3 (default level 1)
          metadata: { significanceLevel: 1 },
          createdAt: new Date('2026-03-25T11:00:00Z'),
        }),
      ];

      await service.generateItemsForEdition('edition-1', events as never[]);

      const callArgs = prisma.newspaperItem.createMany.mock.calls[0][0] as {
        data: { algorithmicRank: number; sourceEventId: string }[];
      };
      const ranks = callArgs.data.map((d: { algorithmicRank: number; sourceEventId: string }) => ({
        rank: d.algorithmicRank,
        eventId: d.sourceEventId,
      }));

      // HIGH_SIGNIFICANCE first (tier 4), then two PRIZE_AWARDED (tier 3, timestamp ASC), then PEER_NOMINATION (tier 2)
      expect(ranks[0].eventId).toBe('evt-3'); // tier 4
      expect(ranks[0].rank).toBe(1);
      expect(ranks[1].eventId).toBe('evt-4'); // tier 3, earlier timestamp
      expect(ranks[1].rank).toBe(2);
      expect(ranks[2].eventId).toBe('evt-2'); // tier 3, later timestamp
      expect(ranks[2].rank).toBe(3);
      expect(ranks[3].eventId).toBe('evt-1'); // tier 2
      expect(ranks[3].rank).toBe(4);
    });

    it('applies channel diversity bonus to boost underrepresented channels within same tier', async () => {
      // Setup: 3 Technology items + 1 Finance item, all same tier (3)
      // Finance item should get diversity boost and rank higher within same tier
      prisma.channel.findMany.mockResolvedValue([
        { id: 'ch-tech', name: 'Technology' },
        { id: 'ch-fin', name: 'Finance' },
      ]);

      const events = [
        createMockEvent({
          id: 'evt-1',
          eventType: 'PRIZE_AWARDED',
          domain: 'Technology',
          metadata: { significanceLevel: 1 }, // tier 3
          createdAt: new Date('2026-03-25T10:00:00Z'),
        }),
        createMockEvent({
          id: 'evt-2',
          eventType: 'PRIZE_AWARDED',
          domain: 'Technology',
          metadata: { significanceLevel: 1 }, // tier 3
          createdAt: new Date('2026-03-25T11:00:00Z'),
        }),
        createMockEvent({
          id: 'evt-3',
          eventType: 'PRIZE_AWARDED',
          domain: 'Finance',
          metadata: { significanceLevel: 1 }, // tier 3 — same tier but underrepresented channel
          createdAt: new Date('2026-03-25T12:00:00Z'),
        }),
        createMockEvent({
          id: 'evt-4',
          eventType: 'PRIZE_AWARDED',
          domain: 'Technology',
          metadata: { significanceLevel: 1 }, // tier 3
          createdAt: new Date('2026-03-25T13:00:00Z'),
        }),
      ];

      await service.generateItemsForEdition('edition-1', events as never[]);

      const callArgs = prisma.newspaperItem.createMany.mock.calls[0][0] as {
        data: { algorithmicRank: number; sourceEventId: string; channelId: string }[];
      };
      const ranked = callArgs.data.map(
        (d: { algorithmicRank: number; sourceEventId: string; channelId: string }) => ({
          rank: d.algorithmicRank,
          eventId: d.sourceEventId,
          channelId: d.channelId,
        }),
      );

      // Finance item (evt-3) should be ranked first due to diversity bonus
      // (1 Finance item vs 3 Technology items → Finance gets higher diversity bonus)
      expect(ranked[0].eventId).toBe('evt-3');
      expect(ranked[0].rank).toBe(1);
    });

    it('diversity bonus NEVER promotes items across significance tiers', async () => {
      // Tier 3 item (Technology, majority channel) vs Tier 2 item (Finance, minority channel)
      // Even with max diversity bonus (0.4), tier 2 + 0.4 = 2.4 < 3.0 = tier 3 + 0.0
      prisma.channel.findMany.mockResolvedValue([
        { id: 'ch-tech', name: 'Technology' },
        { id: 'ch-fin', name: 'Finance' },
      ]);

      const events = [
        createMockEvent({
          id: 'evt-tier3',
          eventType: 'PRIZE_AWARDED',
          domain: 'Technology',
          metadata: { significanceLevel: 1 }, // tier 3
          createdAt: new Date('2026-03-25T10:00:00Z'),
        }),
        createMockEvent({
          id: 'evt-tier3b',
          eventType: 'PRIZE_AWARDED',
          domain: 'Technology',
          metadata: { significanceLevel: 1 }, // tier 3
          createdAt: new Date('2026-03-25T11:00:00Z'),
        }),
        createMockEvent({
          id: 'evt-tier2',
          eventType: 'PEER_NOMINATION_RECEIVED', // tier 2
          domain: 'Finance',
          createdAt: new Date('2026-03-25T09:00:00Z'),
        }),
      ];

      await service.generateItemsForEdition('edition-1', events as never[]);

      const callArgs = prisma.newspaperItem.createMany.mock.calls[0][0] as {
        data: { algorithmicRank: number; sourceEventId: string; significanceScore: number }[];
      };
      const ranked: { rank: number; eventId: string; tier: number }[] = callArgs.data.map(
        (d: { algorithmicRank: number; sourceEventId: string; significanceScore: number }) => ({
          rank: d.algorithmicRank,
          eventId: d.sourceEventId,
          tier: d.significanceScore,
        }),
      );

      // Both tier 3 items must rank above the tier 2 item regardless of diversity bonus
      const tier3Items = ranked.filter((r) => r.tier === 3);
      const tier2Items = ranked.filter((r) => r.tier === 2);

      for (const t3 of tier3Items) {
        for (const t2 of tier2Items) {
          expect(t3.rank).toBeLessThan(t2.rank);
        }
      }
    });

    it('diversity bonus uses discrete steps (NP-NFR1)', async () => {
      // With 4 items on channel A and 1 on channel B:
      // A ratio = 1 - 4/4 = 0.0 → bonus = 0.0
      // B ratio = 1 - 1/4 = 0.75 → bonus = floor(0.75 * 4) / 10 = floor(3) / 10 = 0.3
      // Bonus values are discrete: 0.0, 0.1, 0.2, 0.3, or 0.4
      prisma.channel.findMany.mockResolvedValue([
        { id: 'ch-tech', name: 'Technology' },
        { id: 'ch-fin', name: 'Finance' },
      ]);

      const events = [
        // 4 Technology events, same tier
        ...Array.from({ length: 4 }, (_, i) =>
          createMockEvent({
            id: `evt-tech-${i}`,
            eventType: 'PRIZE_AWARDED',
            domain: 'Technology',
            metadata: { significanceLevel: 1 }, // tier 3
            createdAt: new Date(`2026-03-25T${10 + i}:00:00Z`),
          }),
        ),
        // 1 Finance event, same tier
        createMockEvent({
          id: 'evt-fin-0',
          eventType: 'PRIZE_AWARDED',
          domain: 'Finance',
          metadata: { significanceLevel: 1 }, // tier 3
          createdAt: new Date('2026-03-25T15:00:00Z'),
        }),
      ];

      await service.generateItemsForEdition('edition-1', events as never[]);

      const callArgs = prisma.newspaperItem.createMany.mock.calls[0][0] as {
        data: { algorithmicRank: number; sourceEventId: string }[];
      };
      const ranked = callArgs.data.map((d: { algorithmicRank: number; sourceEventId: string }) => ({
        rank: d.algorithmicRank,
        eventId: d.sourceEventId,
      }));

      // Finance event (evt-fin-0) should rank first due to diversity bonus (0.3)
      // making its composite score 3.3 vs Technology's 3.0
      expect(ranked[0].eventId).toBe('evt-fin-0');
      expect(ranked[0].rank).toBe(1);
    });
  });
});
