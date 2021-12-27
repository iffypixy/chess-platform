import * as React from "react";
import {useSelector} from "react-redux";
import {
  Avatar,
  Box,
  Center,
  Container,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  Text,
  VStack,
  Button,
} from "@chakra-ui/react";
import {useParams, useNavigate} from "react-router-dom";
import {
  MdFastRewind,
  MdFastForward,
  MdFlag,
  MdOutlineTopic,
  MdCheck,
  MdClear,
  MdOutlineWatchLater,
} from "react-icons/md";
import {Chessground} from "chessground";
import {Api} from "chessground/api";
import {Dests, Role, PiecesDiff, Key} from "chessground/types";
import * as ChessJS from "chess.js";
import {Square, ShortMove} from "chess.js";
import * as dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import "chessground/assets/chessground.base.css";
import "dayjs/locale/es";

import {authSelectors} from "@features/auth";
import {matchesSelectors, matchesActions} from "@features/matches";
import {matchmakingActions} from "@features/matchmaking";
import {useDispatch} from "@shared/lib/store";
import {User} from "@shared/api/users";
import {INITIAL_FEN} from "@shared/lib/chessboard";
import {ContentTemplate} from "@shared/ui/templates";
import {
  CompletedMatch,
  MatchClock,
  MatchResult,
  MatchSide,
  PromotionPiece,
  RealMatch,
} from "@shared/api/matches";
import {clientEvents, socket} from "@shared/lib/socket";
import "@shared/lib/chessboard/theme.css";

const Chess = typeof ChessJS === "function" ? ChessJS : ChessJS.Chess;

dayjs.locale("es");
dayjs.extend(duration);

const promptPiecePromotion = () => {
  return "q";
};

interface MatchPageParams {
  matchId: string;
}

export const MatchPage: React.FC = () => {
  const dispatch = useDispatch();

  const match = useSelector(matchesSelectors.match);
  const isPending = useSelector(matchesSelectors.isMatchFetchPending);
  const isRejected = useSelector(matchesSelectors.isMatchFetchRejected);

  const {matchId} = useParams() as MatchPageParams;

  React.useEffect(() => {
    if (!match) dispatch(matchesActions.fetchMatch({matchId}));
  }, []);

  if (isPending) return <Heading>Loading! Wait a bit :)</Heading>;
  if (isRejected) return <Heading>Oops. Something went wrong :(</Heading>;

  if (!match) return null;

  if (!match.isCompleted) return <CurrentMatch />;
  else if (match.isCompleted) return <FinishedMatch />;

  return null;
};

interface ResultState {
  white: {
    rating: number;
    shift: number;
    result: MatchResult;
  };
  black: {
    rating: number;
    shift: number;
    result: MatchResult;
  };
}

interface MessageState {
  text: string;
  isSystem: boolean;
}

