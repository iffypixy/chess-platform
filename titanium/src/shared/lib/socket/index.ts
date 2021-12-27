import {io} from "socket.io-client";

export const socket = io(process.env.BACKEND_URL, {
  withCredentials: true,
});

export const serverEvents = {
  JOIN_QUEUE: "join-queue",
  MAKE_MOVE: "make-move",
  RESIGN: "resign",
  OFFER_DRAW: "offer-draw",
  ACCEPT_DRAW: "accept-draw",
  DECLINE_DRAW: "decline-draw",
  PREMOVE: "make-premove",
  REMOVE_PREMOVE: "remove-premove",
  SPECTATE_MATCH: "spectate-match",
  SEND_MESSAGE: "send-message",
};

export const clientEvents = {
  MOVE: "move",
  MATCH_FOUND: "match-found",
  DRAW_OFFER: "draw-offer",
  DRAW_OFFER_DECLINE: "draw-offer-decline",
  DRAW_OFFER_ACCEPT: "draw-offer-accept",
  CLOCK: "clock",
  RESULTATIVE_ENDING: "resultative-ending",
  TIE_ENDING: "tie-ending",
  RESIGNED: "resigned",
  MESSAGE: "message",
};
