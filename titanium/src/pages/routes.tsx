import * as React from "react";
import {Route, Routes as Switch} from "react-router-dom";

import {PublicOnlyRoute} from "@shared/lib/routing";
import {HomePage} from "./home";
import {LoginPage} from "./login";
import {RegisterPage} from "./register";

export const Routes: React.FC = () => (
  <Switch>
    <Route path="/" element={<HomePage />} />
    <PublicOnlyRoute path="/register" element={<RegisterPage />} />
    <PublicOnlyRoute path="/login" element={<LoginPage />} />
  </Switch>
);
