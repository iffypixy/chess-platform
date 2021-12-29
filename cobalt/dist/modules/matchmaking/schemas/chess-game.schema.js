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
exports.ChessGameSchema = exports.ChessGame = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_1 = require("../../user");
const constants_1 = require("../lib/constants");
let ChessGame = class ChessGame {
};
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: user_1.User.name,
        required: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChessGame.prototype, "white", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: user_1.User.name,
        required: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChessGame.prototype, "black", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
    }),
    __metadata("design:type", String)
], ChessGame.prototype, "pgn", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
    }),
    __metadata("design:type", String)
], ChessGame.prototype, "fen", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: [constants_1.CHESS_TYPES.BULLET, constants_1.CHESS_TYPES.BLITZ, constants_1.CHESS_TYPES.RAPID, constants_1.CHESS_TYPES.CLASSICAL],
    }),
    __metadata("design:type", String)
], ChessGame.prototype, "category", void 0);
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
], ChessGame.prototype, "control", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: user_1.User.name,
        required: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChessGame.prototype, "winner", void 0);
ChessGame = __decorate([
    (0, mongoose_1.Schema)({ versionKey: false, timestamps: true })
], ChessGame);
exports.ChessGame = ChessGame;
exports.ChessGameSchema = mongoose_1.SchemaFactory.createForClass(ChessGame);
exports.ChessGameSchema.virtual("public").get(function () {
    const { _id, white, black, winner, pgn, type, control } = this;
    return {
        id: _id,
        white: white.public,
        black: black.public,
        winner: winner.public,
        pgn,
        type,
        control,
    };
});
//# sourceMappingURL=chess-game.schema.js.map