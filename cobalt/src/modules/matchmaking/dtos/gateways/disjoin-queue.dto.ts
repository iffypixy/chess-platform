import {IsString} from "class-validator";

export class DisjoinQueue {
  @IsString({message: "Match ID must be type of string"})
  matchId: string;
}
