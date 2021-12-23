import {IsString} from "class-validator";

export class SpectateMatchDto {
  @IsString({message: "Match ID must be type of string"})
  matchId: string;
}
