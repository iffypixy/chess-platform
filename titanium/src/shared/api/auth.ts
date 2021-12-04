import {AxiosPromise} from "axios";

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

interface LoginData {
  username: string;
  password: string;
}

interface LoginResponse {
  credentials: Credentials;
}

const login = (data: LoginData): AxiosPromise<LoginResponse> =>
  request({
    url: "/api/auth/login",
    method: "POST",
    data,
  });

interface RegisterData {
  username: string;
  password: string;
}

interface RegisterResponse {
  credentials: Credentials;
}

const register = (data: RegisterData): AxiosPromise<RegisterResponse> =>
  request({
    url: "/api/auth/register",
    method: "POST",
    data,
  });

interface GetCredentialsResponse {
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
