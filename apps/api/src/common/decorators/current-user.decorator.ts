import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface CurrentUserPayload {
  id: string;
  githubId: number | null;
  googleId: string | null;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof CurrentUserPayload | undefined,
    ctx: ExecutionContext,
  ): CurrentUserPayload | CurrentUserPayload[keyof CurrentUserPayload] => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUserPayload;

    return data ? user[data] : user;
  },
);
