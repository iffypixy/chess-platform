import {Injectable} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Model} from "mongoose";

import {
  UserModel,
  UserDocument,
  UserData,
  UserCreationAttributes,
} from "./schemas";

@Injectable()
export class UserService {
  constructor(
    @InjectModel(UserModel.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  findByUsername(username: UserData["username"]): Promise<UserDocument> {
    return this.userModel.findOne({username}).exec();
  }

  create(options: UserCreationAttributes): Promise<UserDocument> {
    return this.userModel.create(options);
  }

  hydrate(data: UserData): UserDocument {
    return this.userModel.hydrate(data);
  }
}
