"use client";

import { ScrollShadow } from "@heroui/react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useMotionReduced } from "@/lib/motion-pref";
import { useNavigationMemory } from "@/lib/navigation";
import { installPressSpring } from "@/motion/press";
import { installProfileMorph } from "@/motion/profile-morph";
import { installQuoteMorph } from "@/motion/quote-morph";
import { installCardTilt } from "@/motion/tilt";
import { Atmosphere } from "./atmosphere";
import { MobileDock } from "./mobile-dock";
import { SiteHeader } from "./site-header";

/**
 * The header stays put while the page scrolls under it; the page itself scrolls inside a ScrollShadow. Phones get the
 * dock instead. The atmosphere sits under every page, so its gradient keeps flowing from one page to the next.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  useNavigationMemory();
  // Each asks once whether motion is reduced, so switching 減少動態效果 installs them again
  const reduced = useMotionReduced();
  useEffect(installPressSpring, [reduced]);
  useEffect(installCardTilt, [reduced]);
  const router = useRouter();
  useEffect(() => installQuoteMorph(router.push), [router]);
  useEffect(() => installProfileMorph(router.push), [router]);
  return (
    <>
      <Atmosphere />
      <Frame>{children}</Frame>
    </>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {/* Its fades follow the scroll in CSS (chrome.css): the ScrollShadow's own check ran on every scroll event of
          the page and every scroller in it, a search of the whole page and a forced layout each time */}
      <ScrollShadow id="app-scroll" className="app-scroll" size={88} isEnabled={false}>
        {children}
      </ScrollShadow>
      <MobileDock />
    </>
  );
}
