import {Chess, Move} from "chess.js";

import {ChessSide, ChessTimeControl} from "@modules/chess";

export class ChessEngine {
  constructor(public readonly control: ChessTimeControl) {}

  private readonly ABORT_TIMEOUT_MS = 15000;
  private readonly CLOCK_INTERVAL_MS = 100;

  private readonly ChessGame = new Chess();

  private abortTimeout: NodeJS.Timeout | null = null;
  private clockTimeout: NodeJS.Timeout | null = null;
  private clockInterval: NodeJS.Timer | null = null;

  readonly clock = {
    white: this.control.time,
    black: this.control.time,
  };

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
    return this.ChessGame.turn() === "w" ? "white" : "black";
  }

  public get isInitiated(): boolean {
    return this.ChessGame.history.length >= 2;
  }

  public get isOver(): boolean {
    return this.ChessGame.game_over();
  }

  public get isCheckmate(): boolean {
    return this.ChessGame.in_checkmate();
  }

  public get isDraw(): boolean {
    return (
      this.ChessGame.in_draw() ||
      this.ChessGame.in_stalemate() ||
      this.ChessGame.in_threefold_repetition() ||
      this.ChessGame.insufficient_material()
    );
  }

  public get pgn(): string {
    return this.ChessGame.pgn();
  }

  public makeMove(move: string): Move {
    return this.ChessGame.move(move);
  }
}
