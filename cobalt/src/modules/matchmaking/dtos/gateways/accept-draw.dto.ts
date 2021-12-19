import {IsString} from "class-validator";

export class AcceptDrawDto {
  @IsString({message: "Match ID must be type of string"})
  matchId: string;
}
