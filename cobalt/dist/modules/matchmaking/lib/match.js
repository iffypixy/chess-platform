"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchEntity = void 0;
const chess_js_1 = require("chess.js");
const user_1 = require("../../user");
const constants_1 = require("./constants");
class MatchEntity {
    constructor(data) {
        this.data = data;
        this.engine = new chess_js_1.Chess(this.data.fen);
    }
    move(move) {
        const turn = this.turn;
        const result = this.engine.move(move);
        if (!result)
            return null;
        const last = this.data.last;
        const taken = !!last ? Date.now() - last : 0;
        const clock = this.data[turn].clock - (taken - this.data.control.increment);
        this.data[turn].clock = clock;
        this.engine.set_comment(`clk:${clock}`);
        this.data.last = Date.now();
        return result;
    }
    startClockTimer(handleOverdue) {
        const timeout = setTimeout(handleOverdue, this.data[this.turn].clock);
        this.data.clockTimeout = timeout[Symbol.toPrimitive]();
    }
    startDrawTimer() {
        const timeout = setTimeout(() => {
            this.data.isDrawOfferValid = false;
        }, constants_1.MATCHMAKING.DRAW_OFFER_DURATION);
        this.data.drawTimeout = timeout[Symbol.toPrimitive]();
    }
    isTurn(id) {
        const { white, black } = this.data;
        const isWhite = white.user.id === String(id);
        const isBlack = black.user.id === String(id);
        return (isWhite && this.turn === "white") || (isBlack && this.turn === "black");
    }
    isParticipant(id) {
        const { white, black } = this.data;
        const isWhite = white.user.id === String(id);
        const isBlack = black.user.id === String(id);
        const isParticipant = isWhite || isBlack;
        return {
            isWhite,
            isBlack,
            isParticipant,
        };
    }
    get fen() {
        return this.engine.fen();
    }
    get pgn() {
        return this.engine.pgn();
    }
    get isCheckmate() {
        return this.engine.in_checkmate();
    }
    get turn() {
        return this.engine.turn() === "w" ? "white" : "black";
    }
    get opposite() {
        return this.engine.turn() === "w" ? "black" : "white";
    }
    get isOver() {
        return this.engine.game_over();
    }
    get output() {
        return Object.assign(Object.assign({}, this.data), { fen: this.engine.fen(), pgn: this.engine.pgn() });
    }
    get public() {
        const { id, white, black, control, fen, pgn, type, isDrawOfferValid } = this.data;
        return {
            id,
            control,
            type,
            fen: this.fen,
            pgn: this.pgn,
            isDrawOfferValid,
            white: {
                user: white.user,
                rating: white.rating,
                clock: white.clock,
                hasOfferedDraw: white.hasOfferedDraw,
                side: "white",
            },
            black: {
                user: black.user,
                rating: black.rating,
                clock: black.clock,
                hasOfferedDraw: black.hasOfferedDraw,
                side: "black",
            },
        };
    }
}
exports.MatchEntity = MatchEntity;
//# sourceMappingURL=match.js.map