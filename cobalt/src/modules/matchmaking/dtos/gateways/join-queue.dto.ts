import {IsNumber, IsNumberString} from "class-validator";

export class JoinQueueDto {
  @IsNumber(
    {},
    {
      message: "Time must be type of number",
    },
  )
  time: number;

  @IsNumber(
    {},
    {
      message: "Increment must be type of number",
    },
  )
  increment: number;

  @IsNumber(
    {},
    {
      message: "Delay must be type of number",
    },
  )
  delay: number;
}
