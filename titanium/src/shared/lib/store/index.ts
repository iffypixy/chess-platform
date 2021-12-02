import {configureStore} from "@reduxjs/toolkit";
import {useDispatch as useRootDispatch} from "react-redux";

import {rootReducer} from "./root-reducer";

export const store = configureStore({reducer: rootReducer});

export type RootStore = ReturnType<typeof store.getState>;
export type RootDispatch = typeof store.dispatch;

export const useDispatch = (): RootDispatch => useRootDispatch<RootDispatch>();
