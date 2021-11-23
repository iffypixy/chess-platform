import {IsString} from "class-validator";

export class OfferDrawDto {
  @IsString({message: "Game ID must be type of string"})
  gameId: string;
}
