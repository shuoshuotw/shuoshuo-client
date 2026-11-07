"use client";

import { Button, Spinner } from "@heroui/react";
import { KeyRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { browserAuth } from "@/lib/api/browser";
import { markReturn } from "@/lib/navigation";
import { NEXT_COOKIE, safeNext } from "@/lib/safe-next";
import { notify } from "@/lib/toast";
import { DiscordIcon, GitHubIcon } from "./brand-icons";
import { FormError } from "./form";
import { Logo } from "./logo";

export const PROVIDERS = [
  { key: "google", name: "Google" },
  { key: "discord", name: "Discord" },
  { key: "github", name: "GitHub" },
] as const;

// Each sign-in shows its own mark: Google's in its colours, Discord's in its blurple, GitHub's in the page's ink
export const MARKS = {
  google: <FcGoogle aria-hidden="true" size={20} />,
  discord: <DiscordIcon aria-hidden="true" size={20} className="mark-discord" />,
  github: <GitHubIcon aria-hidden="true" size={20} />,
};

const ERRORS: Record<string, string> = {
  account_blocked: "這個帳號因違反規範已被停權，無法再次註冊。如有疑問，請先登入原帳號提出申訴。",
  email_unverified: "這個登入方式的 email 尚未驗證。請先到該服務驗證 email，再回來登入。",
  identity_already_exists: "這個身分已綁定到另一個帳號。",
  access_denied: "你取消了授權，所以沒有登入。",
  signin_failed: "登入沒有成功，請再試一次。",
};

/** The OAuth round trip leaves this site, so `next` waits for it in a cookie the callback reads and clears. */
export function rememberNext(next: string) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/auth; Max-Age=600; SameSite=Lax${secure}`;
}

export function LoginPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const reauth = params.get("reauth") === "1";
  const code = params.get("error");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(code ? (ERRORS[code] ?? ERRORS.signin_failed!) : null);
  const [passkey, setPasskey] = useState(false);

  // Decided after hydration: the cached HTML cannot know the browser (AU-04)
  useEffect(() => {
    setPasskey(process.env.NEXT_PUBLIC_PASSKEY_ENABLED !== "false" && typeof window.PublicKeyCredential === "function");
  }, []);

  const withProvider = async (provider: (typeof PROVIDERS)[number]["key"]) => {
    setBusy(provider);
    setError(null);
    rememberNext(next);
    if (reauth) markReturn();
    const auth = await browserAuth();
    const { error: failure } = await auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/auth/callback` } });
    if (failure) {
      setError(ERRORS.signin_failed!);
      setBusy(null);
    }
  };

  const withPasskey = async () => {
    setBusy("passkey");
    setError(null);
    const auth = await browserAuth();
    const { error: failure } = await auth.signInWithPasskey();
    if (failure) {
      // AU-03: D-06, a passkey never creates an account
      void notify("PassKey 登入失敗", "failed");
      setBusy(null);
      return;
    }
    // Verified again as the same person: back to the page within the app, its own page change and all. A first sign-in
    // loads in full, so the header and the session store start from the new cookie
    if (reauth) {
      markReturn();
      router.replace(next);
    } else location.assign(next);
  };

  return (
    <div className="login-panel">
      <Logo size={44} />
      <h1 className="section-title">{reauth ? "重新驗證身分" : "登入說說"}</h1>
      <p>{reauth ? "此操作需要你在 10 分鐘內驗證過身分。" : "選擇一種方式來登入 / 註冊您的說說帳號"}</p>
      <FormError>{error}</FormError>
      <div className="login-buttons">
        {PROVIDERS.map(({ key, name }) => (
          <Button
            key={key}
            radius="full"
            size="lg"
            variant="bordered"
            className="login-button"
            spinner={<Spinner size="sm" color="current" />}
            data-magnet
            isDisabled={busy !== null && busy !== key}
            isLoading={busy === key}
            startContent={busy === key ? undefined : MARKS[key]}
            onPress={() => void withProvider(key)}
          >
            {busy === key ? "前往中" : `使用 ${name} 登入`}
          </Button>
        ))}
        {passkey && (
          <Button
            radius="full"
            size="lg"
            variant="light"
            className="login-button"
            spinner={<Spinner size="sm" color="current" />}
            data-magnet
            isDisabled={busy !== null && busy !== "passkey"}
            isLoading={busy === "passkey"}
            startContent={busy === "passkey" ? undefined : <KeyRound aria-hidden="true" size={20} />}
            onPress={() => void withPasskey()}
          >
            {busy === "passkey" ? "等待驗證" : "使用 Passkey 登入"}
          </Button>
        )}
      </div>
      {!passkey && <p className="field-hint">這個瀏覽器不支援 Passkey，可以用上面三種方式登入。</p>}
    </div>
  );
}
