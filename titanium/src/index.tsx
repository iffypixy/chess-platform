import * as React from "react";
import {render} from "react-dom";
import {BrowserRouter} from "react-router-dom";
import {Provider} from "react-redux";

import {store} from "@shared/lib/store";
import {ThemeProvider} from "@shared/lib/theming";
import {App} from "@app/app";

const root = document.getElementById("root");

render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
  root
);
