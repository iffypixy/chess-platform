import {createReducer} from "@reduxjs/toolkit";

import {Credentials} from "@shared/api/auth";

interface AuthState {
  isAuthenticated: boolean;
  credentials: Credentials | null;
}

const initial: AuthState = {
  isAuthenticated: false,
  credentials: null,
};

export const reducer = createReducer<AuthState>(initial, {});
