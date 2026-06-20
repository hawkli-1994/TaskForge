import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface RequestUser {
  id: string;
  role: string;
}

export const ReqUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as RequestUser | undefined;
    return data ? user?.[data] : user;
  },
);
