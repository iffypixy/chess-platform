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
import {Chess} from "chess.js";

import {UserData, UserService} from "@modules/user";
import {constants} from "@lib/constants";
import {SocketIoService} from "@lib/socket.io";
import {redis} from "@lib/constants/redis";
import {ChessControl, ChessEntity, ChessPlayer} from "./typings";
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
import {DEFAULT_FEN, DEFAULT_GAIN, MAX_DIFF_IN_RATING, MAX_WAIT_TIME} from "./lib/constants";
import {timeControlToCategory} from "./lib/helpers";
import {NextFunction, Request, Response} from "express";
import {session} from "@lib/session";

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
  user: UserData;
  start: number;
  rating: number;
  control: ChessControl;
}

let queue: QueueEntity[] = [];

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
    private readonly socketIoService: SocketIoService,
  ) {}

  @WebSocketServer()
  private readonly server: Server;

  private queueInterval: NodeJS.Timer | null = null;

  afterInit(): void {
    this.server.use((socket: Socket, next: NextFunction) => {
      session()(socket.request as unknown as Request, {} as Response, next);
    });

    this.queueInterval = setInterval(() => {
      queue.forEach((entity) => {
        const {user, control, rating, start} = entity;

        const opponent = queue
          .filter(
            (entity) =>
              !user._id.equals(entity.user._id) &&
              control.time === entity.control.time &&
              control.delay === entity.control.delay &&
              control.increment === entity.control.increment,
          )
          .sort((a, b) => Math.abs(Math.abs(rating - a.rating) - Math.abs(rating - b.rating)))[0];

        const isOpponentAcceptable =
          Math.abs(rating - opponent.rating) <= MAX_DIFF_IN_RATING || Date.now() - start >= MAX_WAIT_TIME;

        if (!isOpponentAcceptable) {
          const id = nanoid();

          const game: ChessEntity = {
            white: {
              id: user._id,
              clock: control.time,
              rating,
            },
            black: {
              id: opponent.user._id,
              clock: control.time,
              rating: opponent.rating,
            },
            fen: DEFAULT_FEN,
            pgn: null,
            premove: null,
            control,
            isDrawOffered: false,
          };

          redis.set(String(id), JSON.stringify(game));

          const sockets = [
            ...this.socketIoService.getSocketsByUserId(user._id),
            ...this.socketIoService.getSocketsByUserId(opponent.user._id),
          ];

          this.server.to(sockets).emit(clientEvents.MATCH_FOUND, {
            game: {
              white: {
                user: this.userService.hydrate(user).public,
                clock: control.time,
                rating,
              },
              black: {
                user: this.userService.hydrate(opponent.user).public,
                clock: control.time,
                rating: opponent.rating,
              },
              control,
            },
          });

          //this.managerService.startClockTimer({gameId: id});

          queue = queue.filter(({user: {_id}}) => !user._id.equals(_id) || !opponent.user._id.equals(_id));
        }
      });
    }, 1000);
  }

  handleDisconnect(socket: Socket): void {
    const {user} = socket.request.session;

    queue = queue.filter(({user: {_id}}) => user._id.equals(_id));
  }

  @SubscribeMessage(serverEvents.JOIN_QUEUE)
  joinQueue(@ConnectedSocket() socket: Socket, body: JoinQueueDto): void {
    const {user} = socket.request.session;

    const control: ChessControl = {
      delay: body.delay,
      increment: body.increment,
      time: body.time,
    };

    queue.push({
      user,
      start: Date.now(),
      rating: user[timeControlToCategory(control)].rating,
      control,
    });
  }

  // @SubscribeMessage(serverEvents.MAKE_MOVE)
  // async makeMove(@ConnectedSocket() socket: Socket, @MessageBody() body: MakeMoveDto): Promise<void> {
  //   const {user} = socket.request.session;

  //   const {game} = await this.managerService.validate({
  //     gameId: body.gameId,
  //     userId: user._id,
  //   });

  //   const engine = new Chess(game.fen);

  //   const turn = engine.turn() === "w" ? "white" : "black";
  //   const opposite = turn === "white" ? "black" : "white";

  //   const isWhite = String(user._id) === String(game.white.id);
  //   const isBlack = String(user._id) === String(game.black.id);

  //   const isTurn = (turn === "white" && isWhite) || (turn === "black" && isBlack);

  //   if (!isTurn) throw new WsException("Not your turn");

  //   const result = engine.move(body.move);

  //   if (!result) throw new WsException("Invalid move");

  //   engine.set_comment(`clk:${game[turn].clock}`);

  //   this.managerService.stopClockTimer({gameId: body.gameId});

  //   const sockets = [
  //     ...this.socketIoService.getSocketsByUserId(game.white.id),
  //     ...this.socketIoService.getSocketsByUserId(game.black.id),
  //   ];

  //   // if (!engine.isInitiated) {
  //   //   this.server.to(sockets).emit(clientEvents.MOVE, {
  //   //     move: body.move,
  //   //     clock: engine.clock,
  //   //   });

  //   //   return engine.startAbortTimer(() => {
  //   //     this.server.to(sockets).emit(clientEvents.ABORT);
  //   //   });
  //   // }

  //   game[turn].clock += game.control.increment;

  //   const {change} = await this.managerService.handleVictory({game});

  //   this.server.to(this.socketIoService.getSocketsByUserId(game[turn].id)).emit(clientEvents.VICTORY, {
  //     rating: game[turn].rating + change,
  //     clock: game[turn].clock,
  //     change,
  //   });

  //   this.server.to(this.socketIoService.getSocketsByUserId(game[opposite].id)).emit(clientEvents.LOSS, {
  //     rating: game[opposite].rating - change,
  //     clock: game[opposite].clock,
  //     change: -change,
  //   });

  //   const handleDraw = async () => {
  //     const [underdog, favourite] = [player, opponent].sort((a, b) => a.rating - b.rating);

  //     await this.userService.updateOne({_id: underdog.id}, {[category]: {rating: underdog.rating + shift}});
  //     await this.userService.updateOne({_id: favourite.id}, {[category]: {rating: favourite.rating - shift}});

  //     await this.chessService.create({
  //       white: white.id,
  //       black: black.id,
  //       increment: control.increment,
  //       delay: control.delay,
  //       time: control.time,
  //       winner: null,
  //       pgn: engine.pgn,
  //       category,
  //     });

  //     this.server.to(this.socketIoService.getSocketsByUserId(underdog.id)).emit(clientEvents.DRAW, {
  //       rating: underdog.rating + shift,
  //       gain: shift,
  //       clock: engine.clock,
  //     });

  //     this.server.to(this.socketIoService.getSocketsByUserId(favourite.id)).emit(clientEvents.DRAW, {
  //       rating: favourite.rating - shift,
  //       loss: -shift,
  //       clock: engine.clock,
  //     });
  //   };

  //   this.server.to(sockets).emit(clientEvents.MOVE, {
  //     move: body.move,
  //     clock: engine.clock,
  //   });

  //   if (engine.in_checkmate()) {
  //     if (engine.isCheckmate) handleVictory({winner: player, loser: opponent});
  //     else if (engine.isDraw) handleDraw();

  //     engine.stop();
  //     this.games = this.games.filter((game) => game.id !== id);

  //     return;
  //   }

  //   if (engine.premove) {
  //     const result = engine.makeMove(engine.premove);

  //     if (result) {
  //       if (engine.isOver) {
  //         if (engine.isCheckmate) handleVictory({winner: opponent, loser: player});
  //         else if (engine.isDraw) handleDraw();

  //         engine.stop();
  //         this.games = this.games.filter((game) => game.id !== id);

  //         return;
  //       }

  //       return engine.startClockTimer(() => handleVictory({winner: opponent, loser: player}));
  //     }
  //   }

  //   engine.startClockTimer(() => handleVictory({winner: player, loser: opponent}));
  // }

  // @SubscribeMessage(serverEvents.RESIGN)
  // async resign(@ConnectedSocket() socket: Socket, @MessageBody() body: ResignDto): Promise<void> {
  //   const {user} = socket.request.session;

  //   const game = this.games.find((game) => game.id === body.gameId) || null;

  //   if (!game) throw new WsException("Invalid game");

  //   const {id, white, black, engine} = game;
  //   const {control} = engine;

  //   const isWhite = white.id.equals(user._id);
  //   const isBlack = black.id.equals(user._id);

  //   const isParticipant = isWhite || isBlack;

  //   if (!isParticipant) throw new WsException("Invalid game");

  //   const player = isWhite ? white : black;
  //   const opponent = isWhite ? black : white;

  //   const shift = Math.round(Math.abs((player.rating - opponent.rating) / 5));

  //   const [underdog] = [player, opponent].sort((a, b) => a.rating - b.rating);
  //   const isWinnerUnderdog = player.id.equals(underdog.id);

  //   const change = isWinnerUnderdog ? DEFAULT_GAIN + shift : DEFAULT_GAIN - shift;

  //   const category = timeControlToCategory(control);

  //   await this.userService.updateOne({_id: player.id}, {[category]: {rating: player.rating - change}});
  //   await this.userService.updateOne({_id: opponent.id}, {[category]: {rating: opponent.rating + change}});

  //   await this.chessService.create({
  //     white: white.id,
  //     black: black.id,
  //     increment: control.increment,
  //     delay: control.delay,
  //     time: control.time,
  //     winner: opponent.id,
  //     pgn: engine.pgn,
  //     category,
  //   });

  //   engine.stop();
  //   this.games = this.games.filter((game) => game.id !== id);

  //   this.server.to(this.socketIoService.getSocketsByUserId(player.id)).emit(clientEvents.LOSS, {
  //     rating: player.rating - change,
  //     loss: -change,
  //     clock: engine.clock,
  //   });

  //   this.server.to(this.socketIoService.getSocketsByUserId(opponent.id)).emit(clientEvents.VICTORY, {
  //     rating: opponent.rating + change,
  //     gain: change,
  //     clock: engine.clock,
  //   });
  // }

  // @SubscribeMessage(serverEvents.OFFER_DRAW)
  // offerDraw(@ConnectedSocket() socket: Socket, @MessageBody() body: OfferDrawDto): void {
  //   const {user} = socket.request.session;

  //   const game = this.games.find((game) => game.id === body.gameId) || null;

  //   if (!game) throw new WsException("Invalid game");

  //   const {white, black, engine} = game;

  //   const isWhite = white.id.equals(user._id);
  //   const isBlack = black.id.equals(user._id);

  //   const isParticipant = isWhite || isBlack;

  //   if (!isParticipant) throw new WsException("Invalid game");

  //   if (engine.isDrawOffered) throw new WsException("Draw has been already offered");

  //   engine.isDrawOffered = true;
  //   engine.isDrawOfferValid = true;

  //   engine.startDrawOfferTimer();

  //   const opponentId = isWhite ? black.id : white.id;

  //   this.server.to(this.socketIoService.getSocketsByUserId(opponentId)).emit(clientEvents.DRAW_OFFER);
  // }

  // @SubscribeMessage(serverEvents.ACCEPT_DRAW)
  // async acceptDraw(@ConnectedSocket() socket: Socket, @MessageBody() body: AcceptDrawDto) {
  //   const {user} = socket.request.session;

  //   const game = this.games.find((game) => game.id === body.gameId) || null;

  //   if (!game) throw new WsException("Invalid game");

  //   const {id, white, black, engine} = game;
  //   const {control} = engine;

  //   const isWhite = white.id.equals(user._id);
  //   const isBlack = black.id.equals(user._id);

  //   const isParticipant = isWhite || isBlack;

  //   if (!isParticipant) throw new WsException("Invalid game");

  //   if (!engine.isDrawOfferValid) throw new WsException("Draw offer is not valid");

  //   const player = isWhite ? white : black;
  //   const opponent = isWhite ? black : white;

  //   const shift = Math.round(Math.abs((player.rating - opponent.rating) / 5));

  //   const [underdog, favourite] = [player, opponent].sort((a, b) => a.rating - b.rating);

  //   const category = timeControlToCategory(control);

  //   await this.userService.updateOne({_id: underdog.id}, {[category]: {rating: underdog.rating + shift}});
  //   await this.userService.updateOne({_id: favourite.id}, {[category]: {rating: favourite.rating - shift}});

  //   await this.chessService.create({
  //     white: white.id,
  //     black: black.id,
  //     increment: control.increment,
  //     delay: control.delay,
  //     time: control.time,
  //     winner: null,
  //     pgn: engine.pgn,
  //     category,
  //   });

  //   engine.stop();
  //   this.games = this.games.filter((game) => game.id !== id);

  //   this.server.to(this.socketIoService.getSocketsByUserId(underdog.id)).emit(clientEvents.DRAW, {
  //     rating: underdog.rating + shift,
  //     change: shift,
  //     clock: engine.clock,
  //   });

  //   this.server.to(this.socketIoService.getSocketsByUserId(favourite.id)).emit(clientEvents.DRAW, {
  //     rating: favourite.rating - shift,
  //     change: -shift,
  //     clock: engine.clock,
  //   });
  // }

  // @SubscribeMessage(serverEvents.DECLINE_DRAW)
  // declineDraw(@ConnectedSocket() socket: Socket, @MessageBody() body: DeclineDrawDto): void {
  //   const {user} = socket.request.session;

  //   const game = this.games.find((game) => game.id === body.gameId) || null;

  //   if (!game) throw new WsException("Invalid game");

  //   const {white, black, engine} = game;

  //   const isWhite = white.id.equals(user._id);
  //   const isBlack = black.id.equals(user._id);

  //   const isParticipant = isWhite || isBlack;

  //   if (!isParticipant) throw new WsException("Invalid game");

  //   if (!engine.isDrawOfferValid) throw new WsException("Draw offer is not valid");

  //   const opponentId = isWhite ? black.id : white.id;

  //   this.server.to(this.socketIoService.getSocketsByUserId(opponentId)).emit(clientEvents.DRAW_OFFER_DECLINE);
  // }

  // @SubscribeMessage(serverEvents.PREMOVE)
  // async premove(@ConnectedSocket() socket: Socket, @MessageBody() body: PremoveDto): Promise<void> {
  //   const error = new WsException("Invalid game");

  //   const game = JSON.parse(await redis.get(`game:${body.gameId}`)) || null;

  //   if (!game) throw error;

  //   const {white, black, turn, engine} = game;
  //   const {user} = socket.request.session;

  //   const isWhite = white.id.equals(user._id);
  //   const isBlack = black.id.equals(user._id);

  //   const isParticipant = isWhite || isBlack;

  //   if (!isParticipant) throw error;

  //   const isTurn = (turn === "white" && isWhite) || (turn === "black" && isBlack);

  //   if (isTurn) throw new WsException("It is your turn");

  //   engine.setPremove(body.move);
  // }
}
