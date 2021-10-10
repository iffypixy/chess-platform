import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Types, Document} from "mongoose";

import {UserDocument, User, UserPublicData} from "@modules/user";
import {categories, GameCategory} from "../lib";

@Schema({versionKey: false, timestamps: true})
export class Game {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  white: UserDocument;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  black: UserDocument;

  @Prop({
    type: String,
    required: true,
  })
  pgn: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      categories.bullet,
      categories.blitz,
      categories.rapid,
      categories.classic,
    ],
  })
  category: GameCategory;

  @Prop({
    type: Number,
    required: true,
  })
  delay: number;

  @Prop({
    type: Number,
    required: true,
  })
  time: number;

  @Prop({
    type: Number,
    required: true,
  })
  increment: number;

  @Prop({
    type: Types.ObjectId,
    ref: "users",
    required: true,
  })
  winner: UserDocument;
}

export interface GameData {
  _id: Types.ObjectId;
  white: UserDocument;
  black: UserDocument;
  winner: UserDocument;
  pgn: string;
  category: GameCategory;
  delay: number;
  time: number;
  increment: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GamePublicData {
  id: string;
  white: UserPublicData;
  black: UserPublicData;
  winner: UserPublicData;
  pgn: string;
  category: GameCategory;
  delay: number;
  time: number;
  increment: number;
}

export type GameDocument = GameData &
  Document & {
    public: GamePublicData;
  };

export const GameSchema = SchemaFactory.createForClass(Game);

GameSchema.virtual("public").get(function (this: GameDocument): GamePublicData {
  const {_id, white, black, winner, pgn, category, delay, time, increment} =
    this;

  return {
    id: _id,
    white: white.public,
    black: black.public,
    winner: winner.public,
    pgn,
    category,
    delay,
    time,
    increment,
  };
});
