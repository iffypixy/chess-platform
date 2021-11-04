import {Chess, Move} from "chess.js";

import {ChessSide, ChessTimeControl, ChessCategory} from "../typings";

export const MAX_DIFF_IN_RATING = 50;
export const DEFAULT_GAIN = 25;
export const MAX_WAIT_TIME = 10000;

export const CHESS_CATEGORIES = {
  BULLET: "bullet",
  BLITZ: "blitz",
  RAPID: "rapid",
  CLASSICAL: "classical",
};

export const getChessCategory = (control: ChessTimeControl): ChessCategory => {
  const {time, delay, increment} = control;

  const overall = (time + delay * 45 + increment * 45) / 1000;

  if (overall <= 2) return CHESS_CATEGORIES.BULLET as ChessCategory;
  else if (overall <= 7) return CHESS_CATEGORIES.BLITZ as ChessCategory;
  else if (overall <= 20) return CHESS_CATEGORIES.RAPID as ChessCategory;
  else if (overall > 20) return CHESS_CATEGORIES.CLASSICAL as ChessCategory;
};

export class ChessGame {
  constructor(public readonly control: ChessTimeControl) {}

  private readonly ABORT_TIMEOUT_MS = 15000;
  private readonly CLOCK_INTERVAL_MS = 100;

  readonly clock = {
    white: this.control.time,
    black: this.control.time,
  };

  private readonly game = new Chess();

  private abortTimeout: NodeJS.Timeout | null = null;
  private clockTimeout: NodeJS.Timeout | null = null;
  private clockInterval: NodeJS.Timer | null = null;

  public addTime({side, time}: {side: ChessSide; time: number}): void {
    this.clock[side] = this.clock[side] + time;
  }

  public startClockTimer(handleVictory: () => void): void {
    const side = this.turn;

    this.clockTimeout = setTimeout(() => {
      this.clockInterval = setInterval(() => {
        this.clock[side] = this.clock[side] - this.CLOCK_INTERVAL_MS;

        if (this.clock[side] <= 0) handleVictory();
      }, this.CLOCK_INTERVAL_MS);
    }, this.control.delay);
  }

  public stopClockTimer(): void {
    clearTimeout(this.clockTimeout);
    clearInterval(this.clockInterval);
  }

  public startAbortTimer(handleAbort: () => void): void {
    this.abortTimeout = setTimeout(() => handleAbort(), this.ABORT_TIMEOUT_MS);
  }

  public stopAbortTimer(): void {
    clearTimeout(this.abortTimeout);
  }

  public get turn(): ChessSide {
    return this.game.turn() === "w" ? "white" : "black";
  }

  public get isInitiated(): boolean {
    return this.game.history.length >= 2;
  }

  public get isOver(): boolean {
    return this.game.game_over();
  }

  public get isCheckmate(): boolean {
    return this.game.in_checkmate();
  }

  public get isDraw(): boolean {
    return (
      this.game.in_draw() ||
      this.game.in_stalemate() ||
      this.game.in_threefold_repetition() ||
      this.game.insufficient_material()
    );
  }

  public get pgn(): string {
    return this.game.pgn();
  }

  public makeMove(move: string): Move {
    return this.game.move(move);
  }
}
