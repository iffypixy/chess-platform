import {Controller, Get} from "@nestjs/common";

import {ChessService} from "./chess.service";
import {ChessGamePublicData} from "./schemas";

@Controller("chess")
export class ChessController {
  constructor(private readonly chessService: ChessService) {}

  @Get("random")
  async getRandom(): Promise<{ChessGame: ChessGamePublicData}> {
    const amount = await this.chessService.count();
    const random = Math.floor(Math.random() * amount);

    const ChessGame = await this.chessService.findOne({}, {skip: random});

    return {
      ChessGame: ChessGame.public,
    };
  }
}
