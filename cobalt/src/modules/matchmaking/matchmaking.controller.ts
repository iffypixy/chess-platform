import {BadRequestException, Controller, Get, Param} from "@nestjs/common";

import {UserService} from "@modules/user";
import {Chess} from "@lib/chess.js";
import {redis} from "@lib/redis";
import {MatchPlayerService, MatchService} from "./services";
import {MatchPublicData} from "./schemas";
import {MatchEntity, MatchEntityPublic} from "./typings";

@Controller("matches")
export class MatchmakingController {
  constructor(
    private readonly matchService: MatchService,
    private readonly userService: UserService,
    private readonly matchPlayerService: MatchPlayerService,
  ) {}

  @Get("random")
  async getRandom(): Promise<{match: MatchPublicData}> {
    const amount = await this.matchService.count();
    const random = Math.floor(Math.random() * amount);

    const match = await this.matchService.findOne({}, {skip: random});

    return {
      match: match.public,
    };
  }

  @Get("users/:username")
  async getUsersMatches(@Param("username") username: string): Promise<{matches: MatchPublicData[]}> {
    const user = await this.userService.findByUsername(username);

    if (!user) throw new BadRequestException("No user found");

    const players = await this.matchPlayerService.find({user: user._id}).exec();

    const matches = [];

    for (let i = 0; i < players.length; i++) {
      const match = await this.matchService
        .findOne({$or: [{white: players[i]._id}, {black: players[i]._id}]})
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

      if (!!match) matches.push(match.public);
    }

    return {matches: matches.reverse()};
  }

  @Get(":matchId")
  async get(
    @Param("matchId") matchId: string,
  ): Promise<{match: (MatchEntityPublic | MatchPublicData) & {isCompleted: boolean}}> {
    let json = await redis.get(`match:${matchId}`);

    if (json) {
      const match: MatchEntity = JSON.parse(json);

      const {id, control, pgn, type, fen, white, black, last} = match;

      const engine = new Chess(fen);
      const turn = engine.turn() === "w" ? "white" : "black";

      const entity: MatchEntityPublic & {isCompleted: boolean} = {
        id,
        control,
        pgn,
        type,
        fen,
        white: {
          user: this.userService.hydrate(white.user).public,
          rating: white.rating,
          side: white.side,
          clock: white.clock,
          hasOfferedDraw: white.hasOfferedDraw,
          isDrawOfferValid: white.isDrawOfferValid,
        },
        black: {
          user: this.userService.hydrate(black.user).public,
          rating: black.rating,
          side: black.side,
          clock: black.clock,
          hasOfferedDraw: black.hasOfferedDraw,
          isDrawOfferValid: black.isDrawOfferValid,
        },
        isCompleted: false,
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
        isCompleted: true,
      },
    };
  }
}
