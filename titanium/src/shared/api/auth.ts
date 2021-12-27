import {AxiosError, AxiosPromise} from "axios";

import {request} from "./request";

export interface Credentials {
  id: string;
  username: string;
  bullet: {
    rating: number;
    isCalibrated: boolean;
  };
  blitz: {
    rating: number;
    isCalibrated: boolean;
  };
  rapid: {
    rating: number;
    isCalibrated: boolean;
  };
  classic: {
    rating: number;
    isCalibrated: boolean;
  };
}

export interface LoginData {
  username: string;
  password: string;
}

export interface LoginResponse {
  credentials: Credentials;
}

const login = (data: LoginData): AxiosPromise<LoginResponse> =>
  request({
    url: "/api/auth/login",
    method: "POST",
    data,
  });

export interface RegisterData {
  username: string;
  password: string;
}

export interface RegisterResponse {
  credentials: Credentials;
}

export interface RegisterResponseError {
  message: string[];
}

const register = (data: RegisterData): AxiosPromise<RegisterResponse> =>
  request({
    url: "/api/auth/register",
    method: "POST",
    data,
  });

export interface GetCredentialsResponse {
  credentials: Credentials;
}

const getCredentials = (): AxiosPromise<GetCredentialsResponse> =>
  request({
    url: "/api/auth/credentials",
    method: "GET",
  });

const logout = () =>
  request({
    url: "/api/auth/logout",
    method: "POST",
  });

export const authApi = {login, register, getCredentials, logout};
