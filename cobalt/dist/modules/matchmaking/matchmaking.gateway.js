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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const mongoose_1 = require("mongoose");
const socket_io_1 = require("socket.io");
const nanoid_1 = require("nanoid");
const user_1 = require("../user");
const constants_1 = require("../../lib/constants");
const socket_io_2 = require("../../lib/socket.io");
const redis_1 = require("../../lib/redis");
const chess_js_1 = require("../../lib/chess.js");
const services_1 = require("./services");
const constants_2 = require("./lib/constants");
const elo_1 = require("./lib/elo");
const gateways_1 = require("./dtos/gateways");
const serverEvents = {
    JOIN_QUEUE: "join-queue",
    MAKE_MOVE: "make-move",
    RESIGN: "resign",
    OFFER_DRAW: "offer-draw",
    ACCEPT_DRAW: "accept-draw",
    DECLINE_DRAW: "decline-draw",
    PREMOVE: "make-premove",
    REMOVE_PREMOVE: "remove-premove",
    SPECTATE_MATCH: "spectate-match",
    SEND_MESSAGE: "send-message",
    DISJOIN_QUEUE: "disjoin-queue",
};
const clientEvents = {
    MOVE: "move",
    MATCH_FOUND: "match-found",
    DRAW_OFFER: "draw-offer",
    DRAW_OFFER_DECLINE: "draw-offer-decline",
    DRAW_OFFER_ACCEPT: "draw-offer-accept",
    CLOCK: "clock",
    RESULTATIVE_ENDING: "resultative-ending",
    TIE_ENDING: "tie-ending",
    MESSAGE: "message",
    RESIGNED: "resigned",
};
const controlToType = ({ time, delay, increment }) => {
    const overall = (time / 60 + delay * 0.45 + increment * 0.45) / 1000;
    if (overall <= 2)
        return constants_2.MATCH_TYPES.BULLET;
    else if (overall <= 7)
        return constants_2.MATCH_TYPES.BLITZ;
    else if (overall <= 20)
        return constants_2.MATCH_TYPES.RAPID;
    else if (overall > 20)
        return constants_2.MATCH_TYPES.CLASSICAL;
};
let MatchmakingGateway = class MatchmakingGateway {
    constructor(userService, matchService, matchPlayerService, service) {
        this.userService = userService;
        this.matchService = matchService;
        this.matchPlayerService = matchPlayerService;
        this.service = service;
        this.queueTimeout = null;
    }
    afterInit() {
        this.service.server = this.server;
        this.service.useAuthMiddleware();
        const handler = async () => {
            const jsons = await redis_1.redis.get("queue");
            let queue = (JSON.parse(jsons) || []).filter(Boolean);
            queue.forEach(({ user, start, control, rating }) => {
                const opponent = queue
                    .filter((entity) => String(user._id) !== String(entity.user._id) &&
                    control.time === entity.control.time &&
                    control.delay === entity.control.delay &&
                    control.increment === entity.control.increment)
                    .sort((a, b) => {
                    const diffA = Math.abs(rating - a.rating);
                    const diffB = Math.abs(rating - b.rating);
                    return Math.abs(diffA - diffB);
                })[0];
                if (!opponent)
                    return;
                const differenceInRating = Math.abs(rating - opponent.rating);
                const awaitTime = Date.now() - start;
                const isOpponentRelevant = differenceInRating <= constants_2.MATCHMAKING.MAX_RATING_DIFFERENCE || awaitTime >= constants_2.MATCHMAKING.MAX_WAIT_TIME;
                if (!isOpponentRelevant)
                    return;
                queue = queue.filter(({ user: { _id } }) => String(_id) !== String(user._id) && String(_id) !== String(opponent.user._id));
                const match = {
                    id: (0, nanoid_1.nanoid)(),
                    control,
                    pgn: null,
                    premove: null,
                    clockTimeout: null,
                    type: controlToType(control),
                    fen: constants_2.NOTATION.INITIAL,
                    last: Date.now(),
                    white: {
                        id: user._id,
                        user: this.userService.hydrate(user),
                        rating,
                        side: "white",
                        clock: control.time,
                        hasOfferedDraw: false,
                        isDrawOfferValid: false,
                    },
                    black: {
                        id: opponent.user._id,
                        user: this.userService.hydrate(opponent.user),
                        rating: opponent.rating,
                        side: "black",
                        clock: control.time,
                        hasOfferedDraw: false,
                        isDrawOfferValid: false,
                    },
                };
                const whites = this.service.getSocketsByUserId(user._id);
                const blacks = this.service.getSocketsByUserId(opponent.user._id);
                const sockets = [...blacks, ...whites];
                sockets.forEach((socket) => socket.join(match.id));
                const timeout = setTimeout(async () => {
                    const result = elo_1.elo.calculateVictory({ winner: opponent.rating, loser: rating });
                    await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(opponent.user._id)) }, { [match.type]: { rating: result.winner } });
                    await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(user._id)) }, { [match.type]: { rating: result.loser } });
                    const white = await this.matchPlayerService.create({
                        user: mongoose_1.Types.ObjectId(String(user._id)),
                        rating: match.white.rating,
                        shift: -result.shift,
                        result: "lose",
                        side: "white",
                    });
                    const black = await this.matchPlayerService.create({
                        user: mongoose_1.Types.ObjectId(String(opponent.user._id)),
                        rating: match.black.rating,
                        shift: result.shift,
                        result: "victory",
                        side: "black",
                    });
                    await this.matchService.create({
                        white,
                        black,
                        control,
                        type: match.type,
                        fen: match.fen,
                        pgn: match.pgn,
                        sid: match.id,
                        winner: black,
                    });
                    this.server.to(match.id).emit(clientEvents.RESULTATIVE_ENDING, {
                        matchId: match.id,
                        white: {
                            rating: result.loser,
                            shift: -result.shift,
                            result: "lose",
                        },
                        black: {
                            rating: result.winner,
                            shift: result.shift,
                            result: "victory",
                        },
                    });
                    this.server.to(match.id).emit(clientEvents.CLOCK, {
                        matchId: match.id,
                        clock: {
                            white: 0,
                            black: match.black.clock,
                        },
                    });
                    await redis_1.redis.del(`match:${match.id}`);
                }, match.white.clock);
                match.clockTimeout = timeout[Symbol.toPrimitive]();
                redis_1.redis.set(`match:${match.id}`, JSON.stringify(match)).then((res) => {
                    if (res !== "OK")
                        return;
                    redis_1.redis.set("queue", JSON.stringify(queue)).then((res) => {
                        if (res !== "OK")
                            return;
                        this.server.to(match.id).emit(clientEvents.MATCH_FOUND, {
                            match: {
                                control,
                                id: match.id,
                                pgn: null,
                                isDrawOfferValid: false,
                                type: match.type,
                                fen: match.fen,
                                isReal: true,
                                white: {
                                    user: match.white.user.public,
                                    rating: match.white.rating,
                                    side: match.white.side,
                                    clock: match.white.clock,
                                    hasOfferedDraw: match.white.hasOfferedDraw,
                                },
                                black: {
                                    user: match.black.user.public,
                                    rating: match.black.rating,
                                    side: match.black.side,
                                    clock: match.black.clock,
                                    hasOfferedDraw: match.black.hasOfferedDraw,
                                },
                            },
                        });
                    });
                });
            });
            setTimeout(handler, 1000);
        };
        this.queueTimeout = setTimeout(handler, 1000);
    }
    async handleDisconnect(socket) {
        const { user } = socket.request.session;
        const jsons = await redis_1.redis.get("queue");
        let queue = (JSON.parse(jsons) || []).filter(Boolean);
        queue = queue.filter(({ user: { _id } }) => String(_id) !== String(user._id));
        await redis_1.redis.set("queue", JSON.stringify(queue));
    }
    async joinQueue(socket, body) {
        const now = Date.now();
        const { user } = socket.request.session;
        const actual = await this.userService.findById(mongoose_1.Types.ObjectId(String(user._id)));
        const control = {
            delay: body.delay,
            increment: body.increment,
            time: body.time,
        };
        const jsons = await redis_1.redis.get("queue");
        let queue = (JSON.parse(jsons) || []).filter(Boolean);
        queue = queue.filter(({ user: { _id } }) => String(_id) !== String(actual._id));
        const mode = actual[controlToType(control)];
        queue.push({
            control,
            user: actual,
            start: now,
            rating: mode.rating,
        });
        redis_1.redis.set("queue", JSON.stringify(queue));
        return socket_io_2.acknowledgment.ok();
    }
    async disjoinQueue(socket, body) {
        const { user } = socket.request.session;
        const jsons = await redis_1.redis.get("queue");
        let queue = (JSON.parse(jsons) || []).filter(Boolean);
        queue = queue.filter(({ user: { _id } }) => String(_id) !== String(user._id));
        redis_1.redis.set("queue", JSON.stringify(queue));
        return socket_io_2.acknowledgment.ok();
    }
    async makeMove(socket, body) {
        const now = Date.now();
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`match:${body.matchId}`);
        if (!json)
            return socket_io_2.acknowledgment.error({ message: "Invalid match" });
        const match = JSON.parse(json);
        const isWhite = String(match.white.id) === String(user._id);
        const isBlack = String(match.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            return socket_io_2.acknowledgment.error({ message: "You are not participant" });
        const engine = new chess_js_1.Chess();
        match.fen && engine.load(match.fen);
        match.pgn && engine.load_pgn(match.pgn);
        const turn = () => (engine.turn() === "w" ? "white" : "black");
        const current = turn();
        const isTurn = (current === "white" && isWhite) || (current === "black" && isBlack);
        if (!isTurn)
            return socket_io_2.acknowledgment.error({ message: "It is not your turn to make move" });
        const result = engine.move({
            from: body.from,
            to: body.to,
            promotion: body.promotion,
        });
        if (!result)
            return socket_io_2.acknowledgment.error({ message: "The move is not valid" });
        clearTimeout(match.clockTimeout);
        match[current].clock = match[current].clock - (now - match.last) + match.control.increment;
        engine.set_comment(`clock:${match[current].clock}`);
        const opposite = turn();
        if (match[opposite].isDrawOfferValid) {
            match[opposite].isDrawOfferValid = false;
            this.server.to(match.id).emit(clientEvents.DRAW_OFFER_DECLINE, {
                from: current,
                matchId: match.id,
            });
        }
        this.server.to(match.id).emit(clientEvents.MOVE, {
            matchId: match.id,
            move: result,
            from: current,
        });
        this.server.to(match.id).emit(clientEvents.CLOCK, {
            matchId: match.id,
            clock: {
                white: match.white.clock,
                black: match.black.clock,
            },
        });
        match.last = Date.now();
        const handleOver = async () => {
            const { control, type } = match;
            const pgn = engine.pgn();
            const fen = engine.fen();
            const isDraw = engine.in_draw() || engine.in_stalemate() || engine.in_threefold_repetition() || engine.insufficient_material();
            const isResultative = !isDraw;
            const isOutOfTime = isResultative && !engine.in_checkmate();
            const win = turn() === "white" ? "black" : "white";
            const lose = turn();
            if (isOutOfTime)
                match[lose].clock = match[lose].clock - (Date.now() - match.last);
            if (isResultative) {
                const winner = match[win];
                const loser = match[lose];
                const result = elo_1.elo.calculateVictory({ winner: winner.rating, loser: loser.rating });
                await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(winner.id)) }, { [match.type]: { rating: result.winner } });
                await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(loser.id)) }, { [match.type]: { rating: result.loser } });
                const isWinnerWhite = winner.side === "white";
                const white = await this.matchPlayerService.create({
                    user: mongoose_1.Types.ObjectId(String(match.white.user._id)),
                    rating: match.white.rating,
                    shift: isWinnerWhite ? result.shift : -result.shift,
                    result: isWinnerWhite ? "victory" : "lose",
                    side: "white",
                });
                const black = await this.matchPlayerService.create({
                    user: mongoose_1.Types.ObjectId(String(match.black.user._id)),
                    rating: match.black.rating,
                    shift: isWinnerWhite ? -result.shift : result.shift,
                    result: isWinnerWhite ? "lose" : "victory",
                    side: "black",
                });
                await this.matchService.create({
                    white,
                    black,
                    control,
                    type,
                    fen,
                    pgn,
                    sid: match.id,
                    winner: isWinnerWhite ? white : black,
                });
                this.server.to(match.id).emit(clientEvents.RESULTATIVE_ENDING, {
                    matchId: match.id,
                    [winner.side]: {
                        rating: result.winner,
                        shift: result.shift,
                        result: "victory",
                    },
                    [loser.side]: {
                        rating: result.loser,
                        shift: -result.shift,
                        result: "lose",
                    },
                });
            }
            else if (isDraw) {
                const [underdog, favourite] = [match.white, match.black].sort((a, b) => a.rating - b.rating);
                const result = elo_1.elo.calculateDraw({ underdog: underdog.rating, favourite: favourite.rating });
                await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(underdog.id)) }, { [match.type]: { rating: result.underdog } });
                await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(favourite.id)) }, { [match.type]: { rating: result.favourite } });
                const isUnderdogWhite = String(underdog.id) === String(match.white.id);
                const white = await this.matchPlayerService.create({
                    user: mongoose_1.Types.ObjectId(String(match.white.user._id)),
                    rating: match.white.rating,
                    shift: isUnderdogWhite ? result.shift : -result.shift,
                    result: "draw",
                    side: "white",
                });
                const black = await this.matchPlayerService.create({
                    user: mongoose_1.Types.ObjectId(String(match.black.user._id)),
                    rating: match.black.rating,
                    shift: isUnderdogWhite ? -result.shift : result.shift,
                    result: "draw",
                    side: "black",
                });
                await this.matchService.create({
                    white,
                    black,
                    control,
                    type,
                    fen,
                    pgn,
                    sid: match.id,
                    winner: null,
                });
                this.server.to(match.id).emit(clientEvents.TIE_ENDING, {
                    matchId: match.id,
                    [underdog.side]: {
                        rating: result.underdog,
                        shift: result.shift,
                        result: "draw",
                    },
                    [favourite.side]: {
                        rating: result.favourite,
                        shift: -result.shift,
                        result: "draw",
                    },
                });
            }
            this.server.to(match.id).emit(clientEvents.CLOCK, {
                matchId: match.id,
                clock: {
                    [win]: match[win].clock,
                    [lose]: match[lose].clock,
                },
            });
            await redis_1.redis.del(`match:${match.id}`);
        };
        const isOver = engine.game_over();
        if (isOver) {
            await handleOver();
            return socket_io_2.acknowledgment.ok();
        }
        const isPremove = !!match.premove;
        if (isPremove) {
            const premove = engine.move(match.premove);
            if (premove) {
                engine.set_comment(`clock:${match[opposite].clock}`);
                if (match[current].isDrawOfferValid) {
                    match[current].isDrawOfferValid = false;
                    this.server.to(match.id).emit(clientEvents.DRAW_OFFER_DECLINE, {
                        matchId: match.id,
                        from: opposite,
                    });
                }
                this.server.to(match.id).emit(clientEvents.MOVE, {
                    matchId: match.id,
                    move: premove,
                    from: opposite,
                });
                this.server.to(match.id).emit(clientEvents.CLOCK, {
                    matchId: match.id,
                    clock: {
                        white: match.white.clock,
                        black: match.black.clock,
                    },
                });
                const isOver = engine.game_over();
                if (isOver) {
                    await handleOver();
                    return socket_io_2.acknowledgment.ok();
                }
            }
        }
        const timeout = setTimeout(() => handleOver(), match[turn()].clock);
        match.clockTimeout = timeout[Symbol.toPrimitive]();
        match.fen = engine.fen();
        match.pgn = engine.pgn();
        await redis_1.redis.set(`match:${match.id}`, JSON.stringify(match));
        return socket_io_2.acknowledgment.ok();
    }
    async resign(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`match:${body.matchId}`);
        if (!json)
            return socket_io_2.acknowledgment.error({ message: "Invalid match" });
        const match = JSON.parse(json);
        const isWhite = String(match.white.id) === String(user._id);
        const isBlack = String(match.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            return socket_io_2.acknowledgment.error({ message: "You are not participant" });
        const { type, control, clockTimeout } = match;
        clearInterval(clockTimeout);
        const loser = isWhite ? match.white : match.black;
        const winner = isWhite ? match.black : match.white;
        this.server.to(match.id).emit(clientEvents.RESIGNED, {
            matchId: match.id,
            from: loser.side,
        });
        const result = elo_1.elo.calculateVictory({ winner: winner.rating, loser: loser.rating });
        await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(loser.id)) }, { [type]: { rating: result.loser } });
        await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(winner.id)) }, { [type]: { rating: result.winner } });
        const white = await this.matchPlayerService.create({
            user: mongoose_1.Types.ObjectId(String(match.white.user._id)),
            rating: match.white.rating,
            shift: isWhite ? -result.shift : result.shift,
            result: isWhite ? "lose" : "victory",
            side: "white",
        });
        const black = await this.matchPlayerService.create({
            user: mongoose_1.Types.ObjectId(String(match.black.user._id)),
            rating: match.black.rating,
            shift: isBlack ? -result.shift : result.shift,
            result: isBlack ? "lose" : "victory",
            side: "black",
        });
        const engine = new chess_js_1.Chess(match.fen);
        match.pgn && engine.load_pgn(match.pgn);
        await this.matchService.create({
            white,
            black,
            control,
            type,
            sid: match.id,
            fen: engine.fen(),
            pgn: engine.pgn(),
            winner: isWhite ? black : white,
        });
        this.server.to(match.id).emit(clientEvents.RESULTATIVE_ENDING, {
            matchId: match.id,
            [winner.side]: {
                rating: result.winner,
                shift: result.shift,
                result: "victory",
            },
            [loser.side]: {
                rating: result.loser,
                shift: -result.shift,
                result: "lose",
            },
        });
        this.server.to(match.id).emit(clientEvents.CLOCK, {
            matchId: match.id,
            clock: {
                white: match.white.clock,
                black: match.black.clock,
            },
        });
        redis_1.redis.del(`match:${match.id}`);
        return socket_io_2.acknowledgment.ok();
    }
    async offerDraw(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`match:${body.matchId}`);
        if (!json)
            return socket_io_2.acknowledgment.error({ message: "Invalid match" });
        const match = JSON.parse(json);
        const isWhite = String(match.white.id) === String(user._id);
        const isBlack = String(match.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            return socket_io_2.acknowledgment.error({ message: "You are not participant" });
        const self = isWhite ? match.white : match.black;
        if (self.hasOfferedDraw)
            return socket_io_2.acknowledgment.error({ message: "You have already offered a draw" });
        self.hasOfferedDraw = true;
        self.isDrawOfferValid = true;
        this.server.to(match.id).emit(clientEvents.DRAW_OFFER, {
            matchId: match.id,
            from: self.side,
        });
        redis_1.redis.set(`match:${match.id}`, JSON.stringify(match));
        return socket_io_2.acknowledgment.ok();
    }
    async acceptDraw(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`match:${body.matchId}`);
        if (!json)
            return socket_io_2.acknowledgment.error({ message: "Invalid match" });
        const match = JSON.parse(json);
        const isWhite = String(match.white.id) === String(user._id);
        const isBlack = String(match.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            return socket_io_2.acknowledgment.error({ message: "You are not participant" });
        const self = isWhite ? match.white : match.black;
        const opponent = isWhite ? match.black : match.white;
        if (!opponent.isDrawOfferValid)
            return socket_io_2.acknowledgment.error({ message: "Draw offer is not valid" });
        clearInterval(match.clockTimeout);
        this.server.to(match.id).emit(clientEvents.DRAW_OFFER_ACCEPT, {
            matchId: match.id,
            from: self.side,
        });
        const { type, control } = match;
        const [underdog, favourite] = [match.white, match.black].sort((a, b) => a.rating - b.rating);
        const result = elo_1.elo.calculateDraw({ underdog: underdog.rating, favourite: favourite.rating });
        await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(underdog.id)) }, { [type]: { rating: result.underdog } });
        await this.userService.updateOne({ _id: mongoose_1.Types.ObjectId(String(favourite.id)) }, { [type]: { rating: result.favourite } });
        const isUnderdogWhite = String(match.white.id) === String(underdog.id);
        const white = await this.matchPlayerService.create({
            user: mongoose_1.Types.ObjectId(String(match.white.user._id)),
            rating: match.white.rating,
            shift: isUnderdogWhite ? result.shift : -result.shift,
            result: "draw",
            side: "white",
        });
        const black = await this.matchPlayerService.create({
            user: mongoose_1.Types.ObjectId(String(match.black.user._id)),
            rating: match.black.rating,
            shift: isUnderdogWhite ? -result.shift : result.shift,
            result: "draw",
            side: "black",
        });
        const engine = new chess_js_1.Chess(match.fen);
        match.pgn && engine.load_pgn(match.pgn);
        await this.matchService.create({
            white,
            black,
            control,
            type,
            sid: match.id,
            fen: engine.fen(),
            pgn: engine.pgn(),
            winner: null,
        });
        this.server.to(match.id).emit(clientEvents.TIE_ENDING, {
            matchId: match.id,
            [underdog.side]: {
                rating: result.underdog,
                shift: result.shift,
                result: "draw",
            },
            [favourite.side]: {
                rating: result.favourite,
                shift: -result.shift,
                result: "draw",
            },
        });
        this.server.to(match.id).emit(clientEvents.CLOCK, {
            matchId: match.id,
            clock: {
                white: match.white.clock,
                black: match.black.clock,
            },
        });
        redis_1.redis.del(`match:${match.id}`);
        return socket_io_2.acknowledgment.ok();
    }
    async declineDraw(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`match:${body.matchId}`);
        if (!json)
            return socket_io_2.acknowledgment.error({ message: "Invalid match" });
        const match = JSON.parse(json);
        const isWhite = String(match.white.id) === String(user._id);
        const isBlack = String(match.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            return socket_io_2.acknowledgment.error({ message: "You are not participant" });
        const opponent = isWhite ? match.black : match.white;
        if (!opponent.isDrawOfferValid)
            return socket_io_2.acknowledgment.error({ message: "Draw offer is not valid" });
        opponent.isDrawOfferValid = false;
        const self = isWhite ? match.white : match.black;
        this.server.to(match.id).emit(clientEvents.DRAW_OFFER_DECLINE, {
            matchId: match.id,
            from: self.side,
        });
        redis_1.redis.set(`match:${match.id}`, JSON.stringify(match));
        return socket_io_2.acknowledgment.ok();
    }
    async premove(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`match:${body.matchId}`);
        if (!json)
            return socket_io_2.acknowledgment.error({ message: "Invalid match" });
        const match = JSON.parse(json);
        const isWhite = String(match.white.id) === String(user._id);
        const isBlack = String(match.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            return socket_io_2.acknowledgment.error({ message: "You are not participant" });
        const engine = new chess_js_1.Chess(match.fen);
        const current = engine.turn() === "w" ? "white" : "black";
        const isTurn = (current === "white" && isWhite) || (current === "black" && isBlack);
        if (isTurn)
            return socket_io_2.acknowledgment.error({ message: "It is your turn to make move, not premove" });
        match.premove = {
            from: body.from,
            to: body.to,
            promotion: body.promotion,
        };
        redis_1.redis.set(`match:${match.id}`, JSON.stringify(match));
        return socket_io_2.acknowledgment.ok();
    }
    async removePremove(socket, body) {
        const { user } = socket.request.session;
        const json = await redis_1.redis.get(`match:${body.matchId}`);
        if (!json)
            return socket_io_2.acknowledgment.error({ message: "Invalid match" });
        const match = JSON.parse(json);
        const isWhite = String(match.white.id) === String(user._id);
        const isBlack = String(match.black.id) === String(user._id);
        const isParticipant = isWhite || isBlack;
        if (!isParticipant)
            return socket_io_2.acknowledgment.error({ message: "You are not participant" });
        const engine = new chess_js_1.Chess(match.fen);
        const current = engine.turn() === "w" ? "white" : "black";
        const isTurn = (current === "white" && isWhite) || (current === "black" && isBlack);
        if (isTurn)
            return socket_io_2.acknowledgment.error({ message: "It is your turn to make move" });
        match.premove = null;
        redis_1.redis.set(`match:${match.id}`, JSON.stringify(match));
        return socket_io_2.acknowledgment.ok();
    }
    async spectateMatch(socket, body) {
        const json = await redis_1.redis.get(`match:${body.matchId}`);
        if (!json)
            return socket_io_2.acknowledgment.error({ message: "Invalid match" });
        const match = JSON.parse(json);
        socket.join(match.id);
        return socket_io_2.acknowledgment.ok();
    }
    async sendMessage(socket, body) {
        const { user } = socket.request.session;
        const actual = await this.userService.findById(mongoose_1.Types.ObjectId(String(user._id)));
        this.server.to(body.matchId).emit(clientEvents.MESSAGE, {
            sender: actual.public,
            text: body.text,
        });
        return socket_io_2.acknowledgment.ok();
    }
};
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MatchmakingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.JOIN_QUEUE),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.JoinQueueDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "joinQueue", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.DISJOIN_QUEUE),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.DisjoinQueue]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "disjoinQueue", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.MAKE_MOVE),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.MakeMoveDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "makeMove", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.RESIGN),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.ResignDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "resign", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.OFFER_DRAW),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.OfferDrawDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "offerDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.ACCEPT_DRAW),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.AcceptDrawDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "acceptDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.DECLINE_DRAW),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.DeclineDrawDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "declineDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.PREMOVE),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.PremoveDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "premove", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.REMOVE_PREMOVE),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket,
        gateways_1.RemovePremoveDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "removePremove", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.SPECTATE_MATCH),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket,
        gateways_1.SpectateMatchDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "spectateMatch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(serverEvents.SEND_MESSAGE),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, gateways_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], MatchmakingGateway.prototype, "sendMessage", null);
MatchmakingGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: constants_1.constants.ORIGIN,
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [user_1.UserService,
        services_1.MatchService,
        services_1.MatchPlayerService,
        socket_io_2.SocketIoService])
], MatchmakingGateway);
exports.MatchmakingGateway = MatchmakingGateway;
//# sourceMappingURL=matchmaking.gateway.js.map