import {createReducer, PayloadAction} from "@reduxjs/toolkit";

import {MatchControl} from "@shared/api/matches";
import * as actions from "./actions";

interface MatchmakingState {
  isJoinQueuePending: boolean;
  queuedControl: MatchControl | null;
}

const initial: MatchmakingState = {
  isJoinQueuePending: false,
  queuedControl: null,
};

export const reducer = createReducer<MatchmakingState>(initial, {
  [actions.joinQueue.pending.type]: (state) => {
    state.isJoinQueuePending = true;
  },

  [actions.joinQueue.fulfilled.type]: (state) => {
    state.isJoinQueuePending = false;
  },

  [actions.joinQueue.rejected.type]: (state) => {
    state.isJoinQueuePending = false;
  },

  [actions.setQueuedControl.type]: (
    state,
    {payload}: PayloadAction<actions.SetQueuedControlPayload>
  ) => {
    state.queuedControl = payload.control;
  },
});
