import {createAsyncThunk} from "@reduxjs/toolkit";

import {
  authApi,
  GetCredentialsResponse,
  LoginData,
  LoginResponse,
  RegisterData,
  RegisterResponse,
} from "@shared/api/auth";

const prefix = "auth";

export interface LoginPayload extends LoginResponse {}

export const login = createAsyncThunk<LoginPayload, LoginData>(
  `${prefix}/login`,
  async (args) => {
    const {data} = await authApi.login(args);

    return data;
  }
);

export interface RegisterPayload extends RegisterResponse {}

export const register = createAsyncThunk<RegisterPayload, RegisterData>(
  `${prefix}/register`,
  async (args) => {
    const {data} = await authApi.register(args);

    return data;
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

    return data;
  }
);
