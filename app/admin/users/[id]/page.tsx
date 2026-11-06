"use client";

import { CircleX, Gavel, Lightbulb, ListChecks, RotateCcw, UserRound } from "lucide-react";
import { use, useCallback, useEffect, useState } from "react";
import { Digits } from "@/components/digits";
import { ChoiceField, Field, toastFailure, useFormErrors } from "@/components/form";
import { MorphDialog } from "@/components/morph-dialog";
import { Notice } from "@/components/notice";
import { PageHead } from "@/components/site-chrome";
import { StandingCard } from "@/components/standing-card";
import { RetryNote, StateNote } from "@/components/state-note";
import type { AdminUser } from "@/lib/api/admin";
import { api } from "@/lib/api/browser";
import type { Sanction } from "@/lib/api/client";
import { countChars, formatDate, formatStamp, formatTime } from "@/lib/format";
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
      <div className="me-head">
        <PageHead icon={UserRound} title={user.username} />
        <div className="dialog-actions">
          <MorphDialog
            label={
              <>
                <Gavel aria-hidden="true" size={18} />
                手動處分
              </>
            }
            title={`處分 ${user.username}`}
            triggerClassName="button button-danger-outline"
            magnet
          >
            {(close) => <SanctionForm id={id} close={close} onDone={load} />}
          </MorphDialog>
          <MorphDialog
            label={
              <>
                <RotateCcw aria-hidden="true" size={18} />
                重設名稱
              </>
            }
            title={`重設 ${user.username} 的名稱`}
            triggerClassName="button"
            magnet
          >
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
          <dd>{formatDate(user.created_at)}</dd>
        </div>
      </dl>
      {user.standing ? <StandingCard standing={user.standing} about /> : <Notice icon={UserRound} title="這個帳號已刪除" />}

      <section className="panel">
        <h2 className="block-title">
          <Gavel aria-hidden="true" />
          處分
        </h2>
        {user.sanctions.length === 0 ? (
          <StateNote title="沒有處分" icon={Gavel} />
        ) : (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="處分清單">
            {/* The roles keep it a table to a screen reader where a phone lays its rows out as cards */}
            <table className="table table-cards" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">
                    種類
                  </th>
                  <th scope="col" role="columnheader">
                    原因
                  </th>
                  <th scope="col" role="columnheader">
                    期間
                  </th>
                  <th scope="col" role="columnheader">
                    狀態
                  </th>
                  <th scope="col" role="columnheader">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {user.sanctions.map((sanction) => (
                  <SanctionRow key={sanction.id} sanction={sanction} onDone={load} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="block-title">
          <ListChecks aria-hidden="true" />
          違規紀錄
        </h2>
        {user.violations.length === 0 ? (
          <StateNote title="沒有違規紀錄" icon={ListChecks} />
        ) : (
          <ul className="plain-list record-list">
            {user.violations.map((violation) => (
              <li key={violation.id}>
                <span>
                  <strong>{reasonLabel(violation.reason)}</strong>
                  {violation.counts_as_strike ? "" : " - 留言被移除不計違規次數"}
                  {violation.overturned_at ? " - 已解除" : ""}
                </span>
                <span className="field-hint">{formatTime(violation.created_at)}</span>
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
    <tr role="row">
      <td role="cell" className="table-lead table-nowrap">
        {SANCTION_KINDS[sanction.kind]}
      </td>
      <td role="cell" className="table-roomy" data-label="原因">
        {sanction.reason}
      </td>
      <td role="cell" className="table-nowrap" data-label="期間">
        {formatStamp(sanction.starts_at)} 至 {sanction.ends_at ? formatStamp(sanction.ends_at) : "永久"}
      </td>
      <td role="cell" className="table-nowrap" data-label="狀態">
        {sanction.lifted_at ? "已解除" : active ? "生效中" : "已到期"}
      </td>
      <td role="cell">
        {active && (
          <MorphDialog label="解除" title="解除這項處分" triggerClassName="text-button cell-button" magnet>
            {(close) => <ReasonForm path={`/v1/admin/sanctions/${sanction.id}/lift`} hint="API Key 不會恢復（D-17）。" confirm="解除處分" done="處分已解除" close={close} onDone={onDone} />}
          </MorphDialog>
        )}
      </td>
    </tr>
  );
}

type ReasonProps = { path: string; hint: string; confirm: string; done: string; close: () => void; onDone: () => Promise<void> };

const REASON_MAX = 500;

/** A reason as both dialogs here take it: what is written counted under the field, the advice beside it after a lightbulb. */
function ReasonField({ value, onChange, error, hint }: { value: string; onChange: (value: string) => void; error: string | undefined; hint: string }) {
  return (
    <Field
      label="原因"
      error={error}
      quiet
      hint={
        <>
          <Lightbulb aria-hidden="true" size={15} />
          {hint}
        </>
      }
      count={
        <>
          <Digits value={countChars(value)} /> / {REASON_MAX}
        </>
      }
    >
      {(props) => <textarea {...props} className="input" rows={3} value={value} onChange={(event) => onChange(event.target.value)} />}
    </Field>
  );
}

const REASON_RULE = `原因須為 1 至 ${REASON_MAX} 字`;
const reasonFits = (reason: string) => countChars(reason) >= 1 && countChars(reason) <= REASON_MAX;

function ReasonForm({ path, hint, confirm, done, close, onDone }: ReasonProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, fail, failWith, clear } = useFormErrors();

  // Every message is a toast; the field only turns red and shakes
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reasonFits(reason)) {
      fail({ reason: REASON_RULE });
      void notify(REASON_RULE, "failed");
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
      toastFailure(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <ReasonField value={reason} onChange={setReason} error={errors.reason} hint={hint} />
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
  const { form, errors, fail, failWith, clear } = useFormErrors();

  // Every message is a toast; the fields only turn red and shake
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid: Record<string, string> = {};
    const duration = Number(days);
    if (kind === "submit_suspension" && (!Number.isInteger(duration) || duration < 1 || duration > 365)) invalid.duration_days = "天數須為 1 至 365";
    if (!reasonFits(reason)) invalid.reason = REASON_RULE;
    if (Object.keys(invalid).length > 0) {
      fail(invalid);
      for (const message of Object.values(invalid)) void notify(message, "failed");
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
      toastFailure(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <ChoiceField
        label="種類"
        value={kind}
        options={[
          ["submit_suspension", SANCTION_KINDS.submit_suspension],
          ["account_ban", SANCTION_KINDS.account_ban],
        ]}
        onChange={setKind}
      />
      {kind === "submit_suspension" ? (
        <Field label="天數" error={errors.duration_days} quiet>
          {(props) => <input {...props} className="input" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} />}
        </Field>
      ) : (
        <Notice icon={CircleX} tone="danger" title="停權會立刻撤銷所有 API Key">
          解除停權後也不會恢復。
        </Notice>
      )}
      <ReasonField value={reason} onChange={setReason} error={errors.reason} hint="處分原因將提供給使用者進行參考，手動處分將不計入違規次數" />
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
