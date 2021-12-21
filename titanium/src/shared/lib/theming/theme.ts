import {extendTheme} from "@chakra-ui/react";

const styles = {
  global: {
    body: {
      color: "secondary",
      backgroundColor: "body",
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
  colors: {
    primary: "#313131",
    secondary: "#797979",
    tertiary: "#353535",
    body: "#212121",
    text: {
      primary: "#A4A4A4",
      secondary: "#313131",
    },
    default: "#FFFFFF",
    feature: "#277843",
  },
});
