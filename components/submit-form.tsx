"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/browser";
import { type Quote } from "@/lib/api/client";
import { CATEGORIES } from "@/lib/categories";
import { standingText } from "@/lib/labels";
import { FormError, useFormErrors } from "./form";
import { MeGate } from "./me-gate";
import { emptyDraft, QUOTE_ERROR_FIELDS, QuoteFields, type QuoteDraft, validateQuote } from "./quote-form";
import { QuoteType, stockOf } from "./quote-sheet";
import { StateNote } from "./state-note";
import { SuccessCheck } from "./success-check";

export function SubmitForm() {
  return <MeGate>{(me) => (me.standing.can_submit ? <Composer /> : <Barred text={standingText(me.standing)} />)}</MeGate>;
}

function Barred({ text }: { text: string }) {
  return (
    <div className="login-panel">
      <h1 className="section-title">目前無法提交</h1>
      <StateNote title={text}>
        <Link className="button button-primary" href="/me/standing">
          查看原因與申訴
        </Link>
      </StateNote>
    </div>
  );
}

function Composer() {
  const router = useRouter();
  const [draft, setDraft] = useState<QuoteDraft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors(QUOTE_ERROR_FIELDS);
  const category = CATEGORIES.find(({ key }) => key === draft.category);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validateQuote(draft);
    if (Object.keys(invalid).length > 0) {
      fail(invalid);
      return;
    }
    setBusy(true);
    clear();
    try {
      const quote = await api<Quote>("/v1/quotes", { method: "POST", body: draft });
      setDone(true);
      // M-08 needs its half a second before the page changes
      setTimeout(() => router.push(`/q/${quote.id}`), 700);
    } catch (failure) {
      failWith(failure);
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="login-panel" role="status">
        <SuccessCheck />
        <h1 className="section-title">已提交</h1>
      </div>
    );
  }

  return (
    <>
      <form className="form submit-form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
        <h1 className="section-title">提交一句</h1>
        <QuoteFields draft={draft} errors={errors} onChange={setDraft} />
        <FormError>{formError}</FormError>
        <button type="submit" className="button button-primary" disabled={busy}>
          {busy ? "送出中" : "送出"}
        </button>
      </form>
      <aside className="submit-preview" aria-label="預覽">
        <article className="sheet" style={category ? stockOf(category.key) : undefined}>
          {draft.content.trim() ? <QuoteType content={draft.content.trim()} /> : <p className="sheet-note">寫下的字會排在這張紙上</p>}
          <footer className="sheet-source">
            <span>{draft.source_from.trim() || "來源"}</span>
            <span>{category?.name ?? "類別"}</span>
          </footer>
        </article>
      </aside>
    </>
  );
}
