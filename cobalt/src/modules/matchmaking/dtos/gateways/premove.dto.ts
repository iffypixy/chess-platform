import {IsString} from "class-validator";

export class PremoveDto {
  @IsString({message: "Game ID must be type of string"})
  gameId: string;

  @IsString({message: "Move must be type of string"})
  move: string;
}
