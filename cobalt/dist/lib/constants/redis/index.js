"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const Redis = require("ioredis");
exports.redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.PROCESS_PORT),
});
//# sourceMappingURL=index.js.map