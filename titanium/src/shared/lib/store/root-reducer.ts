import {combineReducers} from "@reduxjs/toolkit";

import {authReducer} from "@features/auth";

export const rootReducer = combineReducers({
  auth: authReducer,
});
