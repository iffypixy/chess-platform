import * as React from "react";
import {render} from "react-dom";
import {BrowserRouter} from "react-router-dom";

import {App} from "./app";

const root = document.getElementById("root");

render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
  root
);
