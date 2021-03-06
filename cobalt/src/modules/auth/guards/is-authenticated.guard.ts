import {CanActivate, ExecutionContext, Injectable} from "@nestjs/common";
import {SessionData} from "express-session";

@Injectable()
export class IsAuthenticatedGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const session = ctx.switchToHttp().getRequest().session as SessionData;

    return !!session.user;
  }
}
