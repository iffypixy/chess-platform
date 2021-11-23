import {ChessCategory} from "@modules/chess";

export const CHESS_CATEGORIES: {[key: string]: ChessCategory} = {
  BULLET: "bullet",
  BLITZ: "blitz",
  RAPID: "rapid",
  CLASSICAL: "classical",
};

export const MAX_DIFF_IN_RATING = 50;
export const DEFAULT_GAIN = 25;
export const MAX_WAIT_TIME = 10000;

export const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
