export declare const scheduler: {
    schedule: ({ id, cb, ms }: {
        id: string;
        cb: Function;
        ms: number;
    }) => void;
    unschedule: (id: string) => void;
};
