import { FilterQuery, Model, QueryOptions } from "mongoose";
import { MatchPlayerCreationAttributes, MatchPlayerDocument } from "../schemas";
export declare class MatchPlayerService {
    private readonly matchPlayerModel;
    constructor(matchPlayerModel: Model<MatchPlayerDocument>);
    create(options: MatchPlayerCreationAttributes): Promise<MatchPlayerDocument>;
    find(filter: FilterQuery<MatchPlayerDocument>, options?: QueryOptions): import("mongoose").Query<MatchPlayerDocument[], MatchPlayerDocument, {}, MatchPlayerDocument>;
}
