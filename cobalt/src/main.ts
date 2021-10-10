import {NestFactory} from "@nestjs/core";
import {ValidationPipe} from "@nestjs/common";
import * as session from "express-session";
import * as connectRedis from "connect-redis";
import * as redis from "redis";

import {AppModule} from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const RedisStore = connectRedis(session);

  const redisClient = redis.createClient({
    host: "localhost",
    port: 6379,
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        maxAge: 2629800000,
        httpOnly: true,
      },
      store: new RedisStore({client: redisClient}),
    }),
  );

  app.useGlobalPipes(new ValidationPipe({transform: true}));

  await app.listen(3000);
}

bootstrap();
