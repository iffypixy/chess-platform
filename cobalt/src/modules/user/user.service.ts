import {Injectable} from "@nestjs/common";
import {InjectModel} from "@nestjs/mongoose";
import {Model} from "mongoose";

import {User, UserDocument, UserCreationAttributes} from "./schemas";

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  findByUsername(username: User["username"]): Promise<UserDocument> {
    return this.userModel.findOne({username}).exec();
  }

  create(options: UserCreationAttributes): Promise<UserDocument> {
    return this.userModel.create(options);
  }
}
