import { Types } from "mongoose";
import { Move, ShortMove } from "chess.js";
import { UserPublicData } from "@modules/user";
import { MatchControl, MatchSide, MatchType } from "../typings";
interface MatchEntityPlayer {
    id: Types.ObjectId;
    user: UserPublicData;
    clock: number;
    rating: number;
    side: MatchSide;
    hasOfferedDraw: boolean;
}
export interface MatchEntityInstance {
    id: string;
    white: MatchEntityPlayer;
    black: MatchEntityPlayer;
    control: MatchControl;
    fen: string;
    pgn: string | null;
    type: MatchType;
    premove: ShortMove | null;
    isDrawOfferValid: boolean;
    clockTimeout: number | null;
    drawTimeout: number | null;
    last: number;
}
export interface MatchEntityPublic {
    id: string;
    white: MatchEntityPlayerPublic;
    black: MatchEntityPlayerPublic;
    control: MatchControl;
    fen: string;
    pgn: string | null;
    type: MatchType;
    isDrawOfferValid: boolean;
}
interface MatchEntityPlayerPublic {
    user: UserPublicData;
    clock: number;
    rating: number;
    side: MatchSide;
    hasOfferedDraw: boolean;
}
export declare class MatchEntity {
    data: MatchEntityInstance;
    constructor(data: MatchEntityInstance);
    engine: import("chess.js").ChessInstance;
    move(move: string | ShortMove): Move | null;
    startClockTimer(handleOverdue: () => void): void;
    startDrawTimer(): void;
    isTurn(id: Types.ObjectId): boolean;
    isParticipant(id: Types.ObjectId): {
        isWhite: boolean;
        isBlack: boolean;
        isParticipant: boolean;
    };
    get fen(): string;
    get pgn(): string;
    get isCheckmate(): boolean;
    get turn(): MatchSide;
    get opposite(): MatchSide;
    get isOver(): boolean;
    get output(): MatchEntityInstance;
    get public(): MatchEntityPublic;
}
export {};
