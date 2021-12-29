import { OnGatewayInit } from "@nestjs/websockets";
import { Server } from "socket.io";
import { SocketIoService } from "./socket.io.service";
export declare class SocketIoGateway implements OnGatewayInit {
    private readonly socketIoService;
    constructor(socketIoService: SocketIoService);
    afterInit(server: Server): void;
}
