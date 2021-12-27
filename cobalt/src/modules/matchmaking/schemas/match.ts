import {Prop, raw, Schema, SchemaFactory} from "@nestjs/mongoose";
import {Types, Document} from "mongoose";

import {MATCH_TYPES} from "../lib/constants";
import {MatchType, MatchControl} from "../typings";
import {MatchPlayer, MatchPlayerDocument, MatchPlayerPublicData} from "./match-player";

@Schema({versionKey: false, timestamps: true})
export class Match {
  @Prop({
    type: Types.ObjectId,
    ref: MatchPlayer.name,
    required: true,
  })
  white: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: MatchPlayer.name,
    required: true,
  })
  black: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  sid: string;

  @Prop({
    type: String,
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
    enum: [MATCH_TYPES.BULLET, MATCH_TYPES.BLITZ, MATCH_TYPES.RAPID, MATCH_TYPES.CLASSICAL],
  })
  type: MatchType;

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
  control: MatchControl;

  @Prop({
    type: Types.ObjectId,
    ref: MatchPlayer.name,
  })
  winner: Types.ObjectId;
}

export const MatchSchema = SchemaFactory.createForClass(Match);

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
  type: MatchType;
  control: MatchControl;
}

export type MatchDocument = MatchData &
  Document & {
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

MatchSchema.virtual("public").get(function (this: MatchDocument): MatchPublicData {
  const {_id, white, black, winner, pgn, type, control} = this;

  return {
    id: _id,
    white: white.public,
    black: black.public,
    winner: winner && winner.public,
    pgn,
    type,
    control,
  };
});
