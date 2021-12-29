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

import {matchmakingActions, matchmakingSelectors} from "@features/matchmaking";
import {matchesActions} from "@features/matches";
import {ContentTemplate} from "@shared/ui/templates";
import {useDispatch} from "@shared/lib/store";
import {clientEvents, socket} from "@shared/lib/socket";
import {MatchControl, RealMatch} from "@shared/api/matches";
import {Button} from "@chakra-ui/react";
import {useSelector} from "react-redux";

const types = [
  {
    time: 1,
    increment: 0,
    delay: 0,
  },
  {
    time: 1,
    increment: 1,
    delay: 0,
  },
  {
    time: 2,
    increment: 1,
    delay: 0,
  },
  {
    time: 3,
    increment: 0,
    delay: 0,
  },
  {
    time: 3,
    increment: 2,
    delay: 0,
  },
  {
    time: 5,
    increment: 0,
    delay: 0,
  },
  {
    time: 10,
    increment: 0,
    delay: 0,
  },
  {
    time: 10,
    increment: 5,
    delay: 0,
  },
  {
    time: 15,
    increment: 0,
    delay: 0,
  },
  {
    time: 30,
    increment: 0,
    delay: 0,
  },
  {
    time: 45,
    increment: 0,
    delay: 0,
  },
  {
    time: 60,
    increment: 0,
    delay: 0,
  },
];

interface PanelButtonProps {
  children: React.ReactNode;
  handleClick: () => void;
}

const PanelButton: React.FC<PanelButtonProps> = ({children, handleClick}) => (
  <Button
    onClick={handleClick}
    role="button"
    w={0.3}
    h={50}
    color="text.secondary"
    fontSize="xl"
    bg="tertiary"
    borderRadius="xl"
    cursor="pointer"
    transitionProperty="background"
    transitionTimingFunction="linear"
    transitionDuration="0.2s"
    _hover={{bg: "tertiary"}}
    _active={{
      bg: "tertiary",
    }}
  >
    {children}
  </Button>
);

export const HomePage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const control = useSelector(matchmakingSelectors.queuedControl);

  React.useEffect(() => {
    socket.on(clientEvents.MATCH_FOUND, ({match}: {match: RealMatch}) => {
      dispatch(matchesActions.setMatch({match}));

      navigate(`/match/${match.id}`);
    });

    return () => {
      socket.off(clientEvents.MATCH_FOUND);
    };
  }, []);

  return (
    <ContentTemplate>
      <Container maxW="container.xl" h="100vh">
        <Center w="full" h="full">
          <VStack w={[0.95, 0.9, 550]} bg="primary" borderRadius="2xl" p={5}>
            <Center
              w="full"
              borderBottomWidth={3}
              borderBottomColor="divider"
              borderBottomStyle="solid"
              mb={[3, 5]}
              paddingBottom={3}
            >
              <Heading
                color="text.secondary"
                fontWeight="medium"
                fontSize={["2xl", "3xl", "4xl"]}
              >
                New match
              </Heading>
            </Center>

            <VStack w="full" spacing={5} pl={[1, 3]} pr={[1, 3, 5]}>
              {Array.from({length: Math.ceil(types.length / 3)}, (_, idx) => (
                <HStack w="full" spacing={[5, 7]} key={idx}>
                  {[...types]
                    .slice(idx * 3, (idx + 1) * 3)
                    .map(({time, increment, delay}, idx) => {
                      const isCurrent =
                        !!control &&
                        control.time === time &&
                        control.increment === increment &&
                        control.delay === delay;

                      return (
                        <Button
                          key={idx}
                          w={0.3}
                          h={50}
                          color="text.secondary"
                          fontSize="xl"
                          bg="tertiary"
                          borderRadius="xl"
                          cursor="pointer"
                          transitionProperty="background"
                          transitionTimingFunction="linear"
                          transitionDuration="0.2s"
                          _hover={{bg: "tertiary"}}
                          _active={{bg: "tertiary"}}
                          disabled={false}
                          isLoading={isCurrent}
                          onClick={() => {
                            dispatch(
                              matchmakingActions.joinQueue({
                                delay: delay * 1000,
                                increment: increment * 1000,
                                time: time * 60 * 1000,
                              })
                            );

                            dispatch(
                              matchmakingActions.setQueuedControl({
                                control: isCurrent
                                  ? null
                                  : {
                                      delay,
                                      increment,
                                      time,
                                    },
                              })
                            );
                          }}
                        >
                          {time}|{increment}
                        </Button>
                      );
                    })}
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Center>
      </Container>
    </ContentTemplate>
  );
};
