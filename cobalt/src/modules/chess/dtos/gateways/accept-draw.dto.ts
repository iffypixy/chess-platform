import {IsString} from "class-validator";

export class AcceptDrawDto {
  @IsString({message: "Game ID must be type of string"})
  gameId: string;
}
