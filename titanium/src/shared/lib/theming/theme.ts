import {extendTheme} from "@chakra-ui/react";

const styles = {
  global: {
    body: {
      fontWeight: "medium",
    },
  },
};

const font = "Rubik, sans-serif";

export const theme = extendTheme({
  styles,
  fonts: {
    body: font,
    heading: font,
  },
});
