import * as Redis from "ioredis";

export let redis: Redis.Redis = null;

export const setupRedis = () => {
  redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  });
};
