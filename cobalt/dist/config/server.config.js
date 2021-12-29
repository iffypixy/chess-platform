"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverConfig = void 0;
const config_1 = require("@nestjs/config");
exports.serverConfig = (0, config_1.registerAs)("server", () => ({
    port: process.env.PORT,
}));
//# sourceMappingURL=server.config.js.map