import {registerAs} from "@nestjs/config";

export const sessionConfig = registerAs("session", () => ({
  secret: process.env.SESSION_SECRET,
}));
