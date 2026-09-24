import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const { user } = ctx.switchToHttp().getRequest();

    if (!data) {
      return user;
    }

    return user?.[data];
  },
);
