import {Injectable} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {FilterQuery, Model, QueryOptions} from "mongoose";

import {MatchDocument, Match, MatchCreationAttributes} from "../schemas";

@Injectable()
export class MatchService {
  constructor(
    @InjectModel(Match.name)
    private readonly matchModel: Model<MatchDocument>,
  ) {}

  findOne(filter: FilterQuery<MatchDocument>, options?: QueryOptions) {
    return this.matchModel.findOne(filter, options);
  }

  count(options?: QueryOptions): Promise<number> {
    return this.matchModel.estimatedDocumentCount(options).exec();
  }

  create(options: MatchCreationAttributes): Promise<MatchDocument> {
    return this.matchModel.create(options);
  }

  find(filter: FilterQuery<MatchDocument>, options?: QueryOptions) {
    return this.matchModel.find(filter, options);
  }
}
