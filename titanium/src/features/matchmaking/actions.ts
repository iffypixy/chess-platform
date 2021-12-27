import {createAction, createAsyncThunk} from "@reduxjs/toolkit";

import {MatchControl} from "@shared/api/matches";
import {
  matchmakingApi,
  JoinQueueResponse,
  JoinQueueData,
} from "@shared/api/matchmaking";

const prefix = "matchmaking";

export interface JoinQueuePayload extends JoinQueueResponse {}

export const joinQueue = createAsyncThunk<JoinQueuePayload, JoinQueueData>(
  `${prefix}/joinQueue`,
  async (args) => {
    const data = await matchmakingApi.joinQueue(args);

    return data;
  }
);

export interface SetQueuedControlPayload {
  control: MatchControl | null;
}

export const setQueuedControl = createAction<SetQueuedControlPayload>(
  `${prefix}/setQueuedControl`
);
