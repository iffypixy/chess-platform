import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
} from "@nestjs/websockets";
import {Types} from "mongoose";
import {Server, Socket} from "socket.io";
import {nanoid} from "nanoid";

import {ControlMode, UserData, UserService} from "@modules/user";
import {constants} from "@lib/constants";
import {acknowledgment, SocketIoService, Acknowledgment} from "@lib/socket.io";
import {redis} from "@lib/redis";
import {Chess} from "@lib/chess.js";
import {MatchControl, MatchType, MatchEntity} from "./typings";
import {MatchService, MatchPlayerService} from "./services";
import {MATCHMAKING, MATCH_TYPES, NOTATION} from "./lib/constants";
import {elo} from "./lib/elo";
import {
  AcceptDrawDto,
  DeclineDrawDto,
  JoinQueueDto,
  MakeMoveDto,
  ResignDto,
  OfferDrawDto,
  PremoveDto,
  RemovePremoveDto,
  SpectateMatchDto,
  SendMessageDto,
  DisjoinQueue,
} from "./dtos/gateways";

const serverEvents = {
  JOIN_QUEUE: "join-queue",
  MAKE_MOVE: "make-move",
  RESIGN: "resign",
  OFFER_DRAW: "offer-draw",
  ACCEPT_DRAW: "accept-draw",
  DECLINE_DRAW: "decline-draw",
  PREMOVE: "make-premove",
  REMOVE_PREMOVE: "remove-premove",
  SPECTATE_MATCH: "spectate-match",
  SEND_MESSAGE: "send-message",
  DISJOIN_QUEUE: "disjoin-queue",
};

const clientEvents = {
  MOVE: "move",
  MATCH_FOUND: "match-found",
  DRAW_OFFER: "draw-offer",
  DRAW_OFFER_DECLINE: "draw-offer-decline",
  DRAW_OFFER_ACCEPT: "draw-offer-accept",
  CLOCK: "clock",
  RESULTATIVE_ENDING: "resultative-ending",
  TIE_ENDING: "tie-ending",
  MESSAGE: "message",
  RESIGNED: "resigned",
};

interface QueueEntity {
  start: number;
  rating: number;
  control: MatchControl;
  user: UserData;
}

const controlToType = ({time, delay, increment}: MatchControl): MatchType => {
  const overall = (time / 60 + delay * 0.45 + increment * 0.45) / 1000;

  if (overall <= 2) return MATCH_TYPES.BULLET;
  else if (overall <= 7) return MATCH_TYPES.BLITZ;
  else if (overall <= 20) return MATCH_TYPES.RAPID;
  else if (overall > 20) return MATCH_TYPES.CLASSICAL;
};

@WebSocketGateway({
  cors: {
    origin: constants.ORIGIN,
    credentials: true,
  },
})
export class MatchmakingGateway implements OnGatewayInit, OnGatewayDisconnect {
  constructor(
    private readonly userService: UserService,
    private readonly matchService: MatchService,
    private readonly matchPlayerService: MatchPlayerService,
    private readonly service: SocketIoService,
  ) {}

  @WebSocketServer()
  server: Server;

  private queueTimeout: NodeJS.Timeout | null = null;

