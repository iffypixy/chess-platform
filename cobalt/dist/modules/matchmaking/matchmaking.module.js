"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const user_1 = require("../user");
const schemas_1 = require("./schemas");
const services_1 = require("./services");
const matchmaking_gateway_1 = require("./matchmaking.gateway");
const matchmaking_controller_1 = require("./matchmaking.controller");
let MatchmakingModule = class MatchmakingModule {
};
MatchmakingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            user_1.UserModule,
            mongoose_1.MongooseModule.forFeature([
                { name: schemas_1.Match.name, schema: schemas_1.MatchSchema },
                { name: schemas_1.MatchPlayer.name, schema: schemas_1.MatchPlayerSchema },
            ]),
        ],
        providers: [services_1.MatchService, services_1.MatchPlayerService, matchmaking_gateway_1.MatchmakingGateway],
        controllers: [matchmaking_controller_1.MatchmakingController],
    })
], MatchmakingModule);
exports.MatchmakingModule = MatchmakingModule;
//# sourceMappingURL=matchmaking.module.js.map