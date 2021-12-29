"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRedis = exports.redis = void 0;
const Redis = require("ioredis");
exports.redis = null;
const setupRedis = () => {
    exports.redis = new Redis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
    });
};
exports.setupRedis = setupRedis;
//# sourceMappingURL=index.js.map