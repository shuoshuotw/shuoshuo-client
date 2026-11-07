import { useEffect, useSyncExternalStore } from "react";
import { useSessionStore } from "@/stores/session";

// 減少動態效果 belongs to the account (Me.reduce_motion), so it follows it to every device. Each device also keeps the
// last value it saw, which theme.js puts on <html> before paint, so a page never starts moving before the account says
const KEY = "motion";
const CHANGE = "shuoshuo:motion";

const subscribe = (change: () => void) => {
  addEventListener(CHANGE, change);
  return () => removeEventListener(CHANGE, change);
};

const read = () => document.documentElement.dataset.motion === "reduce";

/** Whether 減少動態效果 is on here, whatever the system says. */
export function useMotionReduced() {
  return useSyncExternalStore(subscribe, read, () => false);
}

/** Puts the setting on this device; the account keeps its own copy (PATCH /v1/me). */
export function applyMotionReduced(on: boolean) {
  const root = document.documentElement;
  if (on) root.dataset.motion = "reduce";
  else delete root.dataset.motion;
  try {
    if (on) localStorage.setItem(KEY, "reduce");
    else localStorage.removeItem(KEY);
  } catch {}
  dispatchEvent(new Event(CHANGE));
}

/** Once the account is known, this device takes its setting (changed on another device since). */
export function useMotionSync() {
  const reduce = useSessionStore((state) => state.me?.reduce_motion);
  useEffect(() => {
    if (reduce !== undefined && reduce !== read()) applyMotionReduced(reduce);
  }, [reduce]);
}
