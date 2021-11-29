import {ChessType} from "@modules/matchmaking";

export const CHESS_TYPES: {[key: string]: ChessType} = {
  BULLET: "bullet",
  BLITZ: "blitz",
  RAPID: "rapid",
  CLASSICAL: "classical",
};

export const MATCHMAKING = {
  MAX_RATING_DIFFERENCE: 50,
  MAX_WAIT_TIME: 10,
  RATING_GAIN: 25,
  INIT_TIME: 15000,
  DRAW_OFFER_DURATION: 10000,
};

export const CHESS_NOTATION = {
  INITIAL_FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
};
