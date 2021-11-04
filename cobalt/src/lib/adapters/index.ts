import {IoAdapter} from "@nestjs/platform-socket.io";
import {Server, ServerOptions, Socket} from "socket.io";
import {NextFunction, Request, Response} from "express";

import {session} from "@lib/session";

export class AuthIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);

    server.use((socket: Socket, next: NextFunction) => {
      session()(socket.request as unknown as Request, {} as Response, next);
    });

    return server;
  }
}
