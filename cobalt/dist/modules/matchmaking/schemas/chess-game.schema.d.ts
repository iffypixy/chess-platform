import { Types, Document } from "mongoose";
import { UserDocument, UserPublicData } from "@modules/user";
import { ChessType, ChessControl } from "../typings";
export declare class ChessGame {
    white: Types.ObjectId;
    black: Types.ObjectId;
    pgn: string;
    fen: string;
    category: ChessType;
    control: ChessControl;
    winner: Types.ObjectId;
}
export declare const ChessGameSchema: import("mongoose").Schema<Document<ChessGame, any, any>, import("mongoose").Model<Document<ChessGame, any, any>, any, any>, undefined, {}>;
export interface ChessGameData {
    _id: Types.ObjectId;
    white: UserDocument;
    black: UserDocument;
    winner: UserDocument;
    pgn: string;
    fen: string;
    type: ChessType;
    control: ChessControl;
    createdAt: Date;
    updatedAt: Date;
}
export interface ChessGamePublicData {
    id: string;
    white: UserPublicData;
    black: UserPublicData;
    winner: UserPublicData;
    pgn: string;
    type: ChessType;
    control: ChessControl;
}
export declare type ChessGameDocument = ChessGameData & Document & {
    public: ChessGamePublicData;
};
export interface ChessGameCreationAttributes {
    white: Types.ObjectId;
    black: Types.ObjectId;
    pgn: string;
    fen: string;
    control: ChessControl;
    type: ChessType;
    winner: Types.ObjectId;
}
