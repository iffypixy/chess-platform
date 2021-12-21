import {createReducer} from "@reduxjs/toolkit";

import * as actions from "./actions";

interface MatchmakingState {
  isJoinQueuePending: boolean;
}

const initial: MatchmakingState = {
  isJoinQueuePending: false,
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
});
