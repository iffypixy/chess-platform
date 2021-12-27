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
import {unwrapResult} from "@reduxjs/toolkit";
import {useSelector} from "react-redux";

import {authActions, authSelectors} from "@features/auth";
import {regex} from "@shared/lib/regex";
import {useDispatch} from "@shared/lib/store";
import {MainTemplate} from "@shared/ui/templates";

const schema = yup.object().shape({
  username: yup
    .string()
    .required("Username is required")
    .matches(
      regex.alphaNumeric,
      "Username must contain only numbers and letters"
    )
    .min(3, "Username must contain at least 4 characters"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must contain at least 8 characters"),
});

interface RegisterForm {
  username: string;
  password: string;
}

export const RegisterPage: React.FC = () => {
  const dispatch = useDispatch();

  const isPending = useSelector(authSelectors.isRegisterPending);

  const [errors, setErrors] = React.useState([]);

  const {handleSubmit, formState, register} = useForm<RegisterForm>({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterForm) => {
    dispatch(authActions.register(values)).then(unwrapResult).catch(setErrors);
  };

  return (
    <MainTemplate>
      <Center w="full" h="100vh">
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack w={[300, 400]} spacing={8}>
            <Heading color="text.secondary" fontSize="3xl" fontWeight="bold">
              Sign up
            </Heading>

            <VStack w="full" spacing={4}>
              {errors.length > 0 && (
                <VStack w="full" alignItems="flex-start">
                  {errors.map((error, idx) => (
                    <Text key={idx} fontSize="sm" color="error">
                      {error}
                    </Text>
                  ))}
                </VStack>
              )}

              <FormControl
                id="username"
                isInvalid={!!formState.errors.username}
              >
                <FormLabel
                  htmlFor="username"
                  color="text.secondary"
                  fontSize="sm"
                >
                  Username
                </FormLabel>
                <Input
                  id="username"
                  color="text.secondary"
                  type="text"
                  placeholder="alex123"
                  bg="primary"
                  border="none"
                  _placeholder={{
                    color: "text.secondary",
                  }}
                  {...register("username", {
                    required: "Username is required",
                  })}
                />
                {formState.errors.username && (
                  <FormErrorMessage fontSize="xs">
                    {formState.errors.username.message}
                  </FormErrorMessage>
                )}
              </FormControl>

              <FormControl
                id="password"
                isInvalid={!!formState.errors.password}
              >
                <FormLabel
                  htmlFor="password"
                  color="text.secondary"
                  fontSize="sm"
                >
                  Password
                </FormLabel>
                <Input
                  color="text.secondary"
                  id="password"
                  type="password"
                  placeholder="x x x x x x"
                  bg="primary"
                  border="none"
                  _placeholder={{
                    color: "text.secondary",
                  }}
                  {...register("password", {
                    required: "Password is required",
                  })}
                />
                {formState.errors.password && (
                  <FormErrorMessage fontSize="xs">
                    {formState.errors.password.message}
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
                <Link to="/login">Have an account already?</Link>
              </Text>
              <Button
                type="submit"
                isLoading={isPending}
                bg="primary"
                color="text.secondary"
                w="120px"
                _hover={{bg: "primary"}}
                _active={{bg: "primary"}}
              >
                Register
              </Button>
            </HStack>
          </VStack>
        </form>
      </Center>
    </MainTemplate>
  );
};
