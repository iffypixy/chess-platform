import {IsAlphanumeric, IsString, Length} from "class-validator";

export class RegisterDto {
  @IsAlphanumeric("en-US", {
    message: "Username can contain only letters and numbers",
  })
  @Length(4, 20)
  username: string;

  @IsString({
    message: "Password must be type of string",
  })
  @Length(8, 250)
  password: string;
}
