import {RootStore} from "@shared/lib/store";

const authState = (state: RootStore) => state.auth;

export const credentials = (state: RootStore) => authState(state).credentials;
export const isAuthenticated = (state: RootStore) =>
  authState(state).isAuthenticated;
