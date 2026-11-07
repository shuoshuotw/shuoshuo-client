"use client";

import { Tooltip } from "@heroui/react";
import { Check, CircleQuestionMark, Pencil } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api/browser";
import type { OwnQuote, Quote } from "@/lib/api/client";
import { CATEGORIES } from "@/lib/categories";
import { countChars } from "@/lib/format";
import { notify } from "@/lib/toast";
import { categoryMotion } from "@/motion/category";
import { CategoryIcon } from "./category-icon";
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
  if (source < 1 || source > 100) errors.source_from = "出處須為 1 至 100 字";
  if (!category) errors.category = "請選一個類別";
  return errors;
}

type FieldsProps = {
  draft: QuoteDraft;
  errors: Record<string, string>;
  onChange: (draft: QuoteDraft) => void;
  /** Off where the page writes the sentence in a composer of its own */
  withContent?: boolean;
  /** The messages are toasts; the fields only turn red */
  quietErrors?: boolean;
};

export function QuoteFields({ draft, errors, onChange, withContent = true, quietErrors = false }: FieldsProps) {
  return (
    <>
      {withContent && (
        <Field label="說說" error={errors.content} quiet={quietErrors} hint={`${countChars(draft.content)} / 100 字，僅接受繁體中文`}>
          {(props) => <textarea {...props} className="input" rows={4} value={draft.content} onChange={(event) => onChange({ ...draft, content: event.target.value })} />}
        </Field>
      )}
      <Field
        label="出處"
        error={errors.source_from}
        quiet={quietErrors}
        hint={
          <>
            這則說說來自哪位作者，或哪個
            {/* The question mark never wraps onto a line of its own */}
            <span className="nowrap">
              好作品？
              <SourceHelp />
            </span>
          </>
        }
      >
        {(props) => <input {...props} className="input" value={draft.source_from} onChange={(event) => onChange({ ...draft, source_from: event.target.value })} />}
      </Field>
      <fieldset className="field" data-invalid={errors.category ? "true" : undefined}>
        <legend>類別</legend>
        <div className="category-picker">
          {CATEGORIES.map(({ key, name }) => (
            <label key={key} className="case-cell" data-magnet data-on={draft.category === key} style={stockOf(key)}>
              <CategoryIcon category={key} size={15} />
              <input
                className="sr-only"
                type="radio"
                name="category"
                value={key}
                checked={draft.category === key}
                onChange={(event) => {
                  onChange({ ...draft, category: key });
                  // Its icon performs its own move, as on the categories bar (M-20)
                  categoryMotion(event.currentTarget.closest("label")?.querySelector(".category-icon"));
                }}
              />
              {name}
            </label>
          ))}
        </div>
        {errors.category && !quietErrors && <p className="field-error">{errors.category}</p>}
      </fieldset>
    </>
  );
}

const ORIGINAL_TIP = "若是自己發想的，可以填「原創」";

/** A question mark after the source's hint; under the pointer or focus, or tapped on a phone, it says what to write for one's own words. */
function SourceHelp() {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip content={ORIGINAL_TIP} isOpen={open} onOpenChange={setOpen} isDismissable showArrow placement="top" classNames={{ content: "tip" }}>
      <button type="button" className="hint-help" aria-label={ORIGINAL_TIP} onClick={() => setOpen(true)}>
        <CircleQuestionMark aria-hidden="true" size={16} />
      </button>
    </Tooltip>
  );
}

type EditProps<T extends Quote | OwnQuote> = { quote: T; onSaved: (quote: T) => void };
type EditButtonProps<T extends Quote | OwnQuote> = EditProps<T> & { triggerClassName?: string };

export function EditQuoteButton<T extends Quote | OwnQuote>({ quote, onSaved, triggerClassName = "text-button" }: EditButtonProps<T>) {
  return (
    <MorphDialog
      title="編輯說說"
      triggerClassName={triggerClassName}
      magnet={triggerClassName !== "text-button"}
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
          <Check aria-hidden="true" />
          儲存
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </form>
  );
}
