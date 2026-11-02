"use client";

import { Moon, Sun } from "lucide-react";

/** The icon comes from the class theme.js set before paint, so it is right on a cached page without a server cookie. */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const dark = !root.classList.contains("dark");
    root.classList.add("theme-switching");
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
    setTimeout(() => root.classList.remove("theme-switching"), 300);
  };

  return (
    <button type="button" className="tool theme-toggle" aria-label="切換深淺色" onClick={toggle}>
      <Sun aria-hidden="true" className="theme-sun" />
      <Moon aria-hidden="true" className="theme-moon" />
    </button>
  );
}
