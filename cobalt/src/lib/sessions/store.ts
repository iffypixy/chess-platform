import * as connectRedis from "connect-redis";
import * as session from "express-session";
import * as redis from "redis";

const RedisStore = connectRedis(session);

const redisClient = redis.createClient({
  host: "localhost",
  port: 6379,
});

export const store = new RedisStore({client: redisClient});
