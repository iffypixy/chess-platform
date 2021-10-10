import {Module} from "@nestjs/common";
import {MongooseModule} from "@nestjs/mongoose";

import {UserService} from "./user.service";
import {UserModel, UserSchema} from "./schemas";

@Module({
  imports: [
    MongooseModule.forFeature([{name: UserModel.name, schema: UserSchema}]),
  ],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
