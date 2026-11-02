"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api/browser";
import type { OwnQuote, Quote } from "@/lib/api/client";
import { CATEGORIES } from "@/lib/categories";
import { countChars } from "@/lib/format";
import { notify } from "@/lib/toast";
import { Field, FormError, useFormErrors } from "./form";
import { MorphDialog } from "./morph-dialog";
import { stockOf } from "./quote-sheet";

// §8.3.6
export const EDIT_WINDOW_MINUTES = 24 * 60;

export type QuoteDraft = { content: string; source_from: string; category: string };

export const emptyDraft: QuoteDraft = { content: "", source_from: "", category: "" };

// Errors that are about one field, whichever way Core phrases them
export const QUOTE_ERROR_FIELDS = {
  QUOTE_DUPLICATE: "content",
  QUOTE_NOT_TRADITIONAL: "content",
  QUOTE_NO_HAN: "content",
  QUOTE_EDIT_TOO_LARGE: "content",
};

/** The checks a person can fix without asking the server. Core checks all of them again. */
export function validateQuote({ content, source_from, category }: QuoteDraft) {
  const errors: Record<string, string> = {};
  const length = countChars(content);
  if (length < 2 || length > 100) errors.content = "說說須為 2 至 100 字";
  const source = countChars(source_from);
  if (source < 1 || source > 100) errors.source_from = "來源須為 1 至 100 字";
  if (!category) errors.category = "請選一個類別";
  return errors;
}

type FieldsProps = { draft: QuoteDraft; errors: Record<string, string>; onChange: (draft: QuoteDraft) => void };

export function QuoteFields({ draft, errors, onChange }: FieldsProps) {
  return (
    <>
      <Field label="說說" error={errors.content} hint={`${countChars(draft.content)} / 100 字，僅接受繁體中文`}>
        {(props) => <textarea {...props} className="input" rows={4} value={draft.content} onChange={(event) => onChange({ ...draft, content: event.target.value })} />}
      </Field>
      <Field label="來源" error={errors.source_from} hint="作品、作者或出處；自己寫的可以填「原創」">
        {(props) => <input {...props} className="input" value={draft.source_from} onChange={(event) => onChange({ ...draft, source_from: event.target.value })} />}
      </Field>
      <fieldset className="field" data-invalid={errors.category ? "true" : undefined}>
        <legend>類別</legend>
        <div className="category-picker">
          {CATEGORIES.map(({ key, name }) => (
            <label key={key} className="case-cell" data-on={draft.category === key} style={stockOf(key)}>
              <input
                className="sr-only"
                type="radio"
                name="category"
                value={key}
                checked={draft.category === key}
                onChange={() => onChange({ ...draft, category: key })}
              />
              {name}
            </label>
          ))}
        </div>
        {errors.category && <p className="field-error">{errors.category}</p>}
      </fieldset>
    </>
  );
}

type EditProps<T extends Quote | OwnQuote> = { quote: T; onSaved: (quote: T) => void };

export function EditQuoteButton<T extends Quote | OwnQuote>({ quote, onSaved }: EditProps<T>) {
  return (
    <MorphDialog
      title="編輯說說"
      triggerClassName="text-button"
      label={
        <>
          <Pencil aria-hidden="true" />
          編輯
        </>
      }
    >
      {(close) => <EditQuoteForm quote={quote} onSaved={onSaved} close={close} />}
    </MorphDialog>
  );
}

function EditQuoteForm<T extends Quote | OwnQuote>({ quote, onSaved, close }: EditProps<T> & { close: () => void }) {
  const [draft, setDraft] = useState<QuoteDraft>({ content: quote.content, source_from: quote.source_from, category: quote.category.key });
  const [busy, setBusy] = useState(false);
  const { form, errors, formError, fail, failWith, clear } = useFormErrors(QUOTE_ERROR_FIELDS);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validateQuote(draft);
    if (Object.keys(invalid).length > 0) {
      fail(invalid);
      return;
    }
    const body: Partial<QuoteDraft> = {};
    if (draft.content !== quote.content) body.content = draft.content;
    if (draft.source_from !== quote.source_from) body.source_from = draft.source_from;
    if (draft.category !== quote.category.key) body.category = draft.category;
    if (Object.keys(body).length === 0) {
      close();
      return;
    }
    setBusy(true);
    clear();
    try {
      const saved = await api<Quote>(`/v1/quotes/${quote.id}`, { method: "PATCH", body });
      onSaved({ ...quote, ...saved });
      void notify("已儲存");
      close();
    } catch (failure) {
      failWith(failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" ref={form} onSubmit={(event) => void submit(event)} noValidate>
      <QuoteFields draft={draft} errors={errors} onChange={setDraft} />
      <FormError>{formError}</FormError>
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>
          儲存
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}
