import {AxiosPromise} from "axios";
import {Square} from "chess.js";

import {emit, request} from "./request";
import {User} from "./users";

export interface Match {
  id: string;
  white: MatchPlayer;
  black: MatchPlayer;
  fen: string;
  pgn: string;
  type: MatchType;
  isDrawOfferValid: boolean;
  control: TimeControl;
}

export type MatchType = "bullet" | "blitz" | "rapid" | "classical";

export interface MatchClock {
  white: number;
  black: number;
}

export interface MatchPlayer {
  user: User;
  rating: number;
  side: MatchSide;
  clock: number;
  hasOfferedDraw: boolean;
}

export interface TimeControl {
  time: number;
  increment: number;
  delay: number;
}

export type PromotionPiece = "q" | "n" | "r" | "b";

export type MatchSide = "white" | "black";

export interface MakeMoveData {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
  matchId: string;
}

export interface MakeMoveResponse {}

const makeMove = (data: MakeMoveData): Promise<MakeMoveResponse> =>
  emit({event: "make-move", data});

export interface ResignData {
  matchId: string;
}

export interface ResignResponse {}

const resign = (data: ResignData): Promise<ResignResponse> =>
  emit({event: "resign", data});

export interface OfferDrawData {
  matchId: string;
}

export interface OfferDrawResponse {}

export const offerDraw = (data: OfferDrawData): Promise<OfferDrawResponse> =>
  emit({event: "offer-draw", data});

export interface DeclineDrawData {
  matchId: string;
}

export interface DeclineDrawResponse {}

export const declineDraw = (
  data: DeclineDrawData
): Promise<DeclineDrawResponse> => emit({event: "decline-draw", data});

export interface AcceptDrawData {
  matchId: string;
}

export interface AcceptDrawResponse {}

export const acceptDraw = (data: AcceptDrawData): Promise<AcceptDrawResponse> =>
  emit({event: "accept-draw", data});

export interface MakePremoveData {
  matchId: string;
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

export interface MakePremoveResponse {}

export const makePremove = (
  data: MakePremoveData
): Promise<MakePremoveResponse> => emit({event: "make-premove", data});

export interface RemovePremoveData {
  matchId: string;
}

export interface RemovePremoveResponse {}

export const removePremove = (
  data: RemovePremoveData
): Promise<RemovePremoveResponse> => emit({event: "remove-premove", data});

export interface GetMatchData {
  matchId: string;
}

export interface GetMatchResponse {
  match: Match;
}

const getMatch = (data: GetMatchData): AxiosPromise<GetMatchResponse> =>
  request({
    method: "GET",
    url: `/api/matches/${data.matchId}`,
  });

export const matchesApi = {
  makeMove,
  resign,
  getMatch,
  makePremove,
  acceptDraw,
  declineDraw,
  offerDraw,
  removePremove,
};
