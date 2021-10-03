import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Session,
  UseGuards,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import {UserService, UserPublicData} from "@modules/user";
import {SessionStorage} from "@typings/";
import {LoginDto, RegisterDto} from "./dtos";
import {IsAuthenticatedGuard} from "./guards";

@Controller("auth")
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post("register")
  async register(
    @Body() {username, password}: RegisterDto,
    @Session() session: SessionStorage,
  ): Promise<{credentials: UserPublicData}> {
    const existed = await this.userService.findByUsername(username);

    if (existed)
      throw new BadRequestException(
        "There is already a user with the same username",
      );

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await this.userService.create({username, password: hashed});

    session.user = user.public;

    return {
      credentials: session.user,
    };
  }

  @Post("login")
  async login(
    @Body() dto: LoginDto,
    @Session() session: SessionStorage,
  ): Promise<{credentials: UserPublicData}> {
    const user = await this.userService.findByUsername(dto.username);

    if (!user) throw new BadRequestException("Invalid credentials");

    const doPasswordsMatch = await bcrypt.compare(dto.password, user.password);

    if (!doPasswordsMatch) throw new BadRequestException("Invalid credentials");

    session.user = user.public;

    return {
      credentials: session.user,
    };
  }

  @UseGuards(IsAuthenticatedGuard)
  @Get("credentials")
  async getCredentials(@Session() session: SessionStorage) {
    return {
      credentials: session.user,
    };
  }

  @UseGuards(IsAuthenticatedGuard)
  @Post("logout")
  async logout(@Session() session: SessionStorage) {
    session.destroy((error) => {
      if (error) throw error;
    });
  }
}
