"use client";

import { Flag } from "lucide-react";
import { type ReactNode, useState } from "react";
import { api } from "@/lib/api/browser";
import type { ReportReason } from "@/lib/api/client";
import { REPORT_REASONS } from "@/lib/labels";
import { notify } from "@/lib/toast";
import { ChoiceField, Field, FormError, useFormErrors } from "./form";
import { MorphDialog } from "./morph-dialog";

type Props = { path: string; title: string; triggerClassName?: string; magnet?: boolean; children: ReactNode };

/** ReportDialog in §12.7. Works for a quote or a comment: only the path differs. */
export function ReportButton({ path, title, triggerClassName = "text-button", magnet, children }: Props) {
  return (
    <MorphDialog label={children} title={title} triggerClassName={triggerClassName} magnet={magnet}>
      {(close) => <ReportForm path={path} close={close} />}
    </MorphDialog>
  );
}

function ReportForm({ path, close }: { path: string; close: () => void }) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (reason === "other" && !detail.trim()) {
      fail({ detail: "原因為其他時請說明" });
      return;
    }
    setBusy(true);
    clear();
    try {
      await api(path, { method: "POST", body: { reason, ...(detail.trim() ? { detail: detail.trim() } : {}) } });
      void notify("已收到檢舉，謝謝你");
      setDetail("");
      close();
    } catch (failure) {
      failWith(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <ChoiceField label="原因" value={reason} options={Object.entries(REPORT_REASONS) as [ReportReason, string][]} onChange={setReason} error={errors.reason} />
      <Field label="補充說明" error={errors.detail} hint={reason === "other" ? "必填，最多 500 字" : "選填，最多 500 字"}>
        {(props) => <textarea {...props} className="input" rows={3} value={detail} onChange={(event) => setDetail(event.target.value)} />}
      </Field>
      <FormError>{formError}</FormError>
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          <Flag aria-hidden="true" />
          送出檢舉
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}
