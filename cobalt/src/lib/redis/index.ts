import * as redis from "redis";

export const redisClient = redis.createClient({
  host: "localhost",
  port: 6379,
});