import * as React from "react";
import {Container, Flex, Text, Box, Divider, VStack} from "@chakra-ui/layout";
import {
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@chakra-ui/react";
import {MdExpandMore, MdSettings, MdLogout} from "react-icons/md";
import {Link} from "react-router-dom";

import {UserAvatar} from "@features/users";
import {MainTemplate} from "./main-template";

const headerHeight = 100;

const Header: React.FC = () => {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);
  const closeProfile = () => setIsProfileOpen(false);

  return (
    <Flex
      w="full"
      height={headerHeight}
      position="fixed"
      alignItems="center"
      justifyContent="space-between"
      boxShadow="sm"
      pl={[0, 5, 10, 20]}
      pr={[0, 5, 10, 20]}
    >
      <Container maxW="container.xl">
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontWeight="bold" fontSize={["xl", "3xl", "4xl", "5xl"]}>
            Rechess
          </Text>

          <Popover
            placement="bottom-end"
            onClose={closeProfile}
            isOpen={isProfileOpen}
          >
            <PopoverTrigger>
              <Flex
                alignItems="center"
                cursor="pointer"
                role="group"
                tabIndex={0}
                onClick={toggleProfile}
              >
                <Text
                  fontSize={["md", "xl"]}
                  maxW={250}
                  isTruncated
                  mr={2}
                  _groupHover={{color: "gray.400"}}
                >
                  ansatjrt
                </Text>
                <Icon
                  as={MdExpandMore}
                  w={5}
                  h={5}
                  transitionDuration="0.2s"
                  transitionTimingFunction="linear"
                  transitionProperty="transform"
                  transform={`rotate(${isProfileOpen ? 180 : 0}deg)`}
                  _groupHover={{fill: "gray.400"}}
                />
              </Flex>
            </PopoverTrigger>

            <PopoverContent w={[250, 300]}>
              <PopoverBody w="full" p={3}>
                <VStack w="full" spacing={2}>
                  <Box w="full">
                    <Link to="@/ansatjrt">
                      <Flex
                        w="full"
                        alignItems="center"
                        borderRadius="lg"
                        transitionDuration="0.2s"
                        transitionTimingFunction="linear"
                        transitionProperty="background"
                        _hover={{bg: "gray.100"}}
                        pt={3}
                        pb={3}
                        pl={4}
                        pr={4}
                      >
                        <UserAvatar url="https://bit.ly/30adjXU" size="md" />

                        <Flex flexDirection="column" ml={3}>
                          <Text fontSize={["lg"]} fontWeight="bold">
                            ansatjrt
                          </Text>
                          <Text color="gray.500" fontSize={["md"]}>
                            Go to the profile
                          </Text>
                        </Flex>
                      </Flex>
                    </Link>
                  </Box>

                  <Divider borderBottomWidth={3} />

                  <Box w="full">
                    <Link to="settings">
                      <Flex
                        w="full"
                        alignItems="center"
                        borderRadius="lg"
                        transitionDuration="0.2s"
                        transitionTimingFunction="linear"
                        transitionProperty="background"
                        _hover={{bg: "gray.100"}}
                        pt={2}
                        pb={2}
                        pl={4}
                        pr={4}
                      >
                        <Icon fill="gray.500" as={MdSettings} w={7} h={7} />
                        <Text color="gray.500" ml={5}>
                          Settings
                        </Text>
                      </Flex>
                    </Link>
                  </Box>

                  <Divider borderBottomWidth={3} />

                  <Box w="full">
                    <Flex
                      role="button"
                      w="full"
                      alignItems="center"
                      borderRadius="lg"
                      transitionDuration="0.2s"
                      transitionTimingFunction="linear"
                      transitionProperty="background"
                      _hover={{bg: "gray.100"}}
                      pt={2}
                      pb={2}
                      pl={4}
                      pr={4}
                    >
                      <Icon fill="gray.500" as={MdLogout} w={7} h={7} />
                      <Text color="gray.500" ml={5}>
                        Log out
                      </Text>
                    </Flex>
                  </Box>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>
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
    <Box w="full" h={0} minH="100vh" pt={headerHeight}>
      {children}
    </Box>
  </MainTemplate>
);
