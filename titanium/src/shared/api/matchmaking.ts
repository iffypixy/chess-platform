import {serverEvents} from "@shared/lib/socket";
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
  emit({event: serverEvents.JOIN_QUEUE, data});

export interface DisjoinQueueData {}

export interface DisjoinQueueResponse {}

const disjoinQueue = (data: DisjoinQueueData): Promise<DisjoinQueueResponse> =>
  emit({event: serverEvents.DISJOIN_QUEUE, data});

export const matchmakingApi = {
  joinQueue,
  disjoinQueue,
};
