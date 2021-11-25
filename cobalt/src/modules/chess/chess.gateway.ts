import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  WsException,
} from "@nestjs/websockets";
import {Server, Socket} from "socket.io";
import {nanoid} from "nanoid";
import {NextFunction, Request, Response} from "express";
import {Chess} from "chess.js";
import {Types} from "mongoose";
import process from "process";

import {UserData, UserService} from "@modules/user";
import {constants} from "@lib/constants";
import {SocketIoService} from "@lib/socket.io";
import {redis} from "@lib/redis";
import {session} from "@lib/session";
import {ChessControl, ChessEntity, ChessPlayer, ChessType, ChessSide, ChessResult} from "./typings";
import {ChessService} from "./chess.service";
import {
  AcceptDrawDto,
  DeclineDrawDto,
  JoinQueueDto,
  MakeMoveDto,
  ResignDto,
  OfferDrawDto,
  PremoveDto,
} from "./dtos/gateways";
import {MATCHMAKING, CHESS_NOTATION, CHESS_TYPES} from "./lib/constants";

const serverEvents = {
  JOIN_QUEUE: "join-queue",
  MAKE_MOVE: "make-move",
  RESIGN: "resign",
  OFFER_DRAW: "offer-draw",
  ACCEPT_DRAW: "accept-draw",
  DECLINE_DRAW: "decline-draw",
  PREMOVE: "premove",
};

const clientEvents = {
  MOVE: "move",
  DRAW: "draw",
  MATCH_FOUND: "match-found",
  VICTORY: "victory",
  LOSS: "loss",
  ABORT: "abort",
  DRAW_OFFER: "draw-offer",
  DRAW_OFFER_DECLINE: "draw-offer-decline",
};

interface QueueEntity {
  userId: Types.ObjectId;
  start: number;
  rating: number;
  control: ChessControl;
}

const controlToType = ({time, delay, increment}: ChessControl): ChessType => {
  const overall = (time + delay * 45 + increment * 45) / 1000;

  if (overall <= 2) return CHESS_TYPES.BULLET;
  else if (overall <= 7) return CHESS_TYPES.BLITZ;
  else if (overall <= 20) return CHESS_TYPES.RAPID;
  else if (overall > 20) return CHESS_TYPES.CLASSICAL;
};

const getResult = (
  game: ChessEntity,
): {
  result: ChessResult;
  winner: ChessPlayer;
  loser: ChessPlayer;
  change: number;
} | null => {
  const engine = new Chess(game.notation.fen);

  const turn: ChessSide = engine.turn() === "w" ? "white" : "black";
  const opposite: ChessSide = turn === "white" ? "black" : "white";

  const isCheckmate = engine.in_checkmate();
  const isDraw =
    engine.in_draw() || engine.in_stalemate() || engine.in_threefold_repetition() || engine.insufficient_material();

  if (isCheckmate) {
    const winner = game[opposite];
    const loser = game[turn];

    const difference = Math.abs(Math.round((loser.rating - winner.rating) / 5));
    const change = MATCHMAKING.RATING_GAIN + difference;

    return {
      result: "1:0",
      winner,
      loser,
      change,
    };
  } else if (isDraw) {
    const [winner, loser] = [game[turn], game[opposite]].sort((a, b) => a.rating - b.rating);

    const change = Math.abs(Math.round((winner.rating - loser.rating) / 5));

    return {
      result: "1/2:1/2",
      winner,
      loser,
      change,
    };
  }

  return null;
};

@WebSocketGateway({
  cors: {
    origin: constants.ORIGIN,
    credentials: true,
  },
})
export class ChessGateway implements OnGatewayInit, OnGatewayDisconnect {
  constructor(
    private readonly userService: UserService,
    private readonly chessService: ChessService,
    private readonly service: SocketIoService,
  ) {}

  @WebSocketServer()
  server: Server;

  private queueInterval: NodeJS.Timer | null = null;

