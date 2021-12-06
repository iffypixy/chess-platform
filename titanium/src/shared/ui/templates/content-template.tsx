import * as React from "react";
import {Center} from "@chakra-ui/layout";

import {MainTemplate, MainTemplateProps} from "./main-template";

interface ContentTemplateProps extends MainTemplateProps {}

export const ContentTemplate: React.FC<ContentTemplateProps> = ({
  header,
  footer,
  children,
}) => (
  <MainTemplate header={header} footer={footer}>
    <Center>{children}</Center>
  </MainTemplate>
);
