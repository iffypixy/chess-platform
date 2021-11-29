import {Controller, Get} from "@nestjs/common";

import {MatchmakingService} from "./services/matchmaking.service";
import {ChessGamePublicData} from "./schemas";

@Controller("mm")
export class MatchmakingController {
  constructor(private readonly mmService: MatchmakingService) {}

  @Get("random")
  async getRandom(): Promise<{game: ChessGamePublicData}> {
    const amount = await this.mmService.count();
    const random = Math.floor(Math.random() * amount);

    const game = await this.mmService.findOne({}, {skip: random});

    return {
      game: game.public,
    };
  }
}
