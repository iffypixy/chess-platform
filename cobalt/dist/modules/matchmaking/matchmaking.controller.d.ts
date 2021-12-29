import { UserService } from "@modules/user";
import { MatchPlayerService, MatchService } from "./services";
import { MatchPublicData } from "./schemas";
import { MatchEntityPublic } from "./typings";
export declare class MatchmakingController {
    private readonly matchService;
    private readonly userService;
    private readonly matchPlayerService;
    constructor(matchService: MatchService, userService: UserService, matchPlayerService: MatchPlayerService);
    getRandom(): Promise<{
        match: MatchPublicData;
    }>;
    getUsersMatches(username: string): Promise<{
        matches: MatchPublicData[];
    }>;
    get(matchId: string): Promise<{
        match: (MatchEntityPublic | MatchPublicData) & {
            isCompleted: boolean;
        };
    }>;
}
