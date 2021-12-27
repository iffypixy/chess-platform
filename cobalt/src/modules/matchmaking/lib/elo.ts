import {MATCHMAKING} from "./constants";

interface CalculateVictoryData {
  winner: number;
  loser: number;
}

interface CalculateVictoryReturn {
  winner: number;
  loser: number;
  shift: number;
}

const calculateVictory = ({winner, loser}: CalculateVictoryData): CalculateVictoryReturn => {
  const difference = loser - winner;
  const shift = Math.round(difference / 20);

  const change = Math.max(1, MATCHMAKING.RATING_GAIN + shift);

  return {
    winner: winner + change,
    loser: loser - change,
    shift: change,
  };
};

interface CalculateDrawData {
  underdog: number;
  favourite: number;
}

interface CalculateDrawReturn {
  underdog: number;
  favourite: number;
  shift: number;
}

const calculateDraw = ({underdog, favourite}: CalculateDrawData): CalculateDrawReturn => {
  const difference = Math.abs(underdog - favourite);
  const shift = Math.round(difference / 20);

  return {
    underdog: underdog + shift,
    favourite: favourite - shift,
    shift,
  };
};

export const elo = {
  calculateDraw,
  calculateVictory,
};
