import {IoAdapter} from "@nestjs/platform-socket.io";
import {createAdapter} from "@socket.io/redis-adapter";
import {Server, ServerOptions} from "socket.io";

import {redis} from "@lib/redis";

export class RedisIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);

    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();

    const redisAdapter = createAdapter(pubClient, subClient);

    server.adapter(redisAdapter);

    return server;
  }
}
