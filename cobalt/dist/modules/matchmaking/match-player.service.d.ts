import { Model } from "mongoose";
import { MatchPlayer, MatchPlayerCreationAttributes } from "./schemas";
export declare class MatchPlayerService {
    private readonly matchPlayerModel;
    constructor(matchPlayerModel: Model<MatchPlayer>);
    create(options: MatchPlayerCreationAttributes): Promise<MatchPlayer>;
}
