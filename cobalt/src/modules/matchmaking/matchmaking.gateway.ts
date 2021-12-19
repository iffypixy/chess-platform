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
import {Chess} from "chess.js";
import {nanoid} from "nanoid";

import {ControlMode, UserData, UserService} from "@modules/user";
import {constants} from "@lib/constants";
import {acknowledgment, SocketIoService, Acknowledgment} from "@lib/socket.io";
import {redis} from "@lib/redis";
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
};

const clientEvents = {
  MOVE: "move",
  DRAW: "draw",
  MATCH_FOUND: "match-found",
  VICTORY: "victory",
  LOSE: "lose",
  ABORT: "abort",
  DRAW_OFFER: "draw-offer",
  DRAW_OFFER_DECLINE: "draw-offer-decline",
  CLOCK: "clock",
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
          drawOfferTimeout: null,
          isDrawOfferValid: false,
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
          },
          black: {
            id: opponent.user._id,
            user: this.userService.hydrate(opponent.user),
            rating: opponent.rating,
            side: "black",
            clock: control.time,
            hasOfferedDraw: false,
          },
        };

        redis.set(`match:${match.id}`, JSON.stringify(match)).then((res) => {
          if (res !== "OK") return;

          const sockets = [
            ...this.service.getSocketsByUserId(user._id),
            ...this.service.getSocketsByUserId(opponent.user._id),
          ];

          redis.set("queue", JSON.stringify(queue)).then((res) => {
            if (res !== "OK") return;

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
              });

              const black = await this.matchPlayerService.create({
                user: Types.ObjectId(String(opponent.user._id)),
                rating: match.black.rating,
                shift: result.shift,
                result: "victory",
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

              const winners = this.service.getSocketsByUserId(opponent.user._id);
              const losers = this.service.getSocketsByUserId(user._id);

              this.server.to(winners).emit(clientEvents.VICTORY, {
                rating: result.winner,
                shift: result.shift,
              });

              this.server.to(losers).emit(clientEvents.LOSE, {
                rating: result.loser,
                shift: -result.shift,
              });

              await redis.del(`match:${match.id}`);
            }, match.white.clock);

            match.clockTimeout = timeout[Symbol.toPrimitive]();

            this.server.to(sockets).emit(clientEvents.MATCH_FOUND, {
              match: {
                id: match.id,
                control: match.control,
                pgn: null,
                isDrawOfferValid: false,
                type: match.type,
                fen: match.fen,
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

    const {user} = socket.request.session;

    const actual = await this.userService.findById(Types.ObjectId(String(user._id)));

    const control: MatchControl = {
      delay: body.delay * 1000,
      increment: body.increment * 1000,
      time: body.time * 60 * 1000,
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

    const engine = new Chess(match.fen);

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

    const opponents = this.service.getSocketsByUserId(match[opposite].id);
    const self = this.service.getSocketsByUserId(match[current].id);

    const sockets = [...opponents, ...self];

    this.server.to(opponents).emit(clientEvents.MOVE, {
      move: result,
    });

    this.server.to(sockets).emit(clientEvents.CLOCK, {
      clock: {
        white: match.white.clock,
        black: match.black.clock,
      },
    });

    const isOver = engine.game_over();

    const handleOver = async ({isOutOfTime}: {isOutOfTime: boolean}) => {
      const {control, type} = match;

      const pgn = engine.pgn();
      const fen = engine.fen();

      const current = turn();
      const opposite = turn() === "white" ? "black" : "white";

      const isResultative = engine.game_over() || isOutOfTime;
      const isDraw = !isResultative;

      if (isResultative) {
        const winner = match[opposite];
        const loser = match[current];

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
        });

        const black = await this.matchPlayerService.create({
          user: Types.ObjectId(String(match.black.user._id)),
          rating: match.black.rating,
          shift: isWinnerWhite ? -result.shift : result.shift,
          result: isWinnerWhite ? "lose" : "victory",
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

        const winners = this.service.getSocketsByUserId(winner.id);
        const losers = this.service.getSocketsByUserId(loser.id);

        this.server.to(winners).emit(clientEvents.VICTORY, {
          rating: result.winner,
          shift: result.shift,
        });

        this.server.to(losers).emit(clientEvents.LOSE, {
          rating: result.loser,
          shift: -result.shift,
        });
      } else if (isDraw) {
        const [underdog, favourite] = [match[current], match[opposite]].sort((a, b) => a.rating - b.rating);

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
        });

        const black = await this.matchPlayerService.create({
          user: Types.ObjectId(String(match.black.user._id)),
          rating: match.black.rating,
          shift: isUnderdogWhite ? -result.shift : result.shift,
          result: "draw",
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

        const underdogs = this.service.getSocketsByUserId(underdog.id);
        const favourites = this.service.getSocketsByUserId(favourite.id);

        this.server.to(underdogs).emit(clientEvents.DRAW, {
          rating: result.underdog,
          shift: result.shift,
        });

        this.server.to(favourites).emit(clientEvents.DRAW, {
          rating: result.favourite,
          shift: -result.shift,
        });
      }

      this.server.to(sockets).emit(clientEvents.CLOCK, {
        clock: {
          white: match.white.clock,
          black: match.black.clock,
        },
      });

      await redis.del(`match:${match.id}`);
    };

    if (isOver) {
      await handleOver({isOutOfTime: false});

      return acknowledgment.ok();
    }

    const isPremove = !!match.premove;

    if (isPremove) {
      const premove = engine.move(match.premove);

      if (premove) {
        engine.set_comment(`clock:${match[opposite].clock}`);

        this.server.to(self).emit(clientEvents.MOVE, {
          move: premove,
        });

        this.server.to(sockets).emit(clientEvents.CLOCK, {
          clock: {
            white: match.white.clock,
            black: match.black.clock,
          },
        });

        const isOver = engine.game_over();

        if (isOver) {
          await handleOver({isOutOfTime: false});

          return acknowledgment.ok();
        }
      }
    }

    match.last = Date.now();

    const timeout = setTimeout(() => handleOver({isOutOfTime: true}), match[turn()].clock);

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

    const {type, control} = match;

    const loser = isWhite ? match.white : match.black;
    const winner = isWhite ? match.black : match.white;

    const result = elo.calculateVictory({winner: winner.rating, loser: loser.rating});

    await this.userService.updateOne({_id: Types.ObjectId(String(loser.id))}, {[type]: {rating: result.loser}});

    await this.userService.updateOne({_id: Types.ObjectId(String(winner.id))}, {[type]: {rating: result.winner}});

    const white = await this.matchPlayerService.create({
      user: Types.ObjectId(String(match.white.user._id)),
      rating: match.white.rating,
      shift: isWhite ? -result.shift : result.shift,
      result: isWhite ? "lose" : "victory",
    });

    const black = await this.matchPlayerService.create({
      user: Types.ObjectId(String(match.black.user._id)),
      rating: match.black.rating,
      shift: isBlack ? -result.shift : result.shift,
      result: isBlack ? "lose" : "victory",
    });

    const engine = new Chess(match.fen);

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

    const losers = this.service.getSocketsByUserId(loser.id);
    const winners = this.service.getSocketsByUserId(winner.id);

    this.server.to(losers).emit(clientEvents.LOSE, {
      rating: result.loser,
      loss: -result.shift,
    });

    this.server.to(winners).emit(clientEvents.VICTORY, {
      rating: result.winner,
      gain: result.shift,
    });

    this.server.to([...winners, ...losers]).emit(clientEvents.CLOCK, {
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
    const opponent = isWhite ? match.black : match.white;

    if (match.isDrawOfferValid)
      return acknowledgment.error({message: "The draw offer from your opponent is still valid"});

    if (self.hasOfferedDraw) return acknowledgment.error({message: "You have already offered a draw"});

    self.hasOfferedDraw = true;
    match.isDrawOfferValid = true;

    const opponents = this.service.getSocketsByUserId(opponent.id);

    this.server.to(opponents).emit(clientEvents.DRAW_OFFER);

    const timeout = setTimeout(async () => {
      const json = await redis.get(`match:${match.id}`);

      if (!json) return;

      const entity: MatchEntity = JSON.parse(json);

      entity.isDrawOfferValid = false;

      redis.set(`match:${entity.id}`, JSON.stringify(entity));
    }, MATCHMAKING.DRAW_OFFER_DURATION);

    match.clockTimeout = timeout[Symbol.toPrimitive]();

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

    if (!match.isDrawOfferValid) return acknowledgment.error({message: "Draw offer is not valid"});

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
    });

    const black = await this.matchPlayerService.create({
      user: Types.ObjectId(String(match.black.user._id)),
      rating: match.black.rating,
      shift: isUnderdogWhite ? -result.shift : result.shift,
      result: "draw",
    });

    const engine = new Chess(match.fen);

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

    const underdogs = this.service.getSocketsByUserId(underdog.id);
    const favourites = this.service.getSocketsByUserId(favourite.id);

    this.server.to(underdogs).emit(clientEvents.DRAW, {
      rating: result.underdog,
      shift: result.shift,
    });

    this.server.to(favourites).emit(clientEvents.DRAW, {
      rating: result.favourite,
      shift: -result.shift,
    });

    this.server.to([...underdogs, ...favourites]).emit(clientEvents.CLOCK, {
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

    if (!match.isDrawOfferValid) return acknowledgment.error({message: "Draw offer is not valid"});

    match.isDrawOfferValid = false;

    const opponent = isWhite ? match.black : match.white;
    const opponents = this.service.getSocketsByUserId(opponent.id);

    this.server.to(opponents).emit(clientEvents.DRAW_OFFER_DECLINE);

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
}
