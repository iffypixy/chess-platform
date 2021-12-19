import {IsString} from "class-validator";

export class DeclineDrawDto {
  @IsString({message: "Match ID must be type of string"})
  matchId: string;
}
