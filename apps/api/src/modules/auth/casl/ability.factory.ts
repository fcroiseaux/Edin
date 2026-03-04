import { Injectable, Logger } from '@nestjs/common';
import { AbilityBuilder } from '@casl/ability';
import { createPrismaAbility } from '@casl/prisma';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';
import { Action } from './action.enum.js';
import type { AppAbility } from './app-ability.type.js';

@Injectable()
export class CaslAbilityFactory {
  private readonly logger = new Logger(CaslAbilityFactory.name);

  createForUser(user: CurrentUserPayload): AppAbility {
    const builder = new AbilityBuilder<AppAbility>(createPrismaAbility);

    this.addPublicPermissions(builder);

    switch (user.role) {
      case 'ADMIN':
        this.addAdminPermissions(builder);
        break;
      case 'WORKING_GROUP_LEAD':
        this.addWorkingGroupLeadPermissions(builder, user);
        break;
      case 'FOUNDING_CONTRIBUTOR':
        this.addFoundingContributorPermissions(builder, user);
        break;
      case 'EDITOR':
        this.addEditorPermissions(builder, user);
        break;
      case 'CONTRIBUTOR':
        this.addContributorPermissions(builder, user);
        break;
      case 'APPLICANT':
        this.addApplicantPermissions(builder);
        break;
      case 'PUBLIC':
      default:
        // Public permissions already added
        break;
    }

    this.logger.debug('CASL ability created', {
      contributorId: user.id,
      role: user.role,
    });

    return builder.build();
  }

  private addPublicPermissions(builder: AbilityBuilder<AppAbility>): void {
    const { can } = builder;
    can(Action.Read, 'PublicShowcase');
    can(Action.Read, 'ContributorRoster');
    can(Action.Read, 'DomainManifesto');
    can(Action.Read, 'PublicMetrics');
    can(Action.Read, 'Article');
  }

  private addApplicantPermissions(builder: AbilityBuilder<AppAbility>): void {
    const { can } = builder;
    can(Action.Read, 'Application');
    can(Action.Create, 'Application');
    can(Action.Read, 'MicroTask');
    can(Action.Create, 'MicroTask');
  }

  private addContributorPermissions(
    builder: AbilityBuilder<AppAbility>,
    user: CurrentUserPayload,
  ): void {
    this.addApplicantPermissions(builder);

    const { can } = builder;
    can(Action.Read, 'Contributor');
    can(Action.Update, 'Contributor', { id: user.id });
    can(Action.Read, 'Evaluation');
    can(Action.Read, 'PeerFeedback');
    can(Action.Read, 'WorkingGroup');
    can(Action.Create, 'WorkingGroup');
    can(Action.Read, 'Task');
    can(Action.Update, 'Task');
    can(Action.Create, 'Article');
    can(Action.Create, 'ApplicationReview');
  }

  private addEditorPermissions(
    builder: AbilityBuilder<AppAbility>,
    user: CurrentUserPayload,
  ): void {
    this.addContributorPermissions(builder, user);

    const { can } = builder;
    can(Action.Update, 'Article');
    can(Action.Read, 'EditorialFeedback');
    can(Action.Create, 'EditorialFeedback');
  }

  private addFoundingContributorPermissions(
    builder: AbilityBuilder<AppAbility>,
    user: CurrentUserPayload,
  ): void {
    // FOUNDING_CONTRIBUTOR has same CASL abilities as CONTRIBUTOR.
    // Differentiated by business logic (governance weight, feature flags), not permissions.
    this.addContributorPermissions(builder, user);
  }

  private addWorkingGroupLeadPermissions(
    builder: AbilityBuilder<AppAbility>,
    user: CurrentUserPayload,
  ): void {
    this.addContributorPermissions(builder, user);

    const { can } = builder;
    can(Action.Manage, 'WorkingGroup');
    can(Action.Create, 'Task');
    can(Action.Delete, 'Task');
  }

  private addAdminPermissions(builder: AbilityBuilder<AppAbility>): void {
    const { can } = builder;
    can(Action.Manage, 'all');
  }
}
