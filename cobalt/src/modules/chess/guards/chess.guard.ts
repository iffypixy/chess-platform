import {Injectable, CanActivate, ExecutionContext, BadRequestException} from "@nestjs/common";
import {WsException} from "@nestjs/websockets";

import {redis} from "@lib/constants/redis";

@Injectable()
export class ChessGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ws = context.switchToWs();

    const data = ws.getData();
    const socket = ws.getClient();

    const error = new WsException("Invalid game");

    const game = JSON.parse(await redis.get(`game:${data.gameId}`)) || null;

    if (!game) throw error;

    const {white, black} = game;
    const {user} = socket.request.session;

    const isWhite = white.id.equals(user._id);
    const isBlack = black.id.equals(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) throw error;

    return true;
  }
}
