import {createReducer, PayloadAction} from "@reduxjs/toolkit";

import {CompletedMatch} from "@shared/api/matches";
import {User} from "@shared/api/users";
import * as actions from "./actions";

interface UsersState {
  user: User | null;
  matches: CompletedMatch[] | null;
  isUserFetchPending: boolean;
  isMatchesFetchPending: boolean;
}

const initial: UsersState = {
  user: null,
  matches: null,
  isUserFetchPending: false,
  isMatchesFetchPending: false,
};

export const reducer = createReducer<UsersState>(initial, {
  [actions.fetchUser.pending.type]: (state) => {
    state.isUserFetchPending = true;
  },

  [actions.fetchUser.fulfilled.type]: (
    state,
    {payload}: PayloadAction<actions.FetchUserPayload>
  ) => {
    state.isUserFetchPending = false;
    state.user = payload.user;
  },

  [actions.fetchUser.rejected.type]: (state) => {
    state.isUserFetchPending = false;
  },

  [actions.fetchMatches.pending.type]: (state) => {
    state.isMatchesFetchPending = true;
  },

  [actions.fetchMatches.fulfilled.type]: (
    state,
    {payload}: PayloadAction<actions.FetchMatchesPayload>
  ) => {
    state.isMatchesFetchPending = false;
    state.matches = payload.matches;
  },

  [actions.fetchMatches.rejected.type]: (state) => {
    state.isMatchesFetchPending = false;
  },
});
