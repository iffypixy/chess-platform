import * as React from "react";
import {Route, Routes as Switch} from "react-router-dom";

import {PublicOnlyRoute} from "@shared/lib/routing";
import {MatchPage} from "./match";
import {HomePage} from "./home";
import {LoginPage} from "./login";
import {RegisterPage} from "./register";

export const Routes: React.FC = () => (
  <Switch>
    <Route path="/" element={<HomePage />} />
    <Route path="/match/:matchId" element={<MatchPage />} />
    <Route
      path="/register"
      element={
        <PublicOnlyRoute>
          <RegisterPage />
        </PublicOnlyRoute>
      }
    />
    <Route
      path="/login"
      element={
        <PublicOnlyRoute>
          <LoginPage />
        </PublicOnlyRoute>
      }
    />
  </Switch>
);