  afterInit(): void {
    this.service.server = this.server;

    this.service.useAuthMiddleware();

    const handler = async () => {
      const jsons = await redis.get("queue");

      let queue = ((JSON.parse(jsons) || []) as QueueEntity[]).filter(Boolean);

      queue.forEach(({user, start, control, rating}) => {
        const opponent = queue
          .filter(
            (entity) =>
              String(user._id) !== String(entity.user._id) &&
              control.time === entity.control.time &&
              control.delay === entity.control.delay &&
              control.increment === entity.control.increment,
          )
          .sort((a, b) => {
            const diffA = Math.abs(rating - a.rating);
            const diffB = Math.abs(rating - b.rating);

            return Math.abs(diffA - diffB);
          })[0];

        if (!opponent) return;

        const differenceInRating = Math.abs(rating - opponent.rating);
        const awaitTime = Date.now() - start;

        const isOpponentRelevant =
          differenceInRating <= MATCHMAKING.MAX_RATING_DIFFERENCE || awaitTime >= MATCHMAKING.MAX_WAIT_TIME;

        if (!isOpponentRelevant) return;

        queue = queue.filter(
          ({user: {_id}}) => String(_id) !== String(user._id) && String(_id) !== String(opponent.user._id),
        );

        const match: MatchEntity = {
          id: nanoid(),
          control,
          pgn: null,
          premove: null,
          clockTimeout: null,
          type: controlToType(control),
          fen: NOTATION.INITIAL,
          last: Date.now(),
          white: {
            id: user._id,
            user: this.userService.hydrate(user),
            rating,
            side: "white",
            clock: control.time,
            hasOfferedDraw: false,
            isDrawOfferValid: false,
          },
          black: {
            id: opponent.user._id,
            user: this.userService.hydrate(opponent.user),
            rating: opponent.rating,
            side: "black",
            clock: control.time,
            hasOfferedDraw: false,
            isDrawOfferValid: false,
          },
        };

        const whites = this.service.getSocketsByUserId(user._id);
        const blacks = this.service.getSocketsByUserId(opponent.user._id);

        const sockets = [...blacks, ...whites];

        console.log(whites, blacks, sockets);

        sockets.forEach((socket) => socket.join(match.id));

        const timeout = setTimeout(async () => {
          const result = elo.calculateVictory({winner: opponent.rating, loser: rating});

          await this.userService.updateOne(
            {_id: Types.ObjectId(String(opponent.user._id))},
            {[match.type]: {rating: result.winner}},
          );

          await this.userService.updateOne(
            {_id: Types.ObjectId(String(user._id))},
            {[match.type]: {rating: result.loser}},
          );

          const white = await this.matchPlayerService.create({
            user: Types.ObjectId(String(user._id)),
            rating: match.white.rating,
            shift: -result.shift,
            result: "lose",
            side: "white",
          });

          const black = await this.matchPlayerService.create({
            user: Types.ObjectId(String(opponent.user._id)),
            rating: match.black.rating,
            shift: result.shift,
            result: "victory",
            side: "black",
          });

          await this.matchService.create({
            white,
            black,
            control,
            type: match.type,
            fen: match.fen,
            pgn: match.pgn,
            sid: match.id,
            winner: black,
          });

          this.server.to(match.id).emit(clientEvents.RESULTATIVE_ENDING, {
            matchId: match.id,
            white: {
              rating: result.loser,
              shift: -result.shift,
              result: "lose",
            },
            black: {
              rating: result.winner,
              shift: result.shift,
              result: "victory",
            },
          });

          this.server.to(match.id).emit(clientEvents.CLOCK, {
            matchId: match.id,
            clock: {
              white: 0,
              black: match.black.clock,
            },
          });

          await redis.del(`match:${match.id}`);
        }, match.white.clock);

        match.clockTimeout = timeout[Symbol.toPrimitive]();

        redis.set(`match:${match.id}`, JSON.stringify(match));
        redis.set("queue", JSON.stringify(queue));

        this.server.to(match.id).emit(clientEvents.MATCH_FOUND, {
          match: {
            control,
            id: match.id,
            pgn: null,
            isDrawOfferValid: false,
            type: match.type,
            fen: match.fen,
            isReal: true,
            white: {
              user: match.white.user.public,
              rating: match.white.rating,
              side: match.white.side,
              clock: match.white.clock,
              hasOfferedDraw: match.white.hasOfferedDraw,
            },
            black: {
              user: match.black.user.public,
              rating: match.black.rating,
              side: match.black.side,
              clock: match.black.clock,
              hasOfferedDraw: match.black.hasOfferedDraw,
            },
          },
        });
      });

      setTimeout(handler, 1000);
    };

    this.queueTimeout = setTimeout(handler, 1000);
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const {user} = socket.request.session;

    const jsons = await redis.get("queue");

    let queue = ((JSON.parse(jsons) || []) as QueueEntity[]).filter(Boolean);

    queue = queue.filter(({user: {_id}}) => String(_id) !== String(user._id));

    await redis.set("queue", JSON.stringify(queue));
  }

