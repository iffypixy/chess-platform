import { Types, Document } from "mongoose";
import { MatchType, MatchControl } from "../typings";
import { MatchPlayerDocument, MatchPlayerPublicData } from "./match-player";
export declare class Match {
    white: Types.ObjectId;
    black: Types.ObjectId;
    sid: string;
    pgn: string;
    fen: string;
    type: MatchType;
    control: MatchControl;
    winner: Types.ObjectId;
}
export declare const MatchSchema: import("mongoose").Schema<Document<Match, any, any>, import("mongoose").Model<Document<Match, any, any>, any, any>, undefined, {}>;
export interface MatchData {
    _id: Types.ObjectId;
    sid: string;
    white: MatchPlayerDocument;
    black: MatchPlayerDocument;
    winner: MatchPlayerDocument | null;
    pgn: string;
    fen: string;
    type: MatchType;
    control: MatchControl;
    createdAt: Date;
    updatedAt: Date;
}
export interface MatchPublicData {
    id: string;
    white: MatchPlayerPublicData;
    black: MatchPlayerPublicData;
    winner: MatchPlayerPublicData | null;
    pgn: string;
    fen: string;
    sid: string;
    type: MatchType;
    control: MatchControl;
}
export declare type MatchDocument = MatchData & Document & {
    public: MatchPublicData;
};
export interface MatchCreationAttributes {
    sid: string;
    white: Types.ObjectId | MatchPlayerDocument;
    black: Types.ObjectId | MatchPlayerDocument;
    pgn: string;
    fen: string;
    control: MatchControl;
    type: MatchType;
    winner: Types.ObjectId | MatchPlayerDocument | null;
}
