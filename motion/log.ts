export type MotionVariant = "full" | "reduced";

declare global {
  interface Window {
    __motionLog?: { id: string; variant: MotionVariant; phase: "start" | "end" }[];
  }
}

/** The system's own setting, or 說說's 減少動畫 on this device (lib/motion-pref.ts, set before paint by theme.js). */
export const prefersReduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";

// §13.5. The condition is inlined at build time, so a production build drops the call body.
export function logMotion(id: string, variant: MotionVariant, phase: "start" | "end") {
  if (process.env.NEXT_PUBLIC_MOTION_LOG === "1") (window.__motionLog ??= []).push({ id, variant, phase });
}
