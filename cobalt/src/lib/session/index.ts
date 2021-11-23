import * as sess from "express-session";
import * as connectRedis from "connect-redis";

import {redis} from "@lib/constants/redis";

const RedisStore = connectRedis(sess);

const store = new RedisStore({client: redis});

export const session = () =>
  sess({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 2629800000,
      httpOnly: true,
    },
    store,
  });
