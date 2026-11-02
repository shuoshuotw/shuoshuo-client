"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import type { Me } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session";
import { RetryNote } from "./state-note";

/** proxy.ts turns away anyone without a session; this covers the session ending while the page is open. */
export function MeGate({ children }: { children: (me: Me) => ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useSessionStore((state) => state.me);
  const status = useSessionStore((state) => state.status);

  useEffect(() => {
    void useSessionStore.getState().load();
  }, []);

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router, status]);

  if (me) return children(me);
  if (status === "error") return <RetryNote title="你的資料沒有載入成功" onRetry={() => void useSessionStore.getState().load(true)} />;
  return (
    <span className="skeleton-lines panel-skeleton" aria-busy="true">
      <span />
      <span />
      <span />
    </span>
  );
}
