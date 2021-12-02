import * as React from "react";
import {render} from "react-dom";
import {BrowserRouter} from "react-router-dom";
import {Provider} from "react-redux";

import {store} from "@lib/store";
import {App} from "./app";

const root = document.getElementById("root");

render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
  root
);
