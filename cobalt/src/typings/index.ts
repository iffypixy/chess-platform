import {Session} from "express-session";

import {UserData} from "@modules/user";

export interface SessionData extends Session {
  user: UserData;
}
