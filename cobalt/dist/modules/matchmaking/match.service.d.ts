import { FilterQuery, Model, QueryOptions } from "mongoose";
import { MatchDocument, MatchCreationAttributes } from "./schemas";
export declare class MatchService {
    private readonly matchModel;
    constructor(matchModel: Model<MatchDocument>);
    findOne(filter: FilterQuery<MatchDocument>, options?: QueryOptions): Promise<MatchDocument>;
    count(options?: QueryOptions): Promise<number>;
    create(options: MatchCreationAttributes): Promise<MatchDocument>;
}
