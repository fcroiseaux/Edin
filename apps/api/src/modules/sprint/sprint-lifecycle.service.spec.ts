import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { SprintLifecycleService } from './sprint-lifecycle.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

const mockPrisma = {
  sprintMetric: {
    findMany: vi.fn(),
  },
  platformSetting: {
    upsert: vi.fn(),
  },
  contributor: {
    findFirst: vi.fn().mockResolvedValue({ id: 'admin-1' }),
  },
};

const mockSettingsService = {
  getSettingValue: vi.fn(),
  updateSetting: vi.fn().mockResolvedValue({}),
};

describe('SprintLifecycleService', () => {
  let service: SprintLifecycleService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        SprintLifecycleService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get(SprintLifecycleService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('detectSprintLifecycleEvents', () => {
    it('emits sprint.lifecycle.started when new active sprint detected', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000); // 1 day ago
      const sprintEnd = new Date(now.getTime() + 86400000 * 6); // 6 days from now

      mockSettingsService.getSettingValue.mockResolvedValue(null); // no known states
      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 42',
          sprintStart,
          sprintEnd,
          velocity: 0,
          committedPoints: 20,
          deliveredPoints: 0,
        },
      ]);
      mockPrisma.platformSetting.upsert.mockResolvedValue({});

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-1');

      expect(emitSpy).toHaveBeenCalledWith(
        'sprint.lifecycle.started',
        expect.objectContaining({
          eventType: 'sprint.lifecycle.started',
          payload: expect.objectContaining({
            sprintId: 'sprint-1',
            sprintName: 'Sprint 42',
            committedPoints: 20,
          }),
        }),
      );
    });

    it('emits sprint.lifecycle.completed when sprint end passes', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 14); // 14 days ago
      const sprintEnd = new Date(now.getTime() - 86400000); // ended 1 day ago

      // Sprint was previously known as active
      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [] },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 41',
          sprintStart,
          sprintEnd,
          velocity: 18,
          committedPoints: 20,
          deliveredPoints: 18,
        },
      ]);
      mockPrisma.platformSetting.upsert.mockResolvedValue({});

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-2');

      expect(emitSpy).toHaveBeenCalledWith(
        'sprint.lifecycle.completed',
        expect.objectContaining({
          eventType: 'sprint.lifecycle.completed',
          payload: expect.objectContaining({
            sprintId: 'sprint-1',
            sprintName: 'Sprint 41',
            velocity: 18,
            deliveredPoints: 18,
            committedPoints: 20,
          }),
        }),
      );
    });

    it('emits sprint.velocity.milestone at threshold crossings', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 5);
      const sprintEnd = new Date(now.getTime() + 86400000 * 9);

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [] },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 42',
          sprintStart,
          sprintEnd,
          velocity: 15,
          committedPoints: 20,
          deliveredPoints: 15, // 75%
        },
      ]);
      mockPrisma.platformSetting.upsert.mockResolvedValue({});

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-3');

      // Should emit 50% and 75% milestones
      const milestoneCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'sprint.velocity.milestone',
      );
      expect(milestoneCalls).toHaveLength(2);
      expect(milestoneCalls[0][1]).toEqual(
        expect.objectContaining({
          payload: expect.objectContaining({ milestonePercentage: 50 }),
        }),
      );
      expect(milestoneCalls[1][1]).toEqual(
        expect.objectContaining({
          payload: expect.objectContaining({ milestonePercentage: 75 }),
        }),
      );
    });

    it('does not re-emit for already-known sprint states', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000);
      const sprintEnd = new Date(now.getTime() + 86400000 * 13);

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [50] },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 42',
          sprintStart,
          sprintEnd,
          velocity: 12,
          committedPoints: 20,
          deliveredPoints: 12, // 60% — 50% already emitted
        },
      ]);

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-4');

      // Should not emit started (already active) or 50% milestone (already emitted)
      expect(emitSpy).not.toHaveBeenCalledWith('sprint.lifecycle.started', expect.anything());
      expect(emitSpy).not.toHaveBeenCalledWith('sprint.velocity.milestone', expect.anything());
    });

    it('does not emit completed for already-completed sprints', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 14);
      const sprintEnd = new Date(now.getTime() - 86400000);

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'completed', milestonesEmitted: [50, 75, 100] },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 41',
          sprintStart,
          sprintEnd,
          velocity: 20,
          committedPoints: 20,
          deliveredPoints: 20,
        },
      ]);

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-5');

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('sprint notification detection', () => {
    it('emits sprint.notification.deadline when sprint end approaches within threshold', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 12); // 12 days ago
      const sprintEnd = new Date(now.getTime() + 86400000 * 1); // 24h from now (within 48h threshold)

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [] },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 43',
          sprintStart,
          sprintEnd,
          velocity: 15,
          committedPoints: 20,
          deliveredPoints: 15,
        },
      ]);

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-deadline');

      const deadlineCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'sprint.notification.deadline',
      );
      expect(deadlineCalls).toHaveLength(1);
      expect(deadlineCalls[0][1]).toEqual(
        expect.objectContaining({
          eventType: 'sprint.notification.deadline',
          payload: expect.objectContaining({
            sprintId: 'sprint-1',
            sprintName: 'Sprint 43',
            committedPoints: 20,
            deliveredPoints: 15,
          }),
        }),
      );
    });

    it('does NOT emit deadline notification if already notified', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 12);
      const sprintEnd = new Date(now.getTime() + 86400000 * 1);

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [], deadlineNotified: true },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 43',
          sprintStart,
          sprintEnd,
          velocity: 15,
          committedPoints: 20,
          deliveredPoints: 15,
        },
      ]);

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-deadline-2');

      const deadlineCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'sprint.notification.deadline',
      );
      expect(deadlineCalls).toHaveLength(0);
    });

    it('emits sprint.notification.velocity_drop when velocity drops below threshold mid-sprint', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 10); // 10 days ago
      const sprintEnd = new Date(now.getTime() + 86400000 * 4); // 4 days from now (>50% elapsed)

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [] },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 43',
          sprintStart,
          sprintEnd,
          velocity: 5,
          committedPoints: 20,
          deliveredPoints: 5, // 25% — well below 70% threshold
        },
      ]);

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-velocity');

      const velocityCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'sprint.notification.velocity_drop',
      );
      expect(velocityCalls).toHaveLength(1);
      expect(velocityCalls[0][1]).toEqual(
        expect.objectContaining({
          eventType: 'sprint.notification.velocity_drop',
          payload: expect.objectContaining({
            sprintId: 'sprint-1',
            sprintName: 'Sprint 43',
            deliveryPercentage: 25,
          }),
        }),
      );
    });

    it('does NOT emit velocity drop if sprint is less than 50% elapsed', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 2); // 2 days ago
      const sprintEnd = new Date(now.getTime() + 86400000 * 12); // 12 days from now (<50% elapsed)

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [] },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 43',
          sprintStart,
          sprintEnd,
          velocity: 2,
          committedPoints: 20,
          deliveredPoints: 2, // 10% but <50% elapsed
        },
      ]);

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-early');

      const velocityCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'sprint.notification.velocity_drop',
      );
      expect(velocityCalls).toHaveLength(0);
    });

    it('does NOT re-emit velocity drop for already-notified sprint', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 10);
      const sprintEnd = new Date(now.getTime() + 86400000 * 4);

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [], velocityDropNotified: true },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 43',
          sprintStart,
          sprintEnd,
          velocity: 5,
          committedPoints: 20,
          deliveredPoints: 5,
        },
      ]);

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-no-reemit');

      const velocityCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'sprint.notification.velocity_drop',
      );
      expect(velocityCalls).toHaveLength(0);
    });

    it('loads configurable deadline threshold from PlatformSetting', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 12);
      // 30h remaining — within custom 36h threshold but outside default 48h would still trigger
      const sprintEnd = new Date(now.getTime() + 30 * 3600000);

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [] },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        if (key === 'sprint.deadline_notification_hours') return Promise.resolve(24); // 24h threshold
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 43',
          sprintStart,
          sprintEnd,
          velocity: 15,
          committedPoints: 20,
          deliveredPoints: 15,
        },
      ]);

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-custom-threshold');

      // 30h remaining > 24h threshold — should NOT trigger
      const deadlineCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'sprint.notification.deadline',
      );
      expect(deadlineCalls).toHaveLength(0);
    });

    it('loads configurable velocity drop threshold from PlatformSetting', async () => {
      const now = new Date();
      const sprintStart = new Date(now.getTime() - 86400000 * 10); // 10 days ago
      const sprintEnd = new Date(now.getTime() + 86400000 * 4); // 4 days from now (>50% elapsed)

      const knownStates = JSON.stringify({
        'sprint-1': { status: 'active', milestonesEmitted: [] },
      });
      mockSettingsService.getSettingValue.mockImplementation((key: string) => {
        if (key === 'sprint.known_states') return Promise.resolve(knownStates);
        if (key === 'sprint.velocity_drop_threshold') return Promise.resolve(0.2); // 20% custom threshold
        return Promise.resolve(null);
      });

      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          id: 'metric-1',
          sprintId: 'sprint-1',
          sprintName: 'Sprint 43',
          sprintStart,
          sprintEnd,
          velocity: 5,
          committedPoints: 20,
          deliveredPoints: 5, // 25% — above 20% custom threshold
        },
      ]);

      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      await service.detectSprintLifecycleEvents('corr-custom-velocity');

      // 25% delivery > 20% threshold — should NOT trigger velocity drop
      const velocityCalls = emitSpy.mock.calls.filter(
        (call) => call[0] === 'sprint.notification.velocity_drop',
      );
      expect(velocityCalls).toHaveLength(0);
    });
  });

  describe('handlePollCompleted', () => {
    it('calls detectSprintLifecycleEvents on poll completed', async () => {
      mockSettingsService.getSettingValue.mockResolvedValue(null);
      mockPrisma.sprintMetric.findMany.mockResolvedValue([]);

      const detectSpy = vi.spyOn(service, 'detectSprintLifecycleEvents');

      await service.handlePollCompleted({
        eventType: 'zenhub.poll.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-poll',
        payload: {
          syncId: 'sync-1',
          sprintCount: 2,
          issueCount: 10,
          durationMs: 500,
        },
      });

      expect(detectSpy).toHaveBeenCalledWith('corr-poll');
    });
  });
});
