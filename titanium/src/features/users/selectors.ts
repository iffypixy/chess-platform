import {RootStore} from "@shared/lib/store";

const usersState = (state: RootStore) => state.users;

export const user = (state: RootStore) => usersState(state).user;

export const isUserFetchPending = (state: RootStore) =>
  usersState(state).isUserFetchPending;

export const matches = (state: RootStore) => usersState(state).matches;

export const isMatchesFetchPending = (state: RootStore) =>
  usersState(state).isMatchesFetchPending;
