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
exports.MatchmakingController = void 0;
const common_1 = require("@nestjs/common");
const chess_js_1 = require("chess.js");
const user_1 = require("../user");
const redis_1 = require("../../lib/redis");
const services_1 = require("./services");
let MatchmakingController = class MatchmakingController {
    constructor(matchService, userService, matchPlayerService) {
        this.matchService = matchService;
        this.userService = userService;
        this.matchPlayerService = matchPlayerService;
    }
    async getRandom() {
        const amount = await this.matchService.count();
        const random = Math.floor(Math.random() * amount);
        const match = await this.matchService.findOne({}, { skip: random });
        return {
            match: match.public,
        };
    }
    async getUsersMatches(username) {
        const user = await this.userService.findByUsername(username);
        if (!user)
            throw new common_1.BadRequestException("No user found");
        const players = await this.matchPlayerService.find({ user: user._id }).exec();
        const matches = [];
        for (let i = 0; i < players.length; i++) {
            const match = await this.matchService
                .findOne({ $or: [{ white: players[i]._id }, { black: players[i]._id }] })
                .populate([
                {
                    path: "white",
                    populate: {
                        path: "user",
                    },
                },
                {
                    path: "black",
                    populate: {
                        path: "user",
                    },
                },
                {
                    path: "winner",
                    populate: {
                        path: "user",
                    },
                },
            ])
                .exec();
            if (!!match)
                matches.push(match.public);
        }
        return { matches: matches.reverse() };
    }
    async get(matchId) {
        let json = await redis_1.redis.get(`match:${matchId}`);
        if (json) {
            const match = JSON.parse(json);
            const { id, control, pgn, type, fen, white, black, last } = match;
            const engine = new chess_js_1.Chess(fen);
            const turn = engine.turn() === "w" ? "white" : "black";
            const entity = {
                id,
                control,
                pgn,
                type,
                fen,
                white: {
                    user: this.userService.hydrate(white.user).public,
                    rating: white.rating,
                    side: white.side,
                    clock: white.clock,
                    hasOfferedDraw: white.hasOfferedDraw,
                    isDrawOfferValid: white.isDrawOfferValid,
                },
                black: {
                    user: this.userService.hydrate(black.user).public,
                    rating: black.rating,
                    side: black.side,
                    clock: black.clock,
                    hasOfferedDraw: black.hasOfferedDraw,
                    isDrawOfferValid: black.isDrawOfferValid,
                },
                isCompleted: false,
            };
            entity[turn].clock = entity[turn].clock - (Date.now() - last);
            return {
                match: entity,
            };
        }
        const match = await this.matchService
            .findOne({ sid: matchId })
            .populate([
            {
                path: "white",
                populate: {
                    path: "user",
                },
            },
            {
                path: "black",
                populate: {
                    path: "user",
                },
            },
            {
                path: "winner",
                populate: {
                    path: "user",
                },
            },
        ])
            .exec();
        if (!match)
            throw new common_1.BadRequestException("Invalid match");
        return {
            match: Object.assign(Object.assign({}, match.public), { isCompleted: true }),
        };
    }
};
__decorate([
    (0, common_1.Get)("random"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MatchmakingController.prototype, "getRandom", null);
__decorate([
    (0, common_1.Get)("users/:username"),
    __param(0, (0, common_1.Param)("username")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MatchmakingController.prototype, "getUsersMatches", null);
__decorate([
    (0, common_1.Get)(":matchId"),
    __param(0, (0, common_1.Param)("matchId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MatchmakingController.prototype, "get", null);
MatchmakingController = __decorate([
    (0, common_1.Controller)("matches"),
    __metadata("design:paramtypes", [services_1.MatchService,
        user_1.UserService,
        services_1.MatchPlayerService])
], MatchmakingController);
exports.MatchmakingController = MatchmakingController;
//# sourceMappingURL=matchmaking.controller.js.map