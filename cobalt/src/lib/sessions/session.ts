import * as expressSession from "express-session";

import {store} from "./store";

export const session = () =>
  expressSession({
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
