import {IsString} from "class-validator";

export class ResignDto {
  @IsString({message: "Match ID must be type of string"})
  matchId: string;
}
