"use client";

import type { UserIdentity } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { Field, FormError, useFormErrors } from "@/components/form";
import { PROVIDERS, rememberNext } from "@/components/login-panel";
import { MeGate } from "@/components/me-gate";
import { MorphDialog } from "@/components/morph-dialog";
import { RetryNote, StateNote } from "@/components/state-note";
import { ApiFailure, type Me } from "@/lib/api/client";
import { api, browserAuth } from "@/lib/api/browser";
import { formatDate } from "@/lib/format";
import { notify } from "@/lib/toast";

const PROVIDER_KEYS: string[] = PROVIDERS.map(({ key }) => key);

export default function SecurityPage() {
  return (
    <>
      <h1 className="section-title">安全設置</h1>
      <Suspense>
        <IdentityList />
      </Suspense>
      <PasskeyList />
      <SessionActions />
      <MeGate>{(me) => <DangerZone me={me} />}</MeGate>
    </>
  );
}

function PanelSkeleton() {
  return (
    <span className="skeleton-lines panel-skeleton" aria-busy="true">
      <span />
      <span />
    </span>
  );
}

function IdentityList() {
  const params = useSearchParams();
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "identity_already_exists" ? "這個身分已綁定到另一個帳號。說說不支援合併帳號：請先登入那個帳號解除綁定或刪除它，再回來綁定。" : params.get("error") ? "綁定沒有成功，請再試一次。" : null,
  );

  const load = useCallback(async () => {
    setFailed(false);
    const auth = await browserAuth();
    const { data, error: failure } = await auth.getUserIdentities();
    if (failure) setFailed(true);
    else setIdentities(data.identities);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const link = async (provider: (typeof PROVIDERS)[number]["key"]) => {
    setError(null);
    rememberNext("/me/security");
    const auth = await browserAuth();
    const { error: failure } = await auth.linkIdentity({ provider, options: { redirectTo: `${location.origin}/auth/callback` } });
    if (failure) setError("綁定沒有成功，請再試一次。");
  };

  const unlink = async (identity: UserIdentity) => {
    const auth = await browserAuth();
    const { error: failure } = await auth.unlinkIdentity(identity);
    if (failure) throw new ApiFailure(400, failure.code ?? "unlink_failed", "解除綁定沒有成功，請再試一次");
    void notify("已解除綁定");
    await load();
  };

  // §7.2: a passkey does not count. OAuth is the only way back in when a passkey is lost.
  const linked = identities?.filter(({ provider }) => PROVIDER_KEYS.includes(provider)) ?? [];
  const lastOne = linked.length <= 1;

  return (
    <section className="panel">
      <h2 className="block-title">登入方式</h2>
      <FormError>{error}</FormError>
      {failed ? (
        <RetryNote title="登入方式沒有載入成功" onRetry={() => void load()} />
      ) : !identities ? (
        <PanelSkeleton />
      ) : (
        <ul className="plain-list">
          {PROVIDERS.map(({ key, name }) => {
            const identity = linked.find(({ provider }) => provider === key);
            return (
              <li key={key}>
                <span>
                  {name}
                  {identity ? `：已綁定${identity.identity_data?.email ? `（${identity.identity_data.email}）` : ""}` : "：尚未綁定"}
                </span>
                {identity ? (
                  lastOne ? (
                    <span className="field-hint">至少要保留一個，這是遺失 Passkey 時唯一的復原途徑</span>
                  ) : (
                    <ConfirmButton
                      label="解除綁定"
                      title={`解除綁定 ${name}`}
                      body={`之後就不能用 ${name} 登入這個帳號。`}
                      confirm="解除綁定"
                      onConfirm={() => unlink(identity)}
                    />
                  )
                ) : (
                  <button type="button" className="text-button" onClick={() => void link(key)}>
                    綁定
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type Passkey = { id: string; friendly_name?: string; created_at: string };

function PasskeyList() {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    const auth = await browserAuth();
    const { data, error: failure } = await auth.passkey.list();
    if (failure) setFailed(true);
    else setPasskeys(data);
  }, []);

  useEffect(() => {
    setSupported(typeof window.PublicKeyCredential === "function");
    void load();
  }, [load]);

  const register = async () => {
    setError(null);
    const auth = await browserAuth();
    const { error: failure } = await auth.registerPasskey();
    if (failure) {
      setError("Passkey 沒有新增成功，請再試一次。");
      return;
    }
    void notify("已新增 Passkey");
    await load();
  };

  const remove = async (id: string) => {
    const auth = await browserAuth();
    const { error: failure } = await auth.passkey.delete({ passkeyId: id });
    if (failure) throw new ApiFailure(400, failure.code ?? "passkey_delete_failed", "Passkey 沒有刪除成功，請再試一次");
    void notify("已刪除 Passkey");
    await load();
  };

  return (
    <section className="panel">
      <h2 className="block-title">Passkey</h2>
      <FormError>{error}</FormError>
      {failed ? (
        <RetryNote title="Passkey 沒有載入成功" onRetry={() => void load()} />
      ) : !passkeys ? (
        <PanelSkeleton />
      ) : passkeys.length === 0 ? (
        <StateNote title="還沒有 Passkey">
          <p>綁定後，下次可以直接用指紋或臉部辨識登入。</p>
        </StateNote>
      ) : (
        <ul className="plain-list">
          {passkeys.map((passkey) => (
            <li key={passkey.id}>
              <span>
                {passkey.friendly_name ?? "未命名的 Passkey"}，{formatDate(passkey.created_at)} 新增
              </span>
              <ConfirmButton label="刪除" title="刪除這個 Passkey" body="之後就不能用它登入。" confirm="確定刪除" onConfirm={() => remove(passkey.id)} />
            </li>
          ))}
        </ul>
      )}
      {supported ? (
        <button type="button" className="button" onClick={() => void register()}>
          新增 Passkey
        </button>
      ) : (
        <p className="field-hint">這個瀏覽器不支援 Passkey。</p>
      )}
    </section>
  );
}

function SessionActions() {
  const signOut = async (scope: "local" | "others" | "global") => {
    const auth = await browserAuth();
    const { error } = await auth.signOut({ scope });
    if (error) {
      void notify("登出沒有成功，請再試一次");
      return;
    }
    if (scope === "others") void notify("其他裝置已登出");
    // A full load, so the header starts over without the session
    else location.assign("/");
  };

  return (
    <section className="panel">
      <h2 className="block-title">登入狀態</h2>
      <div className="dialog-actions">
        <button type="button" className="button" onClick={() => void signOut("local")}>
          登出此裝置
        </button>
        <button type="button" className="button" onClick={() => void signOut("others")}>
          登出其他裝置
        </button>
        <button type="button" className="button" onClick={() => void signOut("global")}>
          登出所有裝置
        </button>
      </div>
    </section>
  );
}

function DangerZone({ me }: { me: Me }) {
  return (
    <section className="panel panel-danger">
      <h2 className="block-title">刪除帳號</h2>
      <p>留言、按讚、收藏與 API Key 會被刪除。已發布的說說與你的名稱會保留，並標示帳號已刪除。</p>
      <MorphDialog label="刪除我的帳號" title="刪除帳號">
        {(close) => <DeleteAccountForm me={me} close={close} />}
      </MorphDialog>
    </section>
  );
}

function DeleteAccountForm({ me, close }: { me: Me; close: () => void }) {
  const pathname = usePathname();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [reauth, setReauth] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors({ CONFIRMATION_MISMATCH: "confirm" });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (confirm !== me.username) {
      fail({ confirm: "名稱不符" });
      return;
    }
    setBusy(true);
    clear();
    try {
      await api("/v1/me/account-deletion", { method: "POST", body: { confirm_username: confirm } });
      const auth = await browserAuth();
      await auth.signOut({ scope: "local" });
      location.assign("/");
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.code === "REAUTH_REQUIRED") setReauth(true);
      else failWith(failure);
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <Field label={`輸入你的名稱「${me.username}」以確認`} error={errors.confirm}>
        {(props) => <input {...props} className="input" autoComplete="off" value={confirm} onChange={(event) => setConfirm(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      {reauth && (
        <p className="banner" role="alert">
          刪除帳號需要你在 10 分鐘內驗證過身分。
          <Link className="text-link" href={`/login?reauth=1&next=${encodeURIComponent(pathname)}`}>
            重新驗證
          </Link>
        </p>
      )}
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          永久刪除
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}
