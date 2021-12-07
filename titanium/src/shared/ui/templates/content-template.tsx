import * as React from "react";
import {Flex, Heading, Box} from "@chakra-ui/layout";

import {MainTemplate} from "./main-template";

const Header: React.FC = () => (
  <Flex
    as="header"
    w="100%"
    position="fixed"
    alignItems="center"
    justifyContent="space-between"
    bg="white"
    py={5}
    px={10}
  >
    <Heading>Rechess</Heading>
  </Flex>
);

interface ContentTemplateProps {
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const ContentTemplate: React.FC<ContentTemplateProps> = ({
  footer,
  children,
}) => (
  <MainTemplate header={<Header />} footer={footer}>
    <Box bg="gray.50">{children}</Box>
  </MainTemplate>
);
