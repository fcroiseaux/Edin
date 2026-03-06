import { Controller, Sse, UseGuards, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ContributionSseService } from './contribution-sse.service.js';

@Controller({ path: 'contributors/me/contributions', version: '1' })
export class ContributionSseController {
  private readonly logger = new Logger(ContributionSseController.name);

  constructor(
    private readonly contributionSseService: ContributionSseService,
    private readonly prisma: PrismaService,
  ) {}

  @Sse('stream')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Contribution'))
  async stream(@CurrentUser('githubId') githubId: number): Promise<Observable<MessageEvent>> {
    const contributor = await this.prisma.contributor.findUnique({
      where: { githubId },
      select: { id: true },
    });

    if (!contributor) {
      this.logger.warn('SSE stream requested by user without contributor profile', { githubId });
      return new Observable<MessageEvent>((subscriber) => {
        subscriber.complete();
      });
    }

    this.logger.log('SSE stream established for contributor', {
      contributorId: contributor.id,
    });

    return this.contributionSseService.createStream(contributor.id);
  }
}
