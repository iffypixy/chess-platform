import axios from "axios";

const BACKEND_URL = process.env.BACKEND_URL;

export const request = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
});
