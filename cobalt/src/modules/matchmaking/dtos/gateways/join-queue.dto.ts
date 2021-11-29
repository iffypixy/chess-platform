import {IsNumberString} from "class-validator";

export class JoinQueueDto {
  @IsNumberString(null, {
    message: "Time must be type of number",
  })
  time: number;

  @IsNumberString(null, {
    message: "Increment must be type of number",
  })
  increment: number;

  @IsNumberString(null, {
    message: "Delay must be type of number",
  })
  delay: number;
}
