import {NestFactory} from "@nestjs/core";
import {ValidationPipe} from "@nestjs/common";

import {RedisIoAdapter} from "@lib/adapters";
import {constants} from "@lib/constants";
import {session} from "@lib/session";
import {Cluster} from "@lib/cluster";
import {AppModule} from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      credentials: true,
      origin: constants.ORIGIN,
    },
  });

  app.use(session());
  app.useGlobalPipes(new ValidationPipe({transform: true}));
  app.useWebSocketAdapter(new RedisIoAdapter(app));

  await app.listen(process.env.PORT);
}

Cluster.register(bootstrap);
