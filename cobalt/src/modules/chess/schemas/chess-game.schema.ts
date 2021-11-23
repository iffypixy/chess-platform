import {Prop, raw, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Types, Document} from "mongoose";

import {UserDocument, User, UserPublicData} from "@modules/user";
import {CHESS_CATEGORIES} from "../lib/constants/index";
import {ChessCategory, ChessControl} from "../typings";

@Schema({versionKey: false, timestamps: true})
export class ChessGame {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  white: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  black: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  pgn: string;

  @Prop({
    type: String,
    required: true,
  })
  fen: string;

  @Prop({
    type: String,
    required: true,
    enum: [CHESS_CATEGORIES.BULLET, CHESS_CATEGORIES.BLITZ, CHESS_CATEGORIES.RAPID, CHESS_CATEGORIES.CLASSICAL],
  })
  category: ChessCategory;

  @Prop(
    raw({
      delay: {
        type: Number,
        required: true,
      },
      time: {
        type: Number,
        required: true,
      },
      increment: {
        type: Number,
        required: true,
      },
    }),
  )
  control: ChessControl;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  winner: Types.ObjectId;
}

export const ChessGameSchema = SchemaFactory.createForClass(ChessGame);

export interface ChessGameData {
  _id: Types.ObjectId;
  white: UserDocument;
  black: UserDocument;
  winner: UserDocument;
  pgn: string;
  fen: string;
  category: ChessCategory;
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
  category: ChessCategory;
  control: ChessControl;
}

export type ChessGameDocument = ChessGameData &
  Document & {
    public: ChessGamePublicData;
  };

ChessGameSchema.virtual("public").get(function (this: ChessGameDocument): ChessGamePublicData {
  const {_id, white, black, winner, pgn, category, control} = this;

  return {
    id: _id,
    white: white.public,
    black: black.public,
    winner: winner.public,
    pgn,
    category,
    control,
  };
});

export interface ChessGameCreationAttributes {
  white: Types.ObjectId;
  black: Types.ObjectId;
  pgn: string;
  fen: string;
  control: ChessControl;
  category: ChessCategory;
  winner: Types.ObjectId;
}
