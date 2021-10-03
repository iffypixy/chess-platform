import {CanActivate, ExecutionContext, Injectable} from "@nestjs/common";

import {SessionStorage} from "@typings/";

@Injectable()
export class IsAuthenticatedGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const session = ctx.switchToHttp().getRequest().session as SessionStorage;

    return !!session.user;
  }
}
