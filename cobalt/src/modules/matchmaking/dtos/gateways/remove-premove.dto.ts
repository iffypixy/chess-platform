import {IsString} from "class-validator";

export class RemovePremoveDto {
  @IsString({message: "Match ID must be type of string"})
  matchId: string;
}
