import {Controller, Get} from "@nestjs/common";

import {GameService} from "./game.service";
import {GamePublicData} from "./schemas";

@Controller("games")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get("random")
  async getRandom(): Promise<{game: GamePublicData}> {
    const amount = await this.gameService.count();

    const game = await this.gameService.findOne({}, {skip: amount});

    return {
      game: game.public,
    };
  }
}
