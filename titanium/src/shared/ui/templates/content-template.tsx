import * as React from "react";
import {Container, Flex, Text, Box} from "@chakra-ui/layout";
import {Icon} from "@chakra-ui/react";
import {MdOutlineWhatshot} from "react-icons/md";
import BoringAvatar from "boring-avatars";
import {useSelector} from "react-redux";

import {authSelectors} from "@features/auth";
import {MainTemplate} from "./main-template";
import {Link} from "react-router-dom";

const headerHeight = 100;

const Header: React.FC = () => {
  const credentials = useSelector(authSelectors.credentials)!;

  return (
    <Flex
      w="full"
      height={headerHeight}
      position="fixed"
      alignItems="center"
      justifyContent="space-between"
      boxShadow="sm"
      pl={[5, 10, 15, 20]}
      pr={[5, 10, 15, 20]}
    >
      <Container maxW="container.xl">
        <Flex w="full" alignItems="center" justifyContent="space-between">
          <Link to="/">
            <Icon w="40px" h="40px" fill="secondary" as={MdOutlineWhatshot} />
          </Link>

          <Link to={`/@/${credentials.username}`}>
            <BoringAvatar
              colors={["#EBE5B2", "#F6F3C2", "#F7C69F", "#F89B7E", "#B5A28B"]}
              size={50}
              variant="beam"
              name={credentials.username}
              square={true}
            />
          </Link>
        </Flex>
      </Container>
    </Flex>
  );
};

interface ContentTemplateProps {
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const ContentTemplate: React.FC<ContentTemplateProps> = ({
  footer,
  children,
}) => (
  <MainTemplate header={<Header />} footer={footer}>
    <Box w="full" h="full">
      {children}
    </Box>
  </MainTemplate>
);
