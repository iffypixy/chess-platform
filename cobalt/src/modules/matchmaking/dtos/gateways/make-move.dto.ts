import {IsIn, IsOptional, IsString} from "class-validator";
import {Square} from "chess.js";

import {PROMOTION_PIECES, SQUARES, PromotionPiece} from "@modules/matchmaking";

export class MakeMoveDto {
  @IsString({message: "Match ID must be type of string"})
  matchId: string;

  @IsString({message: "From must be type of string"})
  @IsIn(SQUARES, {message: "From must be a square"})
  from: Square;

  @IsString({message: "To must be type of string"})
  @IsIn(SQUARES, {message: "From must be a square"})
  to: Square;

  @IsOptional()
  @IsString({message: "Promotion must be type of string"})
  @IsIn(PROMOTION_PIECES, {message: "Promotion must be a piece"})
  promotion: PromotionPiece;
}
