import {Prop, Schema, SchemaFactory, raw} from "@nestjs/mongoose";
import {Document, Model, Types} from "mongoose";

export interface ControlMode {
  rating: number;
  calibrated: boolean;
}
@Schema({versionKey: false})
export class User extends Model {
  @Prop({
    type: String,
    required: true,
    unique: true,
    minlength: 5,
    maxlength: 20,
  })
  username: string;

  @Prop({
    type: String,
    required: true,
    minlength: 8,
    maxlength: 256,
  })
  password: string;

  @Prop(
    raw({
      rating: {
        type: Number,
        default: 1500,
        required: true,
      },
      calibrated: {
        type: Boolean,
        default: false,
        required: true,
      },
    }),
  )
  bullet: ControlMode;

  @Prop(
    raw({
      rating: {
        type: Number,
        default: 1500,
        required: true,
      },
      calibrated: {
        type: Boolean,
        default: false,
        required: true,
      },
    }),
  )
  rapid: ControlMode;

  @Prop(
    raw({
      rating: {
        type: Number,
        default: 1500,
        required: true,
      },
      calibrated: {
        type: Boolean,
        default: false,
        required: true,
      },
    }),
  )
  blitz: ControlMode;

  @Prop(
    raw({
      rating: {
        type: Number,
        default: 1500,
        required: true,
      },
      calibrated: {
        type: Boolean,
        default: false,
        required: true,
      },
    }),
  )
  classical: ControlMode;
}

export const UserSchema = SchemaFactory.createForClass(User);

export interface UserPublicData {
  id: string;
  username: string;
  bullet: ControlMode;
  blitz: ControlMode;
  rapid: ControlMode;
  classical: ControlMode;
}

export interface UserData {
  _id: Types.ObjectId;
  username: string;
  password: string;
  bullet: ControlMode;
  blitz: ControlMode;
  rapid: ControlMode;
  classical: ControlMode;
}

export type UserDocument = UserData &
  Document & {
    public: UserPublicData;
  };

UserSchema.virtual("public").get(function (this: UserDocument): UserPublicData {
  const {_id, username, bullet, blitz, rapid, classical} = this;

  return {id: _id, username, bullet, blitz, rapid, classical};
});

export interface UserCreationAttributes {
  username: string;
  password: string;
}
