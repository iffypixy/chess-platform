export type ChessSide = "white" | "black";

export type ChessCategory = "bullet" | "blitz" | "rapid" | "classic";

export interface ChessTimeControl {
  time: number;
  increment: number;
  delay: number;
}
