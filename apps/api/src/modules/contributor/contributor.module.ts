import { Module } from '@nestjs/common';
import { CaslModule } from '../auth/casl/casl.module.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { ContributorService } from './contributor.service.js';
import { ContributorController } from './contributor.controller.js';
import { ProfileController } from './profile.controller.js';

@Module({
  imports: [CaslModule],
  controllers: [ProfileController, ContributorController],
  providers: [ContributorService, AbilityGuard],
  exports: [ContributorService],
})
export class ContributorModule {}
