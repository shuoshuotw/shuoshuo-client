"use client";

import { HeroUIProvider } from "@heroui/system";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

// Toast pulls framer-motion's full bundle; loading it lazily keeps the home page in budget (M0 #11)
const ToastProvider = dynamic(
  () => import("@heroui/toast").then((m) => m.ToastProvider),
  { ssr: false },
);

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  return (
    <HeroUIProvider navigate={router.push}>
      <ToastProvider />
      {children}
    </HeroUIProvider>
  );
}
