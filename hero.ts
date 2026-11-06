import { heroui } from "@heroui/react";

// Hex rather than var(): HeroUI derives its alpha variants from these at build time. Keep in step with styles/tokens.css.
export default heroui({
  layout: {
    radius: { small: "8px", medium: "12px", large: "24px" },
    borderWidth: { small: "1px", medium: "1px", large: "2px" },
  },
  themes: {
    light: {
      colors: {
        background: "#F5F5F3",
        foreground: "#0C0C0E",
        content1: "#FFFFFF",
        primary: { DEFAULT: "#0C0C0E", foreground: "#FFFFFF" },
        danger: { DEFAULT: "#C8321F", foreground: "#FFFFFF" },
        success: { DEFAULT: "#0F6E3D", foreground: "#FFFFFF" },
        warning: { DEFAULT: "#8A5A00", foreground: "#FFFFFF" },
        focus: "#0C0C0E",
      },
    },
    dark: {
      colors: {
        background: "#0A0A0C",
        foreground: "#F2F2F0",
        content1: "#141417",
        primary: { DEFAULT: "#F2F2F0", foreground: "#0A0A0C" },
        danger: { DEFAULT: "#FF6B57", foreground: "#0A0A0C" },
        success: { DEFAULT: "#6FD39A", foreground: "#0A0A0C" },
        warning: { DEFAULT: "#E5B65A", foreground: "#0A0A0C" },
        focus: "#F2F2F0",
      },
    },
  },
});
