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
exports.ChessController = void 0;
const common_1 = require("@nestjs/common");
const chess_service_1 = require("./chess.service");
let ChessController = class ChessController {
    constructor(chessService) {
        this.chessService = chessService;
    }
    async getRandom() {
        const amount = await this.chessService.count();
        const random = Math.floor(Math.random() * amount);
        const game = await this.chessService.findOne({}, { skip: random });
        return {
            game: game.public,
        };
    }
};
__decorate([
    (0, common_1.Get)("random"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChessController.prototype, "getRandom", null);
ChessController = __decorate([
    (0, common_1.Controller)("chess"),
    __metadata("design:paramtypes", [chess_service_1.ChessService])
], ChessController);
exports.ChessController = ChessController;
//# sourceMappingURL=chess.controller.js.map