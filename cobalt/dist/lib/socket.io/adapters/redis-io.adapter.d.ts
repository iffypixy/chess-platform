import { IoAdapter } from "@nestjs/platform-socket.io";
import { Server, ServerOptions } from "socket.io";
export declare class RedisIoAdapter extends IoAdapter {
    createIOServer(port: number, options?: ServerOptions): Server;
}
