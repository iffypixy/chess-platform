import {ChessTimeControl, ChessCategory} from "@modules/chess";

import {CHESS_CATEGORIES} from "../constants";

export const timeControlToCategory = ({time, delay, increment}: ChessTimeControl): ChessCategory => {
  const overall = (time + delay * 45 + increment * 45) / 1000;

  if (overall <= 2) return CHESS_CATEGORIES.BULLET;
  else if (overall <= 7) return CHESS_CATEGORIES.BLITZ;
  else if (overall <= 20) return CHESS_CATEGORIES.RAPID;
  else if (overall > 20) return CHESS_CATEGORIES.CLASSICAL;
};
