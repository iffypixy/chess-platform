import {IsString} from "class-validator";

export class OfferDrawDto {
  @IsString({message: "Match ID must be type of string"})
  matchId: string;
}