  @SubscribeMessage(serverEvents.JOIN_QUEUE)
  async joinQueue(@ConnectedSocket() socket: Socket, @MessageBody() body: JoinQueueDto): Promise<Acknowledgment> {
    const now = Date.now();

    console.log(socket.request.session);

    const {user} = socket.request.session;

    const actual = await this.userService.findById(Types.ObjectId(String(user._id)));

    const control: MatchControl = {
      delay: body.delay,
      increment: body.increment,
      time: body.time,
    };

    const jsons = await redis.get("queue");

    let queue = ((JSON.parse(jsons) || []) as QueueEntity[]).filter(Boolean);

    queue = queue.filter(({user: {_id}}) => String(_id) !== String(actual._id));

    const mode = actual[controlToType(control)] as ControlMode;

    queue.push({
      control,
      user: actual,
      start: now,
      rating: mode.rating,
    });

    redis.set("queue", JSON.stringify(queue));

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.DISJOIN_QUEUE)
  async disjoinQueue(@ConnectedSocket() socket: Socket, @MessageBody() body: DisjoinQueue): Promise<Acknowledgment> {
    const {user} = socket.request.session;

    const jsons = await redis.get("queue");

    let queue = ((JSON.parse(jsons) || []) as QueueEntity[]).filter(Boolean);

    queue = queue.filter(({user: {_id}}) => String(_id) !== String(user._id));

    redis.set("queue", JSON.stringify(queue));

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.MAKE_MOVE)
  async makeMove(@ConnectedSocket() socket: Socket, @MessageBody() body: MakeMoveDto): Promise<Acknowledgment> {
    const now = Date.now();

    const {user} = socket.request.session;

    const json = await redis.get(`match:${body.matchId}`);

    if (!json) return acknowledgment.error({message: "Invalid match"});

    const match: MatchEntity = JSON.parse(json);

    const isWhite = String(match.white.id) === String(user._id);
    const isBlack = String(match.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) return acknowledgment.error({message: "You are not participant"});

    const engine = new Chess();

    match.fen && engine.load(match.fen);
    match.pgn && engine.load_pgn(match.pgn);

    const turn = () => (engine.turn() === "w" ? "white" : "black");

    const current = turn();

    const isTurn = (current === "white" && isWhite) || (current === "black" && isBlack);

    if (!isTurn) return acknowledgment.error({message: "It is not your turn to make move"});

    const result = engine.move({
      from: body.from,
      to: body.to,
      promotion: body.promotion,
    });

    if (!result) return acknowledgment.error({message: "The move is not valid"});

    clearTimeout(match.clockTimeout);

    match[current].clock = match[current].clock - (now - match.last) + match.control.increment;

    engine.set_comment(`clock:${match[current].clock}`);

    const opposite = turn();

    if (match[opposite].isDrawOfferValid) {
      match[opposite].isDrawOfferValid = false;

      this.server.to(match.id).emit(clientEvents.DRAW_OFFER_DECLINE, {
        from: current,
        matchId: match.id,
      });
    }

    this.server.to(match.id).emit(clientEvents.MOVE, {
      matchId: match.id,
      move: result,
      from: current,
    });

    this.server.to(match.id).emit(clientEvents.CLOCK, {
      matchId: match.id,
      clock: {
        white: match.white.clock,
        black: match.black.clock,
      },
    });

    match.last = Date.now();

    const handleOver = async () => {
      const {control, type} = match;

      const pgn = engine.pgn();
      const fen = engine.fen();

      const isDraw =
        engine.in_draw() || engine.in_stalemate() || engine.in_threefold_repetition() || engine.insufficient_material();
      const isResultative = !isDraw;

      const isOutOfTime = isResultative && !engine.in_checkmate();

      const win = turn() === "white" ? "black" : "white";
      const lose = turn();

      if (isOutOfTime) match[lose].clock = match[lose].clock - (Date.now() - match.last);

      if (isResultative) {
        const winner = match[win];
        const loser = match[lose];

        const result = elo.calculateVictory({winner: winner.rating, loser: loser.rating});

        await this.userService.updateOne(
          {_id: Types.ObjectId(String(winner.id))},
          {[match.type]: {rating: result.winner}},
        );

        await this.userService.updateOne(
          {_id: Types.ObjectId(String(loser.id))},
          {[match.type]: {rating: result.loser}},
        );

        const isWinnerWhite = winner.side === "white";

        const white = await this.matchPlayerService.create({
          user: Types.ObjectId(String(match.white.user._id)),
          rating: match.white.rating,
          shift: isWinnerWhite ? result.shift : -result.shift,
          result: isWinnerWhite ? "victory" : "lose",
          side: "white",
        });

        const black = await this.matchPlayerService.create({
          user: Types.ObjectId(String(match.black.user._id)),
          rating: match.black.rating,
          shift: isWinnerWhite ? -result.shift : result.shift,
          result: isWinnerWhite ? "lose" : "victory",
          side: "black",
        });

        await this.matchService.create({
          white,
          black,
          control,
          type,
          fen,
          pgn,
          sid: match.id,
          winner: isWinnerWhite ? white : black,
        });

        this.server.to(match.id).emit(clientEvents.RESULTATIVE_ENDING, {
          matchId: match.id,
          [winner.side]: {
            rating: result.winner,
            shift: result.shift,
            result: "victory",
          },
          [loser.side]: {
            rating: result.loser,
            shift: -result.shift,
            result: "lose",
          },
        });
      } else if (isDraw) {
        const [underdog, favourite] = [match.white, match.black].sort((a, b) => a.rating - b.rating);

        const result = elo.calculateDraw({underdog: underdog.rating, favourite: favourite.rating});

        await this.userService.updateOne(
          {_id: Types.ObjectId(String(underdog.id))},
          {[match.type]: {rating: result.underdog}},
        );

        await this.userService.updateOne(
          {_id: Types.ObjectId(String(favourite.id))},
          {[match.type]: {rating: result.favourite}},
        );

        const isUnderdogWhite = String(underdog.id) === String(match.white.id);

        const white = await this.matchPlayerService.create({
          user: Types.ObjectId(String(match.white.user._id)),
          rating: match.white.rating,
          shift: isUnderdogWhite ? result.shift : -result.shift,
          result: "draw",
          side: "white",
        });

        const black = await this.matchPlayerService.create({
          user: Types.ObjectId(String(match.black.user._id)),
          rating: match.black.rating,
          shift: isUnderdogWhite ? -result.shift : result.shift,
          result: "draw",
          side: "black",
        });

        await this.matchService.create({
          white,
          black,
          control,
          type,
          fen,
          pgn,
          sid: match.id,
          winner: null,
        });

        this.server.to(match.id).emit(clientEvents.TIE_ENDING, {
          matchId: match.id,
          [underdog.side]: {
            rating: result.underdog,
            shift: result.shift,
            result: "draw",
          },
          [favourite.side]: {
            rating: result.favourite,
            shift: -result.shift,
            result: "draw",
          },
        });
      }

      this.server.to(match.id).emit(clientEvents.CLOCK, {
        matchId: match.id,
        clock: {
          [win]: match[win].clock,
          [lose]: match[lose].clock,
        },
      });

      await redis.del(`match:${match.id}`);
    };

    const isOver = engine.game_over();

    if (isOver) {
      await handleOver();

      return acknowledgment.ok();
    }

    const isPremove = !!match.premove;

    if (isPremove) {
      const premove = engine.move(match.premove);

      if (premove) {
        engine.set_comment(`clock:${match[opposite].clock}`);

        if (match[current].isDrawOfferValid) {
          match[current].isDrawOfferValid = false;

          this.server.to(match.id).emit(clientEvents.DRAW_OFFER_DECLINE, {
            matchId: match.id,
            from: opposite,
          });
        }

        this.server.to(match.id).emit(clientEvents.MOVE, {
          matchId: match.id,
          move: premove,
          from: opposite,
        });

        this.server.to(match.id).emit(clientEvents.CLOCK, {
          matchId: match.id,
          clock: {
            white: match.white.clock,
            black: match.black.clock,
          },
        });

        const isOver = engine.game_over();

        if (isOver) {
          await handleOver();

          return acknowledgment.ok();
        }
      }
    }

    const timeout = setTimeout(() => handleOver(), match[turn()].clock);

    match.clockTimeout = timeout[Symbol.toPrimitive]();

    match.fen = engine.fen();
    match.pgn = engine.pgn();

    await redis.set(`match:${match.id}`, JSON.stringify(match));

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.RESIGN)
  async resign(@ConnectedSocket() socket: Socket, @MessageBody() body: ResignDto): Promise<Acknowledgment> {
    const {user} = socket.request.session;

    const json = await redis.get(`match:${body.matchId}`);

    if (!json) return acknowledgment.error({message: "Invalid match"});

    const match: MatchEntity = JSON.parse(json);

    const isWhite = String(match.white.id) === String(user._id);
    const isBlack = String(match.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) return acknowledgment.error({message: "You are not participant"});

    const {type, control, clockTimeout} = match;

    clearInterval(clockTimeout);

    const loser = isWhite ? match.white : match.black;
    const winner = isWhite ? match.black : match.white;

    this.server.to(match.id).emit(clientEvents.RESIGNED, {
      matchId: match.id,
      from: loser.side,
    });

    const result = elo.calculateVictory({winner: winner.rating, loser: loser.rating});

    await this.userService.updateOne({_id: Types.ObjectId(String(loser.id))}, {[type]: {rating: result.loser}});
    await this.userService.updateOne({_id: Types.ObjectId(String(winner.id))}, {[type]: {rating: result.winner}});

    const white = await this.matchPlayerService.create({
      user: Types.ObjectId(String(match.white.user._id)),
      rating: match.white.rating,
      shift: isWhite ? -result.shift : result.shift,
      result: isWhite ? "lose" : "victory",
      side: "white",
    });

    const black = await this.matchPlayerService.create({
      user: Types.ObjectId(String(match.black.user._id)),
      rating: match.black.rating,
      shift: isBlack ? -result.shift : result.shift,
      result: isBlack ? "lose" : "victory",
      side: "black",
    });

    const engine = new Chess(match.fen);

    match.pgn && engine.load_pgn(match.pgn);

    await this.matchService.create({
      white,
      black,
      control,
      type,
      sid: match.id,
      fen: engine.fen(),
      pgn: engine.pgn(),
      winner: isWhite ? black : white,
    });

    this.server.to(match.id).emit(clientEvents.RESULTATIVE_ENDING, {
      matchId: match.id,
      [winner.side]: {
        rating: result.winner,
        shift: result.shift,
        result: "victory",
      },
      [loser.side]: {
        rating: result.loser,
        shift: -result.shift,
        result: "lose",
      },
    });

    this.server.to(match.id).emit(clientEvents.CLOCK, {
      matchId: match.id,
      clock: {
        white: match.white.clock,
        black: match.black.clock,
      },
    });

    redis.del(`match:${match.id}`);

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.OFFER_DRAW)
  async offerDraw(@ConnectedSocket() socket: Socket, @MessageBody() body: OfferDrawDto): Promise<Acknowledgment> {
    const {user} = socket.request.session;

    const json = await redis.get(`match:${body.matchId}`);

    if (!json) return acknowledgment.error({message: "Invalid match"});

    const match: MatchEntity = JSON.parse(json);

    const isWhite = String(match.white.id) === String(user._id);
    const isBlack = String(match.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) return acknowledgment.error({message: "You are not participant"});

    const self = isWhite ? match.white : match.black;

    if (self.hasOfferedDraw) return acknowledgment.error({message: "You have already offered a draw"});

    self.hasOfferedDraw = true;
    self.isDrawOfferValid = true;

    this.server.to(match.id).emit(clientEvents.DRAW_OFFER, {
      matchId: match.id,
      from: self.side,
    });

    redis.set(`match:${match.id}`, JSON.stringify(match));

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.ACCEPT_DRAW)
  async acceptDraw(@ConnectedSocket() socket: Socket, @MessageBody() body: AcceptDrawDto) {
    const {user} = socket.request.session;

    const json = await redis.get(`match:${body.matchId}`);

    if (!json) return acknowledgment.error({message: "Invalid match"});

    const match: MatchEntity = JSON.parse(json);

    const isWhite = String(match.white.id) === String(user._id);
    const isBlack = String(match.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) return acknowledgment.error({message: "You are not participant"});

    const self = isWhite ? match.white : match.black;
    const opponent = isWhite ? match.black : match.white;

    if (!opponent.isDrawOfferValid) return acknowledgment.error({message: "Draw offer is not valid"});

    clearInterval(match.clockTimeout);

    this.server.to(match.id).emit(clientEvents.DRAW_OFFER_ACCEPT, {
      matchId: match.id,
      from: self.side,
    });

    const {type, control} = match;

    const [underdog, favourite] = [match.white, match.black].sort((a, b) => a.rating - b.rating);

    const result = elo.calculateDraw({underdog: underdog.rating, favourite: favourite.rating});

    await this.userService.updateOne({_id: Types.ObjectId(String(underdog.id))}, {[type]: {rating: result.underdog}});
    await this.userService.updateOne({_id: Types.ObjectId(String(favourite.id))}, {[type]: {rating: result.favourite}});

    const isUnderdogWhite = String(match.white.id) === String(underdog.id);

    const white = await this.matchPlayerService.create({
      user: Types.ObjectId(String(match.white.user._id)),
      rating: match.white.rating,
      shift: isUnderdogWhite ? result.shift : -result.shift,
      result: "draw",
      side: "white",
    });

    const black = await this.matchPlayerService.create({
      user: Types.ObjectId(String(match.black.user._id)),
      rating: match.black.rating,
      shift: isUnderdogWhite ? -result.shift : result.shift,
      result: "draw",
      side: "black",
    });

    const engine = new Chess(match.fen);

    match.pgn && engine.load_pgn(match.pgn);

    await this.matchService.create({
      white,
      black,
      control,
      type,
      sid: match.id,
      fen: engine.fen(),
      pgn: engine.pgn(),
      winner: null,
    });

    this.server.to(match.id).emit(clientEvents.TIE_ENDING, {
      matchId: match.id,
      [underdog.side]: {
        rating: result.underdog,
        shift: result.shift,
        result: "draw",
      },
      [favourite.side]: {
        rating: result.favourite,
        shift: -result.shift,
        result: "draw",
      },
    });

    this.server.to(match.id).emit(clientEvents.CLOCK, {
      matchId: match.id,
      clock: {
        white: match.white.clock,
        black: match.black.clock,
      },
    });

    redis.del(`match:${match.id}`);

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.DECLINE_DRAW)
  async declineDraw(@ConnectedSocket() socket: Socket, @MessageBody() body: DeclineDrawDto): Promise<Acknowledgment> {
    const {user} = socket.request.session;

    const json = await redis.get(`match:${body.matchId}`);

    if (!json) return acknowledgment.error({message: "Invalid match"});

    const match: MatchEntity = JSON.parse(json);

    const isWhite = String(match.white.id) === String(user._id);
    const isBlack = String(match.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) return acknowledgment.error({message: "You are not participant"});

    const opponent = isWhite ? match.black : match.white;

    if (!opponent.isDrawOfferValid) return acknowledgment.error({message: "Draw offer is not valid"});

    opponent.isDrawOfferValid = false;

    const self = isWhite ? match.white : match.black;

    this.server.to(match.id).emit(clientEvents.DRAW_OFFER_DECLINE, {
      matchId: match.id,
      from: self.side,
    });

    redis.set(`match:${match.id}`, JSON.stringify(match));

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.PREMOVE)
  async premove(@ConnectedSocket() socket: Socket, @MessageBody() body: PremoveDto): Promise<Acknowledgment> {
    const {user} = socket.request.session;

    const json = await redis.get(`match:${body.matchId}`);

    if (!json) return acknowledgment.error({message: "Invalid match"});

    const match: MatchEntity = JSON.parse(json);

    const isWhite = String(match.white.id) === String(user._id);
    const isBlack = String(match.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) return acknowledgment.error({message: "You are not participant"});

    const engine = new Chess(match.fen);

    const current = engine.turn() === "w" ? "white" : "black";

    const isTurn = (current === "white" && isWhite) || (current === "black" && isBlack);

    if (isTurn) return acknowledgment.error({message: "It is your turn to make move, not premove"});

    match.premove = {
      from: body.from,
      to: body.to,
      promotion: body.promotion,
    };

    redis.set(`match:${match.id}`, JSON.stringify(match));

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.REMOVE_PREMOVE)
  async removePremove(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: RemovePremoveDto,
  ): Promise<Acknowledgment> {
    const {user} = socket.request.session;

    const json = await redis.get(`match:${body.matchId}`);

    if (!json) return acknowledgment.error({message: "Invalid match"});

    const match: MatchEntity = JSON.parse(json);

    const isWhite = String(match.white.id) === String(user._id);
    const isBlack = String(match.black.id) === String(user._id);

    const isParticipant = isWhite || isBlack;

    if (!isParticipant) return acknowledgment.error({message: "You are not participant"});

    const engine = new Chess(match.fen);

    const current = engine.turn() === "w" ? "white" : "black";

    const isTurn = (current === "white" && isWhite) || (current === "black" && isBlack);

    if (isTurn) return acknowledgment.error({message: "It is your turn to make move"});

    match.premove = null;

    redis.set(`match:${match.id}`, JSON.stringify(match));

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.SPECTATE_MATCH)
  async spectateMatch(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: SpectateMatchDto,
  ): Promise<Acknowledgment> {
    const json = await redis.get(`match:${body.matchId}`);

    if (!json) return acknowledgment.error({message: "Invalid match"});

    const match: MatchEntity = JSON.parse(json);

    socket.join(match.id);

    return acknowledgment.ok();
  }

  @SubscribeMessage(serverEvents.SEND_MESSAGE)
  async sendMessage(@ConnectedSocket() socket: Socket, @MessageBody() body: SendMessageDto) {
    const {user} = socket.request.session;

    const actual = await this.userService.findById(Types.ObjectId(String(user._id)));

    this.server.to(body.matchId).emit(clientEvents.MESSAGE, {
      sender: actual.public,
      text: body.text,
    });

    return acknowledgment.ok();
  }
}
