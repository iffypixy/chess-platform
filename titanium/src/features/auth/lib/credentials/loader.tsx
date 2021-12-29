import * as React from "react";
import {useSelector} from "react-redux";
import {Center, Heading} from "@chakra-ui/react";

import {useDispatch} from "@shared/lib/store";
import * as actions from "@features/auth/actions";
import * as selectors from "@features/auth/selectors";

interface CredentialsLoaderProps {
  children: React.ReactElement;
}

export const CredentialsLoader: React.FC<CredentialsLoaderProps> = ({
  children,
}) => {
  const dispatch = useDispatch();

  const isFetching = useSelector(selectors.isCredentialsFetchPending);
  const isAuthenticated = useSelector(selectors.isAuthenticated);

  React.useEffect(() => {
    if (!isAuthenticated) dispatch(actions.fetchCredentials());
  }, []);

  if (isFetching)
    return (
      <Center w="full" h="100vh">
        <Heading>Wait a bit :)</Heading>
      </Center>
    );

  return children;
};
