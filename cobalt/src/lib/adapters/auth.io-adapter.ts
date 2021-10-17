import {IoAdapter} from "@nestjs/platform-socket.io";
import {Server, ServerOptions} from "socket.io";
import {NextFunction, Request, Response} from "express";

import {Socket} from "@typings/";
import {session} from "@lib/sessions/index";

export class AuthIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);

    server.use((socket: Socket, next: NextFunction) => {
      session()(socket.request as unknown as Request, {} as Response, next);
    });

    return server;
  }
}
