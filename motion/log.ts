export type MotionVariant = "full" | "reduced";

declare global {
  interface Window {
    __motionLog?: { id: string; variant: MotionVariant; phase: "start" | "end" }[];
  }
}

export const prefersReduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// §13.5. The condition is inlined at build time, so a production build drops the call body.
export function logMotion(id: string, variant: MotionVariant, phase: "start" | "end") {
  if (process.env.NEXT_PUBLIC_MOTION_LOG === "1") (window.__motionLog ??= []).push({ id, variant, phase });
}
