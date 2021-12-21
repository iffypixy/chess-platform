import * as React from "react";
import {
  Container,
  Center,
  Flex,
  VStack,
  HStack,
  Divider,
  Text,
  Box,
  Avatar,
  Icon,
  Heading,
} from "@chakra-ui/react";
import {useParams} from "react-router-dom";
import {useSelector} from "react-redux";
import {MdTimer} from "react-icons/md";
import {ShortMove, Square} from "chess.js";

import {authSelectors} from "@features/auth";
import {matchSelectors, matchActions} from "@features/matches";
import {MatchSide, MatchClock} from "@shared/api/matches";
import {socket} from "@shared/lib/socket";
import {useDispatch} from "@shared/lib/store";
import {ContentTemplate} from "@shared/ui/templates";
import {
  Chessboard,
  HandleBoardLoadParams,
  HandleMoveMakingParams,
  HandleOwnMoveMakingParams,
  HandlePremoveSetParams,
} from "@shared/lib/chess";

interface MoveProps {
  san: string;
}

const Move: React.FC<MoveProps> = ({san}) => (
  <Flex w="60px" justifyContent="center" alignItems="center">
    <Text fontSize="lg" color="text.primary">
      {san}
    </Text>
  </Flex>
);

interface PlayerSiteProps {
  username: string;
  rating: number;
  avatar: string;
  clock: number;
  isActive: boolean;
  isReversed: boolean;
}

const PlayerSite: React.FC<PlayerSiteProps> = ({
  username,
  rating,
  avatar,
  isActive,
  isReversed,
  clock,
}) => (
  <VStack
    w="full"
    alignItems="flex-start"
    flexDirection={isReversed ? "column-reverse" : "column"}
  >
    <HStack alignItems="center" spacing={5} my={5}>
      <Avatar src="https://bit.ly/3q3ShTw" size="lg" />
      <Text fontSize="lg">
        {username} ({rating})
      </Text>
    </HStack>

    <Flex
      w="fit-content"
      alignItems="center"
      bg={isActive ? "primary" : "secondary"}
      px="25px"
      py="10px"
      borderRadius="lg"
    >
      <Box w="40px" h="40px">
        {isActive && <Icon as={MdTimer} w="full" h="full" fill="feature" />}
      </Box>

      <Box ml={5}>
        <Text color={isActive ? "default" : "text.secondary"} fontSize="5xl">
          {clock}
        </Text>
      </Box>
    </Flex>
  </VStack>
);

interface MatchPageParams {
  matchId: string;
}

