import { Types, Document } from "mongoose";
import { UserDocument, UserPublicData } from "@modules/user";
import { MatchResult, MatchSide } from "../typings";
export declare class MatchPlayer {
    user: Types.ObjectId;
    rating: number;
    shift: number;
    result: MatchResult;
    side: MatchSide;
}
export declare const MatchPlayerSchema: import("mongoose").Schema<Document<MatchPlayer, any, any>, import("mongoose").Model<Document<MatchPlayer, any, any>, any, any>, undefined, {}>;
export interface MatchPlayerData {
    _id: Types.ObjectId;
    user: UserDocument;
    rating: number;
    result: MatchResult;
    shift: number;
    side: MatchSide;
    createdAt: Date;
    updatedAt: Date;
}
export declare type MatchPlayerDocument = MatchPlayerData & Document & {
    public: MatchPlayerPublicData;
};
export interface MatchPlayerPublicData {
    id: string;
    user: UserPublicData;
    rating: number;
    shift: number;
    side: MatchSide;
    result: MatchResult;
}
export interface MatchPlayerCreationAttributes {
    user: Types.ObjectId | UserDocument;
    rating: number;
    result: MatchResult;
    shift: number;
    side: MatchSide;
}
