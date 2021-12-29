"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChessGuard = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const redis_1 = require("../../../lib/constants/redis");
let ChessGuard = class ChessGuard {
    async canActivate(context) {
        const ws = context.switchToWs();
        const data = ws.getData();
        const socket = ws.getClient();
        const error = new websockets_1.WsException("Invalid game");
        const game = JSON.parse(await redis_1.redis.get(`game:${data.gameId}`)) || null;
        if (!game)
            throw error;
        const { white, black } = game;
        const { user } = socket.request.session;
        const isWhite = white.id.equals(user._id);
        const isBlack = black.id.equals(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            throw error;
        return true;
    }
};
ChessGuard = __decorate([
    (0, common_1.Injectable)()
], ChessGuard);
exports.ChessGuard = ChessGuard;
//# sourceMappingURL=chess.guard.js.map