import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";

import {UserModule} from "@modules/user";
import {Game, GameSchema} from "./schemas";
import {GameService} from "./game.service";
import {GameGateway} from "./game.gateway";

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{name: Game.name, schema: GameSchema}]),
  ],
  providers: [GameService, GameGateway],
})
export class GameModule {}
