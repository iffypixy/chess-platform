import {RootStore} from "@shared/lib/store";

const matchmakingState = (state: RootStore) => state.matchmaking;

export const isJoinQueuePending = (state: RootStore) =>
  matchmakingState(state).isJoinQueuePending;
