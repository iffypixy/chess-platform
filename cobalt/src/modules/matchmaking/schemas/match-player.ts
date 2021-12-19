import {Prop, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Types} from "mongoose";

import {User, UserDocument} from "@modules/user";
import {MatchResult} from "../typings";

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
}

export const MatchPlayerSchema = SchemaFactory.createForClass(MatchPlayer);

export interface MatchPlayerData {
  _id: Types.ObjectId;
  user: UserDocument;
  rating: number;
  result: MatchResult;
  shift: number;
  createdAt: Date;
  updatedAt: Date;
}

export type MatchPlayerDocument = MatchPlayerData & Document;

export interface MatchPlayerCreationAttributes {
  user: Types.ObjectId | UserDocument;
  rating: number;
  result: MatchResult;
  shift: number;
}
