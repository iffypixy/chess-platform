import {IsString} from "class-validator";

export class ResignDto {
  @IsString({message: "Game ID must be type of string"})
  gameId: string;
}
