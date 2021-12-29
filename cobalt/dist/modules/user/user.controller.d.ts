import { UserService } from "./user.service";
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getUser(username: string): Promise<{
        user: import("./schemas").UserPublicData;
    }>;
}
