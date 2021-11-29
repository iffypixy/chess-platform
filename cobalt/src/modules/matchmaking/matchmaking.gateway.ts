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
import {Chess} from "chess.js";
import {Types} from "mongoose";
import process from "process";

import {UserData, UserService} from "@modules/user";
import {constants} from "@lib/constants";
import {SocketIoService} from "@lib/socket.io";
import {redis} from "@lib/redis";
import {ChessControl, ChessEntity, ChessPlayer, ChessType, ChessSide, ChessResult} from "./typings";
import {MatchmakingService} from "./services/matchmaking.service";
import {
  AcceptDrawDto,
  DeclineDrawDto,
  JoinQueueDto,
  MakeMoveDto,
  ResignDto,
  OfferDrawDto,
  PremoveDto,
} from "./dtos/gateways";
import {MATCHMAKING, CHESS_TYPES} from "./lib/constants";
import {elo} from "./lib/elo";

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

interface GetResultReturn {
  result: ChessResult;
  winner: ChessPlayer;
  loser: ChessPlayer;
  change: number;
}

@WebSocketGateway({
  cors: {
    origin: constants.ORIGIN,
    credentials: true,
  },
})
export class MatchmakingGateway implements OnGatewayInit, OnGatewayDisconnect {
  constructor(
    private readonly userService: UserService,
    private readonly mmService: MatchmakingService,
    private readonly service: SocketIoService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(): void {
    this.service.server = this.server;

    this.service.useAuthMiddleware();
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
      const isResultative = engine.in_checkmate();
      const isDraw = !isResultative;

      if (isResultative) {
        const winner = game[turn];
        const loser = game[opposite];

        const result = elo.calculateVictory({winner: winner.rating, loser: loser.rating});

        await this.userService.updateOne({_id: winner.id}, {[game.type]: {rating: result.winner}});
        await this.userService.updateOne({_id: loser.id}, {[game.type]: {rating: result.loser}});

        this.server.to(this.service.getSocketsByUserId(winner.id)).emit(clientEvents.VICTORY, {
          rating: result.winner,
          clock: winner.clock,
          shift: result.shift,
        });

        this.server.to(this.service.getSocketsByUserId(loser.id)).emit(clientEvents.LOSS, {
          rating: result.loser,
          clock: loser.clock,
          shift: -result.shift,
        });
      } else if (isDraw) {
        const [underdog, favourite] = [game[turn], game[opposite]].sort((a, b) => a.rating - b.rating);

        const result = elo.calculateDraw({underdog: underdog.rating, favourite: favourite.rating});

        await this.userService.updateOne({_id: underdog.id}, {[game.type]: {rating: result.underdog}});
        await this.userService.updateOne({_id: favourite.id}, {[game.type]: {rating: result.favourite}});

        this.server.to(this.service.getSocketsByUserId(underdog.id)).emit(clientEvents.DRAW, {
          rating: result.underdog,
          clock: underdog.clock,
          shift: result.shift,
        });

        this.server.to(this.service.getSocketsByUserId(favourite.id)).emit(clientEvents.DRAW, {
          rating: result.favourite,
          clock: favourite.clock,
          shift: -result.shift,
        });
      }
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

    await this.mmService.create({
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

    await this.mmService.create({
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
