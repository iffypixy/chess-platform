import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";
import {ConfigModule, ConfigService} from "@nestjs/config";
import {ScheduleModule} from "@nestjs/schedule";

import {AuthModule} from "@modules/auth";
import {UserModule} from "@modules/user";
import {MatchmakingModule} from "@modules/matchmaking";
import {SocketIoModule} from "@lib/socket.io";
import {databaseConfig} from "@config/index";

const env = process.env.NODE_ENV;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: !!env ? `.env.${env}` : ".env.development",
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("database.uri"),
        useCreateIndex: true,
      }),
    }),
    ScheduleModule.forRoot(),
    SocketIoModule,
    UserModule,
    AuthModule,
    MatchmakingModule,
  ],
})
export class AppModule {}
