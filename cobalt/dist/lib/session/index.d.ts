/// <reference types="qs" />
/// <reference types="express" />
export declare const setupStore: () => void;
export declare const session: () => import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
