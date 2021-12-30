import {createAsyncThunk} from "@reduxjs/toolkit";
import {AxiosError} from "axios";

import {
  authApi,
  GetCredentialsResponse,
  LoginData,
  LoginResponse,
  RegisterData,
  RegisterResponse,
  RegisterResponseError,
} from "@shared/api/auth";
import {socket} from "@shared/lib/socket";

const prefix = "auth";

export interface LoginPayload extends LoginResponse {}

export const login = createAsyncThunk<LoginPayload, LoginData>(
  `${prefix}/login`,
  async (args) => {
    const {data} = await authApi.login(args);

    socket.connect();

    return data;
  }
);

export interface RegisterPayload extends RegisterResponse {}

export const register = createAsyncThunk<RegisterPayload, RegisterData>(
  `${prefix}/register`,
  async (args, {rejectWithValue}) => {
    try {
      const {data} = await authApi.register(args);

      socket.connect();

      return data;
    } catch (error) {
      const message = (error as AxiosError<RegisterResponseError>)!.response!
        .data.message;

      return rejectWithValue(typeof message === "string" ? [message] : message);
    }
  }
);

export const logout = createAsyncThunk(`${prefix}/logout`, async () => {
  const {data} = await authApi.logout();

  return data;
});

export interface FetchCredentialsPayload extends GetCredentialsResponse {}

export const fetchCredentials = createAsyncThunk<FetchCredentialsPayload>(
  `${prefix}/fetchCredentials`,
  async () => {
    const {data} = await authApi.getCredentials();

    socket.connect();

    return data;
  }
);
