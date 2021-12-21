import {RootStore} from "@shared/lib/store";

const matchState = (state: RootStore) => state.match;

export const match = (state: RootStore) => matchState(state).match;

export const isMatchFetchPending = (state: RootStore) =>
  matchState(state).isMatchFetchPending;

export const isMatchFetchRejected = (state: RootStore) =>
  matchState(state).isMatchFetchRejected;
