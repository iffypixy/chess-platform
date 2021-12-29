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
exports.UserSchema = exports.User = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let User = class User extends mongoose_2.Model {
};
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        unique: true,
        minlength: 5,
        maxlength: 20,
    }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        minlength: 8,
        maxlength: 256,
    }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, mongoose_1.Prop)((0, mongoose_1.raw)({
        rating: {
            type: Number,
            default: 1500,
            required: true,
        },
        calibrated: {
            type: Boolean,
            default: false,
            required: true,
        },
    })),
    __metadata("design:type", Object)
], User.prototype, "bullet", void 0);
__decorate([
    (0, mongoose_1.Prop)((0, mongoose_1.raw)({
        rating: {
            type: Number,
            default: 1500,
            required: true,
        },
        calibrated: {
            type: Boolean,
            default: false,
            required: true,
        },
    })),
    __metadata("design:type", Object)
], User.prototype, "rapid", void 0);
__decorate([
    (0, mongoose_1.Prop)((0, mongoose_1.raw)({
        rating: {
            type: Number,
            default: 1500,
            required: true,
        },
        calibrated: {
            type: Boolean,
            default: false,
            required: true,
        },
    })),
    __metadata("design:type", Object)
], User.prototype, "blitz", void 0);
__decorate([
    (0, mongoose_1.Prop)((0, mongoose_1.raw)({
        rating: {
            type: Number,
            default: 1500,
            required: true,
        },
        calibrated: {
            type: Boolean,
            default: false,
            required: true,
        },
    })),
    __metadata("design:type", Object)
], User.prototype, "classical", void 0);
User = __decorate([
    (0, mongoose_1.Schema)({ versionKey: false })
], User);
exports.User = User;
exports.UserSchema = mongoose_1.SchemaFactory.createForClass(User);
exports.UserSchema.virtual("public").get(function () {
    const { _id, username, bullet, blitz, rapid, classical } = this;
    return { id: _id, username, bullet, blitz, rapid, classical };
});
//# sourceMappingURL=user.schema.js.map