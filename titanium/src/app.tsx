import * as React from "react";

import {CredentialsLoader} from "@features/auth";
import {Routes} from "@pages/routes";

export const App: React.FC = () => (
  <CredentialsLoader>
    <Routes />
  </CredentialsLoader>
);
