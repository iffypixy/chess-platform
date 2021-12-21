import {createReducer, PayloadAction} from "@reduxjs/toolkit";

import {Credentials} from "@shared/api/auth";
import * as actions from "./actions";

interface AuthState {
  isAuthenticated: boolean;
  credentials: Credentials | null;
  isCredentialsFetchPending: boolean;
  isLoginPending: boolean;
  isRegisterPending: boolean;
  isLogoutPending: boolean;
}

const initial: AuthState = {
  isAuthenticated: false,
  credentials: null,
  isCredentialsFetchPending: true,
  isLoginPending: false,
  isRegisterPending: false,
  isLogoutPending: false,
};

export const reducer = createReducer<AuthState>(initial, {
  [actions.fetchCredentials.pending.type]: (state) => {
    state.isCredentialsFetchPending = true;
  },

  [actions.fetchCredentials.fulfilled.type]: (
    state,
    {payload}: PayloadAction<actions.FetchCredentialsPayload>
  ) => {
    state.credentials = payload.credentials;
    state.isCredentialsFetchPending = false;
  },

  [actions.fetchCredentials.rejected.type]: (state) => {
    state.isCredentialsFetchPending = false;
  },

  [actions.login.pending.type]: (state) => {
    state.isLoginPending = true;
  },

  [actions.login.fulfilled.type]: (
    state,
    {payload}: PayloadAction<actions.LoginPayload>
  ) => {
    state.credentials = payload.credentials;
    state.isLoginPending = false;
  },

  [actions.login.rejected.type]: (state) => {
    state.isLoginPending = false;
  },

  [actions.register.pending.type]: (state) => {
    state.isRegisterPending = true;
  },

  [actions.register.fulfilled.type]: (
    state,
    {payload}: PayloadAction<actions.RegisterPayload>
  ) => {
    state.credentials = payload.credentials;
    state.isRegisterPending = false;
  },

  [actions.register.rejected.type]: (state) => {
    state.isRegisterPending = false;
  },

  [actions.login.pending.type]: (state) => {
    state.isLoginPending = true;
  },

  [actions.login.fulfilled.type]: (state) => {
    state.isLoginPending = false;
  },

  [actions.login.rejected.type]: (state) => {
    state.isLoginPending = false;
  },
});
