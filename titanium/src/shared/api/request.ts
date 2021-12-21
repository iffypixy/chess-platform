import axios from "axios";

import {socket} from "@shared/lib/socket";

const BACKEND_URL = process.env.BACKEND_URL;

export const request = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});

interface EmitOptions {
  event: string;
  data?: any;
}

interface EmitResponse {
  status: "ok" | "error";
  message?: string;
  data?: any;
}

export const emit = ({event, data}: EmitOptions): Promise<any> =>
  new Promise((resolve, reject) => {
    socket.emit(event, data, (response: EmitResponse) => {
      if (response.status === "error") reject(response.message);
      else if (response.status === "ok") resolve(response.data);
    });
  });
