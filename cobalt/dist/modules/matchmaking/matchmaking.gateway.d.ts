import { OnGatewayDisconnect, OnGatewayInit } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { UserService } from "@modules/user";
import { SocketIoService, Acknowledgment } from "@lib/socket.io";
import { MatchService, MatchPlayerService } from "./services";
import { AcceptDrawDto, DeclineDrawDto, JoinQueueDto, MakeMoveDto, ResignDto, OfferDrawDto, PremoveDto, RemovePremoveDto, SpectateMatchDto, SendMessageDto } from "./dtos/gateways";
export declare class MatchmakingGateway implements OnGatewayInit, OnGatewayDisconnect {
    private readonly userService;
    private readonly matchService;
    private readonly matchPlayerService;
    private readonly service;
    constructor(userService: UserService, matchService: MatchService, matchPlayerService: MatchPlayerService, service: SocketIoService);
    server: Server;
    private queueTimeout;
    afterInit(): void;
    handleDisconnect(socket: Socket): Promise<void>;
    joinQueue(socket: Socket, body: JoinQueueDto): Promise<Acknowledgment>;
    makeMove(socket: Socket, body: MakeMoveDto): Promise<Acknowledgment>;
    resign(socket: Socket, body: ResignDto): Promise<Acknowledgment>;
    offerDraw(socket: Socket, body: OfferDrawDto): Promise<Acknowledgment>;
    acceptDraw(socket: Socket, body: AcceptDrawDto): Promise<Acknowledgment>;
    declineDraw(socket: Socket, body: DeclineDrawDto): Promise<Acknowledgment>;
    premove(socket: Socket, body: PremoveDto): Promise<Acknowledgment>;
    removePremove(socket: Socket, body: RemovePremoveDto): Promise<Acknowledgment>;
    spectateMatch(socket: Socket, body: SpectateMatchDto): Promise<Acknowledgment>;
    sendMessage(socket: Socket, body: SendMessageDto): Promise<Acknowledgment>;
}
