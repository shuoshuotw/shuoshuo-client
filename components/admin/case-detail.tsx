"use client";

import { ArrowLeft, CalendarClock, CheckCheck, ChevronLeft, ChevronRight, CircleX, Flag, Gavel, MessageSquare, Quote, ScrollText, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type CSSProperties, Suspense, useEffect, useRef, useState } from "react";
import { Digits } from "@/components/digits";
import { ChoiceField, Field, FormError, useFormErrors } from "@/components/form";
import { LinkButton } from "@/components/link-button";
import { Notice } from "@/components/notice";
import { PageHead } from "@/components/site-chrome";
import { RetryNote } from "@/components/state-note";
import { ACTOR_TYPES, auditAction, type ResolveCaseResult } from "@/lib/api/admin";
import { api, apiPage } from "@/lib/api/browser";
import { ApiFailure, type CaseDetail, type CaseSummary, type Comment, type OwnQuote, type ReportReason } from "@/lib/api/client";
import { countChars, formatStamp, formatTime } from "@/lib/format";
import { heldUntilText, REPORT_REASONS, reasonLabel, standingText } from "@/lib/labels";
import { notify } from "@/lib/toast";
import { usePagedList } from "@/lib/use-paged-list";
import { prefersReduced } from "@/motion/log";
import { queueOf } from "./queue";

const QUOTE_STATUS: Record<OwnQuote["status"], string> = { published: "公開中", under_review: "審核中", removed: "已移除" };

const isComment = (target: OwnQuote | Comment): target is Comment => "quote_id" in target;

const NOTE_MAX = 1000;

type Way = "next" | "back";

export function CaseDetailView({ id }: { id: string }) {
  return (
    <Suspense fallback={<span className="skeleton-lines panel-skeleton" aria-busy="true" />}>
      <CaseView opened={id} />
    </Suspense>
  );
}

/**
 * One case: the way back to the queue and on through it, the reported words on a stage of their own, the decision,
 * and the facts behind it (who wrote it and how they stand, every report, what has been done).
 *
 * Stepping to the case before or after this one stays on this page (history.pushState, which Next keeps usePathname
 * in step with): the bar on top stays where it is, and only the case below changes, page side by side, the one
 * leaving sliding out under a blur toward the side it came from as the next one loads, the next one coming in from
 * the other side.
 */
