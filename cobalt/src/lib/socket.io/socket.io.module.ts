import {Global, Module} from "@nestjs/common";

import {SocketIoService} from "./socket.io.service";
import {SocketIoGateway} from "./socket.io.gateway";

@Global()
@Module({
  providers: [SocketIoGateway, SocketIoService],
  exports: [SocketIoService],
})
export class SocketIoModule {}
