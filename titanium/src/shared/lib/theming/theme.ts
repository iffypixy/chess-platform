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
    tertiary: "#3B3B3B",
    body: "#212121",
    divider: "#444444",
    text: {
      primary: "#FFFFFF",
      secondary: "#C8C8C8",
      tertiary: "#313131",
    },
    default: "#FFFFFF",
    feature: "#277843",
    icon: {
      primary: "#6A6A6A",
      disabled: "#444444",
      active: "#CCCCCC",
    },
    success: "#5C8D24",
    error: "#BB3131",
  },
});
