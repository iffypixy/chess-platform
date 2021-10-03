import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";
import {ConfigModule, ConfigService} from "@nestjs/config";

import {AuthModule} from "@modules/auth";
import {UserModule} from "@modules/user";

import {databaseConfig} from "./config";

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
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
