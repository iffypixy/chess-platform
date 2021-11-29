import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";

import {UserModule} from "@modules/user";
import {ChessGame, ChessGameSchema} from "./schemas";
import {MatchmakingService} from "./services/matchmaking.service";
import {MatchmakingGateway} from "./matchmaking.gateway";

@Module({
  imports: [UserModule, MongooseModule.forFeature([{name: ChessGame.name, schema: ChessGameSchema}])],
  providers: [MatchmakingService, MatchmakingGateway],
})
export class MatchmakingModule {}