  afterInit(): void {
    this.server.use((socket: Socket, next: NextFunction) => {
      session()(socket.request as unknown as Request, {} as Response, next);
    });

    this.queueInterval = setInterval(async () => {
      const jsons = await redis.lrange("queue", 0, -1);
      const queue = jsons.map((json) => JSON.parse(json)).filter(Boolean);

      for (let i = 0; i < queue.length; i++) {
        const {userId, start, control, rating} = queue[i];

        const opponent = queue
          .filter(
            (entity) =>
              !userId.equals(entity.userId) &&
              control.time === entity.control.time &&
              control.delay === entity.control.delay &&
              control.increment === entity.control.increment,
          )
          .sort((a, b) => Math.abs(Math.abs(rating - a.rating) - Math.abs(rating - b.rating)))[0];

        const isOpponentRelevant =
          Math.abs(rating - opponent.rating) <= MATCHMAKING.MAX_RATING_DIFFERENCE ||
          Date.now() - start >= MATCHMAKING.MAX_WAIT_TIME;

        if (isOpponentRelevant) {
          const id = nanoid();

          const white = await this.userService.findById(userId);
          const black = await this.userService.findById(opponent.userId);

          if (!(white && black)) return;

          const game: ChessEntity = {
            control,
            premove: null,
            type: controlToType(control),
            white: {
              id: white._id,
              clock: control.time,
              last: null,
              rating,
            },
            black: {
              id: black._id,
              clock: control.time,
              rating: opponent.rating,
              last: null,
            },
            flags: {
              hasDrawBeenOffered: false,
              isDrawOfferValid: false,
              isStarted: false,
            },
            notation: {
              fen: CHESS_NOTATION.INITIAL_FEN,
              pgn: null,
            },
          };

          redis.set(id, JSON.stringify(game));

          const sockets = [
            ...this.service.getSocketsByUserId(white._id),
            ...this.service.getSocketsByUserId(black._id),
          ];

          this.server.to(sockets).emit(clientEvents.MATCH_FOUND, {
            game: {
              white: {
                user: white.public,
                rating,
              },
              black: {
                user: black.public,
                rating: opponent.rating,
              },
              control,
            },
          });

          redis.pexpire(`clock:${id}`, MATCHMAKING.INIT_TIME);
        }
      }
    }, 1000);
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const {user} = socket.request.session;

    const jsons = await redis.lrange("queue", 0, -1);

    redis.del("queue");

    jsons.forEach((json) => {
      const entity: QueueEntity = JSON.parse(json);

      const isRelevant = String(entity.userId) !== String(user._id);

      if (isRelevant) redis.lpush("queue", json);
    });
  }

  @SubscribeMessage(serverEvents.JOIN_QUEUE)
  async joinQueue(@ConnectedSocket() socket: Socket, body: JoinQueueDto): Promise<void> {
    const {user} = socket.request.session;

    const control: ChessControl = {
      delay: body.delay,
      increment: body.increment,
      time: body.time,
    };

    const entity: QueueEntity = {
      userId: user._id,
      start: Date.now(),
      rating: user[controlToType(control)].rating,
      control,
    };

    const jsons = await redis.lrange("queue", 0, -1);

    const doesAlreadyExist = jsons.some((json) => {
      const entity: QueueEntity = JSON.parse(json);

      return (entity && String(entity.userId)) === String(user._id);
    });

    if (doesAlreadyExist) throw new WsException("You are already in the queue");

    redis.lpush("queue", JSON.stringify(entity));
  }

