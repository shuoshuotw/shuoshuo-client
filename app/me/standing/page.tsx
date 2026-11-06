"use client";

import { Eye, MessageSquareReply, MessageSquareText, MessageSquareWarning, Scale, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppealStatus } from "@/components/appeal-status";
import { Digits } from "@/components/digits";
import { Field, toastFailure, useFormErrors } from "@/components/form";
import { MeGate } from "@/components/me-gate";
import { MorphDialog } from "@/components/morph-dialog";
import { Reveal } from "@/components/reveal";
import { PageHead } from "@/components/site-chrome";
import { StandingCard } from "@/components/standing-card";
import { RetryNote, StateNote } from "@/components/state-note";
import { apiPage, api } from "@/lib/api/browser";
import type { Appeal, Sanction, Violation } from "@/lib/api/client";
import { countChars, formatTime } from "@/lib/format";
import { reasonLabel, SANCTION_KINDS } from "@/lib/labels";
import { notify } from "@/lib/toast";
import { followHeight } from "@/motion/comment-arrive";
import { useSessionStore } from "@/stores/session";

type Records = { entries: Entry[]; appeals: Appeal[] };

/** One thing that happened to the account: a violation and the sanction it brought, or a sanction given by hand. */
type Entry = { id: string; at: string; violation: Violation | null; sanction: Sanction | null };

