"use client";

import { useCallback, useEffect, useState } from "react";
import { Field, FormError, useFormErrors } from "@/components/form";
import { MeGate } from "@/components/me-gate";
import { MorphDialog } from "@/components/morph-dialog";
import { StandingCard } from "@/components/standing-card";
import { RetryNote, StateNote } from "@/components/state-note";
import { apiPage, api } from "@/lib/api/browser";
import type { Appeal, Sanction, Violation } from "@/lib/api/client";
import { countChars, formatTime } from "@/lib/format";
import { APPEAL_STATUS, reasonLabel, SANCTION_KINDS } from "@/lib/labels";
import { notify } from "@/lib/toast";
import { useSessionStore } from "@/stores/session";

type Records = { violations: Violation[]; sanctions: Sanction[]; appeals: Appeal[] };

export default function StandingPage() {
  const [records, setRecords] = useState<Records | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [violations, sanctions, appeals] = await Promise.all([
        apiPage<Violation>("/v1/me/violations?limit=50"),
        apiPage<Sanction>("/v1/me/sanctions?limit=50"),
        apiPage<Appeal>("/v1/me/appeals?limit=50"),
      ]);
      setRecords({ violations: violations.items, sanctions: sanctions.items, appeals: appeals.items });
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const appealed = async () => {
    await load();
    // The notice banner on /me reads from here
    await useSessionStore.getState().load(true);
  };

  // A comment removal has no sanction, so the violation itself is what gets appealed (§9.6)
  const looseViolations = records?.violations.filter(({ sanction }) => !sanction) ?? [];
  const empty = records && records.sanctions.length === 0 && records.violations.length === 0;

  return (
    <>
      <h1 className="section-title">違規與申訴</h1>
      <MeGate>{(me) => <StandingCard standing={me.standing} />}</MeGate>
      {failed ? (
        <RetryNote title="紀錄沒有載入成功" onRetry={() => void load()} />
      ) : !records ? (
        <span className="skeleton-lines panel-skeleton" aria-busy="true">
          <span />
          <span />
        </span>
      ) : empty ? (
        <StateNote title="目前沒有任何違規紀錄" />
      ) : (
        <>
          {records.sanctions.length > 0 && (
            <section className="panel">
              <h2 className="block-title">處分</h2>
              <ul className="plain-list record-list">
                {records.sanctions.map((sanction) => (
                  <li key={sanction.id}>
                    <div>
                      <p>
                        <strong>{SANCTION_KINDS[sanction.kind]}</strong>：{sanction.reason}
                      </p>
                      <p className="field-hint">
                        {formatTime(sanction.starts_at)} 至 {sanction.ends_at ? formatTime(sanction.ends_at) : "永久"}
                        {sanction.lifted_at ? "，已解除" : ""}
                      </p>
                    </div>
                    {sanction.appeal_status ? (
                      <span>{APPEAL_STATUS[sanction.appeal_status]}</span>
                    ) : (
                      <AppealButton targetType="sanction" targetId={sanction.id} onDone={appealed} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {records.violations.length > 0 && (
            <section className="panel">
              <h2 className="block-title">違規紀錄</h2>
              <ul className="plain-list record-list">
                {records.violations.map((violation) => (
                  <li key={violation.id}>
                    <div>
                      <p>
                        <strong>{reasonLabel(violation.reason)}</strong>
                        {violation.counts_as_strike ? "" : "（留言被移除，不計次）"}
                        {violation.overturned_at ? "（已推翻）" : ""}
                      </p>
                      <p className="field-hint">{formatTime(violation.created_at)}</p>
                    </div>
                    {looseViolations.includes(violation) &&
                      (violation.appeal_status ? <span>{APPEAL_STATUS[violation.appeal_status]}</span> : <AppealButton targetType="violation" targetId={violation.id} onDone={appealed} />)}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {records.appeals.length > 0 && (
            <section className="panel">
              <h2 className="block-title">我的申訴</h2>
              <ul className="plain-list record-list">
                {records.appeals.map((appeal) => (
                  <li key={appeal.id}>
                    <div>
                      <p>
                        <strong>{APPEAL_STATUS[appeal.status]}</strong> · {formatTime(appeal.created_at)}
                      </p>
                      <p>{appeal.statement}</p>
                      {appeal.decision_note && <p className="banner">管理員說明：{appeal.decision_note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

type AppealProps = { targetType: "sanction" | "violation"; targetId: string; onDone: () => Promise<void> };

function AppealButton({ targetType, targetId, onDone }: AppealProps) {
  return (
    <MorphDialog label="提出申訴" title="提出申訴" triggerClassName="text-button">
      {(close) => <AppealForm targetType={targetType} targetId={targetId} close={close} onDone={onDone} />}
    </MorphDialog>
  );
}

function AppealForm({ targetType, targetId, close, onDone }: AppealProps & { close: () => void }) {
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const length = countChars(statement);
    if (length < 20 || length > 1000) {
      fail({ statement: "申訴內容須為 20 至 1000 字" });
      return;
    }
    setBusy(true);
    clear();
    try {
      await api("/v1/me/appeals", { method: "POST", body: { target_type: targetType, target_id: targetId, statement: statement.trim() } });
      void notify("申訴已送出");
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
      <p>每個項目只能申訴一次，請一次把理由寫完整。</p>
      <Field label="申訴內容" error={errors.statement} hint={`${countChars(statement)} / 1000 字，至少 20 字`}>
        {(props) => <textarea {...props} className="input" rows={5} value={statement} onChange={(event) => setStatement(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          送出申訴
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}
