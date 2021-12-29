"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChessGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const nanoid_1 = require("nanoid");
const chess_js_1 = require("chess.js");
const process_1 = require("process");
const user_1 = require("../user");
const constants_1 = require("../../lib/constants");
const socket_io_2 = require("../../lib/socket.io");
const redis_1 = require("../../lib/redis");
const session_1 = require("../../lib/session");
const chess_service_1 = require("./chess.service");
const gateways_1 = require("./dtos/gateways");
const constants_2 = require("./lib/constants");
const serverEvents = {
    JOIN_QUEUE: "join-queue",
    MAKE_MOVE: "make-move",
    RESIGN: "resign",
    OFFER_DRAW: "offer-draw",
    ACCEPT_DRAW: "accept-draw",
    DECLINE_DRAW: "decline-draw",
    PREMOVE: "premove",
};
const clientEvents = {
    MOVE: "move",
    DRAW: "draw",
    MATCH_FOUND: "match-found",
    VICTORY: "victory",
    LOSS: "loss",
    ABORT: "abort",
    DRAW_OFFER: "draw-offer",
    DRAW_OFFER_DECLINE: "draw-offer-decline",
};
const controlToType = ({ time, delay, increment }) => {
    const overall = (time + delay * 45 + increment * 45) / 1000;
    if (overall <= 2)
        return constants_2.CHESS_TYPES.BULLET;
    else if (overall <= 7)
        return constants_2.CHESS_TYPES.BLITZ;
    else if (overall <= 20)
        return constants_2.CHESS_TYPES.RAPID;
    else if (overall > 20)
        return constants_2.CHESS_TYPES.CLASSICAL;
};
const getResult = (game) => {
    const engine = new chess_js_1.Chess(game.notation.fen);
    const turn = engine.turn() === "w" ? "white" : "black";
    const opposite = turn === "white" ? "black" : "white";
    const isCheckmate = engine.in_checkmate();
    const isDraw = engine.in_draw() || engine.in_stalemate() || engine.in_threefold_repetition() || engine.insufficient_material();
    if (isCheckmate) {
        const winner = game[opposite];
        const loser = game[turn];
        const difference = Math.abs(Math.round((loser.rating - winner.rating) / 5));
        const change = constants_2.MATCHMAKING.RATING_GAIN + difference;
        return {
            result: "1:0",
            winner,
            loser,
            change,
        };
    }
    else if (isDraw) {
        const [winner, loser] = [game[turn], game[opposite]].sort((a, b) => a.rating - b.rating);
        const change = Math.abs(Math.round((winner.rating - loser.rating) / 5));
        return {
            result: "1/2:1/2",
            winner,
            loser,
            change,
        };
    }
    return null;
};
let ChessGateway = class ChessGateway {
    constructor(userService, chessService, service) {
        this.userService = userService;
        this.chessService = chessService;
        this.service = service;
        this.queueInterval = null;
    }
    afterInit() {
        this.server.use((socket, next) => {
            (0, session_1.session)()(socket.request, {}, next);
        });
        this.queueInterval = setInterval(async () => {
            const jsons = await redis_1.redis.lrange("queue", 0, -1);
            const queue = jsons.map((json) => JSON.parse(json)).filter(Boolean);
            for (let i = 0; i < queue.length; i++) {
                const { userId, start, control, rating } = queue[i];
                const opponent = queue
                    .filter((entity) => !userId.equals(entity.userId) &&
                    control.time === entity.control.time &&
                    control.delay === entity.control.delay &&
                    control.increment === entity.control.increment)
                    .sort((a, b) => Math.abs(Math.abs(rating - a.rating) - Math.abs(rating - b.rating)))[0];
                const isOpponentRelevant = Math.abs(rating - opponent.rating) <= constants_2.MATCHMAKING.MAX_RATING_DIFFERENCE ||
                    Date.now() - start >= constants_2.MATCHMAKING.MAX_WAIT_TIME;
                if (isOpponentRelevant) {
                    const id = (0, nanoid_1.nanoid)();
                    const white = await this.userService.findById(userId);
                    const black = await this.userService.findById(opponent.userId);
                    if (!(white && black))
                        return;
                    const game = {
                        control,
                        premove: null,
                        type: controlToType(control),
                        white: {
                            id: white._id,
                            clock: control.time,
                            last: null,
                            rating,
                        },
                        black: {
                            id: black._id,
                            clock: control.time,
                            rating: opponent.rating,
                            last: null,
                        },
                        flags: {
                            hasDrawBeenOffered: false,
                            isDrawOfferValid: false,
                            isStarted: false,
                        },
                        notation: {
                            fen: constants_2.CHESS_NOTATION.INITIAL_FEN,
                            pgn: null,
                        },
                    };
                    redis_1.redis.set(id, JSON.stringify(game));
                    const sockets = [
                        ...this.service.getSocketsByUserId(white._id),
                        ...this.service.getSocketsByUserId(black._id),
                    ];
                    this.server.to(sockets).emit(clientEvents.MATCH_FOUND, {
                        game: {
                            white: {
                                user: white.public,
                                rating,
                            },
                            black: {
                                user: black.public,
                                rating: opponent.rating,
                            },
                            control,
                        },
                    });
                    redis_1.redis.pexpire(`clock:${id}`, constants_2.MATCHMAKING.INIT_TIME);
                }
            }
        }, 1000);
    }
    async handleDisconnect(socket) {
        const { user } = socket.request.session;
        const jsons = await redis_1.redis.lrange("queue", 0, -1);
        redis_1.redis.del("queue");
        jsons.forEach((json) => {
            const entity = JSON.parse(json);
            const isRelevant = String(entity.userId) !== String(user._id);
            if (isRelevant)
                redis_1.redis.lpush("queue", json);
        });
    }
    async joinQueue(socket, body) {
        const { user } = socket.request.session;
        const control = {
            delay: body.delay,
            increment: body.increment,
            time: body.time,
        };
        const entity = {
            userId: user._id,
            start: Date.now(),
            rating: user[controlToType(control)].rating,
            control,
        };
        const jsons = await redis_1.redis.lrange("queue", 0, -1);
        const doesAlreadyExist = jsons.some((json) => {
            const entity = JSON.parse(json);
            return (entity && String(entity.userId)) === String(user._id);
        });
        if (doesAlreadyExist)
            throw new websockets_1.WsException("You are already in the queue");
        redis_1.redis.lpush("queue", JSON.stringify(entity));
    }
    async makeMove(socket, body) {
        const { user } = socket.request.session;
        const hrtime = process_1.default.hrtime();
        const now = hrtime[0] * 1000000 + hrtime[1] / 1000;
        const json = await redis_1.redis.get(`game:${body.gameId}`);
        const game = JSON.parse(json);
        if (!game)
            throw new websockets_1.WsException("Invalid game");
        const isWhite = String(game.white.id) === String(user._id);
        const isBlack = String(game.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            throw new websockets_1.WsException("You have no permission to make move");
        const engine = new chess_js_1.Chess(game.notation.fen);
        const turn = engine.turn() === "w" ? "white" : "black";
        const opposite = turn === "white" ? "black" : "white";
        const isTurn = (isWhite && turn === "white") || (isBlack && turn === "black");
        if (!isTurn)
            throw new websockets_1.WsException("It is not your turn to make move");
        const move = engine.move(body.move);
        if (!move)
            throw new websockets_1.WsException("Invalid move");
        redis_1.redis.set(`timeout: ${body.gameId}`, null);
        redis_1.redis.set(`delay: ${body.gameId}`, null);
        const taken = game.flags.isStarted ? now - game[opposite].last : 0;
        game[turn].clock -= taken;
        game[turn].clock += game.control.increment;
        engine.set_comment(`clk:${game[turn].clock}`);
        game.flags.isStarted = engine.history.length >= 2;
        const sockets = [
            ...this.service.getSocketsByUserId(game["white"].id),
            ...this.service.getSocketsByUserId(game["black"].id),
        ];
        this.server.to(sockets).emit(clientEvents.MOVE, {
            move: move.san,
            clock: {
                white: game["white"].clock,
                black: game["black"].clock,
            },
        });
        const handleOver = async () => {
            const { result, winner, loser, change } = getResult(game);
            const isResultative = result === "1:0";
            const isDraw = result === "1/2:1/2";
            await this.userService.updateOne({ _id: winner.id }, { [game.type]: { rating: winner.rating + change } });
            await this.userService.updateOne({ _id: loser.id }, { [game.type]: { rating: loser.rating - change } });
            await this.chessService.create({
                white: game.white.id,
                black: game.black.id,
                control: game.control,
                winner: isResultative ? winner.id : null,
                pgn: engine.pgn(),
                fen: engine.fen(),
                type: game.type,
            });
            this.server
                .to(this.service.getSocketsByUserId(winner.id))
                .emit(isDraw ? clientEvents.DRAW : clientEvents.VICTORY, {
                rating: winner.rating + change,
                clock: winner.clock,
                change,
            });
            this.server.to(this.service.getSocketsByUserId(loser.id)).emit(isDraw ? clientEvents.DRAW : clientEvents.LOSS, {
                rating: loser.rating - change,
                clock: loser.clock,
                change: -change,
            });
        };
        const isOver = engine.game_over();
        if (isOver)
            return handleOver();
        const premove = !!game.premove && engine.move(game.premove);
        if (!!premove) {
            engine.set_comment(`clk:${game[opposite].clock}`);
            game.flags.isStarted = engine.history.length >= 2;
            this.server.to(sockets).emit(clientEvents.MOVE, {
                move: premove.san,
                clock: {
                    white: game.white.clock,
                    black: game.black.clock,
                },
            });
            const isOver = engine.game_over();
            if (isOver)
                return handleOver();
        }
        redis_1.redis.pexpire(`delay:${body.gameId}`, game.control.delay);
        redis_1.redis.set(`game:${body.gameId}`, JSON.stringify(game));
    }
    async resign(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`game:${body.gameId}`);
        const game = JSON.parse(json);
        if (!game)
            throw new websockets_1.WsException("Invalid game");
        const isWhite = String(game.white.id) === String(user._id);
        const isBlack = String(game.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            throw new websockets_1.WsException("You have no permission to make move");
        const loser = isWhite ? game.white : game.black;
        const winner = isWhite ? game.black : game.white;
        const difference = Math.round((loser.rating - winner.rating) / 5);
        const change = constants_2.MATCHMAKING.RATING_GAIN + difference;
        const type = controlToType(game.control);
        await this.userService.updateOne({ _id: loser.id }, { [type]: { rating: loser.rating - change } });
        await this.userService.updateOne({ _id: winner.id }, { [type]: { rating: winner.rating + change } });
        await this.chessService.create({
            white: game.white.id,
            black: game.black.id,
            control: game.control,
            winner: winner.id,
            pgn: game.notation.pgn,
            fen: game.notation.fen,
            type,
        });
        this.server.to(this.service.getSocketsByUserId(loser.id)).emit(clientEvents.LOSS, {
            rating: loser.rating - change,
            loss: -change,
            clock: loser.clock,
        });
        this.server.to(this.service.getSocketsByUserId(winner.id)).emit(clientEvents.VICTORY, {
            rating: winner.rating + change,
            gain: change,
            clock: winner.clock,
        });
        redis_1.redis.del(`game:${body.gameId}`);
    }
    async offerDraw(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`game:${body.gameId}`);
        const game = JSON.parse(json);
        if (!game)
            throw new websockets_1.WsException("Invalid game");
        const isWhite = String(game.white.id) === String(user._id);
        const isBlack = String(game.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            throw new websockets_1.WsException("You have no permission to make move");
        if (game.flags.hasDrawBeenOffered)
            throw new websockets_1.WsException("Draw has been already offered");
        game.flags.hasDrawBeenOffered = true;
        game.flags.isDrawOfferValid = true;
        const opponent = isWhite ? game.black : game.white;
        this.server.to(this.service.getSocketsByUserId(opponent.id)).emit(clientEvents.DRAW_OFFER);
        redis_1.redis.pexpire(`draw-timeout:${body.gameId}`, constants_2.MATCHMAKING.DRAW_OFFER_DURATION);
        redis_1.redis.set(`game:${body.gameId}`, JSON.stringify(game));
    }
    async acceptDraw(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`game:${body.gameId}`);
        const game = JSON.parse(json);
        if (!game)
            throw new websockets_1.WsException("Invalid game");
        const isWhite = String(game.white.id) === String(user._id);
        const isBlack = String(game.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            throw new websockets_1.WsException("You have no permission to make move");
        if (!game.flags.isDrawOfferValid)
            throw new websockets_1.WsException("Draw offer is not valid");
        const [underdog, favourite] = [game.white, game.black].sort((a, b) => a.rating - b.rating);
        const change = Math.round((underdog.rating - favourite.rating) / 5);
        const type = controlToType(game.control);
        await this.userService.updateOne({ _id: underdog.id }, { [type]: { rating: underdog.rating + change } });
        await this.userService.updateOne({ _id: favourite.id }, { [type]: { rating: favourite.rating - change } });
        await this.chessService.create({
            white: game.white.id,
            black: game.black.id,
            control: game.control,
            winner: null,
            pgn: game.notation.pgn,
            fen: game.notation.fen,
            type,
        });
        this.server.to(this.service.getSocketsByUserId(underdog.id)).emit(clientEvents.DRAW, {
            change,
            rating: underdog.rating + change,
            clock: underdog.clock,
        });
        this.server.to(this.service.getSocketsByUserId(favourite.id)).emit(clientEvents.DRAW, {
            rating: favourite.rating - change,
            change: -change,
            clock: favourite.clock,
        });
        redis_1.redis.del(`game:${body.gameId}`);
    }
    async declineDraw(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`game:${body.gameId}`);
        const game = JSON.parse(json);
        if (!game)
            throw new websockets_1.WsException("Invalid game");
        const isWhite = String(game.white.id) === String(user._id);
        const isBlack = String(game.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            throw new websockets_1.WsException("You have no permission to make move");
        if (!game.flags.isDrawOfferValid)
            throw new websockets_1.WsException("Draw offer is not valid");
        const opponent = isWhite ? game.black : game.white;
        this.server.to(this.service.getSocketsByUserId(opponent.id)).emit(clientEvents.DRAW_OFFER_DECLINE);
    }
    async premove(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`game:${body.gameId}`);
        const game = JSON.parse(json);
        if (!game)
            throw new websockets_1.WsException("Invalid game");
        const isWhite = String(game.white.id) === String(user._id);
        const isBlack = String(game.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            throw new websockets_1.WsException("You have no permission to make move");
        const engine = new chess_js_1.Chess(game.notation.fen);
        const turn = engine.turn() === "w" ? "white" : "black";
        const isTurn = (isWhite && turn === "white") || (isBlack && turn === "black");
        if (isTurn)
            throw new websockets_1.WsException("It is your turn to make move");
        game.premove = body.move;
        redis_1.redis.set(`game:${body.gameId}`, JSON.stringify(game));
    }
};
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChessGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.JOIN_QUEUE),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.JoinQueueDto]),
    __metadata("design:returntype", Promise)
], ChessGateway.prototype, "joinQueue", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.MAKE_MOVE),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.MakeMoveDto]),
    __metadata("design:returntype", Promise)
], ChessGateway.prototype, "makeMove", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.RESIGN),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.ResignDto]),
    __metadata("design:returntype", Promise)
], ChessGateway.prototype, "resign", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.OFFER_DRAW),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.OfferDrawDto]),
    __metadata("design:returntype", Promise)
], ChessGateway.prototype, "offerDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.ACCEPT_DRAW),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.AcceptDrawDto]),
    __metadata("design:returntype", Promise)
], ChessGateway.prototype, "acceptDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.DECLINE_DRAW),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.DeclineDrawDto]),
    __metadata("design:returntype", Promise)
], ChessGateway.prototype, "declineDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.PREMOVE),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.PremoveDto]),
    __metadata("design:returntype", Promise)
], ChessGateway.prototype, "premove", null);
ChessGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: constants_1.constants.ORIGIN,
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [user_1.UserService, typeof (_a = typeof chess_service_1.ChessService !== "undefined" && chess_service_1.ChessService) === "function" ? _a : Object, socket_io_2.SocketIoService])
], ChessGateway);
exports.ChessGateway = ChessGateway;
//# sourceMappingURL=chess.gateway.js.map