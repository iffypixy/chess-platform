import * as React from "react";
import {
  VStack,
  Center,
  Input,
  Text,
  Button,
  Heading,
  HStack,
} from "@chakra-ui/react";
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
} from "@chakra-ui/form-control";
import {Link} from "react-router-dom";
import {useForm} from "react-hook-form";
import * as yup from "yup";
import {yupResolver} from "@hookform/resolvers/yup";

import {authActions} from "@features/auth";
import {useDispatch} from "@shared/lib/store";
import {MainTemplate} from "@shared/ui/templates";

const schema = yup.object().shape({
  username: yup.string().required("Username is required"),
  password: yup.string().required("Password is required"),
});

interface LoginForm {
  username: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const dispatch = useDispatch();

  const {
    handleSubmit,
    formState: {isSubmitting, errors},
    register,
  } = useForm<LoginForm>({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginForm) => {
    await dispatch(authActions.login(values));
  };

  return (
    <MainTemplate>
      <Center w="full" h="100vh">
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack w={[300, 400]} spacing={8}>
            <Heading color="text.secondary" fontSize="3xl" fontWeight="bold">
              Sign in
            </Heading>

            <VStack w="full" spacing={4}>
              <FormControl id="username" isInvalid={!!errors.username}>
                <FormLabel
                  htmlFor="username"
                  color="text.secondary"
                  fontSize="sm"
                >
                  Username
                </FormLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="alex123"
                  bg="primary"
                  color="text.secondary"
                  border="none"
                  _placeholder={{
                    color: "text.secondary",
                  }}
                  {...register("username", {
                    required: true,
                  })}
                />
                {errors.username && (
                  <FormErrorMessage fontSize="xs">
                    {errors.username.message}
                  </FormErrorMessage>
                )}
              </FormControl>

              <FormControl id="password" isInvalid={!!errors.password}>
                <FormLabel
                  htmlFor="password"
                  color="text.secondary"
                  fontSize="sm"
                >
                  Password
                </FormLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="x x x x x x"
                  bg="primary"
                  color="text.secondary"
                  border="none"
                  _placeholder={{
                    color: "text.secondary",
                  }}
                  {...register("password", {
                    required: true,
                  })}
                />
                {errors.password && (
                  <FormErrorMessage fontSize="xs">
                    {errors.password.message}
                  </FormErrorMessage>
                )}
              </FormControl>
            </VStack>

            <HStack
              w="full"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Text color="text.secondary" fontSize="sm">
                <Link to="/register">Have not an account yet?</Link>
              </Text>
              <Button
                type="submit"
                isLoading={isSubmitting}
                w="120px"
                bg="primary"
                color="text.secondary"
                _hover={{bg: "primary"}}
                _active={{bg: "primary"}}
              >
                Login
              </Button>
            </HStack>
          </VStack>
        </form>
      </Center>
    </MainTemplate>
  );
};
