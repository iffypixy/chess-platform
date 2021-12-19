import {Injectable} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Model} from "mongoose";

import {MatchPlayer, MatchPlayerCreationAttributes, MatchPlayerDocument} from "../schemas";

@Injectable()
export class MatchPlayerService {
  constructor(
    @InjectModel(MatchPlayer.name)
    private readonly matchPlayerModel: Model<MatchPlayerDocument>,
  ) {}

  create(options: MatchPlayerCreationAttributes): Promise<MatchPlayerDocument> {
    return this.matchPlayerModel.create(options);
  }
}
