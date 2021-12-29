import { FilterQuery, Model, QueryOptions, Types, UpdateQuery, UpdateWithAggregationPipeline, UpdateWriteOpResult } from "mongoose";
import { UserDocument, UserData, UserCreationAttributes } from "./schemas";
export declare class UserService {
    private readonly userModel;
    constructor(userModel: Model<UserDocument>);
    findByUsername(username: UserData["username"]): Promise<UserDocument>;
    findById(id: Types.ObjectId, options?: QueryOptions): Promise<UserDocument>;
    updateOne(filter: FilterQuery<UserDocument>, update: UpdateQuery<UserDocument>, options?: QueryOptions): Promise<UpdateWriteOpResult>;
    findOneAndUpdate(filter: FilterQuery<UserDocument>, update: UpdateQuery<UserDocument> | UpdateWithAggregationPipeline, options: QueryOptions & {
        new: boolean;
    }): import("mongoose").Query<UserDocument, UserDocument, {}, UserDocument>;
    create(options: UserCreationAttributes): Promise<UserDocument>;
    hydrate(data: UserData): UserDocument;
}
