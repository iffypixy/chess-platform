import {OnGatewayInit, WebSocketGateway} from "@nestjs/websockets";
import {Server} from "socket.io";

import {constants} from "@lib/constants";
import {SocketIoService} from "./socket.io.service";

@WebSocketGateway(80, {
  cors: {
    origin: constants.ORIGIN,
    credentials: true,
  },
})
export class SocketIoGateway implements OnGatewayInit {
  constructor(private readonly socketIoService: SocketIoService) {}

  afterInit(server: Server) {
    this.socketIoService.server = server;
  }
}
