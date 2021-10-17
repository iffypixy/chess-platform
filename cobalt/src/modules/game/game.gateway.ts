import {WebSocketGateway} from "@nestjs/websockets";

import {constants} from "@lib/constants";

@WebSocketGateway({
  cors: {
    origin: constants.ORIGIN,
    credentials: true,
  },
})
export class GameGateway {}
