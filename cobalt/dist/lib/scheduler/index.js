"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduler = void 0;
const redis_1 = require("../redis");
exports.scheduler = {
    schedule: ({ id, cb, ms }) => {
        const timeout = setTimeout(cb, ms);
        const timeoutId = timeout[Symbol.toPrimitive]();
        const channel = `__keyevent@${redis_1.redis.options.db}__:del`;
        redis_1.redis.subscribe(channel, () => {
            redis_1.redis.on("message", (_, key) => {
                if (key === id) {
                    clearTimeout(timeoutId);
                }
            });
        });
        redis_1.redis.set(id, timeoutId);
    },
    unschedule: (id) => {
        redis_1.redis.del(id);
    },
};
//# sourceMappingURL=index.js.map