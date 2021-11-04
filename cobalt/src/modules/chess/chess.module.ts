import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";

import {UserModule} from "@modules/user";
import {ChessGame, ChessGameSchema} from "./schemas";
import {ChessService} from "./chess.service";
import {ChessGateway} from "./chess.gateway";

@Module({
  imports: [UserModule, MongooseModule.forFeature([{name: ChessGame.name, schema: ChessGameSchema}])],
  providers: [ChessService, ChessGateway],
})
export class ChessModule {}
