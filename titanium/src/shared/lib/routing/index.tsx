import * as React from "react";
import {useSelector} from "react-redux";
import {Navigate} from "react-router-dom";

import {authSelectors} from "@features/auth";

interface PrivateRouteProps {
  children: React.ReactElement;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({children}) => {
  const isAuthenticated = useSelector(authSelectors.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/login" />;

  return children;
};

interface PublicOnlyRouteProps {
  children: React.ReactElement;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({children}) => {
  const isAuthenticated = useSelector(authSelectors.isAuthenticated);

  if (isAuthenticated) return <Navigate to="/" />;

  return children;
};
