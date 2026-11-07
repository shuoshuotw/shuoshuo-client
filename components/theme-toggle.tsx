"use client";

import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { prefersReduced } from "@/motion/log";

/**
 * The icon comes from the class theme.js set before paint, so it is right on a cached page without a server cookie.
 * Every part of the page fades to its new colours at once as one picture crossfading into the next (a view
 * transition): the page itself restyles once instead of tweening each element's colours frame by frame.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const dark = !root.classList.contains("dark");
    const apply = (mode: string) => {
      root.classList.add(mode);
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
    };
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}

    if (prefersReduced()) {
      apply("theme-instant");
      void getComputedStyle(document.body).color;
      setTimeout(() => root.classList.remove("theme-instant"), 1);
    } else if (document.startViewTransition) {
      // No element tweens on its own inside the new picture; the crossfade is the transition
      void document.startViewTransition(() => apply("theme-instant")).finished.finally(() => root.classList.remove("theme-instant"));
    } else {
      apply("theme-switching");
      setTimeout(() => root.classList.remove("theme-switching"), 300);
    }
  };

  return (
    <Button isIconOnly radius="full" variant="light" className="theme-toggle" data-magnet aria-label="切換深淺色" onPress={toggle}>
      <span className="theme-icons" aria-hidden="true">
        <Sun className="theme-sun" size={20} />
        <Moon className="theme-moon" size={20} />
      </span>
    </Button>
  );
}
