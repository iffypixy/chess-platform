"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = void 0;
const config_1 = require("@nestjs/config");
exports.databaseConfig = (0, config_1.registerAs)("database", () => ({
    uri: process.env.DATABASE_URI,
}));
//# sourceMappingURL=database.config.js.map