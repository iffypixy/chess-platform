import "express-session";

import {UserData} from "@modules/user";

declare module "express-session" {
  interface SessionData extends Session {
    user: UserData;
  }
}
