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
exports.MatchPlayerSchema = exports.MatchPlayer = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_1 = require("../../user");
let MatchPlayer = class MatchPlayer {
};
__decorate([
    (0, mongoose_1.Prop)({
        type: mongoose_2.Types.ObjectId,
        ref: user_1.User.name,
        required: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], MatchPlayer.prototype, "user", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Number,
        required: true,
    }),
    __metadata("design:type", Number)
], MatchPlayer.prototype, "rating", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Number,
        required: true,
    }),
    __metadata("design:type", Number)
], MatchPlayer.prototype, "shift", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: ["victory", "lose", "draw"],
    }),
    __metadata("design:type", String)
], MatchPlayer.prototype, "result", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: ["white", "black"],
    }),
    __metadata("design:type", String)
], MatchPlayer.prototype, "side", void 0);
MatchPlayer = __decorate([
    (0, mongoose_1.Schema)({ versionKey: false, timestamps: true })
], MatchPlayer);
exports.MatchPlayer = MatchPlayer;
exports.MatchPlayerSchema = mongoose_1.SchemaFactory.createForClass(MatchPlayer);
exports.MatchPlayerSchema.virtual("public").get(function () {
    const { _id, user, rating, shift, result, side } = this;
    return {
        id: _id,
        user: user.public,
        rating,
        shift,
        result,
        side,
    };
});
//# sourceMappingURL=match-player.js.map