export const MatchPage = () => {
  const [history, setHistory] = React.useState<string[]>([]);

  const [turn, setTurn] = React.useState<MatchSide>("white");
  const [clock, setClock] = React.useState<
    MatchClock & {interval: NodeJS.Timer | null}
  >({
    white: 0,
    black: 0,
    interval: null,
  });

  const dispatch = useDispatch();

  const {matchId} = useParams() as MatchPageParams;

  const credentials = useSelector(authSelectors.credentials)!;

  const match = useSelector(matchSelectors.match);
  const isPending = useSelector(matchSelectors.isMatchFetchPending);
  const isRejected = useSelector(matchSelectors.isMatchFetchRejected);

  const isMatch = !!match;

  const player = isMatch
    ? match.white.user.id === credentials.id
      ? match.white
      : match.black.user.id === credentials.id
      ? match.black
      : null
    : null;

  const isPlayer = !!player;

  const moves = history.reduce<string[][]>(
    (prev, current, idx) =>
      idx % 2 === 0 ? [...prev, history.slice(idx, idx + 2)] : prev,
    []
  );

  const isReversed = isPlayer && player.side === "black";

  React.useEffect(() => {
    if (!isMatch) dispatch(matchActions.fetchMatch({matchId}));
  }, []);

  React.useEffect(() => {
    if (isMatch)
      setClock((clock) => ({
        ...clock,
        white: match.white.clock,
        black: match.black.clock,
      }));
  }, [isMatch]);

  React.useEffect(() => {
    if (!isMatch) return;

    if (clock.interval) clearInterval(clock.interval);

    const interval = setInterval(() => {
      setClock((clock) => {
        const time = Math.max(0, clock[turn] - 100);

        return {
          ...clock,
          [turn]: time,
        };
      });
    }, 100);

    setClock((clock) => ({...clock, interval}));
  }, [turn, isMatch]);

  const renderMoves = () =>
    history
      .reduce<string[][]>(
        (prev, current, idx) =>
          idx % 2 === 0 ? [...prev, history.slice(idx, idx + 2)] : prev,
        []
      )
      .map((pair, idx) => (
        <Flex
          key={idx}
          py={2}
          px={4}
          bg={idx % 2 === 0 ? "tertiary" : "transparent"}
        >
          <Text fontSize="lg" color="text.primary">
            {idx + 1}.
          </Text>

          <Flex ml={3}>
            <Move san={pair[0]} />
            {moves[1] && <Move san={pair[1]} />}
          </Flex>
        </Flex>
      ));

  const handleOwnMoveMaking = ({engine}: HandleOwnMoveMakingParams) => {
    if (!isPlayer) return;

    const history = engine.history({verbose: true});
    const move = history[history.length - 1];

    dispatch(
      matchActions.makeMove({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        matchId: match!.id,
      })
    );
  };

  const handleMoveMaking = ({engine}: HandleMoveMakingParams) => {
    const turn = engine.turn() === "w" ? "white" : "black";
    const history = engine.history();

    setTurn(turn);
    setHistory(history);
  };

  const handlePremoveSet = ({orig, dest}: HandlePremoveSetParams) => {
    if (!isPlayer) return;

    dispatch(
      matchActions.makePremove({
        from: orig as Square,
        to: dest as Square,
        promotion: "q",
        matchId: match!.id,
      })
    );
  };

  const handlePremoveUnset = () => {
    if (!isPlayer) return;

    matchActions.removePremove({
      matchId: match!.id,
    });
  };

  const handleBoardLoad = ({api, engine}: HandleBoardLoadParams) => {
    const turn = engine.turn() === "w" ? "white" : "black";
    const history = engine.history();

    setTurn(turn);
    setHistory(history);

    socket.on("move", ({move}: {move: ShortMove}) =>
      api.move(move.from, move.to)
    );

    socket.on("clock", ({clock}: {clock: {white: number; black: number}}) => {
      setClock((prev) => ({...prev, ...clock}));
    });

    socket.on("victory", () => {
      console.log("VICTORY");

      setClock((clock) => ({...clock, inteval: null}));
    });

    socket.on("lose", () => {
      console.log("LOSE");

      setClock((clock) => ({...clock, inteval: null}));
    });

    socket.on("draw", () => {
      console.log("DRAW");

      setClock((clock) => ({...clock, inteval: null}));
    });
  };

  const whiteSite = match && (
    <PlayerSite
      username={match.white.user.username}
      avatar="https://bit.ly/3q3ShTw"
      rating={match.white.rating}
      isReversed={isReversed}
      isActive={turn === "white"}
      clock={clock.white}
    />
  );

  const blackSite = match && (
    <PlayerSite
      username={match.black.user.username}
      avatar="https://bit.ly/3q3ShTw"
      rating={match.black.rating}
      isReversed={isReversed}
      isActive={turn === "black"}
      clock={clock.black}
    />
  );

  if (isRejected)
    return (
      <ContentTemplate>
        <Center>
          <Heading>Oops! It seems like there is no such a match :(</Heading>
        </Center>
      </ContentTemplate>
    );

  if (isPending)
    return (
      <ContentTemplate>
        <Center>
          <Heading>Loading! Wait a bit :)</Heading>
        </Center>
      </ContentTemplate>
    );

  if (!match) return null;

  return (
    <ContentTemplate>
      <Container maxW="full" h="full">
        <Center w="full" h="full">
          <Flex
            w={350}
            h="95vh"
            flexDirection="column"
            justifyContent="space-between"
            mr={10}
          >
            <Flex
              flexDirection="column"
              w="full"
              h="45%"
              bg="primary"
              borderRadius="lg"
              overflowY="scroll"
            >
              <Box pt={3} pb={3} pl={4} pr={4}>
                <Text color="text.primary">
                  D12: Slav Defense: Modern, Quiet.
                </Text>
              </Box>

              {renderMoves()}
            </Flex>

            <Flex></Flex>

            <Flex w="full" h="40%" bg="primary" borderRadius="lg"></Flex>
          </Flex>

          <Box w="95vh" h="95vh">
            <Chessboard
              fen={match!.fen}
              side={player!.side}
              isViewOnly={!isPlayer}
              isReversed={isReversed}
              handleBoardLoad={handleBoardLoad}
              handleMoveMaking={handleMoveMaking}
              handleOwnMoveMaking={handleOwnMoveMaking}
              handlePremoveSet={handlePremoveSet}
              handlePremoveUnset={handlePremoveUnset}
            />
          </Box>

          <VStack w={350} h="95vh" justifyContent="center" ml={10}>
            {isReversed ? whiteSite : blackSite}
            <Divider borderColor="feature" borderWidth={2} />
            {isReversed ? blackSite : whiteSite}
          </VStack>
        </Center>
      </Container>
    </ContentTemplate>
  );
};
