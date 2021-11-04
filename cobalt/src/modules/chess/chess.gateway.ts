import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
} from "@nestjs/websockets";
import {BadRequestException} from "@nestjs/common";
import {Server, Socket} from "socket.io";
import {nanoid} from "nanoid";
import {Types} from "mongoose";

import {UserData, UserService} from "@modules/user";
import {constants} from "@lib/constants";
import {redisClient} from "@lib/redis";
import {ChessService} from "./chess.service";
import {ChessTimeControl} from "./typings";
import {ChessEngine} from "./lib/classes";
import {DEFAULT_GAIN, MAX_DIFF_IN_RATING, MAX_WAIT_TIME} from "./lib/constants";
import {timeControlToCategory} from "./lib/helpers";
import {JoinQueueDto, MakeMoveDto} from "./dtos/gateways";

interface ChessGameEntityPlayer {
  id: Types.ObjectId;
  rating: number;
}

interface ChessGameEntity {
  id: string;
  engine: ChessEngine;
  white: ChessGameEntityPlayer;
  black: ChessGameEntityPlayer;
}

interface QueueEntity {
  user: UserData;
  start: number;
  rating: number;
  control: ChessTimeControl;
}

const serverEvents = {
  JOIN_QUEUE: "join-queue",
  MAKE_MOVE: "make-move",
};

const clientEvents = {
  MOVE: "move",
  DRAW: "draw",
  MATCH_FOUND: "match-found",
  VICTORY: "victory",
  LOSS: "loss",
  ABORT: "abort",
};

@WebSocketGateway({
  cors: {
    origin: constants.ORIGIN,
    credentials: true,
  },
})
export class ChessGateway implements OnGatewayInit, OnGatewayDisconnect {
  constructor(private readonly userService: UserService, private readonly chessService: ChessService) {}

  @WebSocketServer()
  private readonly server: Server;

  private queue: QueueEntity[] = [];
  private games: ChessGameEntity[] = [];

  private queueInterval: NodeJS.Timer | null = null;

  afterInit(): void {
    this.queueInterval = setInterval(async () => {
      for (let i = 0; i < this.queue.length; i++) {
        const {user, control, rating, start} = this.queue[i];

        const opponent = this.queue
          .filter(
            (entity) =>
              !user._id.equals(entity.user._id) &&
              control.time === entity.control.time &&
              control.delay === entity.control.delay &&
              control.increment === entity.control.increment,
          )
          .sort((a, b) => Math.abs(Math.abs(rating - a.rating) - Math.abs(rating - b.rating)))[0];

        const isOpponentAcceptable =
          Math.abs(rating - opponent.rating) <= MAX_DIFF_IN_RATING || Date.now() - start <= MAX_WAIT_TIME;

        if (!isOpponentAcceptable) continue;

        const id = nanoid();

        const engine = new ChessEngine(control);
        const category = timeControlToCategory(control);

        const white = {id: user._id, rating: user[category].rating};
        const black = {id: opponent.user._id, rating: opponent.user[category].rating};

        const match = {id, engine, white, black};

        redisClient.set(`game:${id}`, JSON.stringify(match));

        const sockets = [...this.getSocketsByUserId(user._id), ...this.getSocketsByUserId(opponent.user._id)];

        this.server.to(sockets).emit(clientEvents.MATCH_FOUND, {
          id,
          control,
          white: this.userService.hydrate(user).public,
          black: this.userService.hydrate(opponent.user).public,
        });

        engine.startAbortTimer(() => {
          this.server.to(sockets).emit(clientEvents.ABORT);
        });

        this.queue = this.queue.filter(({user}) => !user._id.equals(user._id) || !user._id.equals(opponent.user._id));
      }
    }, 1000);
  }

  handleDisconnect(socket: Socket): void {
    const {user} = socket.request.session;

    this.queue = this.queue.filter((entity) => user._id.equals(entity.user._id));
  }

  @SubscribeMessage(serverEvents.JOIN_QUEUE)
  joinQueue(@ConnectedSocket() socket: Socket, body: JoinQueueDto): void {
    const {user} = socket.request.session;

    const control: ChessTimeControl = {
      delay: body.delay,
      increment: body.increment,
      time: body.time,
    };

    this.queue.push({
      user,
      start: Date.now(),
      rating: user[timeControlToCategory(control)].rating,
      control,
    });
  }

