"use client";

import { HeroUIProvider } from "@heroui/system";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { type ReactNode, useSyncExternalStore } from "react";
import { useMotionReduced, useMotionSync } from "@/lib/motion-pref";

// Toast pulls framer-motion's full bundle; loading it lazily keeps the home page in budget (M0 #11)
const ToastProvider = dynamic(
  () => import("@heroui/toast").then((m) => m.ToastProvider),
  { ssr: false },
);

const WIDE = "(min-width: 768px)";
const subscribe = (change: () => void) => {
  const query = matchMedia(WIDE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

/**
 * Toasts rise in the bottom right corner of a wide screen. On a phone they come down from the top, where nothing
 * else is: the dock takes the bottom of the screen there.
 */
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const wide = useSyncExternalStore(subscribe, () => matchMedia(WIDE).matches, () => true);
  const reduced = useMotionReduced();
  useMotionSync();
  return (
    // zh-TW: the date pickers read their fields as 年／月／日
    <HeroUIProvider navigate={router.push} locale="zh-TW" reducedMotion={reduced ? "always" : "user"}>
      <ToastProvider
        placement={wide ? "bottom-right" : "top-center"}
        toastOffset={wide ? 24 : 12}
        maxVisibleToasts={3}
        regionProps={{ classNames: { base: "toast-region" } }}
        toastProps={{
          radius: "lg",
          variant: "flat",
          timeout: 3200,
        }}
      />
      {children}
    </HeroUIProvider>
  );
}