const CurrentMatch: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const credentials = useSelector(authSelectors.credentials)!;
  const match = useSelector(matchesSelectors.match) as RealMatch;

  const {white, black} = match;

  const [cgApi, setCgApi] = React.useState<Api | null>(null);

  const [isDrawOfferValid, setIsDrawOfferValid] =
    React.useState<boolean>(false);
  const [isInQueue, setIsInQueue] = React.useState(false);
  const [hasOfferedDraw, setHasOfferedDraw] = React.useState(false);

  const [text, setText] = React.useState("");

  const [position, setPosition] = React.useState(match.fen);
  const [result, setResult] = React.useState<ResultState | null>(null);
  const [messages, setMessages] = React.useState<MessageState[]>([]);

  const [history, setHistory] = React.useState<string[]>([]);
  const [moves, setMoves] = React.useState<string[][]>([]);
  const [turn, setTurn] = React.useState<MatchSide>("white");

  const [clock, setClock] = React.useState<
    MatchClock & {interval: NodeJS.Timer | null}
  >({
    white: white.clock,
    black: black.clock,
    interval: null,
  });

  const player =
    white.user.id === credentials.id
      ? white
      : black.user.id === credentials.id
      ? black
      : null;

  const isBlack = !!player && player.side === "black";
  const isReversed = isBlack;

  const isAbleToOfferDraw = !!player && !hasOfferedDraw;

  const format = match.type === "classical" ? "H:mm:ss" : "mm:ss";

  const groundRef = React.useCallback(
    (node) => {
      if (!node) return;

      const engine = new Chess(match.fen);

      match.pgn && engine.load_pgn(match.pgn);

      const dests = () => {
        const dests: Dests = new Map();

        engine.SQUARES.forEach((square) => {
          const moves = engine.moves({square, verbose: true});

          dests.set(
            square,
            moves.map((move) => move.to)
          );
        });

        return dests;
      };

      const role = (promotion: PromotionPiece): Role => {
        if (promotion === "q") return "queen";
        else if (promotion === "n") return "knight";
        else if (promotion === "b") return "bishop";
        else if (promotion === "r") return "rook";

        return "queen";
      };

      const moves = () => {
        const history = engine.history();

        return history.reduce<string[][]>(
          (prev, current, idx) =>
            idx % 2 === 0 ? [...prev, history.slice(idx, idx + 2)] : prev,
          []
        );
      };

      const history = () => engine.get_comments().map(({fen}) => fen);
      const turn = (): MatchSide => (engine.turn() === "w" ? "white" : "black");
      const isViewOnly = () => engine.in_checkmate();
      const fen = () => engine.fen();

      setTurn(turn());
      setMoves(moves());
      setHistory(history());
      setPosition(fen());

      const api = Chessground(node, {
        fen: match.fen,
        turnColor: turn(),
        viewOnly: isViewOnly(),
        coordinates: false,
        orientation: isBlack ? "black" : "white",
        check: engine.in_check(),
        movable: {
          free: false,
          color: (player && player.side) || undefined,
          dests: dests(),
          events: {
            after: () => {
              const history = engine.history({verbose: true});
              const move = history[history.length - 1];

              setIsDrawOfferValid(false);

              dispatch(
                matchesActions.makeMove({
                  from: move.from,
                  to: move.to,
                  promotion: move.promotion,
                  matchId: match!.id,
                })
              );
            },
          },
        },
        premovable: {
          events: {
            set: (orig, dest) => {
              dispatch(
                matchesActions.makePremove({
                  from: orig as Square,
                  to: dest as Square,
                  promotion: "q",
                  matchId: match.id,
                })
              );
            },
            unset: () => {
              dispatch(
                matchesActions.removePremove({
                  matchId: match.id,
                })
              );
            },
          },
        },
        events: {
          move: async (orig, dest) => {
            const current = turn();

            const possible = engine.moves({square: orig, verbose: true});

            const isPromotion = possible
              .filter((move) => move.flags.includes("p"))
              .some((move) => move.to === dest);

            const promotion = (isPromotion &&
              (await promptPiecePromotion())) as PromotionPiece;

            const move = engine.move({
              from: orig as Square,
              to: dest as Square,
              promotion,
            });

            if (!move) return;

            engine.set_comment("");

            if (isPromotion) {
              const map: PiecesDiff = new Map();

              map.set(dest, {
                role: role(promotion),
                promoted: true,
                color: current,
              });

              api.setPieces(map);
            }

            const isEnPassant = move.flags.includes("e");

            if (isEnPassant) {
              const map: PiecesDiff = new Map();

              const square = `${dest[0]}${Number(dest[1]) - 1}` as Key;

              map.set(square, undefined);

              api.setPieces(map);
            }

            api.set({
              viewOnly: isViewOnly(),
              turnColor: turn(),
              check: engine.in_check(),
              movable: {
                free: false,
                color: (player && player.side) || undefined,
                dests: dests(),
              },
            });

            const hist = history();

            setTurn(turn());
            setMoves(moves());
            setHistory(hist);
            setPosition(api.getFen());

            api.playPremove();
          },
        },
      });

      socket.off(clientEvents.MOVE);
      socket.off(clientEvents.CLOCK);
      socket.off(clientEvents.RESULTATIVE_ENDING);
      socket.off(clientEvents.TIE_ENDING);
      socket.off(clientEvents.DRAW_OFFER);
      socket.off(clientEvents.DRAW_OFFER_ACCEPT);
      socket.off(clientEvents.DRAW_OFFER_DECLINE);
      socket.off(clientEvents.RESIGNED);
      socket.off(clientEvents.MESSAGE);

      socket.on(
        clientEvents.MOVE,
        ({move, from}: {move: ShortMove; from: MatchSide}) => {
          if (!!player && player.side === from) return;

          api.move(move.from, move.to);
        }
      );

      socket.on(clientEvents.CLOCK, ({clock}: {clock: MatchClock}) => {
        setClock((prev) => ({...prev, ...clock}));
      });

      socket.on(clientEvents.RESULTATIVE_ENDING, ({white, black}) => {
        api.set({
          viewOnly: true,
        });

        setResult({white, black});
        setIsDrawOfferValid(false);
        setMessages((messages) => {
          const side = white.result === "victory" ? "white" : "black";

          return [
            ...messages,
            {
              isSystem: true,
              text: `${match[side].user.username} wins the match!`,
            },
          ];
        });
      });

      socket.on(clientEvents.TIE_ENDING, ({white, black}) => {
        api.set({
          viewOnly: true,
        });

        setResult({white, black});
        setIsDrawOfferValid(false);
        setMessages((messages) => [
          ...messages,
          {
            isSystem: true,
            text: "The match ended as a draw!",
          },
        ]);
      });

      socket.on(clientEvents.DRAW_OFFER, ({from}: {from: MatchSide}) => {
        if (!!player && player.side !== from) setIsDrawOfferValid(true);

        setMessages((messages) => [
          ...messages,
          {
            isSystem: true,
            text: `${match[from].user.username} offers a draw`,
          },
        ]);
      });

      socket.on(
        clientEvents.DRAW_OFFER_DECLINE,
        ({from}: {from: MatchSide}) => {
          setMessages((messages) => [
            ...messages,
            {
              isSystem: true,
              text: `${match[from].user.username} declined a draw offer`,
            },
          ]);
        }
      );

      socket.on(clientEvents.DRAW_OFFER_ACCEPT, ({from}: {from: MatchSide}) => {
        setMessages((messages) => [
          ...messages,
          {
            isSystem: true,
            text: `${match[from].user.username} accepted a draw offer`,
          },
        ]);
      });

      socket.on(clientEvents.RESIGNED, ({from}: {from: MatchSide}) => {
        setMessages((messages) => [
          ...messages,
          {
            isSystem: true,
            text: `${match[from].user.username} has resigned!`,
          },
        ]);
      });

      socket.on(
        clientEvents.MESSAGE,
        ({sender, text}: {sender: User; text: string}) => {
          if (sender.id === credentials.id) return;

          setMessages((messages) => [
            ...messages,
            {
              text: `${sender.username}: ${text}`,
              isSystem: false,
            },
          ]);
        }
      );

      setCgApi(api);
    },
    [match]
  );

  React.useEffect(() => {
    setIsInQueue(false);
    setMessages([]);
    setIsDrawOfferValid(false);
    setResult(null);
    setHasOfferedDraw(false);
    setText("");
    setClock((clock) => ({
      ...clock,
      white: match.white.clock,
      black: match.black.clock,
    }));
  }, [match]);

  React.useEffect(() => {
    dispatch(matchesActions.spectateMatch({matchId: match.id}));
  }, [match]);

  React.useEffect(() => {
    clock.interval && clearInterval(clock.interval);

    const interval = setInterval(() => {
      setClock((clock) => ({
        ...clock,
        [turn]: Math.max(clock[turn] - 1000, 0),
      }));
    }, 1000);

    setClock((clock) => ({...clock, interval}));
  }, [turn, match]);

  React.useEffect(() => {
    if (!result) return;

    clock.interval && clearInterval(clock.interval);
  }, [result]);

  const isActualPosition =
    !(history.length !== 0) || history[history.length - 1].startsWith(position);
  const isFirstPosition = INITIAL_FEN.startsWith(position);

  const handlePrevMoveClick = () => {
    if (!cgApi || isFirstPosition) return;

    const idx = history.findIndex((fen) => fen.startsWith(cgApi.getFen()));
    const fen = history[idx - 1] || INITIAL_FEN;

    setPosition(fen);

    cgApi.set({
      fen,
      movable: {
        color: undefined,
      },
    });
  };

  const handleDrawOfferClick = () => {
    if (!isAbleToOfferDraw) return;

    dispatch(
      matchesActions.offerDraw({
        matchId: match.id,
      })
    );

    setHasOfferedDraw(true);

    setMessages([
      ...messages,
      {
        text: "You've offered a draw",
        isSystem: true,
      },
    ]);
  };

  const handleMessageInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setText(event.currentTarget.value);
  };

  const handleMessagesFormSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    dispatch(
      matchesActions.sendMessage({
        matchId: match.id,
        text,
      })
    );

    setMessages([
      ...messages,
      {
        isSystem: false,
        text: `${credentials.username}: ${text}`,
      },
    ]);

    setText("");
  };

  const handleNextMoveClick = () => {
    if (!cgApi || isActualPosition) return;

    const position = cgApi.getFen();

    const idx = history.findIndex((fen) => fen.startsWith(position));
    const fen = history[Math.min(history.length - 1, idx + 1)];

    const isActual = history.length - 2 === idx;

    setPosition(fen);

    cgApi.set({
      fen,
      movable: {
        color: (isActual && !!player && player.side) || undefined,
      },
    });
  };

  const handleResignClick = () => {
    dispatch(
      matchesActions.resign({
        matchId: match.id,
      })
    );

    setMessages([
      ...messages,
      {
        isSystem: true,
        text: "You've been resigned",
      },
    ]);
  };

  const handleDrawOfferDeclineClick = () => {
    setIsDrawOfferValid(false);

    dispatch(matchesActions.declineDraw({matchId: match.id}));

    setMessages([
      ...messages,
      {
        isSystem: true,
        text: "You've declined a draw offer",
      },
    ]);
  };

  const handleDrawOfferAcceptClick = () => {
    setIsDrawOfferValid(false);

    dispatch(matchesActions.acceptDraw({matchId: match.id}));

    setMessages([
      ...messages,
      {
        isSystem: true,
        text: "You've accepted a draw offer",
      },
    ]);
  };

  const handleJoinQueueClick = () => {
    dispatch(matchmakingActions.joinQueue(match.control));
    dispatch(
      matchmakingActions.setQueuedControl({
        control: {
          time: match.control.time / 60 / 1000,
          delay: match.control.delay / 1000,
          increment: match.control.increment / 1000,
        },
      })
    );

    navigate("/");
  };

  const top = isReversed ? white : black;
  const bottom = isReversed ? black : white;

  return (
    <ContentTemplate>
      <Container maxW="full" h="full">
        <Center w="full" h="full">
          <HStack w="full" h="95vh" justifyContent="center" spacing={10}>
            <Flex
              w={400}
              h="full"
              flexDirection="column"
              justifyContent="space-between"
            >
              <Flex
                w="full"
                h="45%"
                flexDirection="column"
                bg="primary"
                borderRadius="lg"
              >
                <HStack w="full" py={3} px={4} spacing={5}>
                  <Icon
                    w="30px"
                    h="30px"
                    color="icon.primary"
                    as={MdOutlineTopic}
                  />
                  <Text fontSize="xl" color="text.secondary" isTruncated>
                    Opening
                  </Text>
                </HStack>

                <Flex
                  w="full"
                  flexDirection="column"
                  overflowY="scroll"
                  sx={{
                    scrollbarWidth: "0",
                    "::-webkit-scrollbar": {
                      width: "0",
                      height: "0",
                    },
                  }}
                >
                  {moves.map((moves, idx) => (
                    <HStack
                      key={idx}
                      alignItems="center"
                      bg={idx % 2 === 0 ? "tertiary" : "transparent"}
                      py={2}
                      px={4}
                      spacing={12}
                    >
                      <Text color="text.secondary" fontSize="lg">
                        {idx + 1}.
                      </Text>

                      <HStack alignItems="center" spacing={16}>
                        <Text
                          w="60px"
                          textAlign="center"
                          color="text.secondary"
                          fontSize="lg"
                        >
                          {moves[0]}
                        </Text>
                        {moves[1] && (
                          <Text
                            w="60px"
                            textAlign="center"
                            color="text.secondary"
                            fontSize="lg"
                          >
                            {moves[1]}
                          </Text>
                        )}
                      </HStack>
                    </HStack>
                  ))}
                </Flex>
              </Flex>

              {!!result && !!player ? (
                <VStack w="full" alignItems="flex-start" my={8}>
                  <Button
                    isLoading={isInQueue}
                    onClick={handleJoinQueueClick}
                    w="full"
                    textTransform="uppercase"
                    color="text.secondary"
                    bg="primary"
                    disabled={false}
                    transitionDuration="0.2s"
                    transitionTimingFunction="linear"
                    transitionProperty="background"
                    py={10}
                    _hover={{
                      bg: "primary",
                    }}
                    _active={{
                      bg: "primary",
                    }}
                  >
                    Find new opponent
                  </Button>
                </VStack>
              ) : (
                <Flex
                  w="full"
                  flexDirection="row"
                  justifyContent="center"
                  alignItems="center"
                >
                  <HStack spacing={7}>
                    <Icon
                      onClick={handlePrevMoveClick}
                      w="35px"
                      h="35px"
                      fill={isFirstPosition ? "icon.disabled" : "icon.primary"}
                      cursor={isFirstPosition ? "default" : "pointer"}
                      as={MdFastRewind}
                      transitionDuration="0.2s"
                      transitionTimingFunction="linear"
                      transitionProperty="fill"
                      _hover={{
                        fill: isFirstPosition ? "icon.disabled" : "icon.active",
                      }}
                    />
                    {player && (
                      <>
                        <Text
                          onClick={handleDrawOfferClick}
                          fontSize="4xl"
                          cursor={isAbleToOfferDraw ? "pointer" : "default"}
                          color={
                            isAbleToOfferDraw ? "icon.primary" : "icon.disabled"
                          }
                          transitionDuration="0.2s"
                          transitionTimingFunction="linear"
                          transitionProperty="color"
                          _hover={{
                            color: isAbleToOfferDraw
                              ? "icon.active"
                              : "icon.disabled",
                          }}
                        >
                          ½
                        </Text>

                        <Icon
                          onClick={handleResignClick}
                          w="35px"
                          h="35px"
                          fill="icon.primary"
                          cursor="pointer"
                          as={MdFlag}
                          transitionDuration="0.2s"
                          transitionTimingFunction="linear"
                          transitionProperty="fill"
                          _hover={{
                            fill: "icon.active",
                          }}
                        />
                      </>
                    )}
                    <Icon
                      onClick={handleNextMoveClick}
                      w="35px"
                      h="35px"
                      fill={isActualPosition ? "icon.disabled" : "icon.primary"}
                      cursor={isActualPosition ? "default" : "pointer"}
                      as={MdFastForward}
                      transitionDuration="0.2s"
                      transitionTimingFunction="linear"
                      transitionProperty="fill"
                      _hover={{
                        fill: isActualPosition
                          ? "icon.disabled"
                          : "icon.active",
                      }}
                    />
                  </HStack>
                </Flex>
              )}

              <Flex w="full" h="45%" flexDirection="column">
                {isDrawOfferValid && !result ? (
                  <Flex
                    w="full"
                    flexDirection="row"
                    justifyContent="center"
                    mb={6}
                  >
                    <Flex
                      onClick={handleDrawOfferDeclineClick}
                      justifyContent="center"
                      alignItems="center"
                      borderWidth={3}
                      borderColor="primary"
                      cursor="pointer"
                      transitionDuration="0.2s"
                      transitionProperty="background, border-color"
                      transitionTimingFunction="linear"
                      role="group"
                      p={4}
                      _hover={{
                        borderColor: "error",
                        bg: "error",
                      }}
                    >
                      <Icon
                        w="25px"
                        h="25px"
                        fill="error"
                        as={MdClear}
                        _groupHover={{
                          fill: "text.primary",
                        }}
                      />
                    </Flex>
                    <Flex
                      justifyContent="center"
                      alignItems="center"
                      bg="primary"
                      px={6}
                    >
                      <Text color="text.primary">
                        You opponent offers a draw
                      </Text>
                    </Flex>
                    <Flex
                      onClick={handleDrawOfferAcceptClick}
                      justifyContent="center"
                      alignItems="center"
                      borderWidth={3}
                      borderColor="primary"
                      cursor="pointer"
                      transitionDuration="0.2s"
                      transitionProperty="background, border-color"
                      transitionTimingFunction="linear"
                      role="group"
                      p={4}
                      _hover={{
                        borderColor: "success",
                        bg: "success",
                      }}
                    >
                      <Icon
                        w="25px"
                        h="25px"
                        fill="success"
                        as={MdCheck}
                        _groupHover={{
                          fill: "text.primary",
                        }}
                      />
                    </Flex>
                  </Flex>
                ) : null}

                <Flex
                  w="full"
                  flexDirection="column"
                  justifyContent="space-between"
                  bg="primary"
                  borderRadius="lg"
                >
                  <VStack
                    w="full"
                    h="250px"
                    alignItems="flex-start"
                    spacing={4}
                    py={4}
                    px={4}
                  >
                    <VStack w="full" alignItems="flex-start" spacing={0}>
                      <Text
                        color="text.primary"
                        fontSize="md"
                        textTransform="uppercase"
                      >
                        New Match
                      </Text>

                      <Text
                        color="text.secondary"
                        fontWeight="normal"
                        fontSize="sm"
                      >
                        {white.user.username} ({white.rating}) vs.{" "}
                        {black.user.username} ({black.rating}) (
                        {Math.floor(match.control.time / 60 / 1000)} min)
                      </Text>
                    </VStack>

                    <VStack
                      w="full"
                      alignItems="flex-start"
                      spacing={1}
                      overflowY="scroll"
                      sx={{
                        scrollbarWidth: "0",
                        "::-webkit-scrollbar": {
                          width: "0",
                          height: "0",
                        },
                      }}
                    >
                      {messages.map(({text, isSystem}, idx) => (
                        <Text
                          key={idx}
                          color={isSystem ? "text.primary" : "text.secondary"}
                          fontWeight={isSystem ? "medium" : "normal"}
                          fontSize="sm"
                        >
                          {text}
                        </Text>
                      ))}
                    </VStack>
                  </VStack>

                  <Box w="full" borderTopColor="tertiary" borderTopWidth={2}>
                    <form onSubmit={handleMessagesFormSubmit}>
                      <Input
                        onChange={handleMessageInputChange}
                        value={text}
                        w="full"
                        variant="unstyled"
                        color="text.secondary"
                        _placeholder={{
                          color: "text.secondary",
                        }}
                        placeholder="Be nice in the chat!"
                        px={4}
                        py={2}
                      />
                    </form>
                  </Box>
                </Flex>
              </Flex>
            </Flex>

            <Box w="95vh" h="95vh" ref={groundRef} />

            <VStack
              w={400}
              h="full"
              flexDirection="column"
              justifyContent="center"
              alignItems="flex-start"
              spacing={5}
            >
              <Flex
                w="250px"
                bg={turn === top.side && !result ? "primary" : "secondary"}
                alignItems="center"
                justifyContent="space-between"
                borderRadius="lg"
                py={4}
                px={6}
              >
                {turn === top.side && !result ? (
                  <Icon
                    w="40px"
                    h="40px"
                    fill="feature"
                    as={MdOutlineWatchLater}
                  />
                ) : (
                  <div />
                )}
                <Text
                  color={
                    turn === top.side && !result
                      ? "text.primary"
                      : "text.tertiary"
                  }
                  fontSize="4xl"
                >
                  {dayjs.duration(clock[top.side]).format(format)}
                </Text>
              </Flex>

              <Flex
                w="full"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <HStack alignItems="center" spacing={3}>
                  <Avatar
                    src="https://bit.ly/3HgzhZf"
                    sx={{
                      borderRadius: 0,
                      ".chakra-avatar__img": {
                        borderRadius: 0,
                      },
                    }}
                  />
                  <Text>
                    {top.user.username} ({top.rating})
                  </Text>

                  {result && (
                    <Text
                      color={
                        result[top.side].result === "victory"
                          ? "success"
                          : result[top.side].result === "lose"
                          ? "error"
                          : "secondary"
                      }
                    >
                      {result[top.side].shift > 0 && "+"}
                      {result[top.side].shift}
                    </Text>
                  )}
                </HStack>

                {result && (
                  <Text color="text.primary" fontSize="5xl">
                    {result[top.side].result === "victory"
                      ? 1
                      : result[top.side].result === "lose"
                      ? 0
                      : result[top.side].result === "draw"
                      ? 0.5
                      : null}
                  </Text>
                )}
              </Flex>

              <Divider borderWidth={2} borderColor="feature" />

              <Flex
                w="full"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <HStack alignItems="center" spacing={3}>
                  <Avatar
                    src="https://bit.ly/3HgzhZf"
                    sx={{
                      borderRadius: 0,
                      ".chakra-avatar__img": {
                        borderRadius: 0,
                      },
                    }}
                  />
                  <Text>
                    {bottom.user.username} ({bottom.rating})
                  </Text>

                  {result && (
                    <Text
                      color={
                        result[bottom.side].result === "victory"
                          ? "success"
                          : result[bottom.side].result === "lose"
                          ? "error"
                          : "secondary"
                      }
                    >
                      {result[bottom.side].shift > 0 && "+"}
                      {result[bottom.side].shift}
                    </Text>
                  )}
                </HStack>

                {result && (
                  <Text color="text.primary" fontSize="5xl">
                    {result[bottom.side].result === "victory"
                      ? 1
                      : result[bottom.side].result === "lose"
                      ? 0
                      : result[bottom.side].result === "draw"
                      ? 0.5
                      : null}
                  </Text>
                )}
              </Flex>

              <Flex
                w="250px"
                bg={turn === bottom.side && !result ? "primary" : "secondary"}
                alignItems="center"
                justifyContent="space-between"
                borderRadius="lg"
                py={4}
                px={6}
              >
                {turn === bottom.side && !result ? (
                  <Icon
                    w="40px"
                    h="40px"
                    fill="feature"
                    as={MdOutlineWatchLater}
                  />
                ) : (
                  <div />
                )}
                <Text
                  color={
                    turn === bottom.side && !result
                      ? "text.primary"
                      : "text.tertiary"
                  }
                  fontSize="3xl"
                >
                  {dayjs.duration(clock[bottom.side]).format(format)}
                </Text>
              </Flex>
            </VStack>
          </HStack>
        </Center>
      </Container>
    </ContentTemplate>
  );
};

