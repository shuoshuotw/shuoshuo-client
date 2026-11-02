"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Field, FormError, useFormErrors } from "@/components/form";
import { MorphDialog } from "@/components/morph-dialog";
import { StandingCard } from "@/components/standing-card";
import { RetryNote, StateNote } from "@/components/state-note";
import type { AdminUser } from "@/lib/api/admin";
import { api } from "@/lib/api/browser";
import type { Sanction } from "@/lib/api/client";
import { countChars, formatTime } from "@/lib/format";
import { reasonLabel, SANCTION_KINDS } from "@/lib/labels";
import { notify } from "@/lib/toast";

export default function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setUser(await api<AdminUser>(`/v1/admin/users/${id}`));
    } catch {
      setFailed(true);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <RetryNote title="使用者資料沒有載入成功" onRetry={() => void load()} />;
  if (!user) {
    return (
      <span className="skeleton-lines panel-skeleton" aria-busy="true">
        <span />
        <span />
        <span />
      </span>
    );
  }

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">{user.username}</h1>
        <div className="dialog-actions">
          <MorphDialog label="手動處分" title={`處分 ${user.username}`}>
            {(close) => <SanctionForm id={id} close={close} onDone={load} />}
          </MorphDialog>
          <MorphDialog label="重設名稱" title={`重設 ${user.username} 的名稱`}>
            {(close) => (
              <ReasonForm
                path={`/v1/admin/users/${id}/reset-profile`}
                hint="名稱會改回預設形式，並留下稽核紀錄。"
                confirm="重設名稱"
                done="名稱已重設"
                close={close}
                onDone={load}
              />
            )}
          </MorphDialog>
        </div>
      </div>
      <dl className="admin-facts">
        <div>
          <dt>說說</dt>
          <dd>{user.quote_count}</dd>
        </div>
        <div>
          <dt>API Key</dt>
          <dd>{user.api_key_count}</dd>
        </div>
        <div>
          <dt>違規次數</dt>
          <dd>{user.standing?.strike_count ?? "–"}</dd>
        </div>
        <div>
          <dt>加入於</dt>
          <dd>{formatTime(user.created_at)}</dd>
        </div>
      </dl>
      {user.standing ? <StandingCard standing={user.standing} /> : <p className="banner">這個帳號已刪除。</p>}

      <section className="case-section">
        <h2 className="block-title">處分</h2>
        {user.sanctions.length === 0 ? (
          <StateNote title="沒有處分" />
        ) : (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="處分清單">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">種類</th>
                  <th scope="col">原因</th>
                  <th scope="col">期間</th>
                  <th scope="col">狀態</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {user.sanctions.map((sanction) => (
                  <SanctionRow key={sanction.id} sanction={sanction} onDone={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="case-section">
        <h2 className="block-title">違規紀錄</h2>
        {user.violations.length === 0 ? (
          <StateNote title="沒有違規紀錄" />
        ) : (
          <ul className="plain-list">
            {user.violations.map((violation) => (
              <li key={violation.id}>
                <span>
                  {reasonLabel(violation.reason)}，{formatTime(violation.created_at)}
                  {violation.counts_as_strike ? "" : "（不計次）"}
                  {violation.overturned_at ? "（已推翻）" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function SanctionRow({ sanction, onDone }: { sanction: Sanction; onDone: () => Promise<void> }) {
  const active = !sanction.lifted_at && (!sanction.ends_at || new Date(sanction.ends_at) > new Date());
  return (
    <tr>
      <td>{SANCTION_KINDS[sanction.kind]}</td>
      <td>{sanction.reason}</td>
      <td>
        {formatTime(sanction.starts_at)} 至 {sanction.ends_at ? formatTime(sanction.ends_at) : "永久"}
      </td>
      <td>{sanction.lifted_at ? "已解除" : active ? "生效中" : "已到期"}</td>
      <td>
        {active && (
          <MorphDialog label="解除" title="解除這項處分" triggerClassName="text-button">
            {(close) => <ReasonForm path={`/v1/admin/sanctions/${sanction.id}/lift`} hint="API Key 不會恢復（D-17）。" confirm="解除處分" done="處分已解除" close={close} onDone={onDone} />}
          </MorphDialog>
        )}
      </td>
    </tr>
  );
}

type ReasonProps = { path: string; hint: string; confirm: string; done: string; close: () => void; onDone: () => Promise<void> };

function ReasonForm({ path, hint, confirm, done, close, onDone }: ReasonProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const length = countChars(reason);
    if (length < 1 || length > 500) {
      fail({ reason: "原因須為 1 至 500 字" });
      return;
    }
    setBusy(true);
    clear();
    try {
      await api(path, { method: "POST", body: { reason: reason.trim() } });
      void notify(done);
      close();
      await onDone();
    } catch (failure) {
      failWith(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <Field label="原因" error={errors.reason} hint={hint}>
        {(props) => <textarea {...props} className="input" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          {confirm}
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}

function SanctionForm({ id, close, onDone }: { id: string; close: () => void; onDone: () => Promise<void> }) {
  const [kind, setKind] = useState<"submit_suspension" | "account_ban">("submit_suspension");
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid: Record<string, string> = {};
    const length = countChars(reason);
    if (length < 1 || length > 500) invalid.reason = "原因須為 1 至 500 字";
    const duration = Number(days);
    if (kind === "submit_suspension" && (!Number.isInteger(duration) || duration < 1 || duration > 365)) invalid.duration_days = "天數須為 1 至 365";
    if (Object.keys(invalid).length > 0) {
      fail(invalid);
      return;
    }
    setBusy(true);
    clear();
    try {
      await api(`/v1/admin/users/${id}/sanctions`, {
        method: "POST",
        body: { kind, reason: reason.trim(), ...(kind === "submit_suspension" ? { duration_days: duration } : {}) },
      });
      void notify("處分已建立");
      close();
      await onDone();
    } catch (failure) {
      failWith(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <Field label="種類">
        {(props) => (
          <select {...props} className="input" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="submit_suspension">{SANCTION_KINDS.submit_suspension}</option>
            <option value="account_ban">{SANCTION_KINDS.account_ban}</option>
          </select>
        )}
      </Field>
      {kind === "submit_suspension" ? (
        <Field label="天數" error={errors.duration_days}>
          {(props) => <input {...props} className="input" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} />}
        </Field>
      ) : (
        <p className="banner">停權會立刻撤銷所有 API Key，解除後也不會恢復。</p>
      )}
      <Field label="原因" error={errors.reason} hint="會顯示給使用者，手動處分不計違規次數">
        {(props) => <textarea {...props} className="input" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          建立處分
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}
