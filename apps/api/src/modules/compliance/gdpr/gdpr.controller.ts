import { Controller, Get, Post, Param, Res, UseGuards, Req } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../../common/types/api-response.type.js';
import { GdprService } from './gdpr.service.js';

@Controller({ path: 'contributors/me', version: '1' })
@UseGuards(JwtAuthGuard)
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Post('data-export')
  async requestExport(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const correlationId = req.correlationId ?? '';
    const result = await this.gdprService.requestExport(user.id, correlationId);
    return createSuccessResponse(result, correlationId);
  }

  @Get('data-export/:requestId')
  async getExportStatus(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const correlationId = req.correlationId ?? '';
    const result = await this.gdprService.getExportStatus(requestId, user.id);
    return createSuccessResponse(result, correlationId);
  }

  @Get('data-export/:requestId/download')
  async downloadExport(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Res() res: Response,
  ) {
    const { filePath, fileName } = await this.gdprService.getExportFile(requestId, user.id);

    if (!existsSync(filePath)) {
      res.status(404).json({ message: 'Export file not found on disk' });
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    createReadStream(filePath).pipe(res);
  }

  @Post('data-deletion')
  async requestDeletion(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const correlationId = req.correlationId ?? '';
    const result = await this.gdprService.requestDeletion(user.id, correlationId);
    return createSuccessResponse(result, correlationId);
  }

  @Post('data-deletion/:requestId/confirm')
  async confirmDeletion(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const correlationId = req.correlationId ?? '';
    const result = await this.gdprService.confirmDeletion(requestId, user.id, correlationId);
    return createSuccessResponse(result, correlationId);
  }

  @Post('data-deletion/:requestId/cancel')
  async cancelDeletion(
    @Param('requestId') requestId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const correlationId = req.correlationId ?? '';
    const result = await this.gdprService.cancelDeletion(requestId, user.id, correlationId);
    return createSuccessResponse(result, correlationId);
  }
}
