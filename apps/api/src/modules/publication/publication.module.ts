import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ArticleController } from './article.controller.js';
import { EditorialController } from './editorial.controller.js';
import { EditorEligibilityController } from './editor-eligibility.controller.js';
import { PublicArticleController } from './public-article.controller.js';
import { ArticleService } from './article.service.js';
import { EditorialService } from './editorial.service.js';
import { EditorEligibilityService } from './editor-eligibility.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    ArticleController,
    EditorialController,
    EditorEligibilityController,
    PublicArticleController,
  ],
  providers: [ArticleService, EditorialService, EditorEligibilityService],
  exports: [ArticleService, EditorialService, EditorEligibilityService],
})
export class PublicationModule {}
