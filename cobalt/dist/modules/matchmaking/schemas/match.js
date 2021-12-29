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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchSchema = exports.Match = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const constants_1 = require("../lib/constants");
const match_player_1 = require("./match-player");
let Match = class Match {
};
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: match_player_1.MatchPlayer.name,
        required: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Match.prototype, "white", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: match_player_1.MatchPlayer.name,
        required: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Match.prototype, "black", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
    }),
    __metadata("design:type", String)
], Match.prototype, "sid", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
    }),
    __metadata("design:type", String)
], Match.prototype, "pgn", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
    }),
    __metadata("design:type", String)
], Match.prototype, "fen", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: [constants_1.MATCH_TYPES.BULLET, constants_1.MATCH_TYPES.BLITZ, constants_1.MATCH_TYPES.RAPID, constants_1.MATCH_TYPES.CLASSICAL],
    }),
    __metadata("design:type", String)
], Match.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)((0, mongoose_1.raw)({
        delay: {
            type: Number,
            required: true,
        },
        time: {
            type: Number,
            required: true,
        },
        increment: {
            type: Number,
            required: true,
        },
    })),
    __metadata("design:type", Object)
], Match.prototype, "control", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: match_player_1.MatchPlayer.name,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Match.prototype, "winner", void 0);
Match = __decorate([
    (0, mongoose_1.Schema)({ versionKey: false, timestamps: true })
], Match);
exports.Match = Match;
exports.MatchSchema = mongoose_1.SchemaFactory.createForClass(Match);
exports.MatchSchema.virtual("public").get(function () {
    const { _id, white, black, winner, pgn, type, control, fen, sid } = this;
    return {
        id: _id,
        white: white.public,
        black: black.public,
        winner: winner && winner.public,
        sid,
        fen,
        pgn,
        type,
        control,
    };
});
//# sourceMappingURL=match.js.map