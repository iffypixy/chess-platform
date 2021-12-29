import {createAsyncThunk} from "@reduxjs/toolkit";

import {
  GetMatchesData,
  GetMatchesResponse,
  GetUserData,
  GetUserResponse,
  usersApi,
} from "@shared/api/users";

const prefix = "users";

export interface FetchUserPayload extends GetUserResponse {}

export const fetchUser = createAsyncThunk<FetchUserPayload, GetUserData>(
  `${prefix}/fetchUser`,
  async (args) => {
    const {data} = await usersApi.getUser(args);

    return data;
  }
);

export interface FetchMatchesPayload extends GetMatchesResponse {}

export const fetchMatches = createAsyncThunk<
  FetchMatchesPayload,
  GetMatchesData
>(`${prefix}/fetchMatches`, async (args) => {
  const {data} = await usersApi.getMatches(args);

  return data;
});
