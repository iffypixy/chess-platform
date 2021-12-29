import {AxiosPromise} from "axios";

import {CompletedMatch} from "./matches";
import {request} from "./request";

export interface User {
  id: string;
  username: string;
  bullet: UserScore;
  blitz: UserScore;
  rapid: UserScore;
  classical: UserScore;
}

interface UserScore {
  rating: number;
  isCalibrated: boolean;
}

export interface GetUserData {
  username: string;
}

export interface GetUserResponse {
  user: User;
}

const getUser = ({username}: GetUserData): AxiosPromise<GetUserResponse> =>
  request({
    url: `/api/users/${username}`,
    method: "GET",
  });

export interface GetMatchesData {
  username: string;
}

export interface GetMatchesResponse {
  matches: CompletedMatch[];
}

const getMatches = ({
  username,
}: GetMatchesData): AxiosPromise<GetMatchesResponse> =>
  request({
    method: "GET",
    url: `/api/matches/users/${username}`,
  });

export const usersApi = {
  getUser,
  getMatches,
};
