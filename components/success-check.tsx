"use client";

import { useEffect, useRef } from "react";
import { drawCheck } from "@/motion/anime";

/** M-08. Static until the script arrives, so the tick is there even if it never does. */
export function SuccessCheck() {
  const path = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (path.current) void drawCheck(path.current);
  }, []);

  return (
    <svg className="success-check" viewBox="0 0 24 24" width="48" height="48" role="img" aria-label="完成">
      <path ref={path} d="M4 12.5 9.5 18 20 6.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
