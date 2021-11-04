import {Controller, Get} from "@nestjs/common";

import {GameService} from "./game.service";
import {GamePublicData} from "./schemas";

@Controller("games")
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get("random")
  async getRandom(): Promise<{game: GamePublicData}> {
    const amount = await this.gameService.count();
    const random = Math.floor(Math.random() * amount);

    const game = await this.gameService.findOne({}, {skip: random});

    return {
      game: game.public,
    };
  }
}
