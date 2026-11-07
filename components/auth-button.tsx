"use client";

import { LogIn } from "lucide-react";
import { useEffect } from "react";
import { useSessionStore } from "@/stores/session";
import { Avatar } from "./avatar";
import { LinkButton } from "./link-button";

/** Both are in the cached HTML; theme.js picks one before paint from the session cookie (CD-03). `round` is the dock's icon-only form. */
export function AuthButton({ round = false }: { round?: boolean }) {
  const me = useSessionStore((state) => state.me);

  useEffect(() => {
    void useSessionStore.getState().load();
  }, []);

  return (
    <>
      {round ? (
        <LinkButton href="/login" isIconOnly radius="full" className="auth-in dock-round" aria-label="登入">
          <LogIn aria-hidden="true" size={20} />
        </LinkButton>
      ) : (
        <LinkButton href="/login" radius="full" color="primary" className="auth-in" data-magnet startContent={<LogIn aria-hidden="true" size={18} />}>
          登入
        </LinkButton>
      )}
      <LinkButton
        href="/me"
        isIconOnly
        radius="full"
        variant="light"
        className={round ? "avatar-link auth-out dock-round" : "avatar-link auth-out"}
        data-magnet={round ? undefined : true}
        aria-label={me ? `${me.username} 的個人中心` : "個人中心"}
      >
        <Avatar url={me?.avatar_url} name={me?.username ?? "我"} size={round ? 36 : 34} />
      </LinkButton>
    </>
  );
}
