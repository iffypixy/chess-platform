import * as React from "react";
import {
  Center,
  Heading,
  HStack,
  VStack,
  Text,
  Container,
} from "@chakra-ui/layout";
import {useNavigate} from "react-router-dom";

import {matchmakingActions} from "@features/matchmaking";
import {matchActions} from "@features/matches";
import {ContentTemplate} from "@shared/ui/templates";
import {useDispatch} from "@shared/lib/store";
import {socket} from "@shared/lib/socket";

const types = [
  {
    time: 1,
    increment: 0,
  },
  {
    time: 1,
    increment: 1,
  },
  {
    time: 2,
    increment: 1,
  },
  {
    time: 3,
    increment: 0,
  },
  {
    time: 3,
    increment: 2,
  },
  {
    time: 5,
    increment: 0,
  },
  {
    time: 10,
    increment: 0,
  },
  {
    time: 10,
    increment: 5,
  },
  {
    time: 15,
    increment: 0,
  },
  {
    time: 30,
    increment: 0,
  },
  {
    time: 45,
    increment: 0,
  },
  {
    time: 60,
    increment: 0,
  },
];

interface PanelButtonProps {
  children: React.ReactNode;
  handleClick: () => void;
}

const PanelButton: React.FC<PanelButtonProps> = ({children, handleClick}) => (
  <Center
    onClick={handleClick}
    role="button"
    w={0.3}
    h={50}
    bg="gray.200"
    borderRadius="xl"
    cursor="pointer"
    transitionProperty="background"
    transitionTimingFunction="linear"
    transitionDuration="0.2s"
    _hover={{bg: "gray.300"}}
  >
    <Text fontSize="xl">{children}</Text>
  </Center>
);

export const HomePage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  React.useEffect(() => {
    socket.on("match-found", ({match}) => {
      dispatch(matchActions.setMatch({match}));

      navigate(`/match/${match.id}`);
    });
  }, []);

  return (
    <ContentTemplate>
      <Container maxW="container.xl" h="full">
        <Center w="full" h="full">
          <VStack w={[0.95, 0.9, 550]} bg="gray.100" borderRadius="2xl" p={5}>
            <Center
              w="full"
              borderBottomWidth={3}
              borderBottomColor="gray.200"
              borderBottomStyle="solid"
              mb={[3, 5]}
              paddingBottom={3}
            >
              <Heading fontWeight="medium" fontSize={["2xl", "3xl", "4xl"]}>
                New game
              </Heading>
            </Center>

            <VStack w="full" spacing={5} pl={[1, 3]} pr={[1, 3, 5]}>
              {Array.from({length: Math.ceil(types.length / 3)}, (_, idx) => (
                <HStack w="full" spacing={[5, 7]} key={idx}>
                  {[...types]
                    .slice(idx * 3, (idx + 1) * 3)
                    .map(({time, increment}, idx) => (
                      <PanelButton
                        key={idx}
                        handleClick={() => {
                          dispatch(
                            matchmakingActions.joinQueue({
                              delay: 0,
                              increment,
                              time,
                            })
                          );
                        }}
                      >
                        {time}|{increment}
                      </PanelButton>
                    ))}
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Center>
      </Container>
    </ContentTemplate>
  );
};
