"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSessionStore } from "@/stores/session";
import { Avatar } from "./avatar";

/** Both are in the cached HTML; theme.js picks one before paint from the session cookie (CD-03). */
export function AuthButton() {
  const me = useSessionStore((state) => state.me);

  useEffect(() => {
    void useSessionStore.getState().load();
  }, []);

  return (
    <>
      <Link className="button auth-in" href="/login">
        登入
      </Link>
      <Link className="avatar-link auth-out" href="/me" aria-label={me ? `${me.username} 的個人中心` : "個人中心"}>
        <Avatar url={me?.avatar_url} name={me?.username ?? "我"} />
      </Link>
    </>
  );
}