  @SubscribeMessage(serverEvents.MAKE_MOVE)
  async makeMove(@ConnectedSocket() socket: Socket, @MessageBody() body: MakeMoveDto): Promise<void> {
    const {user} = socket.request.session;

    const hrtime = process.hrtime();
    const now = hrtime[0] * 1000000 + hrtime[1] / 1000;

    const json = await redis.get(`game:${body.gameId}`);
    const game: ChessEntity = JSON.parse(json);

    if (!game) throw new WsException("Invalid game");

    const isWhite = String(game.white.id) === String(user._id);
    const isBlack = String(game.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) throw new WsException("You have no permission to make move");

    const engine = new Chess(game.notation.fen);

    const turn = engine.turn() === "w" ? "white" : "black";
    const opposite = turn === "white" ? "black" : "white";

    const isTurn = (isWhite && turn === "white") || (isBlack && turn === "black");

    if (!isTurn) throw new WsException("It is not your turn to make move");

    const move = engine.move(body.move);

    if (!move) throw new WsException("Invalid move");

    redis.set(`timeout: ${body.gameId}`, null);
    redis.set(`delay: ${body.gameId}`, null);

    const taken = game.flags.isStarted ? now - game[opposite].last : 0;

    game[turn].clock -= taken;
    game[turn].clock += game.control.increment;

    engine.set_comment(`clk:${game[turn].clock}`);

    game.flags.isStarted = engine.history.length >= 2;

    const sockets = [
      ...this.service.getSocketsByUserId(game["white"].id),
      ...this.service.getSocketsByUserId(game["black"].id),
    ];

    this.server.to(sockets).emit(clientEvents.MOVE, {
      move: move.san,
      clock: {
        white: game["white"].clock,
        black: game["black"].clock,
      },
    });

    const handleOver = async () => {
      const {result, winner, loser, change} = getResult(game);

      const isResultative = result === "1:0";
      const isDraw = result === "1/2:1/2";

      await this.userService.updateOne({_id: winner.id}, {[game.type]: {rating: winner.rating + change}});
      await this.userService.updateOne({_id: loser.id}, {[game.type]: {rating: loser.rating - change}});

      await this.chessService.create({
        white: game.white.id,
        black: game.black.id,
        control: game.control,
        winner: isResultative ? winner.id : null,
        pgn: engine.pgn(),
        fen: engine.fen(),
        type: game.type,
      });

      this.server
        .to(this.service.getSocketsByUserId(winner.id))
        .emit(isDraw ? clientEvents.DRAW : clientEvents.VICTORY, {
          rating: winner.rating + change,
          clock: winner.clock,
          change,
        });

      this.server.to(this.service.getSocketsByUserId(loser.id)).emit(isDraw ? clientEvents.DRAW : clientEvents.LOSS, {
        rating: loser.rating - change,
        clock: loser.clock,
        change: -change,
      });
    };

    const isOver = engine.game_over();

    if (isOver) return handleOver();

    const premove = !!game.premove && engine.move(game.premove);

    if (!!premove) {
      engine.set_comment(`clk:${game[opposite].clock}`);

      game.flags.isStarted = engine.history.length >= 2;

      this.server.to(sockets).emit(clientEvents.MOVE, {
        move: premove.san,
        clock: {
          white: game.white.clock,
          black: game.black.clock,
        },
      });

      const isOver = engine.game_over();

      if (isOver) return handleOver();
    }

    redis.pexpire(`delay:${body.gameId}`, game.control.delay);

    redis.set(`game:${body.gameId}`, JSON.stringify(game));
  }

  @SubscribeMessage(serverEvents.RESIGN)
  async resign(@ConnectedSocket() socket: Socket, @MessageBody() body: ResignDto): Promise<void> {
    const {user} = socket.request.session;

    const json = await redis.get(`game:${body.gameId}`);
    const game: ChessEntity = JSON.parse(json);

    if (!game) throw new WsException("Invalid game");

    const isWhite = String(game.white.id) === String(user._id);
    const isBlack = String(game.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) throw new WsException("You have no permission to make move");

    const loser = isWhite ? game.white : game.black;
    const winner = isWhite ? game.black : game.white;

    const difference = Math.round((loser.rating - winner.rating) / 5);
    const change = MATCHMAKING.RATING_GAIN + difference;

    const type = controlToType(game.control);

    await this.userService.updateOne({_id: loser.id}, {[type]: {rating: loser.rating - change}});
    await this.userService.updateOne({_id: winner.id}, {[type]: {rating: winner.rating + change}});

    await this.chessService.create({
      white: game.white.id,
      black: game.black.id,
      control: game.control,
      winner: winner.id,
      pgn: game.notation.pgn,
      fen: game.notation.fen,
      type,
    });

    this.server.to(this.service.getSocketsByUserId(loser.id)).emit(clientEvents.LOSS, {
      rating: loser.rating - change,
      loss: -change,
      clock: loser.clock,
    });

    this.server.to(this.service.getSocketsByUserId(winner.id)).emit(clientEvents.VICTORY, {
      rating: winner.rating + change,
      gain: change,
      clock: winner.clock,
    });

    redis.del(`game:${body.gameId}`);
  }

