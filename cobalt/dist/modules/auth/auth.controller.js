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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const user_1 = require("../user");
const dtos_1 = require("./dtos");
const guards_1 = require("./guards");
let AuthController = class AuthController {
    constructor(userService) {
        this.userService = userService;
    }
    async register({ username, password }, session) {
        const existed = await this.userService.findByUsername(username);
        if (existed)
            throw new common_1.BadRequestException("There is already a user with the same username");
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);
        const user = await this.userService.create({ username, password: hashed });
        session.user = user;
        return {
            credentials: user.public,
        };
    }
    async login(dto, session) {
        const user = await this.userService.findByUsername(dto.username);
        if (!user)
            throw new common_1.BadRequestException("Invalid credentials");
        const doPasswordsMatch = await bcrypt.compare(dto.password, user.password);
        if (!doPasswordsMatch)
            throw new common_1.BadRequestException("Invalid credentials");
        session.user = user;
        return {
            credentials: user.public,
        };
    }
    async getCredentials(session) {
        const user = this.userService.hydrate(session.user);
        return {
            credentials: user.public,
        };
    }
    async logout(session) {
        session.destroy((error) => {
            if (error)
                throw error;
        });
    }
};
__decorate([
    (0, common_1.Post)("register"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Session)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)("login"),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Session)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(guards_1.IsAuthenticatedGuard),
    (0, common_1.Get)("credentials"),
    __param(0, (0, common_1.Session)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getCredentials", null);
__decorate([
    (0, common_1.UseGuards)(guards_1.IsAuthenticatedGuard),
    (0, common_1.Post)("logout"),
    __param(0, (0, common_1.Session)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
AuthController = __decorate([
    (0, common_1.Controller)("auth"),
    __metadata("design:paramtypes", [user_1.UserService])
], AuthController);
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map