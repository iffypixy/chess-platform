interface AcknowledgmentOptions {
  message?: string;
  data?: any;
}

export interface Acknowledgment extends AcknowledgmentOptions {
  status: "ok" | "error";
}

export const acknowledgment = {
  ok: (options: AcknowledgmentOptions = {}): Acknowledgment => ({
    status: "ok",
    ...options,
  }),

  error: (options: AcknowledgmentOptions = {}): Acknowledgment => ({
    status: "error",
    ...options,
  }),
};
