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
    .min(3, "Username must contain at least 3 characters"),
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

  const {
    handleSubmit,
    formState: {isSubmitting, errors},
    register,
  } = useForm<RegisterForm>({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (values: RegisterForm) => {
    await dispatch(authActions.register(values));
  };

  return (
    <MainTemplate>
      <Center w="100%" h="100vh">
        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack w={[300, 400]} spacing={8}>
            <Heading fontSize="3xl" fontWeight="bold">
              Sign up
            </Heading>

            <VStack w="100%" spacing={4}>
              <FormControl id="username" isInvalid={!!errors.username}>
                <FormLabel htmlFor="username" color="gray.500" fontSize="sm">
                  Username
                </FormLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="alex123"
                  bg="gray.100"
                  border="null"
                  {...register("username", {
                    required: "Username is required",
                  })}
                />
                {errors.username && (
                  <FormErrorMessage fontSize="xs">
                    {errors.username.message}
                  </FormErrorMessage>
                )}
              </FormControl>

              <FormControl id="password" isInvalid={!!errors.password}>
                <FormLabel htmlFor="password" color="gray.500" fontSize="sm">
                  Password
                </FormLabel>
                <Input
                  id="password"
                  type="password"
                  placeholder="x x x x x x"
                  bg="gray.100"
                  border="null"
                  {...register("password", {
                    required: "Password is required",
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
              w="100%"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Text color="gray.500" fontSize="sm">
                <Link to="/login">Have an account already?</Link>
              </Text>
              <Button
                type="submit"
                isLoading={isSubmitting}
                w="120px"
                bg="black"
                color="white"
                _hover={{bg: "black", color: "white"}}
                _active={{bg: "black"}}
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
