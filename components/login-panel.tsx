"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { browserAuth } from "@/lib/api/browser";
import { NEXT_COOKIE, safeNext } from "@/lib/safe-next";
import { FormError } from "./form";

export const PROVIDERS = [
  { key: "google", name: "Google" },
  { key: "discord", name: "Discord" },
  { key: "github", name: "GitHub" },
] as const;

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
      setError("Passkey 登入沒有完成。Passkey 必須先綁定：第一次請用 Google、Discord 或 GitHub 登入，再到安全設置新增。");
      setBusy(null);
      return;
    }
    // A full load, so the header and the session store start from the new cookie
    location.assign(next);
  };

  return (
    <div className="login-panel">
      <h1 className="section-title">{reauth ? "重新驗證身分" : "登入說說"}</h1>
      <p>{reauth ? "這個操作需要你剛驗證過身分。用任一方式再登入一次，就會回到原本的頁面。" : "說說不開放 Email 註冊。用下面任一個帳號登入，第一次登入時就會建立帳號。"}</p>
      <FormError>{error}</FormError>
      <div className="login-buttons">
        {PROVIDERS.map(({ key, name }) => (
          <button key={key} type="button" className="button button-primary" disabled={busy !== null} onClick={() => void withProvider(key)}>
            {busy === key ? "前往中" : `使用 ${name} 登入`}
          </button>
        ))}
        {passkey && (
          <button type="button" className="button" disabled={busy !== null} onClick={() => void withPasskey()}>
            {busy === "passkey" ? "等待驗證" : "使用 Passkey 登入"}
          </button>
        )}
      </div>
      {!passkey && <p className="field-hint">這個瀏覽器不支援 Passkey，可以用上面三種方式登入。</p>}
    </div>
  );
}