function CaseView({ opened }: { opened: string }) {
  const router = useRouter();
  const id = /^\/admin\/cases\/([^/]+)$/.exec(usePathname())?.[1] ?? opened;
  const { status, type, query } = queueOf(useSearchParams());
  const { items, status: listStatus, reload } = usePagedList<CaseSummary>(`/v1/admin/cases?status=${status}&limit=50`);
  const queue = type === "all" ? items : items.filter(({ target_type }) => target_type === type);

  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [enter, setEnter] = useState<Way | undefined>();
  const way = useRef<Way>("next");
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setFailed(false);
    const leaving = body.current;
    const out =
      leaving && !prefersReduced()
        ? leaving
            .animate(
              { opacity: [1, 0], filter: ["blur(0)", "blur(3px)"], translate: ["0 0", `${way.current === "next" ? -20 : 20}px 0`] },
              { duration: 180, easing: "cubic-bezier(0.4, 0, 1, 1)", fill: "forwards" },
            )
            .finished.catch(() => undefined)
        : undefined;
    Promise.all([api<CaseDetail>(`/v1/admin/cases/${id}`), out]).then(
      ([next]) => {
        if (!live) return;
        setEnter(leaving ? way.current : undefined);
        setDetail(next);
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [id, attempt]);

  const go = (target: string, direction: Way) => {
    way.current = direction;
    window.history.pushState(null, "", `/admin/cases/${target}${query}`);
  };

  // Decided: on to the next open case, or back to the queue when none is left
  const resolved = async () => {
    void reload();
    const { items: open } = await apiPage<CaseSummary>("/v1/admin/cases?status=open&limit=2");
    const next = open.find((item) => item.id !== id);
    if (next) go(next.id, "next");
    else router.push(`/admin/cases${query}`);
  };

  const index = queue.findIndex((item) => item.id === id);
  return (
    <div className="case-detail">
      <nav
        className="case-nav"
        aria-label="案件"
        // A plain click on 上一件 or 下一件 stays on this page; one that opens a new tab is left to the link
        onClickCapture={(event) => {
          const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-step]");
          if (!link?.dataset.target || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          go(link.dataset.target, link.dataset.step as Way);
        }}
      >
        <LinkButton href={`/admin/cases${query}`} size="sm" radius="full" variant="light" data-magnet startContent={<ArrowLeft aria-hidden="true" size={16} />}>
          回到佇列
        </LinkButton>
        <span className="case-steps">
          {listStatus !== "loading" && index >= 0 && (
            <span>
              第 <Digits value={index + 1} /> / {queue.length} 件
            </span>
          )}
          <Step target={index > 0 ? queue[index - 1] : undefined} way="back" query={query} />
          <Step target={index >= 0 ? queue[index + 1] : undefined} way="next" query={query} />
        </span>
      </nav>
      {failed ? (
        <RetryNote title="案件沒有載入成功" onRetry={() => setAttempt((value) => value + 1)} />
      ) : !detail ? (
        <span className="skeleton-lines panel-skeleton" aria-busy="true">
          <span />
          <span />
          <span />
        </span>
      ) : (
        <div ref={body} key={detail.id} className="slide-pane" data-enter={enter} aria-busy={detail.id !== id || undefined}>
          <CaseBody detail={detail} onResolved={resolved} />
        </div>
      )}
    </div>
  );
}

function Step({ target, way, query }: { target: CaseSummary | undefined; way: Way; query: string }) {
  const forward = way === "next";
  return (
    <LinkButton
      href={target ? `/admin/cases/${target.id}${query}` : `/admin/cases${query}`}
      size="sm"
      radius="full"
      variant="bordered"
      data-magnet
      data-step={way}
      data-target={target?.id}
      isDisabled={!target}
      startContent={forward ? undefined : <ChevronLeft aria-hidden="true" size={16} />}
      endContent={forward ? <ChevronRight aria-hidden="true" size={16} /> : undefined}
    >
      {forward ? "下一件" : "上一件"}
    </LinkButton>
  );
}

function CaseBody({ detail, onResolved }: { detail: CaseDetail; onResolved: () => Promise<void> }) {
  const { target } = detail;
  return (
    <>
      <PageHead icon={detail.target_type === "quote" ? Quote : MessageSquare} title={detail.target_type === "quote" ? "說說案件" : "留言案件"}>
        <div className="case-facts">
          <span className="fact-chip">
            <CalendarClock aria-hidden="true" size={14} />
            建立於 {formatStamp(detail.created_at)}
          </span>
          <span className="fact-chip">
            <Flag aria-hidden="true" size={14} />
            有效檢舉 {detail.effective_reporter_count} / 全部 {detail.reporter_count}
          </span>
        </div>
      </PageHead>

      <section className="case-target" aria-label="被檢舉的內容">
        {!target ? (
          <Notice icon={MessageSquare} title="這則留言已隨帳號刪除" />
        ) : isComment(target) ? (
          <div className="comments-quote" style={{ "--glow": "var(--ink)" } as CSSProperties}>
            <span className="comments-quote-text">{target.content}</span>
          </div>
        ) : (
          <>
            <div className="comments-quote" style={{ "--glow": `var(--stock-${target.category.key})` } as CSSProperties}>
              <span className="comments-quote-text quote">{target.content}</span>
            </div>
            <p className="case-target-meta">
              <span>出處：{target.source_from}</span>
              <span>{target.category.name}</span>
              {/* Only a quote held for review or taken down wears a coloured chip */}
              <span className={target.status === "published" ? "fact-chip" : "status-chip"} data-tone={target.status === "removed" ? "danger" : undefined}>
                {QUOTE_STATUS[target.status]}
              </span>
            </p>
          </>
        )}
      </section>

      {detail.status === "open" ? (
        <ResolveForm detail={detail} onResolved={onResolved} />
      ) : (
        <Notice icon={CheckCheck} title="此檢舉已處理">
          {detail.resolution === "uphold" ? `確認違規（${reasonLabel(detail.final_reason)}）` : detail.resolution === "dismiss" ? "已撤銷檢舉" : "目標已刪除"}
        </Notice>
      )}

      <SubjectCard detail={detail} />

      <div className="case-records">
        <section className="panel case-panel">
          <h2 className="block-title">
            <Flag aria-hidden="true" />
            檢舉（{detail.reports.length}）
          </h2>
          <ul className="report-list">
            {detail.reports.map((report, index) => (
              <li key={index} className="report-item">
                <p className="report-head">
                  <Flag aria-hidden="true" size={16} />
                  <strong>{reasonLabel(report.reason)}</strong>
                  {report.is_discounted && <span className="fact-chip">不計入門檻</span>}
                </p>
                {report.detail && <p className="report-detail">「{report.detail}」</p>}
                <p className="report-meta">
                  <span>{formatTime(report.created_at)}</span>
                  {report.reporter_id ? (
                    <Link className="text-link" href={`/admin/users/${report.reporter_id}`}>
                      檢舉者
                    </Link>
                  ) : (
                    <span>檢舉者已刪除帳號</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel case-panel">
          <h2 className="block-title">
            <ScrollText aria-hidden="true" />
            稽核紀錄
          </h2>
          {detail.audit.length === 0 ? (
            <p className="field-hint">還沒有任何處理紀錄</p>
          ) : (
            <ol className="audit-timeline">
              {detail.audit.map((entry) => (
                <li key={entry.id}>
                  <p className="audit-timeline-action">{auditAction(entry.action)}</p>
                  <p className="field-hint">
                    {entry.actor ? (
                      <Link className="text-link" href={`/admin/users/${entry.actor.id}`}>
                        {entry.actor.username}
                      </Link>
                    ) : (
                      ACTOR_TYPES[entry.actor_type]
                    )}
                    ・{formatStamp(entry.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

/**
 * Who wrote it, on one card: their name, how they stand and how many strikes they have used, and what they were
 * found to have done before. The back office reads the facts; the advice the account's owner gets is left out.
 */
function SubjectCard({ detail }: { detail: CaseDetail }) {
  const { subject } = detail;
  if (!subject) {
    return (
      <section className="panel subject-card">
        <h2 className="block-title">
          <UserRound aria-hidden="true" />
          被檢舉者
        </h2>
        <p>帳號已刪除，確認違規時不會新增違規紀錄。</p>
      </section>
    );
  }
  const { standing } = subject;
  const until = heldUntilText(standing);
  return (
    <section className="panel subject-card">
      <h2 className="block-title">
        <UserRound aria-hidden="true" />
        被檢舉者
      </h2>
      <div className="subject-head">
        <Link className="subject-name text-link" href={`/admin/users/${subject.user_id}`}>
          {subject.username}
        </Link>
        <span className="status-chip" data-tone={standing.status === "active" ? "success" : standing.status === "banned" ? "danger" : undefined}>
          {standingText(standing)}
        </span>
        {until && <span className="field-hint">{until}</span>}
      </div>
      <dl className="admin-facts subject-facts">
        <div>
          <dt>違規次數</dt>
          <dd>
            {standing.strike_count} / {standing.strike_limit}
          </dd>
        </div>
        <div>
          <dt>過去的違規</dt>
          <dd>{subject.prior_violations.length} 筆</dd>
        </div>
      </dl>
      {subject.prior_violations.length > 0 && (
        <ul className="plain-list record-list">
          {subject.prior_violations.map((violation) => (
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
  );
}

function ResolveForm({ detail, onResolved }: { detail: CaseDetail; onResolved: () => Promise<void> }) {
  const [resolution, setResolution] = useState<"uphold" | "dismiss">("dismiss");
  const [reason, setReason] = useState<ReportReason>(detail.top_reason ?? "spam");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const { form, errors, formError, failWith, clear } = useFormErrors();
  const goNext = onResolved;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    clear();
    try {
      const body = { resolution, ...(resolution === "uphold" ? { final_reason: reason } : {}), ...(note.trim() ? { note: note.trim() } : {}) };
      const { effects } = await api<ResolveCaseResult>(`/v1/admin/cases/${detail.id}/resolve`, { method: "POST", body });
      void notify(
        resolution === "dismiss"
          ? "已撤銷檢舉"
          : effects.sanction?.kind === "account_ban"
            ? `已確認違規，帳號已停權，撤銷 ${effects.api_keys_revoked ?? 0} 組 API Key`
            : "已確認違規",
      );
      await goNext();
    } catch (failure) {
      if (failure instanceof ApiFailure && failure.code === "CASE_ALREADY_RESOLVED") setGone(true);
      failWith(failure);
      setBusy(false);
    }
  };

  return (
    <form className="panel form resolve-form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <h2 className="block-title">
        <Gavel aria-hidden="true" />
        處分這則檢舉
      </h2>
      {detail.subject?.would_ban && (
        <Notice icon={CircleX} tone="danger" title="確認這件會讓帳號停權">
          這會是第 {detail.subject.standing.strike_limit} 次違規：帳號會自動停權，所有 API Key 都會撤銷。
        </Notice>
      )}
      <fieldset className="field resolve-choices">
        <legend className="sr-only">處理結果</legend>
        <label className="check">
          <input type="radio" name="resolution" checked={resolution === "dismiss"} onChange={() => setResolution("dismiss")} />
          <span>撤銷檢舉</span>
        </label>
        <label className="check">
          <input type="radio" name="resolution" checked={resolution === "uphold"} onChange={() => setResolution("uphold")} />
          <span>確認違規</span>
        </label>
      </fieldset>
      {/* Opens and folds with the choice (accordion): the panel's height follows it frame by frame, nothing jumps */}
      <div className="resolve-reason" data-open={resolution === "uphold" || undefined} inert={resolution !== "uphold"}>
        <div>
          <ChoiceField label="違規原因" value={reason} options={Object.entries(REPORT_REASONS) as [ReportReason, string][]} onChange={setReason} error={errors.final_reason} />
        </div>
      </div>
      <Field
        label="內部備註"
        error={errors.note}
        count={
          <>
            <Digits value={countChars(note)} /> / {NOTE_MAX}
          </>
        }
      >
        {(props) => <textarea {...props} className="input" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      <div className="resolve-actions">
        {gone ? (
          <button type="button" className="button button-primary" data-magnet onClick={() => void goNext()}>
            前往下一件
          </button>
        ) : (
          <button type="submit" className={resolution === "uphold" ? "button button-danger" : "button button-primary"} data-magnet disabled={busy}>
            {resolution === "uphold" ? "確認違規" : "撤銷檢舉"}
          </button>
        )}
      </div>
    </form>
  );
}
