import { UserService } from "@modules/user";
import { FilterQuery, Model, QueryOptions } from "mongoose";
import { ChessGameDocument, ChessGameCreationAttributes } from "./schemas";
export declare class MatchmakingService {
    private readonly chessGameModel;
    private readonly userService;
    constructor(chessGameModel: Model<ChessGameDocument>, userService: UserService);
    findOne(filter: FilterQuery<ChessGameDocument>, options?: QueryOptions): Promise<ChessGameDocument>;
    count(options?: QueryOptions): Promise<number>;
    create(options: ChessGameCreationAttributes): Promise<ChessGameDocument>;
}
