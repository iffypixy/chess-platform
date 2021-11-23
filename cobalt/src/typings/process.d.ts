import "process";

declare module "process" {
  global {
    namespace NodeJS {
      interface ProcessEnv {
        REDIS_HOST: string;
        REDIS_PORT: string;
      }
    }
  }
}
