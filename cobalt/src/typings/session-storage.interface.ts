import {Session} from "express-session";

import {UserPublicData} from "@modules/user";

export interface SessionStorage extends Session {
  user: UserPublicData;
}
