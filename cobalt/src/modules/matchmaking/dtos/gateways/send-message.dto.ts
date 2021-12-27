import {IsString, MaxLength} from "class-validator";

export class SendMessageDto {
  @IsString({message: "Match ID must be type of string"})
  matchId: string;

  @IsString({message: "Text must be type of string"})
  @MaxLength(256, {message: "Text's length must not exceed 256"})
  text: string;
}
