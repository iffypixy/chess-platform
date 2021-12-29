import {BadRequestException, Controller, Get, Param} from "@nestjs/common";

import {UserService} from "./user.service";

@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(":username")
  async getUser(@Param("username") username: string) {
    const user = await this.userService.findByUsername(username);

    if (!user) throw new BadRequestException("No user found");

    return {
      user: user.public,
    };
  }
}
