import { OnGatewayDisconnect, OnGatewayInit } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UserService } from "@modules/user";
import { SocketIoService } from "@lib/socket.io";
import { ChessService } from "./chess.service";
import { AcceptDrawDto, DeclineDrawDto, JoinQueueDto, MakeMoveDto, ResignDto, OfferDrawDto, PremoveDto } from "./dtos/gateways";
export declare class ChessGateway implements OnGatewayInit, OnGatewayDisconnect {
    private readonly userService;
    private readonly chessService;
    private readonly service;
    constructor(userService: UserService, chessService: ChessService, service: SocketIoService);
    server: Server;
    private queueInterval;
    afterInit(): void;
    handleDisconnect(socket: Socket): Promise<void>;
    joinQueue(socket: Socket, body: JoinQueueDto): Promise<void>;
    makeMove(socket: Socket, body: MakeMoveDto): Promise<void>;
    resign(socket: Socket, body: ResignDto): Promise<void>;
    offerDraw(socket: Socket, body: OfferDrawDto): Promise<void>;
    acceptDraw(socket: Socket, body: AcceptDrawDto): Promise<void>;
    declineDraw(socket: Socket, body: DeclineDrawDto): Promise<void>;
    premove(socket: Socket, body: PremoveDto): Promise<void>;
}
