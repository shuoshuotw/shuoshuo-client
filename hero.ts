import { heroui } from "@heroui/react";

// Hex rather than var(): HeroUI derives its alpha variants from these at build time. Keep in step with styles/tokens.css.
export default heroui({
  layout: {
    radius: { small: "0px", medium: "0px", large: "0px" },
    borderWidth: { small: "1px", medium: "1px", large: "2px" },
  },
  themes: {
    light: {
      colors: {
        background: "#E6E7E3",
        foreground: "#161A1D",
        content1: "#F5F5F1",
        primary: { DEFAULT: "#161A1D", foreground: "#F5F5F1" },
        danger: { DEFAULT: "#B92C1A", foreground: "#FFFFFF" },
        success: { DEFAULT: "#0F6E3D", foreground: "#FFFFFF" },
        warning: { DEFAULT: "#8A5A00", foreground: "#FFFFFF" },
        focus: "#161A1D",
      },
    },
    dark: {
      colors: {
        background: "#121517",
        foreground: "#ECEDE8",
        content1: "#1B1F22",
        primary: { DEFAULT: "#ECEDE8", foreground: "#121517" },
        danger: { DEFAULT: "#FF8A6B", foreground: "#121517" },
        success: { DEFAULT: "#6FD39A", foreground: "#121517" },
        warning: { DEFAULT: "#E5B65A", foreground: "#121517" },
        focus: "#ECEDE8",
      },
    },
  },
});
