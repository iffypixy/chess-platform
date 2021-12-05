declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production";
    BACKEND_URL: string;
  }
}
