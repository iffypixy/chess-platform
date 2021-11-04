import {Injectable} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {FilterQuery, Model, QueryOptions} from "mongoose";

import {GameDocument, Game, GameCreationAttributes} from "./schemas";

@Injectable()
export class GameService {
  constructor(
    @InjectModel(Game.name)
    private readonly gameModel: Model<GameDocument>,
  ) {}

  async findOne(
    filter: FilterQuery<GameDocument>,
    options?: QueryOptions,
  ): Promise<GameDocument> {
    return this.gameModel.findOne(filter, options).exec();
  }

  count(options?: QueryOptions): Promise<number> {
    return this.gameModel.estimatedDocumentCount(options).exec();
  }

  create(options: GameCreationAttributes): Promise<GameDocument> {
    return this.gameModel.create(options);
  }
}
