"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { Field, FormError, useFormErrors } from "@/components/form";
import { MorphDialog } from "@/components/morph-dialog";
import { RetryNote, StateNote } from "@/components/state-note";
import { SuccessCheck } from "@/components/success-check";
import { api } from "@/lib/api/browser";
import { type ApiKey, type ApiKeyScope, type ApiKeyWithSecret, ApiFailure } from "@/lib/api/client";
import { countChars, formatDate, formatTime } from "@/lib/format";
import { API_SCOPES } from "@/lib/labels";
import { notify } from "@/lib/toast";
import { usePagedList } from "@/lib/use-paged-list";

const DOCS_QUICKSTART = "https://docs.shuoshuotw.xyz/quickstart";

export default function ApiKeysPage() {
  const { items, setItems, status, reload } = usePagedList<ApiKey>("/v1/me/api-keys");
  const [revealed, setRevealed] = useState<ApiKeyWithSecret | null>(null);
  const [reauth, setReauth] = useState(false);

  const created = (key: ApiKeyWithSecret) => {
    setItems((current) => [key, ...current.filter((item) => item.id !== key.id)]);
    setRevealed(key);
  };

  const needsReauth = (failure: unknown) => {
    if (failure instanceof ApiFailure && failure.code === "REAUTH_REQUIRED") {
      setReauth(true);
      return true;
    }
    return false;
  };

  const remove = async (id: string) => {
    await api(`/v1/me/api-keys/${id}`, { method: "DELETE" });
    setItems((current) => current.filter((item) => item.id !== id));
    if (revealed?.id === id) setRevealed(null);
    void notify("已刪除 API Key");
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
        <h1 className="section-title">API Key</h1>
        <MorphDialog label="建立 API Key" title="建立 API Key" triggerClassName="button button-primary">
          {(close) => <CreateKeyForm close={close} onCreated={created} onReauth={needsReauth} />}
        </MorphDialog>
      </div>
      {reauth && <ReauthNote />}
      {revealed && <SecretReveal apiKey={revealed} onDismiss={() => setRevealed(null)} />}
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
          <table className="table">
            <thead>
              <tr>
                <th scope="col">名稱</th>
                <th scope="col">前綴</th>
                <th scope="col">權限</th>
                <th scope="col">最後使用</th>
                <th scope="col">建立於</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td>
                    <code>{key.key_prefix}</code>
                  </td>
                  <td>{key.scopes.map((scope) => API_SCOPES[scope]).join("、")}</td>
                  <td>{key.last_used_at ? formatTime(key.last_used_at) : "尚未使用"}</td>
                  <td>{formatDate(key.created_at)}</td>
                  <td>
                    <span className="table-actions">
                      <ConfirmButton
                        label="重新產生"
                        title={`重新產生「${key.name}」`}
                        body="舊金鑰會立刻失效，使用它的程式要換成新金鑰。"
                        confirm="重新產生"
                        onConfirm={() => regenerate(key.id)}
                      />
                      <ConfirmButton
                        label="刪除"
                        title={`刪除「${key.name}」`}
                        body="刪除後無法復原，使用它的程式會立刻失敗。"
                        confirm="確定刪除"
                        onConfirm={() => remove(key.id)}
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

function ReauthNote() {
  const pathname = usePathname();
  return (
    <p className="banner" role="alert">
      這個操作需要你在 10 分鐘內驗證過身分。
      <Link className="text-link" href={`/login?reauth=1&next=${encodeURIComponent(pathname)}`}>
        重新驗證
      </Link>
    </p>
  );
}

function SecretReveal({ apiKey, onDismiss }: { apiKey: ApiKeyWithSecret; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLElement>(null);

  // The one thing on the page that matters now, and the dialog that opened it has just closed
  useEffect(() => {
    panel.current?.focus();
  }, [apiKey.secret]);

  const copy = async () => {
    await navigator.clipboard.writeText(apiKey.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="secret" ref={panel} tabIndex={-1} aria-label={`「${apiKey.name}」的金鑰`}>
      <SuccessCheck />
      <div className="secret-body">
        <h2 className="block-title">「{apiKey.name}」的金鑰只會顯示這一次</h2>
        <p>離開這頁就再也看不到了，請現在存到安全的地方。</p>
        <code className="secret-value" data-testid="api-key-secret">
          {apiKey.secret}
        </code>
        <div className="dialog-actions">
          <button type="button" className="button button-primary" onClick={() => void copy()}>
            <span className="swap" data-swapped={copied} aria-hidden="true">
              <Copy />
              <Check />
            </span>
            {copied ? "已複製" : "複製金鑰"}
          </button>
          <button type="button" className="button" onClick={onDismiss}>
            我已存好
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
      onCreated(await api<ApiKeyWithSecret>("/v1/me/api-keys", { method: "POST", body: { name: name.trim(), scopes } }));
      setName("");
      setScopes(["quotes:read"]);
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
      <Field label="名稱" error={errors.name} hint="之後認得出來的名字，例如「我的部落格」">
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
