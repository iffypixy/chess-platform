import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Types, Document} from "mongoose";

import {User, UserDocument, UserPublicData} from "@modules/user";
import {MatchResult, MatchSide} from "../typings";

@Schema({versionKey: false, timestamps: true})
export class MatchPlayer {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
  })
  rating: number;

  @Prop({
    type: Number,
    required: true,
  })
  shift: number;

  @Prop({
    type: String,
    required: true,
    enum: ["victory", "lose", "draw"],
  })
  result: MatchResult;

  @Prop({
    type: String,
    required: true,
    enum: ["white", "black"],
  })
  side: MatchSide;
}

export const MatchPlayerSchema = SchemaFactory.createForClass(MatchPlayer);

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

export type MatchPlayerDocument = MatchPlayerData & Document & {public: MatchPlayerPublicData};

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

MatchPlayerSchema.virtual("public").get(function (this: MatchPlayerDocument): MatchPlayerPublicData {
  const {_id, user, rating, shift, result, side} = this;

  return {
    id: _id,
    user: user.public,
    rating,
    shift,
    result,
    side,
  };
});
