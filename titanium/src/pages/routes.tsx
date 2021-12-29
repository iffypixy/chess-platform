import * as React from "react";
import {Navigate, Route, Routes as Switch} from "react-router-dom";

import {PrivateRoute, PublicOnlyRoute} from "@shared/lib/routing";
import {MatchPage} from "./match";
import {HomePage} from "./home";
import {LoginPage} from "./login";
import {RegisterPage} from "./register";
import {UserPage} from "./user";

export const Routes: React.FC = () => (
  <Switch>
    <Route
      path="/"
      element={
        <PrivateRoute>
          <HomePage />
        </PrivateRoute>
      }
    />
    <Route
      path="match/:matchId"
      element={
        <PrivateRoute>
          <MatchPage />
        </PrivateRoute>
      }
    />
    <Route
      path="@/:username"
      element={
        <PrivateRoute>
          <UserPage />
        </PrivateRoute>
      }
    />
    <Route
      path="register"
      element={
        <PublicOnlyRoute>
          <RegisterPage />
        </PublicOnlyRoute>
      }
    />
    <Route
      path="login"
      element={
        <PublicOnlyRoute>
          <LoginPage />
        </PublicOnlyRoute>
      }
    />
    <Route path="*" element={<Navigate to="/" />} />
  </Switch>
);
