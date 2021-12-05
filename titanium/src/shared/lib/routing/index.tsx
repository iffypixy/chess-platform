import * as React from "react";
import {useSelector} from "react-redux";
import {Route, RouteProps, Navigate} from "react-router-dom";

import {authSelectors} from "@features/auth";

interface PrivateRouteProps extends RouteProps {}

export const PrivateRoute: React.FC<PrivateRouteProps> = (props) => {
  const isAuthenticated = useSelector(authSelectors.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/" />;

  return <Route {...props} />;
};

interface PublicOnlyRouteProps extends RouteProps {}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = (props) => {
  const isAuthenticated = useSelector(authSelectors.isAuthenticated);

  if (isAuthenticated) return <Navigate to="/" />;

  return <Route {...props} />;
};
