"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("./lib/socket.io");
const constants_1 = require("./lib/constants");
const session_1 = require("./lib/session");
const redis_1 = require("./lib/redis");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: {
            credentials: true,
            origin: constants_1.constants.ORIGIN,
        },
    });
    (0, redis_1.setupRedis)();
    (0, session_1.setupStore)();
    app.use((0, session_1.session)());
    app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
    app.setGlobalPrefix("api");
    await app.listen(process.env.PORT);
}
bootstrap();
//# sourceMappingURL=main.js.map