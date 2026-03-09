import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES, createAnnouncementSchema } from '@edin/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { WorkingGroupService } from './working-group.service.js';

@Controller({ path: 'working-groups', version: '1' })
export class WorkingGroupController {
  private readonly logger = new Logger(WorkingGroupController.name);

  constructor(private readonly workingGroupService: WorkingGroupService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'WorkingGroup'))
  async findAll(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const groups = await this.workingGroupService.findAll(user.id);

    return createSuccessResponse(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        domain: g.domain,
        accentColor: g.accentColor,
        memberCount: g.memberCount,
        isMember: g.isMember,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
      req.correlationId || 'unknown',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'WorkingGroup'))
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const group = await this.workingGroupService.findById(id, user.id);

    const [contributions, activeTasks] = await Promise.all([
      this.workingGroupService.getGroupContributions(id),
      this.workingGroupService.getActiveTasksForDomain(group.domain),
    ]);

    return createSuccessResponse(
      {
        id: group.id,
        name: group.name,
        description: group.description,
        domain: group.domain,
        accentColor: group.accentColor,
        memberCount: group.memberCount,
        leadContributor: group.leadContributor ?? null,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
        isMember: group.isMember,
        members: group.members.map((m) => ({
          id: m.id,
          workingGroupId: m.workingGroupId,
          contributorId: m.contributorId,
          joinedAt: m.joinedAt.toISOString(),
          recentContributionCount: m.recentContributionCount ?? 0,
          contributor: m.contributor,
        })),
        announcements: group.announcements.map((a) => ({
          id: a.id,
          workingGroupId: a.workingGroupId,
          authorId: a.authorId,
          content: a.content,
          createdAt: a.createdAt.toISOString(),
          author: a.author,
        })),
        recentContributions: contributions.map((c) => ({
          id: c.id,
          title: c.title,
          contributionType: c.contributionType,
          createdAt: c.createdAt.toISOString(),
          contributor: c.contributor,
          repository: c.repository,
        })),
        activeTasks,
      },
      req.correlationId || 'unknown',
    );
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'WorkingGroup'))
  async joinGroup(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const member = await this.workingGroupService.joinGroup(id, user.id, req.correlationId);

    this.logger.log('Contributor joined working group', {
      workingGroupId: id,
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'working-group',
    });

    return createSuccessResponse(
      {
        id: member.id,
        workingGroupId: member.workingGroupId,
        contributorId: member.contributorId,
        joinedAt: member.joinedAt.toISOString(),
      },
      req.correlationId || 'unknown',
    );
  }

  @Delete(':id/members')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Delete, 'WorkingGroup'))
  async leaveGroup(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    await this.workingGroupService.leaveGroup(id, user.id, req.correlationId);

    this.logger.log('Contributor left working group', {
      workingGroupId: id,
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'working-group',
    });

    return createSuccessResponse(
      { message: 'Successfully left the working group' },
      req.correlationId || 'unknown',
    );
  }

  @Post(':id/announcements')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'WorkingGroup'))
  async createAnnouncement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    await this.workingGroupService.assertLeadAccess(id, user.id, user.role);

    const parsed = createAnnouncementSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid announcement data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    this.logger.log('Creating announcement', {
      workingGroupId: id,
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'working-group',
    });

    const announcement = await this.workingGroupService.createAnnouncement(
      id,
      user.id,
      parsed.data.content,
      req.correlationId,
    );

    return createSuccessResponse(
      {
        id: announcement.id,
        workingGroupId: announcement.workingGroupId,
        authorId: announcement.authorId,
        content: announcement.content,
        createdAt: announcement.createdAt.toISOString(),
        author: announcement.author,
      },
      req.correlationId || 'unknown',
    );
  }

  @Get(':id/announcements')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'WorkingGroup'))
  async getAnnouncements(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('limit') limitStr: string | undefined,
    @Req() req: Request,
  ) {
    const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 5, 20) : 5;

    const announcements = await this.workingGroupService.getAnnouncements(id, limit);

    return createSuccessResponse(
      announcements.map((a) => ({
        id: a.id,
        workingGroupId: a.workingGroupId,
        authorId: a.authorId,
        content: a.content,
        createdAt: a.createdAt.toISOString(),
        author: a.author,
      })),
      req.correlationId || 'unknown',
    );
  }

  @Delete(':id/announcements/:announcementId')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'WorkingGroup'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnnouncement(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('announcementId', new ParseUUIDPipe()) announcementId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    await this.workingGroupService.assertLeadAccess(id, user.id, user.role);

    this.logger.log('Deleting announcement', {
      announcementId,
      contributorId: user.id,
      correlationId: req.correlationId,
      module: 'working-group',
    });

    await this.workingGroupService.deleteAnnouncement(
      id,
      announcementId,
      user.id,
      req.correlationId,
    );
  }

  @Get(':id/dashboard')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'WorkingGroup'))
  async getLeadDashboard(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    await this.workingGroupService.assertLeadAccess(id, user.id, user.role);

    const dashboard = await this.workingGroupService.getLeadDashboard(id, req.correlationId);

    return createSuccessResponse(
      {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        domain: dashboard.domain,
        accentColor: dashboard.accentColor,
        memberCount: dashboard.memberCount,
        leadContributor: dashboard.leadContributor ?? null,
        createdAt: dashboard.createdAt.toISOString(),
        updatedAt: dashboard.updatedAt.toISOString(),
        members: dashboard.members.map((m) => ({
          id: m.id,
          workingGroupId: m.workingGroupId,
          contributorId: m.contributorId,
          joinedAt: m.joinedAt.toISOString(),
          recentContributionCount: m.recentContributionCount ?? 0,
          contributor: m.contributor,
        })),
        announcements: dashboard.announcements.map((a) => ({
          id: a.id,
          workingGroupId: a.workingGroupId,
          authorId: a.authorId,
          content: a.content,
          createdAt: a.createdAt.toISOString(),
          author: a.author,
        })),
        tasks: dashboard.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          domain: t.domain,
          difficulty: t.difficulty,
          estimatedEffort: t.estimatedEffort,
          status: t.status,
          sortOrder: t.sortOrder,
          claimedById: t.claimedById,
          claimedAt: t.claimedAt?.toISOString() ?? null,
          completedAt: t.completedAt?.toISOString() ?? null,
          createdById: t.createdById,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          claimedBy: t.claimedBy,
        })),
        recentContributions: dashboard.recentContributions.map((c) => ({
          id: c.id,
          title: c.title,
          contributionType: c.contributionType,
          createdAt: c.createdAt.toISOString(),
          contributor: c.contributor,
          repository: c.repository,
        })),
        healthIndicators: dashboard.healthIndicators,
      },
      req.correlationId || 'unknown',
    );
  }

  @Patch(':id/lead')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'WorkingGroup'))
  async assignLead(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { contributorId: string },
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    if (user.role !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only admins can assign working group leads',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!body.contributorId) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'contributorId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log('Assigning WG lead', {
      workingGroupId: id,
      contributorId: body.contributorId,
      correlationId: req.correlationId,
      module: 'working-group',
    });

    const updated = await this.workingGroupService.assignLead(
      id,
      body.contributorId,
      req.correlationId,
    );

    return createSuccessResponse(
      {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        domain: updated.domain,
        accentColor: updated.accentColor,
        memberCount: updated.memberCount,
        leadContributor: updated.leadContributor ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
      req.correlationId || 'unknown',
    );
  }
}
