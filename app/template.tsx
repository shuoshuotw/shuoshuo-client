import type { ReactNode } from "react";

// M-12. A template remounts on every navigation, which restarts the CSS animation.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in">{children}</div>;
}
