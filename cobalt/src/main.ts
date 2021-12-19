import {NestFactory} from "@nestjs/core";
import {ValidationPipe} from "@nestjs/common";

import {RedisIoAdapter} from "@lib/socket.io";
import {constants} from "@lib/constants";
import {session, setupStore} from "@lib/session";
import {setupRedis} from "@lib/redis";
import {AppModule} from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      credentials: true,
      origin: constants.ORIGIN,
    },
  });

  setupRedis();
  setupStore();

  app.use(session());
  app.useGlobalPipes(new ValidationPipe({transform: true}));
  app.useWebSocketAdapter(new RedisIoAdapter(app));

  app.setGlobalPrefix("api");

  await app.listen(process.env.PORT);
}

bootstrap();
