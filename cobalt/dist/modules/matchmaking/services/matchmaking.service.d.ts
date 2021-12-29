import { FilterQuery, Model, QueryOptions } from "mongoose";
import { MatchDocument, MatchCreationAttributes } from "../schemas";
export declare class MatchmakingService {
    private readonly chessGameModel;
    constructor(chessGameModel: Model<MatchDocument>);
    findOne(filter: FilterQuery<MatchDocument>, options?: QueryOptions): Promise<MatchDocument>;
    count(options?: QueryOptions): Promise<number>;
    create(options: MatchCreationAttributes): Promise<MatchDocument>;
}
