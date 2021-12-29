import {AxiosPromise} from "axios";
import {Square} from "chess.js";

import {serverEvents} from "@shared/lib/socket";
import {emit, request} from "./request";
import {User} from "./users";

export type Match = RealMatch | CompletedMatch;

export interface RealMatch {
  id: string;
  white: RealMatchPlayer;
  black: RealMatchPlayer;
  fen: string;
  pgn: string;
  type: MatchType;
  isDrawOfferValid: boolean;
  control: TimeControl;
  isCompleted: false;
}

export interface CompletedMatch {
  id: string;
  white: CompletedMatchPlayer;
  black: CompletedMatchPlayer;
  winner: CompletedMatchPlayer | null;
  pgn: string;
  fen: string;
  sid: string;
  type: MatchType;
  control: MatchControl;
  isCompleted: true;
}

export type MatchType = "bullet" | "blitz" | "rapid" | "classical";

export type MatchResult = "victory" | "lose" | "draw";

export interface MatchControl {
  time: number;
  increment: number;
  delay: number;
}

export interface MatchClock {
  white: number;
  black: number;
}

export interface RealMatchPlayer {
  user: User;
  rating: number;
  side: MatchSide;
  clock: number;
  hasOfferedDraw: boolean;
}

export interface CompletedMatchPlayer {
  id: string;
  user: User;
  rating: number;
  shift: number;
  result: MatchResult;
  side: MatchSide;
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
  emit({event: serverEvents.MAKE_MOVE, data});

export interface ResignData {
  matchId: string;
}

export interface ResignResponse {}

const resign = (data: ResignData): Promise<ResignResponse> =>
  emit({event: serverEvents.RESIGN, data});

export interface OfferDrawData {
  matchId: string;
}

export interface OfferDrawResponse {}

export const offerDraw = (data: OfferDrawData): Promise<OfferDrawResponse> =>
  emit({event: serverEvents.OFFER_DRAW, data});

export interface DeclineDrawData {
  matchId: string;
}

export interface DeclineDrawResponse {}

export const declineDraw = (
  data: DeclineDrawData
): Promise<DeclineDrawResponse> =>
  emit({event: serverEvents.DECLINE_DRAW, data});

export interface AcceptDrawData {
  matchId: string;
}

export interface AcceptDrawResponse {}

export const acceptDraw = (data: AcceptDrawData): Promise<AcceptDrawResponse> =>
  emit({event: serverEvents.ACCEPT_DRAW, data});

export interface MakePremoveData {
  matchId: string;
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

export interface MakePremoveResponse {}

export const makePremove = (
  data: MakePremoveData
): Promise<MakePremoveResponse> => emit({event: serverEvents.PREMOVE, data});

export interface RemovePremoveData {
  matchId: string;
}

export interface RemovePremoveResponse {}

export const removePremove = (
  data: RemovePremoveData
): Promise<RemovePremoveResponse> =>
  emit({event: serverEvents.REMOVE_PREMOVE, data});

export interface SpectateMatchData {
  matchId: string;
}

export interface SpectateMatchResponse {}

export const spectateMatch = (
  data: SpectateMatchData
): Promise<SpectateMatchResponse> =>
  emit({event: serverEvents.SPECTATE_MATCH, data});

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

export interface SendMessageData {
  matchId: string;
  text: string;
}

export interface SendMessageResponse {}

const sendMessage = (data: SendMessageData): Promise<SendMessageResponse> =>
  emit({
    event: serverEvents.SEND_MESSAGE,
    data,
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
  spectateMatch,
  sendMessage,
};
