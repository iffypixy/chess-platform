import * as React from "react";
import {
  Center,
  Container,
  HStack,
  VStack,
  Text,
  Heading,
  Flex,
  Box,
} from "@chakra-ui/react";
import Avatar from "boring-avatars";
import {useParams, Link} from "react-router-dom";
import {useSelector} from "react-redux";

import {usersActions, usersSelectors} from "@features/users";
import {ContentTemplate} from "@shared/ui/templates";
import {useDispatch} from "@shared/lib/store";
import {Chessground} from "chessground";
import {CompletedMatch} from "@shared/api/matches";
import {matchesActions} from "@features/matches";

interface UserPageParams {
  username: string;
}

export const UserPage: React.FC = () => {
  const dispatch = useDispatch();

  const {username} = useParams() as UserPageParams;

  React.useEffect(() => {
    dispatch(usersActions.fetchUser({username}));
    dispatch(usersActions.fetchMatches({username}));
  }, [username]);

  const user = useSelector(usersSelectors.user);
  const matches = useSelector(usersSelectors.matches);

  const isMatchesFetchPending = useSelector(
    usersSelectors.isMatchesFetchPending
  );
  const isPending = useSelector(usersSelectors.isUserFetchPending);

  if (isPending)
    return (
      <Center w="full" h="100vh">
        <Heading>Wait a bit :)</Heading>
      </Center>
    );

  if (!user) return null;

  return (
    <ContentTemplate>
      <Container
        maxW="container.lg"
        h="full"
        centerContent
        pt={["120px", null, null, "120px"]}
      >
        <Flex
          w="100%"
          alignItems={["align-items", null, null, "flex-start"]}
          flexDirection={["column", null, null, "row"]}
        >
          <VStack
            spacing={3}
            alignItems="flex-start"
            mb={[8, null, null, 0]}
            mr={[0, null, null, 10]}
          >
            <HStack
              w="full"
              justifyContent="space-between"
              bg="primary"
              borderRadius="md"
              alignItems="center"
              spacing={5}
              p={6}
            >
              <Text fontSize="lg" textTransform="uppercase">
                Bullet
              </Text>
              <Text fontSize="lg" color="text.primary" fontWeight="bold">
                {user.bullet.rating}
              </Text>
            </HStack>

            <HStack
              w="full"
              justifyContent="space-between"
              bg="primary"
              borderRadius="md"
              alignItems="center"
              spacing={5}
              p={6}
            >
              <Text fontSize="lg" textTransform="uppercase">
                Blitz
              </Text>
              <Text fontSize="lg" color="text.primary" fontWeight="bold">
                {user.blitz.rating}
              </Text>
            </HStack>

            <HStack
              w="full"
              justifyContent="space-between"
              bg="primary"
              borderRadius="md"
              alignItems="center"
              spacing={5}
              p={6}
            >
              <Text fontSize="lg" textTransform="uppercase">
                Rapid
              </Text>
              <Text fontSize="lg" color="text.primary" fontWeight="bold">
                {user.rapid.rating}
              </Text>
            </HStack>

            <HStack
              w="full"
              justifyContent="space-between"
              bg="primary"
              borderRadius="md"
              alignItems="center"
              spacing={5}
              p={6}
            >
              <Text fontSize="lg" textTransform="uppercase">
                Classical
              </Text>
              <Text fontSize="lg" color="text.primary" fontWeight="bold">
                {user.classical.rating}
              </Text>
            </HStack>
          </VStack>

          <VStack
            w="100%"
            alignItems={["center", null, null, "flex-start"]}
            spacing={8}
          >
            <HStack alignItems="center" spacing={4}>
              <Avatar
                colors={["#EBE5B2", "#F6F3C2", "#F7C69F", "#F89B7E", "#B5A28B"]}
                size={80}
                variant="beam"
                name={user.username}
                square={true}
              />

              <Text
                color="text.primary"
                fontSize="2xl"
                textTransform="uppercase"
              >
                {user.username}
              </Text>
            </HStack>

            <VStack w={["full", null, null, "auto"]}>
              {isMatchesFetchPending && <Heading>Wait a bit :)</Heading>}

              {!isMatchesFetchPending && !matches && (
                <Heading>No matches :(</Heading>
              )}

              {matches &&
                matches.map((match, idx) => (
                  <MatchItem key={idx} match={match} />
                ))}
            </VStack>
          </VStack>
        </Flex>
      </Container>
    </ContentTemplate>
  );
};

interface MatchItemProps {
  match: CompletedMatch;
}

const MatchItem: React.FC<MatchItemProps> = ({match}) => {
  const dispatch = useDispatch();

  const ref = React.useCallback((node) => {
    if (!node) return;

    Chessground(node, {
      fen: match.fen,
      coordinates: false,
      viewOnly: true,
    });
  }, []);

  return (
    <Link
      style={{width: "100%"}}
      to={`/match/${match.sid}`}
      onClick={() =>
        dispatch(
          matchesActions.setMatch({match: {...match, isCompleted: true}})
        )
      }
    >
      <HStack
        bg="primary"
        spacing={[2, 4, 6, 8]}
        borderRadius="md"
        p={[2, 4, 6]}
      >
        <Box minW={["125px", "200px"]} minH={["125px", "200px"]} ref={ref} />

        <VStack
          w="full"
          alignItems="center"
          justifyContent="space-between"
          p={[2, 4, 6]}
          spacing={[2, 4, 6]}
        >
          <Text fontSize={["xs", "lg"]} textTransform="uppercase">
            {match.control.time / 60 / 1000}|{match.control.increment} •{" "}
            {match.type}
          </Text>

          <VStack spacing={0}>
            <HStack alignItems="center" spacing={4}>
              <Text fontSize={["xs", "lg"]} textTransform="uppercase">
                white:
              </Text>
              <Text fontSize={["xs", "lg"]} color="text.primary">
                {match.white.user.username} ({match.white.rating})
              </Text>
            </HStack>

            <HStack alignItems="center" spacing={4}>
              <Text fontSize={["xs", "lg"]} textTransform="uppercase">
                black:
              </Text>
              <Text fontSize={["xs", "lg"]} color="text.primary">
                {match.black.user.username} ({match.black.rating})
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </HStack>
    </Link>
  );
};
