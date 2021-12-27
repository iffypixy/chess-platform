import {createAction, createAsyncThunk} from "@reduxjs/toolkit";

import {
  matchesApi,
  MakeMoveData,
  MakeMoveResponse,
  ResignData,
  ResignResponse,
  Match,
  GetMatchResponse,
  GetMatchData,
  MakePremoveData,
  MakePremoveResponse,
  OfferDrawResponse,
  OfferDrawData,
  AcceptDrawResponse,
  AcceptDrawData,
  DeclineDrawResponse,
  DeclineDrawData,
  RemovePremoveResponse,
  RemovePremoveData,
  SpectateMatchResponse,
  SpectateMatchData,
  MatchSide,
  SendMessageResponse,
  SendMessageData,
} from "@shared/api/matches";

const prefix = "match";

export interface MakeMovePayload extends MakeMoveResponse {}

export const makeMove = createAsyncThunk<MakeMovePayload, MakeMoveData>(
  `${prefix}/makeMove`,
  async (args) => {
    const data = await matchesApi.makeMove(args);

    return data;
  }
);

export interface ResignPayload extends ResignResponse {}

export const resign = createAsyncThunk<ResignPayload, ResignData>(
  `${prefix}/resign`,
  async (args) => {
    const data = await matchesApi.resign(args);

    return data;
  }
);

export interface FetchMatchPayload extends GetMatchResponse {}

export const fetchMatch = createAsyncThunk<FetchMatchPayload, GetMatchData>(
  `${prefix}/fetchMatch`,
  async (args) => {
    const {data} = await matchesApi.getMatch(args);

    return data;
  }
);

interface MakePremovePayload extends MakePremoveResponse {}

export const makePremove = createAsyncThunk<
  MakePremovePayload,
  MakePremoveData
>(`${prefix}/makePremove`, async (args) => {
  const data = await matchesApi.makePremove(args);

  return data;
});

interface OfferDrawPayload extends OfferDrawResponse {}

export const offerDraw = createAsyncThunk<OfferDrawPayload, OfferDrawData>(
  `${prefix}/offerDraw`,
  async (args) => {
    const data = await matchesApi.offerDraw(args);

    return data;
  }
);

interface AcceptDrawPayload extends AcceptDrawResponse {}

export const acceptDraw = createAsyncThunk<AcceptDrawPayload, AcceptDrawData>(
  `${prefix}/acceptDraw`,
  async (args) => {
    const data = await matchesApi.acceptDraw(args);

    return data;
  }
);

interface DeclineDrawPayload extends DeclineDrawResponse {}

export const declineDraw = createAsyncThunk<
  DeclineDrawPayload,
  DeclineDrawData
>(`${prefix}/declineDraw`, async (args) => {
  const data = await matchesApi.declineDraw(args);

  return data;
});

export interface RemovePremovePayload extends RemovePremoveResponse {}

export const removePremove = createAsyncThunk<
  RemovePremovePayload,
  RemovePremoveData
>(`${prefix}/removePremove`, async (args) => {
  const data = await matchesApi.removePremove(args);

  return data;
});

export interface SendMessagePayload extends SendMessageResponse {}

export const sendMessage = createAsyncThunk<
  SendMessagePayload,
  SendMessageData
>(`${prefix}/sendMessage`, async (args) => {
  const data = await matchesApi.sendMessage(args);

  return data;
});

interface SpectateMatchPayload extends SpectateMatchResponse {}

export const spectateMatch = createAsyncThunk<
  SpectateMatchPayload,
  SpectateMatchData
>(`${prefix}/spectateMatch`, async (args) => {
  const data = await matchesApi.spectateMatch(args);

  return data;
});

export interface SetMatchPayload {
  match: Match;
}

export const setMatch = createAction<SetMatchPayload>(`${prefix}/setMatch`);
