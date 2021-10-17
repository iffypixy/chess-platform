import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";

import {Game, GameSchema} from "./schemas";
import {GameService} from "./game.service";
import {GameGateway} from "./game.gateway";

@Module({
  imports: [MongooseModule.forFeature([{name: Game.name, schema: GameSchema}])],
  providers: [GameService, GameGateway],
})
export class GameModule {}