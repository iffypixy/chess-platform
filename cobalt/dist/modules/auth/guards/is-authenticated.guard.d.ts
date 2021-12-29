import { CanActivate, ExecutionContext } from "@nestjs/common";
export declare class IsAuthenticatedGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean;
}
