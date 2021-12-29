import { SessionData } from "express-session";
import { UserService, UserPublicData } from "@modules/user";
import { LoginDto, RegisterDto } from "./dtos";
export declare class AuthController {
    private readonly userService;
    constructor(userService: UserService);
    register({ username, password }: RegisterDto, session: SessionData): Promise<{
        credentials: UserPublicData;
    }>;
    login(dto: LoginDto, session: SessionData): Promise<{
        credentials: UserPublicData;
    }>;
    getCredentials(session: SessionData): Promise<{
        credentials: UserPublicData;
    }>;
    logout(session: SessionData): Promise<void>;
}
