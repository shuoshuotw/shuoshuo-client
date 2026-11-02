"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Field, FormError, useFormErrors } from "@/components/form";
import { stockOf } from "@/components/quote-sheet";
import { StandingCard } from "@/components/standing-card";
import { RetryNote } from "@/components/state-note";
import type { ResolveCaseResult } from "@/lib/api/admin";
import { api, apiPage } from "@/lib/api/browser";
import { ApiFailure, type CaseDetail, type CaseSummary, type Comment, type OwnQuote, type ReportReason } from "@/lib/api/client";
import { formatTime } from "@/lib/format";
import { REPORT_REASONS, reasonLabel } from "@/lib/labels";
import { notify } from "@/lib/toast";

const QUOTE_STATUS: Record<OwnQuote["status"], string> = { published: "公開中", under_review: "審核中", removed: "已移除" };

const isComment = (target: OwnQuote | Comment): target is Comment => "quote_id" in target;

export function CaseDetailView({ id }: { id: string }) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setDetail(null);
    try {
      setDetail(await api<CaseDetail>(`/v1/admin/cases/${id}`));
    } catch {
      setFailed(true);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) return <RetryNote title="案件沒有載入成功" onRetry={() => void load()} />;
  if (!detail) {
    return (
      <span className="skeleton-lines panel-skeleton" aria-busy="true">
        <span />
        <span />
        <span />
      </span>
    );
  }

  const { target, subject } = detail;
  return (
    <div className="case-detail">
      <div>
        <h1 className="admin-title">{detail.target_type === "quote" ? "說說案件" : "留言案件"}</h1>
        <p className="field-hint">
          建立於 {formatTime(detail.created_at)} · 有效檢舉 {detail.effective_reporter_count} / 全部 {detail.reporter_count}
        </p>
      </div>

      {!target ? (
        <p className="banner">這則留言已隨帳號刪除。</p>
      ) : isComment(target) ? (
        <blockquote className="case-comment">{target.content}</blockquote>
      ) : (
        <article className="quote-row-item" style={stockOf(target.category.key)}>
          <p className="quote quote-row">{target.content}</p>
          <footer className="quote-row-meta">
            <span>{target.source_from}</span>
            <span>{target.category.name}</span>
            <span>{QUOTE_STATUS[target.status]}</span>
          </footer>
        </article>
      )}

      {detail.status === "open" ? (
        <ResolveForm detail={detail} />
      ) : (
        <p className="banner" role="status">
          已處理：{detail.resolution === "uphold" ? `確認違規（${reasonLabel(detail.final_reason)}）` : detail.resolution === "dismiss" ? "駁回" : "目標已刪除"}
        </p>
      )}

      <section className="case-section">
        <h2 className="block-title">被檢舉者</h2>
        {subject ? (
          <>
            <p>
              <Link className="text-link" href={`/admin/users/${subject.user_id}`}>
                {subject.username}
              </Link>
            </p>
            <StandingCard standing={subject.standing} />
            <p>過去的違規：{subject.prior_violations.length === 0 ? "沒有" : `${subject.prior_violations.length} 筆`}</p>
            {subject.prior_violations.length > 0 && (
              <ul className="plain-list">
                {subject.prior_violations.map((violation) => (
                  <li key={violation.id}>
                    <span>
                      {reasonLabel(violation.reason)}，{formatTime(violation.created_at)}
                      {violation.overturned_at ? "（已推翻）" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>帳號已刪除，確認違規時不會新增違規紀錄。</p>
        )}
      </section>

      <section className="case-section">
        <h2 className="block-title">檢舉（{detail.reports.length}）</h2>
        <ul className="case-reports">
          {detail.reports.map((report, index) => (
            <li key={index}>
              <p>
                <strong>{reasonLabel(report.reason)}</strong>
                {report.is_discounted ? "（不計入門檻）" : ""} · {formatTime(report.created_at)}
                {report.reporter_id && (
                  <>
                    {" · "}
                    <Link className="text-link" href={`/admin/users/${report.reporter_id}`}>
                      檢舉者
                    </Link>
                  </>
                )}
              </p>
              {report.detail && <p>{report.detail}</p>}
            </li>
          ))}
        </ul>
      </section>

      {detail.audit.length > 0 && (
        <section className="case-section">
          <h2 className="block-title">稽核紀錄</h2>
          <ul className="plain-list">
            {detail.audit.map((entry) => (
              <li key={entry.id}>
                <span>
                  <code>{entry.action}</code> · {formatTime(entry.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ResolveForm({ detail }: { detail: CaseDetail }) {
  const router = useRouter();
  const [resolution, setResolution] = useState<"uphold" | "dismiss">("dismiss");
  const [reason, setReason] = useState<ReportReason>(detail.top_reason ?? "spam");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  const { form, errors, formError, failWith, clear } = useFormErrors();

  const goNext = async () => {
    const { items } = await apiPage<CaseSummary>("/v1/admin/cases?status=open&limit=2");
    const next = items.find((item) => item.id !== detail.id);
    router.push(next ? `/admin/cases/${next.id}` : "/admin/cases");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    clear();
    try {
      const body = { resolution, ...(resolution === "uphold" ? { final_reason: reason } : {}), ...(note.trim() ? { note: note.trim() } : {}) };
      const { effects } = await api<ResolveCaseResult>(`/v1/admin/cases/${detail.id}/resolve`, { method: "POST", body });
      void notify(
        resolution === "dismiss"
          ? "已駁回"
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
    <form className="form resolve-form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      {detail.subject?.would_ban && (
        <p className="banner" role="alert">
          確認這件會是第 {detail.subject.standing.strike_limit} 次違規：帳號會自動停權，所有 API Key 都會撤銷。
        </p>
      )}
      <fieldset className="field">
        <legend>處理結果</legend>
        <label className="check">
          <input type="radio" name="resolution" checked={resolution === "dismiss"} onChange={() => setResolution("dismiss")} />
          <span>駁回：內容沒有問題</span>
        </label>
        <label className="check">
          <input type="radio" name="resolution" checked={resolution === "uphold"} onChange={() => setResolution("uphold")} />
          <span>確認違規：{detail.target_type === "quote" ? "移除說說並依階梯處分" : "移除留言，不計違規次數"}</span>
        </label>
      </fieldset>
      {resolution === "uphold" && (
        <Field label="違規原因" error={errors.final_reason}>
          {(props) => (
            <select {...props} className="input" value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>
              {Object.entries(REPORT_REASONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Field label="內部備註" error={errors.note} hint="不會公開，最多 1000 字">
        {(props) => <textarea {...props} className="input" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      {gone ? (
        <button type="button" className="button button-primary" onClick={() => void goNext()}>
          前往下一件
        </button>
      ) : (
        <button type="submit" className="button button-primary" disabled={busy}>
          {resolution === "uphold" ? "確認違規" : "駁回案件"}
        </button>
      )}
    </form>
  );
}