  @SubscribeMessage(serverEvents.MAKE_MOVE)
  async makeMove(@ConnectedSocket() socket: Socket, @MessageBody() body: MakeMoveDto): Promise<void> {
    const match = redisClient.get(`game:${body.gameId}`) as unknown as string;

    if (!match) throw new BadRequestException("Invalid game");

    const {engine, white, black} = JSON.parse(match) as ChessGameEntity;
    const {turn, control} = engine;

    const {user} = socket.request.session;

    const isWhite = white.id.equals(user._id);
    const isBlack = black.id.equals(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) throw new BadRequestException("Invalid game");

    const isTurn = (turn === "white" && isWhite) || (turn === "black" && isBlack);

    if (!isTurn) throw new BadRequestException("Not your turn");

    const result = engine.makeMove(body.move);

    if (!result) throw new BadRequestException("Invalid move");

    engine.stopAbortTimer();
    engine.stopClockTimer();

    const player = isWhite ? white : black;
    const opponent = isWhite ? black : white;

    const sockets = [...this.getSocketsByUserId(player.id), ...this.getSocketsByUserId(opponent.id)];

    if (!engine.isInitiated) {
      this.server.to(sockets).emit(clientEvents.MOVE, {
        move: body.move,
        clock: engine.clock,
      });

      return engine.startAbortTimer(() => {
        this.server.to(sockets).emit(clientEvents.ABORT);
      });
    }

    engine.addTime({
      side: turn,
      time: control.increment,
    });

    const gain = engine.isCheckmate ? DEFAULT_GAIN : 0;
    const shift = Math.round(Math.abs((player.rating - opponent.rating) / 5));

    const change = gain + shift;

    const category = timeControlToCategory(control);

    const handleVictory = async () => {
      await this.userService.updateOne({_id: player.id}, {[category]: {rating: player.rating + change}});

      await this.userService.updateOne({_id: opponent.id}, {[category]: {rating: opponent.rating - change}});

      await this.chessService.create({
        white: white.id,
        black: black.id,
        increment: control.increment,
        delay: control.delay,
        time: control.time,
        winner: user._id,
        pgn: engine.pgn,
        category,
      });

      this.server.to(this.getSocketsByUserId(user._id)).emit(clientEvents.VICTORY, {
        rating: player.rating + change,
        gain: change,
        clock: engine.clock,
      });

      this.server.to(this.getSocketsByUserId(opponent.id)).emit(clientEvents.LOSS, {
        rating: opponent.rating - change,
        loss: -change,
        clock: engine.clock,
      });
    };

    const handleDraw = async () => {
      const [underdog, favourite] = [player, opponent].sort((a, b) => a.rating - b.rating);

      await this.userService.updateOne({_id: underdog.id}, {[category]: {rating: underdog.rating + change}});

      await this.userService.updateOne({_id: favourite.id}, {[category]: {rating: favourite.rating - change}});

      await this.chessService.create({
        white: white.id,
        black: black.id,
        increment: control.increment,
        delay: control.delay,
        time: control.time,
        winner: null,
        pgn: engine.pgn,
        category,
      });

      this.server.to(this.getSocketsByUserId(underdog.id)).emit(clientEvents.DRAW, {
        rating: underdog.rating + change,
        gain: change,
        clock: engine.clock,
      });

      this.server.to(this.getSocketsByUserId(favourite.id)).emit(clientEvents.DRAW, {
        rating: favourite.rating - change,
        loss: -change,
        clock: engine.clock,
      });
    };

    if (engine.isOver) {
      if (engine.isCheckmate) handleVictory();
      else if (engine.isDraw) handleDraw();
    }

    this.server.to(sockets).emit(clientEvents.MOVE, {
      move: body.move,
      clock: engine.clock,
    });

    engine.startClockTimer(handleVictory);
  }

  private getSocketsByUserId(id: Types.ObjectId): string[] {
    const sockets: string[] = [];

    for (const socket of this.server.sockets.sockets.values() as IterableIterator<Socket>) {
      if (socket.request.session.user._id.equals(id)) sockets.push(socket.id);
    }

    return sockets;
  }
}
