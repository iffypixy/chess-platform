import {Global, Module} from "@nestjs/common";

import {SocketIoService} from "./socket.io.service";

@Global()
@Module({
  providers: [SocketIoService],
  exports: [SocketIoService],
})
export class SocketIoModule {}
