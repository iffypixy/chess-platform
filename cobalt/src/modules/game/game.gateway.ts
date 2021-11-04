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
import {Server} from "socket.io";
import {nanoid} from "nanoid";
import {Types} from "mongoose";

import {UserData, UserService} from "@modules/user";
import {constants} from "@lib/constants";
import {Socket} from "@typings/";
import {GameService} from "./game.service";
import {ChessTimeControl} from "./typings";
import {
  DEFAULT_GAIN,
  MAX_DIFF_IN_RATING,
  MAX_WAIT_TIME,
  getChessCategory,
  ChessGame,
} from "./lib";
import {JoinQueueDto, MakeMoveDto} from "./dtos/gateways";

interface ChessMatchEntityPlayer {
  id: Types.ObjectId;
  rating: number;
}

interface ChessMatchEntity {
  id: string;
  game: ChessGame;
  white: ChessMatchEntityPlayer;
  black: ChessMatchEntityPlayer;
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
export class GameGateway implements OnGatewayInit, OnGatewayDisconnect {
  constructor(
    private readonly userService: UserService,
    private readonly gameService: GameService,
  ) {}

  @WebSocketServer()
  private readonly server: Server;

  private queue: QueueEntity[] = [];
  private matches: ChessMatchEntity[] = [];

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
          .sort((a, b) =>
            Math.abs(Math.abs(rating - a.rating) - Math.abs(rating - b.rating)),
          )[0];

        const isOpponentAcceptable =
          Math.abs(rating - opponent.rating) <= MAX_DIFF_IN_RATING ||
          Date.now() - start <= MAX_WAIT_TIME;

        if (!isOpponentAcceptable) continue;

        const id = nanoid();

        const game = new ChessGame(control);
        const category = getChessCategory(control);

        this.matches.push({
          id,
          game,
          white: {
            id: user._id,
            rating: user[category].rating,
          },
          black: {
            id: opponent.user._id,
            rating: opponent.user[category].rating,
          },
        });

        const sockets = [
          ...this.getSocketsByUserId(user._id),
          ...this.getSocketsByUserId(opponent.user._id),
        ];

        this.server.to(sockets).emit(clientEvents.MATCH_FOUND, {
          id,
          control,
          white: this.userService.hydrate(user).public,
          black: this.userService.hydrate(opponent.user).public,
        });

        game.startAbortTimer(() => {
          this.server.to(sockets).emit(clientEvents.ABORT);
        });

        this.queue = this.queue.filter(
          ({user}) =>
            !user._id.equals(user._id) || !user._id.equals(opponent.user._id),
        );
      }
    }, 1000);
  }

  handleDisconnect(socket: Socket): void {
    const {user} = socket.request.session;

    this.queue = this.queue.filter((entity) =>
      user._id.equals(entity.user._id),
    );
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
      rating: user[getChessCategory(control)].rating,
      control,
    });
  }

  @SubscribeMessage(serverEvents.MAKE_MOVE)
  async makeMove(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: MakeMoveDto,
  ): Promise<void> {
    const match = this.matches.find(({id}) => id === body.gameId) || null;

    if (!match) throw new BadRequestException("Invalid game");

    const {game, white, black} = match;
    const {turn, control} = game;

    const {user} = socket.request.session;

    const isWhite = white.id.equals(user._id);
    const isBlack = black.id.equals(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) throw new BadRequestException("Invalid game");

    const isTurn =
      (turn === "white" && isWhite) || (turn === "black" && isBlack);

    if (!isTurn) throw new BadRequestException("Not your turn");

    const result = game.makeMove(body.move);

    if (!result) throw new BadRequestException("Invalid move");

    game.stopAbortTimer();
    game.stopClockTimer();

    const player = isWhite ? white : black;
    const opponent = isWhite ? black : white;

    const sockets = [
      ...this.getSocketsByUserId(player.id),
      ...this.getSocketsByUserId(opponent.id),
    ];

    if (!game.isInitiated)
      return game.startAbortTimer(() => {
        this.server.to(sockets).emit(clientEvents.ABORT);
      });

    game.addTime({
      side: turn,
      time: control.increment,
    });

    const category = getChessCategory(control);

    const gain = game.isCheckmate ? DEFAULT_GAIN : 0;
    const shift = Math.round(Math.abs((player.rating - opponent.rating) / 5));

    const change = gain + shift;

    const handleVictory = async () => {
      await this.userService.updateOne(
        {_id: player.id},
        {[category]: {rating: player.rating + change}},
      );

      await this.userService.updateOne(
        {_id: opponent.id},
        {[category]: {rating: opponent.rating - change}},
      );

      await this.gameService.create({
        white: white.id,
        black: black.id,
        category,
        increment: control.increment,
        delay: control.delay,
        time: control.time,
        winner: user._id,
        pgn: game.pgn,
      });

      this.server
        .to(this.getSocketsByUserId(user._id))
        .emit(clientEvents.VICTORY, {
          rating: player.rating + change,
          gain: change,
          clock: game.clock,
        });

      this.server
        .to(this.getSocketsByUserId(opponent.id))
        .emit(clientEvents.LOSS, {
          rating: opponent.rating - change,
          loss: -change,
          clock: game.clock,
        });
    };

    const handleDraw = async () => {
      const [underdog, favourite] = [player, opponent].sort(
        (a, b) => a.rating - b.rating,
      );

      await this.userService.updateOne(
        {_id: underdog.id},
        {[category]: {rating: underdog.rating + change}},
      );

      await this.userService.updateOne(
        {_id: favourite.id},
        {[category]: {rating: favourite.rating - change}},
      );

      await this.gameService.create({
        white: white.id,
        black: black.id,
        increment: control.increment,
        delay: control.delay,
        time: control.time,
        winner: null,
        pgn: game.pgn,
        category,
      });

      this.server
        .to(this.getSocketsByUserId(underdog.id))
        .emit(clientEvents.DRAW, {
          rating: underdog.rating + change,
          gain: change,
          clock: game.clock,
        });

      this.server
        .to(this.getSocketsByUserId(favourite.id))
        .emit(clientEvents.DRAW, {
          rating: favourite.rating - change,
          loss: -change,
          clock: game.clock,
        });
    };

    if (game.isOver) {
      if (game.isCheckmate) handleVictory();
      else if (game.isDraw) handleDraw();
    }

    this.server.to(sockets).emit(clientEvents.MOVE, {
      move: body.move,
      clock: game.clock,
    });

    game.startClockTimer(handleVictory);
  }

  private getSocketsByUserId(id: Types.ObjectId): string[] {
    const sockets: string[] = [];

    for (const socket of this.server.sockets.sockets.values() as IterableIterator<Socket>) {
      if (socket.request.session.user._id.equals(id)) sockets.push(socket.id);
    }

    return sockets;
  }
}
