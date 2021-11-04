import {Injectable} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {
  FilterQuery,
  Model,
  QueryOptions,
  Types,
  UpdateQuery,
  UpdateWriteOpResult,
} from "mongoose";

import {User, UserDocument, UserData, UserCreationAttributes} from "./schemas";

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  findByUsername(username: UserData["username"]): Promise<UserDocument> {
    return this.userModel.findOne({username}).exec();
  }

  findById(id: Types.ObjectId, options?: QueryOptions): Promise<UserDocument> {
    return this.userModel.findById(id, {}, options).exec();
  }

  updateOne(
    filter: FilterQuery<UserDocument>,
    update: UpdateQuery<UserDocument>,
    options?: QueryOptions,
  ): Promise<UpdateWriteOpResult> {
    return this.userModel.updateOne(filter, update, options).exec();
  }

  create(options: UserCreationAttributes): Promise<UserDocument> {
    return this.userModel.create(options);
  }

  hydrate(data: UserData): UserDocument {
    return this.userModel.hydrate(data);
  }
}
