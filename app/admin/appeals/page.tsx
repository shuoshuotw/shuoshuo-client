"use client";

import Link from "next/link";
import { useState } from "react";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { Field, FormError, useFormErrors } from "@/components/form";
import { ListFooter } from "@/components/list-footer";
import { RetryNote, StateNote } from "@/components/state-note";
import type { AdminAppeal } from "@/lib/api/admin";
import { api } from "@/lib/api/browser";
import { countChars, formatTime } from "@/lib/format";
import { reasonLabel, SANCTION_KINDS } from "@/lib/labels";
import { notify } from "@/lib/toast";
import { usePagedList } from "@/lib/use-paged-list";

const STATUSES = [
  { key: "pending", label: "待處理" },
  { key: "accepted", label: "已接受" },
  { key: "rejected", label: "已駁回" },
] as const;

export default function AppealsPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]["key"]>("pending");
  const { items, setItems, status: listStatus, hasMore, loadMore, reload } = usePagedList<AdminAppeal>(`/v1/admin/appeals?status=${status}&limit=20`);

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">申訴</h1>
        <div className="segmented" role="group" aria-label="申訴狀態">
          {STATUSES.map(({ key, label }) => (
            <button key={key} type="button" aria-pressed={status === key} onClick={() => setStatus(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {listStatus === "loading" ? (
        <TableSkeleton />
      ) : listStatus === "error" && items.length === 0 ? (
        <RetryNote title="申訴沒有載入成功" onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <StateNote title={status === "pending" ? "沒有待處理的申訴" : "這裡還沒有申訴"} />
      ) : (
        <div className="appeal-list">
          {items.map((appeal) => (
            <AppealCard key={appeal.id} appeal={appeal} onResolved={() => setItems((current) => current.filter((item) => item.id !== appeal.id))} />
          ))}
        </div>
      )}
      <ListFooter status={listStatus} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
    </>
  );
}

function AppealCard({ appeal, onResolved }: { appeal: AdminAppeal; onResolved: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  const decide = async (decision: "accept" | "reject") => {
    const length = countChars(note);
    if (length < 1 || length > 1000) {
      fail({ note: "請寫下給申訴者的說明，1 至 1000 字" });
      return;
    }
    setBusy(true);
    clear();
    try {
      await api(`/v1/admin/appeals/${appeal.id}/resolve`, { method: "POST", body: { decision, note: note.trim() } });
      void notify(decision === "accept" ? "已接受申訴" : "已駁回申訴");
      onResolved();
    } catch (failure) {
      failWith(failure);
      setBusy(false);
    }
  };

  return (
    <article className="panel appeal-card">
      <p className="field-hint">
        <Link className="text-link" href={`/admin/users/${appeal.user_id}`}>
          申訴者
        </Link>{" "}
        · {formatTime(appeal.created_at)}
      </p>
      {appeal.sanction && (
        <p>
          處分：{SANCTION_KINDS[appeal.sanction.kind]}（{appeal.sanction.reason}）
        </p>
      )}
      {appeal.violation && <p>違規：{reasonLabel(appeal.violation.reason)}</p>}
      <blockquote className="case-comment">{appeal.statement}</blockquote>
      {appeal.status === "pending" && (
        <form className="form" ref={form} onSubmit={(event) => event.preventDefault()} noValidate>
          <Field label="給申訴者的說明" error={errors.note} hint="會顯示給申訴者">
            {(props) => <textarea {...props} className="input" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />}
          </Field>
          <FormError>{formError}</FormError>
          <div className="dialog-actions">
            <button type="button" className="button button-primary" disabled={busy} onClick={() => void decide("accept")}>
              接受申訴
            </button>
            <button type="button" className="button" disabled={busy} onClick={() => void decide("reject")}>
              駁回申訴
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
