import {Prop, Schema, SchemaFactory, raw} from "@nestjs/mongoose";
import {Document} from "mongoose";

interface ControlMode {
  rating: number;
  calibrated: boolean;
}

export interface UserPublicData {
  id: string;
  username: string;
  bullet: ControlMode;
  blitz: ControlMode;
  rapid: ControlMode;
  classic: ControlMode;
}

@Schema({versionKey: false})
export class User {
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
  classic: ControlMode;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual("public").get(function (this: UserDocument): UserPublicData {
  const {_id, password, ...props} = this.toObject();

  return {id: _id, ...props};
});

export type UserDocument = User &
  Document & {
    public: UserPublicData;
  };

export interface UserCreationAttributes {
  username: string;
  password: string;
}