/** Violations carry the sanction they brought; a sanction no violation brought (given by hand) stands on its own. */
function entriesOf(violations: Violation[], sanctions: Sanction[]): Entry[] {
  const brought = new Set(violations.map(({ sanction }) => sanction?.id));
  return [
    ...violations.map((violation) => ({ id: violation.id, at: violation.created_at, violation, sanction: violation.sanction })),
    ...sanctions.filter(({ id }) => !brought.has(id)).map((sanction) => ({ id: sanction.id, at: sanction.starts_at, violation: null, sanction })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}

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
      setRecords({ entries: entriesOf(violations.items, sanctions.items), appeals: appeals.items });
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // What was just appealed: its button turns into the appeal's status, which comes in instead of just being there
  const [fresh, setFresh] = useState<string | null>(null);
  const appealed = async (targetId: string) => {
    setFresh(targetId);
    await load();
    // The notice banner on /me reads from here
    await useSessionStore.getState().load(true);
  };

  return (
    <>
      <PageHead icon={Scale} title="違規與申訴" />
      <MeGate>{(me) => <StandingCard standing={me.standing} />}</MeGate>
      <Reveal
        loading={!records && !failed}
        skeleton={
          <span className="skeleton-lines panel-skeleton" aria-busy="true">
            <span />
            <span />
          </span>
        }
      >
        {failed ? (
          <RetryNote title="紀錄沒有載入成功" onRetry={() => void load()} />
        ) : !records || records.entries.length === 0 ? (
          <StateNote title="目前沒有任何違規紀錄" />
        ) : (
          <div className="standing-records">
            <section className="panel" ref={followHeight}>
              <h2 className="block-title">
                <Scale aria-hidden="true" />
                違規與處分
              </h2>
              <ul className="plain-list record-list">
                {records.entries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} fresh={fresh} onAppealed={appealed} />
                ))}
              </ul>
            </section>
            {records.appeals.length > 0 && (
              <section className="panel" ref={followHeight}>
                <h2 className="block-title">
                  <MessageSquareText aria-hidden="true" />
                  我的申訴
                </h2>
                <ul className="appeal-entries">
                  {records.appeals.map((appeal) => (
                    <AppealEntry key={appeal.id} appeal={appeal} entries={records.entries} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </Reveal>
    </>
  );
}

/**
 * Why, and what it brought: the reason on top, then the sanction and how long it runs; what was taken down a press
 * away, and the appeal beside it. A sanction is appealed as itself; a comment taken down, which brings none, as the
 * violation (§9.6).
 */
function EntryRow({ entry, fresh, onAppealed }: { entry: Entry; fresh: string | null; onAppealed: (targetId: string) => Promise<void> }) {
  const { violation, sanction } = entry;
  const lifted = Boolean(violation?.overturned_at || sanction?.lifted_at);
  const range = sanction && `${formatTime(sanction.starts_at)} 至 ${sanction.ends_at ? formatTime(sanction.ends_at) : "永久"}`;
  const appeal = sanction ? sanction.appeal_status : violation?.appeal_status;
  const targetId = sanction ? sanction.id : violation!.id;
  return (
    <li>
      <div className="record-text">
        <p className="record-title">
          <strong>{violation ? reasonLabel(violation.reason) : sanction && SANCTION_KINDS[sanction.kind]}</strong>
          {violation && !violation.counts_as_strike && " - 留言被移除不計違規次數"}
          {lifted && " - 已解除"}
        </p>
        {violation && sanction && (
          <p>
            {SANCTION_KINDS[sanction.kind]}：{sanction.reason}
          </p>
        )}
        <p className="field-hint">{range ? (violation ? range : `${sanction!.reason}，${range}`) : formatTime(entry.at)}</p>
      </div>
      <span className="record-actions">
        {violation?.target && <ViolationContent violation={violation} />}
        {appeal ? (
          <AppealStatus status={appeal} enter={fresh === targetId} />
        ) : (
          <AppealButton targetType={sanction ? "sanction" : "violation"} targetId={targetId} onDone={() => onAppealed(targetId)} />
        )}
      </span>
    </li>
  );
}

/** Which record an appeal is about, in the words of that record. */
function appealTarget(appeal: Appeal, entries: Entry[]) {
  for (const { violation, sanction } of entries) {
    if (appeal.target_type === "sanction" && sanction?.id === appeal.target_id) return `${SANCTION_KINDS[sanction.kind]}：${sanction.reason}`;
    if (appeal.target_type === "violation" && violation?.id === appeal.target_id) {
      return `${reasonLabel(violation.reason)}・${violation.target?.type === "quote" ? "說說" : "留言"}被移除`;
    }
  }
  return appeal.target_type === "sanction" ? "帳號處分" : "違規紀錄";
}

/**
 * One appeal as a short thread: its status and what it is about on top, the appeal in the writer's own words, and
 * the back office's answer under it in a reply of its own once it is decided.
 */
function AppealEntry({ appeal, entries }: { appeal: Appeal; entries: Entry[] }) {
  return (
    <li className="appeal-entry">
      <div className="appeal-entry-head">
        <AppealStatus status={appeal.status} />
        <span className="appeal-entry-target">{appealTarget(appeal, entries)}</span>
        <time className="appeal-entry-time" dateTime={appeal.created_at}>
          {formatTime(appeal.created_at)}
        </time>
      </div>
      <p className="appeal-entry-statement">{appeal.statement}</p>
      {appeal.decision_note && (
        <div className="appeal-reply">
          <p className="appeal-reply-head">
            <MessageSquareReply aria-hidden="true" size={15} />
            管理員回覆
            {appeal.decided_at && <time dateTime={appeal.decided_at}>・{formatTime(appeal.decided_at)}</time>}
          </p>
          <p className="appeal-reply-text">{appeal.decision_note}</p>
        </div>
      )}
    </li>
  );
}

/**
 * What was taken down, in the comments' dialog with only its sentence left: the quote or the comment as it was
 * written, and why it was removed.
 */
function ViolationContent({ violation }: { violation: Violation }) {
  const target = violation.target!;
  const what = target.type === "quote" ? "說說" : "留言";
  return (
    <MorphDialog
      label={
        <>
          <Eye aria-hidden="true" />
          查看內容
        </>
      }
      title="違規內容"
      className="violation-dialog"
      triggerClassName="text-button"
      closeButton
      magnet
    >
      {() => (
        <>
          <p>我們已移除以下違規內容</p>
          <div className="comments-quote" data-kind={target.type}>
            <span className={target.type === "quote" ? "comments-quote-text quote" : "comments-quote-text"}>{target.content ?? `這則${what}已不存在`}</span>
          </div>
          <p className="field-hint">移除原因：{reasonLabel(violation.reason)}</p>
        </>
      )}
    </MorphDialog>
  );
}

type AppealProps = { targetType: "sanction" | "violation"; targetId: string; onDone: () => Promise<void> };

/** The records are read again once the card is back in its button: the button turning into the appeal's status. */
function AppealButton({ targetType, targetId, onDone }: AppealProps) {
  const sent = useRef(false);
  return (
    <MorphDialog
      label={
        <>
          <MessageSquareWarning aria-hidden="true" />
          提出申訴
        </>
      }
      title="對處分提出申訴？"
      triggerClassName="text-button record-pill"
      magnet
      onClosed={() => {
        if (sent.current) void onDone();
      }}
    >
      {(close) => (
        <AppealForm
          targetType={targetType}
          targetId={targetId}
          close={close}
          onSent={() => {
            sent.current = true;
          }}
        />
      )}
    </MorphDialog>
  );
}

const STATEMENT_MIN = 20;
const STATEMENT_MAX = 1000;

function AppealForm({ targetType, targetId, close, onSent }: Omit<AppealProps, "onDone"> & { close: () => void; onSent: () => void }) {
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, fail, failWith, clear } = useFormErrors();
  const length = countChars(statement);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Every message is a toast; the field only turns red and shakes
    if (length < STATEMENT_MIN || length > STATEMENT_MAX) {
      const message = `申訴內容須為 ${STATEMENT_MIN} 至 ${STATEMENT_MAX} 字`;
      fail({ statement: message });
      void notify(message, "failed");
      return;
    }
    setBusy(true);
    clear();
    try {
      await api("/v1/me/appeals", { method: "POST", body: { target_type: targetType, target_id: targetId, statement: statement.trim() } });
      void notify("申訴已送出");
      onSent();
      close();
    } catch (failure) {
      failWith(failure);
      toastFailure(failure);
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <p>說說為保障您的權利，您可以針對每筆帳號處分提出一次申訴。說說管理團隊對一切規章與處分內容保留最終解釋權。</p>
      <Field
        label="申訴內容"
        hideLabel
        error={errors.statement}
        quiet
        count={
          <>
            <Digits value={length} /> / {STATEMENT_MAX}
          </>
        }
      >
        {(props) => (
          <textarea
            {...props}
            className="input"
            rows={5}
            placeholder="說明您的申訴理由..."
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
          />
        )}
      </Field>
      <div className="dialog-actions">
        <button type="submit" className="button button-primary send-button" data-magnet disabled={busy}>
          <Send className="send-icon" aria-hidden="true" size={18} />
          提交申訴
        </button>
        <button type="button" className="button" data-magnet onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}
