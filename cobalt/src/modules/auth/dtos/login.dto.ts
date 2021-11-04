import {IsAlphanumeric, IsString} from "class-validator";

export class LoginDto {
  @IsAlphanumeric("en-US", {
    message: "Username must be type of alphanumeric",
  })
  username: string;

  @IsString({
    message: "Password must be type of string",
  })
  password: string;
}