interface HistoryState {
  fen: string;
  clock: number;
}

const FinishedMatch: React.FC = () => {
  const match = useSelector(matchesSelectors.match) as CompletedMatch;

  const [cgApi, setCgApi] = React.useState<Api | null>(null);

  const [moves, setMoves] = React.useState<string[][]>([]);
  const [history, setHistory] = React.useState<HistoryState[]>([]);
  const [turn, setTurn] = React.useState<MatchSide>("white");

  const [clock, setClock] = React.useState<MatchClock>({
    white: match.control.time,
    black: match.control.time,
  });

  const {white, black} = match;

  const isFinitePosition =
    !(history.length !== 0) ||
    (cgApi && history[history.length - 1].fen.startsWith(cgApi.getFen()));

  const isFirstPosition =
    !(history.length !== 0) ||
    (cgApi && INITIAL_FEN.startsWith(cgApi.getFen()));

  const format = match.type === "classical" ? "H:mm:ss" : "mm:ss";

  const groundRef = React.useCallback(
    (node) => {
      if (!node) return;

      const engine = new Chess();

      match.pgn && engine.load_pgn(match.pgn);

      const moves = () => {
        const history = engine.history();

        return history.reduce<string[][]>(
          (prev, current, idx) =>
            idx % 2 === 0 ? [...prev, history.slice(idx, idx + 2)] : prev,
          []
        );
      };

      const history = () =>
        engine.get_comments().map(({fen, comment}) => ({
          fen,
          clock: Number(comment.split("clock:")[1]),
        }));

      setHistory(history());
      setMoves(moves());

      const api = Chessground(node, {
        fen: INITIAL_FEN,
        viewOnly: false,
        coordinates: false,
        orientation: "white",
        check: false,
        movable: {
          free: false,
          color: undefined,
        },
      });

      setCgApi(api);
    },
    [match]
  );

  const handlePrevMoveClick = () => {
    if (!cgApi || isFirstPosition) return;

    const position = cgApi.getFen();

    const idx = history.findIndex(({fen}) => fen.startsWith(position));

    const hist = history[idx - 1] || {
      fen: INITIAL_FEN,
      clock: match.control.time,
    };

    const engine = new Chess(hist.fen);

    const turn = () => (engine.turn() === "w" ? "white" : "black");

    const current: MatchSide = turn();
    const opposite: MatchSide = turn() === "white" ? "black" : "white";

    const time = history[idx - 2] && history[idx - 2].clock;

    setClock({
      ...clock,
      [opposite]: hist.clock,
      [current]: time || match.control.time,
    });

    setTurn(current);

    cgApi.set({
      fen: hist.fen,
      viewOnly: false,
      check: engine.in_check(),
      movable: {
        free: false,
        color: undefined,
      },
    });
  };

  const handleNextMoveClick = () => {
    if (!cgApi || isFinitePosition) return;

    const position = cgApi.getFen();

    const idx = history.findIndex(({fen}) => fen.startsWith(position));
    const hist = history[Math.min(history.length - 1, idx + 1)];

    const engine = new Chess(hist.fen);

    const turn = () => (engine.turn() === "w" ? "white" : "black");

    const current = turn();
    const opposite = turn() === "white" ? "black" : "white";

    setClock({...clock, [opposite]: hist.clock});
    setTurn(current);

    cgApi.set({
      fen: hist.fen,
      viewOnly: false,
      check: engine.in_check(),
      movable: {
        free: false,
        color: undefined,
      },
    });
  };

  const top = match.black;
  const bottom = match.white;

  return (
    <ContentTemplate>
      <Container maxW="full" h="full">
        <Center w="full" h="full">
          <HStack w="full" h="95vh" justifyContent="center" spacing={10}>
            <Flex
              w={400}
              h="full"
              flexDirection="column"
              justifyContent="space-between"
            >
              <Flex
                w="full"
                h="45%"
                flexDirection="column"
                bg="primary"
                borderRadius="lg"
              >
                <HStack w="full" py={3} px={4} spacing={5}>
                  <Icon
                    w="30px"
                    h="30px"
                    color="icon.primary"
                    as={MdOutlineTopic}
                  />
                  <Text fontSize="xl" color="text.secondary" isTruncated>
                    Opening
                  </Text>
                </HStack>

                <Flex
                  w="full"
                  flexDirection="column"
                  overflowY="scroll"
                  sx={{
                    scrollbarWidth: "0",
                    "::-webkit-scrollbar": {
                      width: "0",
                      height: "0",
                    },
                  }}
                >
                  {moves.map((moves, idx) => (
                    <HStack
                      key={idx}
                      alignItems="center"
                      bg={idx % 2 === 0 ? "tertiary" : "transparent"}
                      py={2}
                      px={4}
                      spacing={12}
                    >
                      <Text color="text.secondary" fontSize="lg">
                        {idx + 1}.
                      </Text>

                      <HStack alignItems="center" spacing={16}>
                        <Text
                          w="60px"
                          textAlign="center"
                          color="text.secondary"
                          fontSize="lg"
                        >
                          {moves[0]}
                        </Text>
                        {moves[1] && (
                          <Text
                            w="60px"
                            textAlign="center"
                            color="text.secondary"
                            fontSize="lg"
                          >
                            {moves[1]}
                          </Text>
                        )}
                      </HStack>
                    </HStack>
                  ))}
                </Flex>
              </Flex>

              <Flex
                w="full"
                flexDirection="row"
                justifyContent="center"
                alignItems="center"
              >
                <HStack spacing={7}>
                  <Icon
                    onClick={handlePrevMoveClick}
                    w="35px"
                    h="35px"
                    fill={isFirstPosition ? "icon.disabled" : "icon.primary"}
                    cursor={isFirstPosition ? "default" : "pointer"}
                    as={MdFastRewind}
                    transitionDuration="0.2s"
                    transitionTimingFunction="linear"
                    transitionProperty="fill"
                    _hover={{
                      fill: isFirstPosition ? "icon.disabled" : "icon.active",
                    }}
                  />

                  <Icon
                    onClick={handleNextMoveClick}
                    w="35px"
                    h="35px"
                    fill={isFinitePosition ? "icon.disabled" : "icon.primary"}
                    cursor={isFinitePosition ? "default" : "pointer"}
                    as={MdFastForward}
                    transitionDuration="0.2s"
                    transitionTimingFunction="linear"
                    transitionProperty="fill"
                    _hover={{
                      fill: isFinitePosition ? "icon.disabled" : "icon.active",
                    }}
                  />
                </HStack>
              </Flex>

              <Flex w="full" h="45%" flexDirection="column">
                <Flex
                  w="full"
                  flexDirection="column"
                  justifyContent="space-between"
                  bg="primary"
                  borderRadius="lg"
                >
                  <VStack
                    w="full"
                    h="250px"
                    alignItems="flex-start"
                    spacing={4}
                    py={4}
                    px={4}
                  >
                    <VStack w="full" alignItems="flex-start" spacing={0}>
                      <Text
                        color="text.primary"
                        fontSize="md"
                        textTransform="uppercase"
                      >
                        New Match
                      </Text>

                      <Text
                        color="text.secondary"
                        fontWeight="normal"
                        fontSize="sm"
                      >
                        {white.user.username} ({white.rating}) vs.{" "}
                        {black.user.username} ({black.rating}) (
                        {Math.floor(match.control.time / 60 / 1000)} min)
                      </Text>
                    </VStack>

                    <VStack
                      w="full"
                      alignItems="flex-start"
                      spacing={1}
                      overflowY="scroll"
                      sx={{
                        scrollbarWidth: "0",
                        "::-webkit-scrollbar": {
                          width: "0",
                          height: "0",
                        },
                      }}
                    />
                  </VStack>
                </Flex>
              </Flex>
            </Flex>

            <Box w="95vh" h="95vh" ref={groundRef} />

            <VStack
              w={400}
              h="full"
              flexDirection="column"
              justifyContent="center"
              alignItems="flex-start"
              spacing={5}
            >
              <Flex
                w="250px"
                bg={turn === top.side ? "primary" : "secondary"}
                alignItems="center"
                justifyContent="space-between"
                borderRadius="lg"
                py={4}
                px={6}
              >
                {turn === top.side ? (
                  <Icon
                    w="40px"
                    h="40px"
                    fill="feature"
                    as={MdOutlineWatchLater}
                  />
                ) : (
                  <div />
                )}
                <Text
                  color={turn === top.side ? "text.primary" : "text.tertiary"}
                  fontSize="4xl"
                >
                  {dayjs.duration(clock[top.side]).format(format)}
                </Text>
              </Flex>

              <Flex
                w="full"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <HStack alignItems="center" spacing={3}>
                  <Avatar
                    src="https://bit.ly/3HgzhZf"
                    sx={{
                      borderRadius: 0,
                      ".chakra-avatar__img": {
                        borderRadius: 0,
                      },
                    }}
                  />
                  <Text>
                    {top.user.username} ({top.rating})
                  </Text>

                  <Text
                    color={
                      top.result === "victory"
                        ? "success"
                        : top.result === "lose"
                        ? "error"
                        : "secondary"
                    }
                  >
                    {top.shift > 0 && "+"}
                    {top.shift}
                  </Text>
                </HStack>

                <Text color="text.primary" fontSize="5xl">
                  {top.result === "victory"
                    ? 1
                    : top.result === "lose"
                    ? 0
                    : top.result === "draw"
                    ? 0.5
                    : null}
                </Text>
              </Flex>

              <Divider borderWidth={2} borderColor="feature" />

              <Flex
                w="full"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <HStack alignItems="center" spacing={3}>
                  <Avatar
                    src="https://bit.ly/3HgzhZf"
                    sx={{
                      borderRadius: 0,
                      ".chakra-avatar__img": {
                        borderRadius: 0,
                      },
                    }}
                  />
                  <Text>
                    {bottom.user.username} ({bottom.rating})
                  </Text>

                  <Text
                    color={
                      bottom.result === "victory"
                        ? "success"
                        : bottom.result === "lose"
                        ? "error"
                        : "secondary"
                    }
                  >
                    {bottom.shift > 0 && "+"}
                    {bottom.shift}
                  </Text>
                </HStack>

                <Text color="text.primary" fontSize="5xl">
                  {bottom.result === "victory"
                    ? 1
                    : bottom.result === "lose"
                    ? 0
                    : bottom.result === "draw"
                    ? 0.5
                    : null}
                </Text>
              </Flex>

              <Flex
                w="250px"
                bg={turn === bottom.side ? "primary" : "secondary"}
                alignItems="center"
                justifyContent="space-between"
                borderRadius="lg"
                py={4}
                px={6}
              >
                {turn === bottom.side ? (
                  <Icon
                    w="40px"
                    h="40px"
                    fill="feature"
                    as={MdOutlineWatchLater}
                  />
                ) : (
                  <div />
                )}
                <Text
                  color={
                    turn === bottom.side ? "text.primary" : "text.tertiary"
                  }
                  fontSize="3xl"
                >
                  {dayjs.duration(clock[bottom.side]).format(format)}
                </Text>
              </Flex>
            </VStack>
          </HStack>
        </Center>
      </Container>
    </ContentTemplate>
  );
};
