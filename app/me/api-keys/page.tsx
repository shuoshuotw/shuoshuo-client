"use client";

import { Check, Copy, KeyRound, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type RefObject, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { BarredNote } from "@/components/barred-note";
import { ConfirmButton } from "@/components/confirm-button";
import { ChoiceField, Field, FormError, useFormErrors } from "@/components/form";
import { MeGate } from "@/components/me-gate";
import { MorphDialog } from "@/components/morph-dialog";
import { PageHead } from "@/components/site-chrome";
import { RetryNote, StateNote } from "@/components/state-note";
import { type SendPhase, SendStatus } from "@/components/send-status";
import { api } from "@/lib/api/browser";
import { type ApiKey, type ApiKeyScope, type ApiKeyWithSecret, ApiFailure } from "@/lib/api/client";
import { countChars, formatDate, formatTime } from "@/lib/format";
import { API_SCOPES } from "@/lib/labels";
import { askToReauth, notify } from "@/lib/toast";
import { usePagedList } from "@/lib/use-paged-list";
import { collapse, dropRow } from "@/motion/comment-arrive";
import { prefersReduced } from "@/motion/log";
import { useSessionStore } from "@/stores/session";

const DOCS_QUICKSTART = "https://docs.shuoshuotw.xyz/quickstart";

// A banned account's keys are all revoked and it may make none (D-17): the page says why instead
export default function ApiKeysPage() {
  return (
    <MeGate>
      {(me) =>
        me.standing.status === "banned" ? (
          <>
            <PageHead icon={KeyRound} title="API Key" />
            <BarredNote standing={me.standing} />
          </>
        ) : (
          <ApiKeys />
        )
      }
    </MeGate>
  );
}

function ApiKeys() {
  const { items, setItems, status, reload } = usePagedList<ApiKey>("/v1/me/api-keys");
  const pathname = usePathname();
  const [revealed, setRevealed] = useState<ApiKeyWithSecret | null>(null);
  const secret = useRef<HTMLElement>(null);
  const table = useRef<HTMLTableSectionElement>(null);
  // Keys deleted while their dialog is still open; each leaves the table once the dialog is back in its button
  const deleted = useRef(new Set<string>());

  const created = (key: ApiKeyWithSecret) => {
    setItems((current) => [key, ...current.filter((item) => item.id !== key.id)]);
    setRevealed(key);
  };

  const needsReauth = (failure: unknown) => {
    if (failure instanceof ApiFailure && failure.code === "REAUTH_REQUIRED") {
      askToReauth(pathname);
      return true;
    }
    return false;
  };

  // The shown-once panel folds away before it goes
  const hideSecret = () => void collapse(secret.current).then(() => setRevealed(null));

  const remove = async (id: string) => {
    await api(`/v1/me/api-keys/${id}`, { method: "DELETE" });
    deleted.current.add(id);
    void notify("已刪除 API Key");
  };

  const leave = (id: string) => {
    if (!deleted.current.delete(id)) return;
    if (secret.current?.dataset.keyId === id) hideSecret();
    void dropRow(table.current?.querySelector<HTMLElement>(`:scope > [data-id="${id}"]`) ?? null, () =>
      flushSync(() => setItems((current) => current.filter((item) => item.id !== id))),
    );
  };

  const regenerate = async (id: string) => {
    try {
      created(await api<ApiKeyWithSecret>(`/v1/me/api-keys/${id}/regenerate`, { method: "POST" }));
    } catch (failure) {
      if (!needsReauth(failure)) throw failure;
    }
  };

  return (
    <>
      <div className="me-head">
        <PageHead icon={KeyRound} title="API Key" />
        <MorphDialog
          label={
            <>
              <Plus aria-hidden="true" />
              建立 API Key
            </>
          }
          title="建立 API Key"
          triggerClassName="button button-primary"
          magnet
        >
          {(close) => <CreateKeyForm close={close} onCreated={created} onReauth={needsReauth} />}
        </MorphDialog>
      </div>
      {revealed && <SecretReveal ref={secret} apiKey={revealed} onDismiss={hideSecret} />}
      {status === "loading" ? (
        <div className="table-scroll" aria-busy="true">
          <table className="table">
            <tbody>
              {[0, 1, 2].map((row) => (
                <tr key={row}>
                  <td>
                    <span className="skeleton-lines" aria-hidden="true">
                      <span />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : status === "error" ? (
        <RetryNote title="API Key 沒有載入成功" onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <StateNote title="還沒有 API Key">
          <a className="text-link" href={DOCS_QUICKSTART}>
            看快速開始
          </a>
        </StateNote>
      ) : (
        <div className="table-scroll" tabIndex={0} role="region" aria-label="API Key 清單">
          {/* On a phone each key stands as a card of its own, every value under its column's name */}
          <table className="table table-stack table-keys">
            <thead>
              <tr>
                <th scope="col" className="table-roomy">名稱</th>
                <th scope="col">前綴</th>
                <th scope="col" className="table-roomy">權限</th>
                <th scope="col" className="table-nowrap">到期</th>
                <th scope="col" className="table-nowrap">最後使用</th>
                <th scope="col" className="table-nowrap">建立於</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody ref={table}>
              {items.map((key) => (
                <tr key={key.id} data-id={key.id}>
                  <td data-label="名稱" className="table-lead table-roomy">
                    {key.name}
                  </td>
                  <td data-label="前綴">
                    <code>{key.key_prefix}</code>
                  </td>
                  <td data-label="權限" className="table-roomy">{key.scopes.map((scope) => API_SCOPES[scope]).join("、")}</td>
                  <td data-label="到期" className="table-nowrap">{expiry(key.expires_at)}</td>
                  <td data-label="最後使用">{key.last_used_at ? <DayAndTime at={key.last_used_at} /> : <span className="nowrap">尚未使用</span>}</td>
                  <td data-label="建立於" className="table-nowrap">{formatDate(key.created_at)}</td>
                  <td data-label="操作">
                    <span className="table-actions">
                      <ConfirmButton
                        label="重新產生"
                        title={`重新產生「${key.name}」`}
                        body="重新產生此金鑰會導致舊金鑰立即失效，確定要繼續嗎？"
                        confirm="重新產生"
                        tone="warning"
                        onConfirm={() => regenerate(key.id)}
                      />
                      <ConfirmButton
                        label="刪除"
                        title={`刪除「${key.name}」`}
                        body="刪除後無法復原，使用它的程式會立刻失敗。"
                        confirm="確定刪除"
                        tone="warning"
                        onConfirm={() => remove(key.id)}
                        onClosed={() => leave(key.id)}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** A moment as its day and its time, which may go on two lines but never break inside either. */
function DayAndTime({ at }: { at: string }) {
  const [day, ...time] = formatTime(at).split(" ");
  return (
    <>
      <span className="nowrap">{day}</span> <span className="nowrap">{time.join(" ")}</span>
    </>
  );
}

/** When a key stops working: its day, gone by, or never. */
function expiry(at: string | null) {
  if (!at) return "永久";
  return Date.parse(at) <= Date.now() ? "已過期" : formatDate(at);
}

// §8.8.2
const LIFETIMES = [
  ["30", "30 天"],
  ["60", "60 天"],
  ["90", "90 天"],
  ["180", "180 天"],
  ["360", "360 天"],
] as const;
type Lifetime = (typeof LIFETIMES)[number][0] | "forever";
const WITH_FOREVER: readonly (readonly [Lifetime, string])[] = [...LIFETIMES, ["forever", "永久"]];

/**
 * The new key, shown once. The panel drops in; its disc spins a moment and then turns into a green tick (M-08, the
 * spinner to check), and the key sits in a field with its copy button beside it.
 */
function SecretReveal({ ref: panel, apiKey, onDismiss }: { ref: RefObject<HTMLElement | null>; apiKey: ApiKeyWithSecret; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<SendPhase>("sending");

  // The one thing on the page that matters now, and the dialog that opened it has just closed
  useEffect(() => {
    panel.current?.focus();
    setPhase("sending");
    const timer = setTimeout(() => setPhase("done"), prefersReduced() ? 0 : 650);
    return () => clearTimeout(timer);
  }, [apiKey.secret, panel]);

  const copy = async () => {
    await navigator.clipboard.writeText(apiKey.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section key={apiKey.secret} className="secret" data-phase={phase} data-key-id={apiKey.id} ref={panel} tabIndex={-1} aria-label={`「${apiKey.name}」的金鑰`}>
      <SendStatus phase={phase} />
      <div className="secret-body">
        <h2 className="secret-title">請妥善保存您的金鑰</h2>
        <div className="secret-field">
          <code className="secret-value" data-testid="api-key-secret">
            {apiKey.secret}
          </code>
          <button type="button" className="button button-primary secret-copy" data-magnet aria-label={copied ? "已複製" : "複製金鑰"} onClick={() => void copy()}>
            <span className="icon-swap" data-swapped={copied} aria-hidden="true">
              <Copy />
              <Check className="check-draw" />
            </span>
          </button>
        </div>
        <div className="dialog-actions">
          <button type="button" className="button" data-magnet onClick={onDismiss}>
            我已妥善儲存
          </button>
        </div>
      </div>
    </section>
  );
}

type CreateProps = { close: () => void; onCreated: (key: ApiKeyWithSecret) => void; onReauth: (failure: unknown) => boolean };

function CreateKeyForm({ close, onCreated, onReauth }: CreateProps) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["quotes:read"]);
  const [lifetime, setLifetime] = useState<Lifetime>("90");
  const forever = useSessionStore((state) => state.me?.allow_permanent_api_keys ?? false);
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const length = countChars(name);
    if (length < 1 || length > 50) {
      fail({ name: "名稱須為 1 至 50 字" });
      return;
    }
    setBusy(true);
    clear();
    try {
      onCreated(await api<ApiKeyWithSecret>("/v1/me/api-keys", { method: "POST", body: { name: name.trim(), scopes, expires_in_days: lifetime === "forever" ? null : Number(lifetime) } }));
      setName("");
      setScopes(["quotes:read"]);
      setLifetime("90");
      close();
    } catch (failure) {
      if (onReauth(failure)) close();
      else failWith(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <Field label="名稱" error={errors.name} hint="為你的 API Key 取一個別名">
        {(props) => <input {...props} className="input" value={name} onChange={(event) => setName(event.target.value)} />}
      </Field>
      <fieldset className="field">
        <legend>權限</legend>
        {(Object.entries(API_SCOPES) as [ApiKeyScope, string][]).map(([scope, label]) => (
          <label className="check" key={scope}>
            <input
              type="checkbox"
              checked={scopes.includes(scope)}
              // Every key can read; Core adds it anyway (§8.8.2)
              disabled={scope === "quotes:read"}
              onChange={(event) => setScopes((current) => (event.target.checked ? [...current, scope] : current.filter((item) => item !== scope)))}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <ChoiceField<Lifetime>
        label="有效期限"
        value={lifetime}
        options={forever ? WITH_FOREVER : LIFETIMES}
        onChange={setLifetime}
      />
      {/* Beside the select, not its description: HeroUI drops an outside label into the box when it has one */}
      {!forever && (
        <p className="field-hint">
          要建立不會過期的金鑰，先到
          <Link className="text-link" href="/me/security">
            安全設置
          </Link>
          允許永久 API Key。
        </p>
      )}
      <FormError>{formError}</FormError>
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          建立
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}
