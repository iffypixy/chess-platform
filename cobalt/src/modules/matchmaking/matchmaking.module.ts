import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";

import {UserModule} from "@modules/user";
import {Match, MatchPlayer, MatchPlayerSchema, MatchSchema} from "./schemas";
import {MatchService, MatchPlayerService} from "./services";
import {MatchmakingGateway} from "./matchmaking.gateway";
import {MatchmakingController} from "./matchmaking.controller";

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      {name: Match.name, schema: MatchSchema},
      {name: MatchPlayer.name, schema: MatchPlayerSchema},
    ]),
  ],
  providers: [MatchService, MatchPlayerService, MatchmakingGateway],
  controllers: [MatchmakingController],
})
export class MatchmakingModule {}
