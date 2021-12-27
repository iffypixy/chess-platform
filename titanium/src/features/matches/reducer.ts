import {createReducer, PayloadAction} from "@reduxjs/toolkit";

import {Match, RealMatch} from "@shared/api/matches";
import * as actions from "./actions";

interface MatchState {
  match: Match | null;
  isMatchFetchPending: boolean;
  isMatchFetchRejected: boolean;
}

const initial: MatchState = {
  match: null,
  isMatchFetchPending: false,
  isMatchFetchRejected: false,
};

export const reducer = createReducer<MatchState>(initial, {
  [actions.setMatch.type]: (
    state,
    {payload}: PayloadAction<actions.SetMatchPayload>
  ) => {
    state.match = payload.match;
  },

  [actions.fetchMatch.pending.type]: (state) => {
    state.isMatchFetchPending = true;
  },

  [actions.fetchMatch.fulfilled.type]: (
    state,
    {payload}: PayloadAction<actions.FetchMatchPayload>
  ) => {
    state.match = payload.match;
    state.isMatchFetchPending = false;
  },

  [actions.fetchMatch.rejected.type]: (state) => {
    state.isMatchFetchRejected = true;
    state.isMatchFetchPending = false;
  },
});
