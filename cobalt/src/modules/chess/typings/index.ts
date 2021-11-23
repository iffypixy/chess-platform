import {Types} from "mongoose";

export type ChessSide = "white" | "black";

export type ChessCategory = "bullet" | "blitz" | "rapid" | "classical";

export interface ChessControl {
  time: number;
  increment: number;
  delay: number;
}

export interface ChessPlayer {
  id: Types.ObjectId;
  clock: number;
  rating: number;
}

export interface ChessEntity {
  white: ChessPlayer;
  black: ChessPlayer;
  fen: string;
  pgn: string;
  premove: string | null;
  control: ChessControl;
  isDrawOffered: boolean;
}
