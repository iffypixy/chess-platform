import {Injectable} from "@nestjs/common";
import {Types} from "mongoose";
import {Server, Socket} from "socket.io";

@Injectable()
export class SocketIoService {
  server: Server;

  public getSocketsByUserId(id: Types.ObjectId): string[] {
    const sockets: string[] = [];

    for (const socket of this.server.sockets.sockets.values() as IterableIterator<Socket>) {
      if (socket.request.session.user._id.equals(id)) sockets.push(socket.id);
    }

    return sockets;
  }
}
