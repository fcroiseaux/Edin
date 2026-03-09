import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { subject } from '@casl/ability';
import { CaslAbilityFactory } from './ability.factory.js';
import { Action } from './action.enum.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';

describe('CaslAbilityFactory', () => {
  let factory: CaslAbilityFactory;

  const makeUser = (role: string, id = 'user-uuid-1'): CurrentUserPayload => ({
    id,
    githubId: 12345,
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
    role,
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CaslAbilityFactory],
    }).compile();

    factory = module.get(CaslAbilityFactory);
  });

  describe('PUBLIC role', () => {
    it('can read public showcase', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Read, 'PublicShowcase')).toBe(true);
    });

    it('can read contributor roster', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Read, 'ContributorRoster')).toBe(true);
    });

    it('can read domain manifestos', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Read, 'DomainManifesto')).toBe(true);
    });

    it('can read public metrics', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Read, 'PublicMetrics')).toBe(true);
    });

    it('can read published articles', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Read, 'Article')).toBe(true);
    });

    it('cannot create articles', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Create, 'Article')).toBe(false);
    });

    it('cannot read contributors', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Read, 'Contributor')).toBe(false);
    });

    it('cannot read applications', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Read, 'Application')).toBe(false);
    });

    it('cannot manage anything', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Manage, 'all')).toBe(false);
    });

    it('cannot update contributor profiles', () => {
      const ability = factory.createForUser(makeUser('PUBLIC'));
      expect(ability.can(Action.Update, 'Contributor')).toBe(false);
    });
  });

  describe('APPLICANT role', () => {
    it('inherits public read access', () => {
      const ability = factory.createForUser(makeUser('APPLICANT'));
      expect(ability.can(Action.Read, 'PublicShowcase')).toBe(true);
      expect(ability.can(Action.Read, 'Article')).toBe(true);
    });

    it('can read applications', () => {
      const ability = factory.createForUser(makeUser('APPLICANT'));
      expect(ability.can(Action.Read, 'Application')).toBe(true);
    });

    it('can create applications', () => {
      const ability = factory.createForUser(makeUser('APPLICANT'));
      expect(ability.can(Action.Create, 'Application')).toBe(true);
    });

    it('can read micro-tasks', () => {
      const ability = factory.createForUser(makeUser('APPLICANT'));
      expect(ability.can(Action.Read, 'MicroTask')).toBe(true);
    });

    it('can create micro-task submissions', () => {
      const ability = factory.createForUser(makeUser('APPLICANT'));
      expect(ability.can(Action.Create, 'MicroTask')).toBe(true);
    });

    it('cannot read contributor profiles', () => {
      const ability = factory.createForUser(makeUser('APPLICANT'));
      expect(ability.can(Action.Read, 'Contributor')).toBe(false);
    });

    it('cannot create articles', () => {
      const ability = factory.createForUser(makeUser('APPLICANT'));
      expect(ability.can(Action.Create, 'Article')).toBe(false);
    });

    it('cannot read evaluations', () => {
      const ability = factory.createForUser(makeUser('APPLICANT'));
      expect(ability.can(Action.Read, 'Evaluation')).toBe(false);
    });

    it('cannot manage working groups', () => {
      const ability = factory.createForUser(makeUser('APPLICANT'));
      expect(ability.can(Action.Manage, 'WorkingGroup')).toBe(false);
    });
  });

  describe('CONTRIBUTOR role', () => {
    it('inherits applicant permissions', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Read, 'Application')).toBe(true);
      expect(ability.can(Action.Create, 'Application')).toBe(true);
      expect(ability.can(Action.Read, 'MicroTask')).toBe(true);
    });

    it('can read contributor profiles', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Read, 'Contributor')).toBe(true);
    });

    it('can update own profile', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(ability.can(Action.Update, subject('Contributor', { id: 'own-id' }) as never)).toBe(
        true,
      );
    });

    it('cannot update other profile', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(ability.can(Action.Update, subject('Contributor', { id: 'other-id' }) as never)).toBe(
        false,
      );
    });

    it('can read evaluations', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Read, 'Evaluation')).toBe(true);
    });

    it('can read own PeerFeedback', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(
        ability.can(Action.Read, subject('PeerFeedback', { reviewerId: 'own-id' }) as never),
      ).toBe(true);
    });

    it('cannot read other contributor PeerFeedback', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(
        ability.can(Action.Read, subject('PeerFeedback', { reviewerId: 'other-id' }) as never),
      ).toBe(false);
    });

    it('can read and join working groups', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Read, 'WorkingGroup')).toBe(true);
      expect(ability.can(Action.Create, 'WorkingGroup')).toBe(true);
    });

    it('can read and claim tasks', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Read, 'Task')).toBe(true);
      expect(ability.can(Action.Update, 'Task')).toBe(true);
    });

    it('can create articles', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Create, 'Article')).toBe(true);
    });

    it('cannot update articles (not editor)', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Update, 'Article')).toBe(false);
    });

    it('cannot manage all', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Manage, 'all')).toBe(false);
    });

    it('cannot delete tasks', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Delete, 'Task')).toBe(false);
    });

    it('cannot access health metrics', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR'));
      expect(ability.can(Action.Read, 'HealthMetrics')).toBe(false);
    });

    it('can read own notifications', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(
        ability.can(Action.Read, subject('Notification', { contributorId: 'own-id' }) as never),
      ).toBe(true);
    });

    it('can update own notifications', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(
        ability.can(Action.Update, subject('Notification', { contributorId: 'own-id' }) as never),
      ).toBe(true);
    });

    it('cannot read other user notifications', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(
        ability.can(Action.Read, subject('Notification', { contributorId: 'other-id' }) as never),
      ).toBe(false);
    });

    it('cannot update other user notifications', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(
        ability.can(Action.Update, subject('Notification', { contributorId: 'other-id' }) as never),
      ).toBe(false);
    });

    it('can update own PeerFeedback (where reviewerId matches)', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(
        ability.can(Action.Update, subject('PeerFeedback', { reviewerId: 'own-id' }) as never),
      ).toBe(true);
    });

    it('cannot update other contributor PeerFeedback', () => {
      const ability = factory.createForUser(makeUser('CONTRIBUTOR', 'own-id'));
      expect(
        ability.can(Action.Update, subject('PeerFeedback', { reviewerId: 'other-id' }) as never),
      ).toBe(false);
    });
  });

  describe('EDITOR role', () => {
    it('inherits contributor permissions', () => {
      const ability = factory.createForUser(makeUser('EDITOR'));
      expect(ability.can(Action.Read, 'Contributor')).toBe(true);
      expect(ability.can(Action.Read, 'Evaluation')).toBe(true);
      expect(ability.can(Action.Create, 'Article')).toBe(true);
    });

    it('can update articles', () => {
      const ability = factory.createForUser(makeUser('EDITOR'));
      expect(ability.can(Action.Update, 'Article')).toBe(true);
    });

    it('can read editorial feedback', () => {
      const ability = factory.createForUser(makeUser('EDITOR'));
      expect(ability.can(Action.Read, 'EditorialFeedback')).toBe(true);
    });

    it('can create editorial feedback', () => {
      const ability = factory.createForUser(makeUser('EDITOR'));
      expect(ability.can(Action.Create, 'EditorialFeedback')).toBe(true);
    });

    it('cannot manage all', () => {
      const ability = factory.createForUser(makeUser('EDITOR'));
      expect(ability.can(Action.Manage, 'all')).toBe(false);
    });

    it('cannot delete articles', () => {
      const ability = factory.createForUser(makeUser('EDITOR'));
      expect(ability.can(Action.Delete, 'Article')).toBe(false);
    });

    it('cannot manage working groups', () => {
      const ability = factory.createForUser(makeUser('EDITOR'));
      expect(ability.can(Action.Manage, 'WorkingGroup')).toBe(false);
    });
  });

  describe('FOUNDING_CONTRIBUTOR role', () => {
    it('has same permissions as CONTRIBUTOR', () => {
      const ability = factory.createForUser(makeUser('FOUNDING_CONTRIBUTOR'));
      expect(ability.can(Action.Read, 'Contributor')).toBe(true);
      expect(ability.can(Action.Read, 'Evaluation')).toBe(true);
      expect(ability.can(Action.Create, 'Article')).toBe(true);
      expect(ability.can(Action.Read, 'WorkingGroup')).toBe(true);
      expect(ability.can(Action.Read, 'Task')).toBe(true);
    });

    it('can update own profile', () => {
      const ability = factory.createForUser(makeUser('FOUNDING_CONTRIBUTOR', 'founder-id'));
      expect(
        ability.can(Action.Update, subject('Contributor', { id: 'founder-id' }) as never),
      ).toBe(true);
    });

    it('cannot update articles (not editor)', () => {
      const ability = factory.createForUser(makeUser('FOUNDING_CONTRIBUTOR'));
      expect(ability.can(Action.Update, 'Article')).toBe(false);
    });

    it('cannot manage all', () => {
      const ability = factory.createForUser(makeUser('FOUNDING_CONTRIBUTOR'));
      expect(ability.can(Action.Manage, 'all')).toBe(false);
    });

    it('cannot delete tasks', () => {
      const ability = factory.createForUser(makeUser('FOUNDING_CONTRIBUTOR'));
      expect(ability.can(Action.Delete, 'Task')).toBe(false);
    });
  });

  describe('WORKING_GROUP_LEAD role', () => {
    it('inherits contributor permissions', () => {
      const ability = factory.createForUser(makeUser('WORKING_GROUP_LEAD'));
      expect(ability.can(Action.Read, 'Contributor')).toBe(true);
      expect(ability.can(Action.Create, 'Article')).toBe(true);
      expect(ability.can(Action.Read, 'Evaluation')).toBe(true);
    });

    it('can manage working groups', () => {
      const ability = factory.createForUser(makeUser('WORKING_GROUP_LEAD'));
      expect(ability.can(Action.Manage, 'WorkingGroup')).toBe(true);
    });

    it('can create tasks', () => {
      const ability = factory.createForUser(makeUser('WORKING_GROUP_LEAD'));
      expect(ability.can(Action.Create, 'Task')).toBe(true);
    });

    it('can delete tasks', () => {
      const ability = factory.createForUser(makeUser('WORKING_GROUP_LEAD'));
      expect(ability.can(Action.Delete, 'Task')).toBe(true);
    });

    it('cannot manage all', () => {
      const ability = factory.createForUser(makeUser('WORKING_GROUP_LEAD'));
      expect(ability.can(Action.Manage, 'all')).toBe(false);
    });

    it('cannot access health metrics', () => {
      const ability = factory.createForUser(makeUser('WORKING_GROUP_LEAD'));
      expect(ability.can(Action.Read, 'HealthMetrics')).toBe(false);
    });

    it('cannot update articles (not editor)', () => {
      const ability = factory.createForUser(makeUser('WORKING_GROUP_LEAD'));
      expect(ability.can(Action.Update, 'Article')).toBe(false);
    });
  });

  describe('ADMIN role', () => {
    it('can manage all', () => {
      const ability = factory.createForUser(makeUser('ADMIN'));
      expect(ability.can(Action.Manage, 'all')).toBe(true);
    });

    it('can read any subject', () => {
      const ability = factory.createForUser(makeUser('ADMIN'));
      expect(ability.can(Action.Read, 'Contributor')).toBe(true);
      expect(ability.can(Action.Read, 'HealthMetrics')).toBe(true);
      expect(ability.can(Action.Read, 'PlatformSettings')).toBe(true);
      expect(ability.can(Action.Read, 'AuditLog')).toBe(true);
    });

    it('can update any subject', () => {
      const ability = factory.createForUser(makeUser('ADMIN'));
      expect(ability.can(Action.Update, 'Contributor')).toBe(true);
      expect(ability.can(Action.Update, 'PlatformSettings')).toBe(true);
    });

    it('can delete any subject', () => {
      const ability = factory.createForUser(makeUser('ADMIN'));
      expect(ability.can(Action.Delete, 'Contributor')).toBe(true);
      expect(ability.can(Action.Delete, 'Article')).toBe(true);
    });

    it('can create any subject', () => {
      const ability = factory.createForUser(makeUser('ADMIN'));
      expect(ability.can(Action.Create, 'Article')).toBe(true);
      expect(ability.can(Action.Create, 'WorkingGroup')).toBe(true);
    });

    it('can manage health metrics', () => {
      const ability = factory.createForUser(makeUser('ADMIN'));
      expect(ability.can(Action.Manage, 'HealthMetrics')).toBe(true);
    });

    it('can manage PeerFeedback', () => {
      const ability = factory.createForUser(makeUser('ADMIN'));
      expect(ability.can(Action.Manage, 'PeerFeedback')).toBe(true);
    });
  });

  describe('unknown role defaults to PUBLIC', () => {
    it('only has public permissions', () => {
      const ability = factory.createForUser(makeUser('UNKNOWN_ROLE'));
      expect(ability.can(Action.Read, 'PublicShowcase')).toBe(true);
      expect(ability.can(Action.Read, 'Contributor')).toBe(false);
      expect(ability.can(Action.Manage, 'all')).toBe(false);
    });
  });
});
