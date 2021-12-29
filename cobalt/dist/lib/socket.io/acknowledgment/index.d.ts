interface AcknowledgmentOptions {
    message?: string;
    data?: any;
}
export interface Acknowledgment extends AcknowledgmentOptions {
    status: "ok" | "error";
}
export declare const acknowledgment: {
    ok: (options?: AcknowledgmentOptions) => Acknowledgment;
    error: (options?: AcknowledgmentOptions) => Acknowledgment;
};
export {};
