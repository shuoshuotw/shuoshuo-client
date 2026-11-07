"use client";

import { Check, MessageSquareWarning, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { APPEAL_ICONS } from "@/components/appeal-status";
import { Field, FormError, useFormErrors } from "@/components/form";
import { ListFooter } from "@/components/list-footer";
import { Reveal } from "@/components/reveal";
import { Segmented } from "@/components/segmented";
import { PageHead } from "@/components/site-chrome";
import { SlidePane } from "@/components/slide-pane";
import { RetryNote, StateNote } from "@/components/state-note";
import type { AdminAppeal } from "@/lib/api/admin";
import { api } from "@/lib/api/browser";
import { countChars, formatTime } from "@/lib/format";
import { reasonLabel, SANCTION_KINDS } from "@/lib/labels";
import { notify } from "@/lib/toast";
import { usePagedList } from "@/lib/use-paged-list";
import { collapse, followHeight } from "@/motion/comment-arrive";

const STATUSES = [
  { key: "pending", label: "待處理", icon: APPEAL_ICONS.pending },
  { key: "accepted", label: "已接受", icon: APPEAL_ICONS.accepted },
  { key: "rejected", label: "已駁回", icon: APPEAL_ICONS.rejected },
] as const;

export default function AppealsPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]["key"]>("pending");
  const { items, setItems, status: listStatus, hasMore, loadMore, reload } = usePagedList<AdminAppeal>(`/v1/admin/appeals?status=${status}&limit=20`);

  return (
    <>
      {/* On a phone the title and the tabs stay at the top while the appeals scroll under them */}
      <div className="admin-head">
        <div className="me-head">
          <PageHead icon={MessageSquareWarning} title="使用者申訴" />
          <Segmented label="申訴狀態" options={STATUSES} value={status} onChange={setStatus} />
        </div>
      </div>
      <SlidePane index={STATUSES.findIndex(({ key }) => key === status)}>
        <Reveal
          loading={listStatus === "loading"}
          skeleton={
            <span className="skeleton-lines panel-skeleton" aria-busy="true">
              <span />
              <span />
              <span />
            </span>
          }
        >
          {listStatus === "error" && items.length === 0 ? (
            <RetryNote title="申訴沒有載入成功" onRetry={() => void reload()} />
          ) : items.length === 0 ? (
            <StateNote title={status === "pending" ? "沒有待處理的申訴" : "這裡還沒有申訴"} icon={MessageSquareWarning} large />
          ) : (
            <div className="appeal-list">
              {items.map((appeal) => (
                <AppealCard key={appeal.id} appeal={appeal} onResolved={() => setItems((current) => current.filter((item) => item.id !== appeal.id))} />
              ))}
            </div>
          )}
        </Reveal>
        <ListFooter status={listStatus} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
      </SlidePane>
    </>
  );
}

/**
 * One appeal: who, against what, in their words; decided with the reason given to them, after which the card folds
 * away. It eases to its new height when an error comes up under the field.
 */
function AppealCard({ appeal, onResolved }: { appeal: AdminAppeal; onResolved: () => void }) {
  const card = useRef<HTMLElement>(null);
  useEffect(() => followHeight(card.current), []);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  const decide = async (decision: "accept" | "reject") => {
    const length = countChars(note);
    if (length < 1 || length > 1000) {
      fail({ note: "請說明原因，1 至 1000 字" });
      return;
    }
    setBusy(true);
    clear();
    try {
      await api(`/v1/admin/appeals/${appeal.id}/resolve`, { method: "POST", body: { decision, note: note.trim() } });
      void notify(decision === "accept" ? "已接受申訴" : "已駁回申訴");
      await collapse(card.current);
      onResolved();
    } catch (failure) {
      failWith(failure);
      setBusy(false);
    }
  };

  return (
    <article className="panel appeal-card" ref={card}>
      <p className="appeal-meta">
        <Link className="text-link" href={`/admin/users/${appeal.user_id}`}>
          申訴者
        </Link>
        <span>{formatTime(appeal.created_at)}</span>
        {appeal.sanction && (
          <span className="fact-chip">
            {SANCTION_KINDS[appeal.sanction.kind]}：{appeal.sanction.reason}
          </span>
        )}
        {appeal.violation && <span className="fact-chip">違規：{reasonLabel(appeal.violation.reason)}</span>}
      </p>
      <div className="appeal-statement">
        <h3 className="field-label">申訴內容</h3>
        <blockquote className="case-comment">{appeal.statement}</blockquote>
      </div>
      {appeal.status === "pending" && (
        <form className="form" ref={form} onSubmit={(event) => event.preventDefault()} noValidate>
          <Field label="說明原因" error={errors.note}>
            {(props) => <textarea {...props} className="input" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />}
          </Field>
          <FormError>{formError}</FormError>
          <div className="dialog-actions">
            <button type="button" className="button button-primary" data-magnet disabled={busy} onClick={() => void decide("accept")}>
              <Check aria-hidden="true" size={18} />
              接受申訴
            </button>
            <button type="button" className="button button-danger-outline" data-magnet disabled={busy} onClick={() => void decide("reject")}>
              <X aria-hidden="true" size={18} />
              駁回申訴
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