  @SubscribeMessage(serverEvents.OFFER_DRAW)
  async offerDraw(@ConnectedSocket() socket: Socket, @MessageBody() body: OfferDrawDto): Promise<void> {
    const {user} = socket.request.session;

    const json = await redis.get(`game:${body.gameId}`);
    const game: ChessEntity = JSON.parse(json);

    if (!game) throw new WsException("Invalid game");

    const isWhite = String(game.white.id) === String(user._id);
    const isBlack = String(game.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) throw new WsException("You have no permission to make move");

    if (game.flags.hasDrawBeenOffered) throw new WsException("Draw has been already offered");

    game.flags.hasDrawBeenOffered = true;
    game.flags.isDrawOfferValid = true;

    const opponent = isWhite ? game.black : game.white;

    this.server.to(this.service.getSocketsByUserId(opponent.id)).emit(clientEvents.DRAW_OFFER);

    redis.pexpire(`draw-timeout:${body.gameId}`, MATCHMAKING.DRAW_OFFER_DURATION);

    redis.set(`game:${body.gameId}`, JSON.stringify(game));
  }

  @SubscribeMessage(serverEvents.ACCEPT_DRAW)
  async acceptDraw(@ConnectedSocket() socket: Socket, @MessageBody() body: AcceptDrawDto) {
    const {user} = socket.request.session;

    const json = await redis.get(`game:${body.gameId}`);
    const game: ChessEntity = JSON.parse(json);

    if (!game) throw new WsException("Invalid game");

    const isWhite = String(game.white.id) === String(user._id);
    const isBlack = String(game.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) throw new WsException("You have no permission to make move");

    if (!game.flags.isDrawOfferValid) throw new WsException("Draw offer is not valid");

    const [underdog, favourite] = [game.white, game.black].sort((a, b) => a.rating - b.rating);

    const change = Math.round((underdog.rating - favourite.rating) / 5);

    const type = controlToType(game.control);

    await this.userService.updateOne({_id: underdog.id}, {[type]: {rating: underdog.rating + change}});
    await this.userService.updateOne({_id: favourite.id}, {[type]: {rating: favourite.rating - change}});

    await this.chessService.create({
      white: game.white.id,
      black: game.black.id,
      control: game.control,
      winner: null,
      pgn: game.notation.pgn,
      fen: game.notation.fen,
      type,
    });

    this.server.to(this.service.getSocketsByUserId(underdog.id)).emit(clientEvents.DRAW, {
      change,
      rating: underdog.rating + change,
      clock: underdog.clock,
    });

    this.server.to(this.service.getSocketsByUserId(favourite.id)).emit(clientEvents.DRAW, {
      rating: favourite.rating - change,
      change: -change,
      clock: favourite.clock,
    });

    redis.del(`game:${body.gameId}`);
  }

  @SubscribeMessage(serverEvents.DECLINE_DRAW)
  async declineDraw(@ConnectedSocket() socket: Socket, @MessageBody() body: DeclineDrawDto): Promise<void> {
    const {user} = socket.request.session;

    const json = await redis.get(`game:${body.gameId}`);
    const game: ChessEntity = JSON.parse(json);

    if (!game) throw new WsException("Invalid game");

    const isWhite = String(game.white.id) === String(user._id);
    const isBlack = String(game.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) throw new WsException("You have no permission to make move");

    if (!game.flags.isDrawOfferValid) throw new WsException("Draw offer is not valid");

    const opponent = isWhite ? game.black : game.white;

    this.server.to(this.service.getSocketsByUserId(opponent.id)).emit(clientEvents.DRAW_OFFER_DECLINE);
  }

  @SubscribeMessage(serverEvents.PREMOVE)
  async premove(@ConnectedSocket() socket: Socket, @MessageBody() body: PremoveDto): Promise<void> {
    const {user} = socket.request.session;

    const json = await redis.get(`game:${body.gameId}`);
    const game: ChessEntity = JSON.parse(json);

    if (!game) throw new WsException("Invalid game");

    const isWhite = String(game.white.id) === String(user._id);
    const isBlack = String(game.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) throw new WsException("You have no permission to make move");

    const engine = new Chess(game.notation.fen);

    const turn = engine.turn() === "w" ? "white" : "black";

    const isTurn = (isWhite && turn === "white") || (isBlack && turn === "black");

    if (isTurn) throw new WsException("It is your turn to make move");

    game.premove = body.move;

    redis.set(`game:${body.gameId}`, JSON.stringify(game));
  }
}
