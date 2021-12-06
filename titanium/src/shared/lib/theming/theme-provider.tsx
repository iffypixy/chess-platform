import * as React from "react";
import {ChakraProvider} from "@chakra-ui/provider";

import {theme} from "./theme";

export const ThemeProvider: React.FC = ({children}) => (
  <ChakraProvider theme={theme}>{children}</ChakraProvider>
);
