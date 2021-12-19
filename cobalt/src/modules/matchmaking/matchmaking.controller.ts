import {BadRequestException, Controller, Get, Param} from "@nestjs/common";
import {Chess} from "chess.js";

import {UserService} from "@modules/user";
import {redis} from "@lib/redis";
import {MatchService} from "./services";
import {MatchPublicData} from "./schemas";
import {MatchEntity, MatchEntityPublic} from "./typings";

@Controller("matches")
export class MatchmakingController {
  constructor(private readonly matchService: MatchService, private readonly userService: UserService) {}

  @Get("random")
  async getRandom(): Promise<{match: MatchPublicData}> {
    const amount = await this.matchService.count();
    const random = Math.floor(Math.random() * amount);

    const match = await this.matchService.findOne({}, {skip: random});

    return {
      match: match.public,
    };
  }

  @Get(":matchId")
  async get(
    @Param("matchId") matchId: string,
  ): Promise<{match: (MatchEntityPublic | MatchPublicData) & {isActual: boolean}}> {
    let json = await redis.get(`match:${matchId}`);

    if (json) {
      const match: MatchEntity = JSON.parse(json);

      const {id, control, pgn, type, fen, white, black, isDrawOfferValid, last} = match;

      const engine = new Chess(fen);
      const turn = engine.turn() === "w" ? "white" : "black";

      const entity = {
        id,
        control,
        pgn,
        isDrawOfferValid,
        type,
        fen,
        white: {
          user: this.userService.hydrate(white.user).public,
          rating: white.rating,
          side: white.side,
          clock: white.clock,
          hasOfferedDraw: white.hasOfferedDraw,
        },
        black: {
          user: this.userService.hydrate(black.user).public,
          rating: black.rating,
          side: black.side,
          clock: black.clock,
          hasOfferedDraw: black.hasOfferedDraw,
        },
        isActual: true,
      };

      entity[turn].clock = entity[turn].clock - (Date.now() - last);

      return {
        match: entity,
      };
    }

    const match = await this.matchService
      .findOne({sid: matchId})
      .populate([
        {
          path: "white",
          populate: {
            path: "user",
          },
        },
        {
          path: "black",
          populate: {
            path: "user",
          },
        },
        {
          path: "winner",
          populate: {
            path: "user",
          },
        },
      ])
      .exec();

    if (!match) throw new BadRequestException("Invalid match");

    return {
      match: {
        ...match.public,
        isActual: false,
      },
    };
  }
}
