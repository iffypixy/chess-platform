import {combineReducers} from "@reduxjs/toolkit";

import {authReducer} from "@features/auth";
import {matchmakingReducer} from "@features/matchmaking";
import {matchReducer} from "@features/matches";

export const rootReducer = combineReducers({
  auth: authReducer,
  matchmaking: matchmakingReducer,
  match: matchReducer,
});
