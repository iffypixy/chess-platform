export type ChessSide = "white" | "black";

export type ChessCategory = "bullet" | "blitz" | "rapid" | "classical";

export interface ChessTimeControl {
  time: number;
  increment: number;
  delay: number;
}
