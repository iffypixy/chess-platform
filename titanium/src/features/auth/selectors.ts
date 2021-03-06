import {RootStore} from "@shared/lib/store";

const authState = (state: RootStore) => state.auth;

export const credentials = (state: RootStore) => authState(state).credentials;

export const isCredentialsFetchPending = (state: RootStore) =>
  authState(state).isCredentialsFetchPending;

export const isAuthenticated = (state: RootStore) =>
  authState(state).isAuthenticated;

export const isRegisterPending = (state: RootStore) =>
  authState(state).isRegisterPending;

export const isLoginPending = (state: RootStore) =>
  authState(state).isLoginPending;
