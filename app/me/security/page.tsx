"use client";

import type { UserIdentity } from "@supabase/supabase-js";
import { Fingerprint, Infinity as Forever, KeyRound, Link as LinkIcon, Link2, LogOut, Plus, ShieldAlert, ShieldCheck, ShieldOff, Trash2, TriangleAlert, Unlink } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { Field, FormError, useFormErrors } from "@/components/form";
import { MARKS, PROVIDERS, rememberNext } from "@/components/login-panel";
import { MeGate } from "@/components/me-gate";
import { MorphDialog } from "@/components/morph-dialog";
import { PasskeyMark } from "@/components/passkey-mark";
import { PageHead } from "@/components/site-chrome";
import { RetryNote, StateNote } from "@/components/state-note";
import { api, browserAuth } from "@/lib/api/browser";
import { ApiFailure, type Me } from "@/lib/api/client";
import { formatDate } from "@/lib/format";
import { askToReauth, notify } from "@/lib/toast";
import { useSessionStore } from "@/stores/session";

const PROVIDER_KEYS: string[] = PROVIDERS.map(({ key }) => key);

export default function SecurityPage() {
  return (
    <>
      <PageHead icon={ShieldCheck} title="安全設置" />
      <Suspense>
        <IdentityList />
      </Suspense>
      <PasskeyList />
      <MeGate>
        {(me) => (
          <>
            <PermanentKeys me={me} />
            <DangerZone me={me} />
          </>
        )}
      </MeGate>
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
      <h2 className="block-title">
        <Link2 aria-hidden="true" />
        登入方式
      </h2>
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
                <span className="identity">
                  {MARKS[key]}
                  {name}
                  {identity ? `：已綁定${identity.identity_data?.email ? `（${identity.identity_data.email}）` : ""}` : "：尚未綁定"}
                </span>
                {identity ? (
                  lastOne ? (
                    <span className="field-hint">至少需保留一種登入方式</span>
                  ) : (
                    <ConfirmButton
                      label={
                        <>
                          <Unlink aria-hidden="true" />
                          解除綁定
                        </>
                      }
                      title={`解除綁定 ${name}`}
                      body={`之後就不能用 ${name} 登入這個帳號。`}
                      confirm="解除綁定"
                      magnet
                      onConfirm={() => unlink(identity)}
                    />
                  )
                ) : (
                  <button type="button" className="text-button" data-magnet onClick={() => void link(key)}>
                    <LinkIcon aria-hidden="true" />
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
    const auth = await browserAuth();
    const { error: failure } = await auth.registerPasskey();
    if (failure) {
      void notify("Passkey 沒有新增成功，請再試一次", "failed");
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
      <h2 className="block-title">
        <Fingerprint aria-hidden="true" />
        Passkey
      </h2>
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
              <span className="passkey">
                <PasskeyMark name={passkey.friendly_name} />
                {passkey.friendly_name ?? "未命名的 Passkey"}
                <span className="field-hint">此金鑰註冊於 {formatDate(passkey.created_at)}</span>
              </span>
              <ConfirmButton
                label={
                  <>
                    <Trash2 aria-hidden="true" />
                    刪除
                  </>
                }
                title="刪除這個 Passkey"
                body="你確定要移除這個 PassKey 嗎？"
                confirm="確定刪除"
                tone="question"
                magnet
                onConfirm={() => remove(passkey.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {supported ? (
        <button type="button" className="button" data-magnet onClick={() => void register()}>
          <Plus aria-hidden="true" />
          新增 Passkey
        </button>
      ) : (
        <p className="field-hint">這個瀏覽器不支援 Passkey。</p>
      )}
    </section>
  );
}

/**
 * §8.8.2: keys that never expire are allowed here after a yes in a dialog, and the leave is taken back the same way,
 * which revokes every such key at once. The one button changes its words once the card is back in it.
 */
function PermanentKeys({ me }: { me: Me }) {
  const allowed = me.allow_permanent_api_keys;
  const firstAllowed = useRef(allowed);
  // The new state waits for the card to shrink back into the button, so the closing card never shows the other one
  const pending = useRef<Me | null>(null);

  const set = async (allow: boolean) => {
    pending.current = await api<Me>("/v1/me", { method: "PATCH", body: { allow_permanent_api_keys: allow } });
  };

  const settle = () => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    useSessionStore.getState().setMe(next);
    void notify(next.allow_permanent_api_keys ? "已允許永不過期的 API Key" : "已撤銷許可");
  };

  return (
    // Allowed is the riskier state, so it shows: a warning-coloured mark and edge, and a red way back
    <section className="panel permanent-keys" data-allowed={allowed || undefined}>
      <h2 className="block-title">
        <KeyRound aria-hidden="true" />
        永久 API Key
        {/* The badge and the words come in anew when the state turns, as the edge eases to its colour */}
        <span key={String(allowed)} className="state-badge" data-changed={allowed !== firstAllowed.current || undefined}>
          {allowed ? <ShieldAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          {allowed ? "已允許" : "未允許"}
        </span>
      </h2>
      <p key={String(allowed)} className="state-words" data-changed={allowed !== firstAllowed.current || undefined}>
        {allowed ? "您目前已允許永久 API Key 的建立。撤銷此許可時，所有設為永不過期的 API Key 將會同步撤銷" : "啟用此選項後，您將可以建立永不過期的 API Key"}
      </p>
      <ConfirmButton
        labelKey={allowed ? "revoke" : "allow"}
        label={
          allowed ? (
            <>
              <ShieldOff aria-hidden="true" />
              撤銷永久 API Key 許可
            </>
          ) : (
            <>
              <Forever aria-hidden="true" />
              允許永不過期的 API Key
            </>
          )
        }
        title={allowed ? "撤銷永久 API Key 許可" : "允許永不過期的 API Key"}
        body={
          allowed
            ? "撤銷後，所有永不過期的 API Key 會立即一併撤銷，使用它們的程式將無法再呼叫 API。"
            : "開啟此選項你將可以創建永不過期的 API Key。一旦該 API Key 遭到外洩，在你撤銷之前都可以繼續使用。"
        }
        confirm={allowed ? "撤銷" : "允許"}
        tone={allowed ? "warning" : "question"}
        triggerClassName={allowed ? "button button-danger-outline" : "button button-primary"}
        magnet
        onConfirm={() => set(!allowed)}
        onClosed={settle}
      />
    </section>
  );
}

function DangerZone({ me }: { me: Me }) {
  const signOutEverywhere = async () => {
    const auth = await browserAuth();
    const { error } = await auth.signOut({ scope: "global" });
    if (error) throw new ApiFailure(400, error.code ?? "sign_out_failed", "登出沒有成功，請再試一次");
    // A full load, so the header starts over without the session
    location.assign("/");
  };

  return (
    <section className="panel panel-danger">
      <h2 className="block-title">
        <TriangleAlert aria-hidden="true" />
        危險區域
      </h2>
      <div className="danger-row">
        <div>
          <h3>登出所有裝置</h3>
          <p>包含此裝置在內，登出所有已登入裝置。</p>
        </div>
        <ConfirmButton
          label={
            <>
              <LogOut aria-hidden="true" />
              登出所有裝置
            </>
          }
          title="登出所有裝置"
          body="包含這台裝置在內，每一台裝置都要重新登入。"
          confirm="全部登出"
          tone="warning"
          triggerClassName="button"
          magnet
          onConfirm={signOutEverywhere}
        />
      </div>
      <div className="danger-row">
        <div>
          <h3>與說說道別</h3>
          <p>你所發布過的留言、按讚與收藏紀錄將會被全數刪除，所有 API Key 也將被撤銷。</p>
        </div>
        <MorphDialog label="刪除帳號" title="刪除帳號" triggerClassName="button button-danger" magnet tone="warning">
          {(close) => <DeleteAccountForm me={me} close={close} />}
        </MorphDialog>
      </div>
    </section>
  );
}

function DeleteAccountForm({ me, close }: { me: Me; close: () => void }) {
  const pathname = usePathname();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
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
      if (failure instanceof ApiFailure && failure.code === "REAUTH_REQUIRED") {
        askToReauth(pathname);
        close();
      } else failWith(failure);
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <Field label={`輸入你的名稱「${me.username}」以確認`} error={errors.confirm}>
        {(props) => <input {...props} className="input" autoComplete="off" value={confirm} onChange={(event) => setConfirm(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      <div className="dialog-actions">
        <button type="submit" className="button button-danger" disabled={busy}>
          永久刪除
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}
