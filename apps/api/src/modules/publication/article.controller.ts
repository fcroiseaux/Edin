import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ArticleService } from './article.service.js';
import { FileImportService } from './file-import.service.js';
import { createArticleSchema, updateArticleSchema } from '@edin/shared';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type { Request } from 'express';

@Controller({ path: 'articles', version: '1' })
@UseGuards(JwtAuthGuard)
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly fileImportService: FileImportService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createArticle(
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = createArticleSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid article data',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const article = await this.articleService.createArticle(userId, parsed.data);
    return createSuccessResponse(article, req.correlationId ?? '');
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async importFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') _userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (!file) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'No file provided',
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.fileImportService.importFile(file);
    return createSuccessResponse(result, req.correlationId ?? '');
  }

  @Get(':id')
  async getArticle(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const article = await this.articleService.getArticle(id, userId);
    return createSuccessResponse(article, req.correlationId ?? '');
  }

  @Patch(':id')
  async updateArticle(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = updateArticleSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid update data',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const article = await this.articleService.updateArticle(id, userId, parsed.data);
    return createSuccessResponse(article, req.correlationId ?? '');
  }

  @Get()
  async listArticles(
    @Query('status') status: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limitStr: string | undefined,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 20, 100) : 20;
    const result = await this.articleService.getUserArticles(userId, status, cursor, limit);

    return createSuccessResponse(result.items, req.correlationId ?? '', result.pagination);
  }

  @Post(':id/submit')
  async submitArticle(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const article = await this.articleService.submitArticle(id, userId, req.correlationId ?? '');
    return createSuccessResponse(article, req.correlationId ?? '');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteArticle(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.articleService.deleteArticle(id, userId);
  }
}
