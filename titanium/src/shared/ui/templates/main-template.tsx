import * as React from "react";
import {Box} from "@chakra-ui/layout";

export interface MainTemplateProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const MainTemplate: React.FC<MainTemplateProps> = ({
  header,
  footer,
  children,
}) => (
  <Box w="100%" h="100%">
    {header && <header>{header}</header>}
    <main>{children}</main>
    {footer && <footer>{footer}</footer>}
  </Box>
);
