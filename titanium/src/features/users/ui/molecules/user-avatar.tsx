import * as React from "react";
import {Avatar, AvatarProps} from "@chakra-ui/react";

interface UserAvatarProps extends Partial<AvatarProps> {
  url: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({url, ...props}) => (
  <Avatar {...props} name="An avatar of the user" />
);
