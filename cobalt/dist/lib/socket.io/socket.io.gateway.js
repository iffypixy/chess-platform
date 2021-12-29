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
exports.SocketIoGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const constants_1 = require("../constants");
const socket_io_service_1 = require("./socket.io.service");
let SocketIoGateway = class SocketIoGateway {
    constructor(socketIoService) {
        this.socketIoService = socketIoService;
    }
    afterInit(server) {
        this.socketIoService.server = server;
    }
};
SocketIoGateway = __decorate([
    (0, websockets_1.WebSocketGateway)(80, {
        cors: {
            origin: constants_1.constants.ORIGIN,
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [socket_io_service_1.SocketIoService])
], SocketIoGateway);
exports.SocketIoGateway = SocketIoGateway;
//# sourceMappingURL=socket.io.gateway.js.map