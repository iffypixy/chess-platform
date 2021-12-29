import { CanActivate, ExecutionContext } from "@nestjs/common";
export declare class ChessGuard implements CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
