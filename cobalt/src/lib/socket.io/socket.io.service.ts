import {Injectable} from "@nestjs/common";
import {NextFunction, Request, Response} from "express";
import {Types} from "mongoose";
import {Server, Socket} from "socket.io";

import {session} from "@lib/session";

@Injectable()
export class SocketIoService {
  public server: Server;

  public getSocketsByUserId(id: Types.ObjectId): Socket[] {
    const sockets: Socket[] = [];

    for (const socket of this.server.sockets.sockets.values() as IterableIterator<Socket>) {
      if (String(socket.request.session.user._id) === String(id)) sockets.push(socket);
    }

    return sockets;
  }

  public useAuthMiddleware() {
    this.server.use((socket: Socket, next: NextFunction) => {
      session()(socket.request as unknown as Request, {} as Response, next);
    });
  }
}
