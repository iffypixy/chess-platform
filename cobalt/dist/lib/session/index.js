"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.session = exports.setupStore = void 0;
const sess = require("express-session");
const connectRedis = require("connect-redis");
const redis_1 = require("../redis");
const RedisStore = connectRedis(sess);
let store = null;
const setupStore = () => {
    store = new RedisStore({ client: redis_1.redis });
};
exports.setupStore = setupStore;
const session = () => sess({
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
exports.session = session;
//# sourceMappingURL=index.js.map