import {ShortMove} from "chess.js";
import {Types} from "mongoose";

import {UserDocument, UserPublicData} from "@modules/user";

export type MatchSide = "white" | "black";

export type MatchType = "bullet" | "blitz" | "rapid" | "classical";

export type MatchResult = "victory" | "lose" | "draw";

export type PromotionPiece = "q" | "r" | "b" | "n";

export interface MatchControl {
  time: number;
  increment: number;
  delay: number;
}

export interface MatchEntity {
  id: string;
  white: MatchPlayerEntity;
  black: MatchPlayerEntity;
  fen: string;
  pgn: string;
  last: number;
  control: MatchControl;
  type: MatchType;
  isDrawOfferValid: boolean;
  premove: ShortMove | null;
  drawOfferTimeout: number | null;
  clockTimeout: number | null;
}

export interface MatchPlayerEntity {
  id: Types.ObjectId;
  user: UserDocument;
  clock: number;
  rating: number;
  side: MatchSide;
  hasOfferedDraw: boolean;
}

export interface MatchEntityPublic {
  id: string;
  control: MatchControl;
  type: MatchType;
  pgn: string;
  fen: string;
  white: MatchEntityPlayerPublic;
  black: MatchEntityPlayerPublic;
  isDrawOfferValid: boolean;
}

export interface MatchEntityPlayerPublic {
  user: UserPublicData;
  side: MatchSide;
  rating: number;
  clock: number;
  hasOfferedDraw: boolean;
}
