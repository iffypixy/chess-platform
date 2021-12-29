"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHESS_NOTATION = exports.MATCHMAKING = exports.CHESS_TYPES = void 0;
const matchmaking_1 = require("../..");
exports.CHESS_TYPES = {
    BULLET: "bullet",
    BLITZ: "blitz",
    RAPID: "rapid",
    CLASSICAL: "classical",
};
exports.MATCHMAKING = {
    MAX_RATING_DIFFERENCE: 50,
    MAX_WAIT_TIME: 10,
    RATING_GAIN: 25,
    INIT_TIME: 15000,
    DRAW_OFFER_DURATION: 10000,
};
exports.CHESS_NOTATION = {
    INITIAL_FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
};
//# sourceMappingURL=index.js.map