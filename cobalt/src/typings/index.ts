import {Session} from "express-session";
import {Socket as SocketIO} from "socket.io";

import {UserData} from "@modules/user";

export interface SessionData extends Session {
  user: UserData;
}

export interface Socket extends SocketIO {
  request: SocketIO["request"] & {
    session: SessionData;
  };
}
