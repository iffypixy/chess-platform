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
