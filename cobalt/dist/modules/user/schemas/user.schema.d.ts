import { Document, Model, Types } from "mongoose";
export interface ControlMode {
    rating: number;
    calibrated: boolean;
}
export declare class User extends Model {
    username: string;
    password: string;
    bullet: ControlMode;
    rapid: ControlMode;
    blitz: ControlMode;
    classical: ControlMode;
}
export declare const UserSchema: import("mongoose").Schema<Document<User, any, any>, Model<Document<User, any, any>, any, any>, undefined, {}>;
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
export declare type UserDocument = UserData & Document & {
    public: UserPublicData;
};
export interface UserCreationAttributes {
    username: string;
    password: string;
}
