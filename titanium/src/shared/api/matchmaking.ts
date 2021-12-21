import {emit} from "./request";

export interface JoinQueueData {
  delay: number;
  increment: number;
  time: number;
}

export interface JoinQueueResponse {
  matchId: string;
}

const joinQueue = (data: JoinQueueData): Promise<JoinQueueResponse> =>
  emit({event: "join-queue", data});

export const matchmakingApi = {
  joinQueue,
};
