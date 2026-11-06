"use client";

import { Select, SelectItem } from "@heroui/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { failureMessage, fieldMessages } from "@/lib/api/client";
import { notify } from "@/lib/toast";
import { prefersReduced } from "@/motion/log";
import { springEase } from "@/motion/spring";

type FieldProps = { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined };

type Props = {
  label: string;
  /** Named for a screen reader only, where what is around the field already says what goes in it */
  hideLabel?: boolean;
  error?: string | undefined;
  /** The error turns the field red but its words go elsewhere (a toast) */
  quiet?: boolean;
  hint?: ReactNode;
  /** How much is written, under the field at its right (the submit page's count), the hint beside it */
  count?: ReactNode;
  children: (props: FieldProps) => ReactNode;
};

export function Field({ label, hideLabel, error, quiet = false, hint, count, children }: Props) {
  const id = useId();
  const said = error && !quiet;
  const described = [said ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  const hintLine = hint && (
    <p className="field-hint" id={`${id}-hint`}>
      {hint}
    </p>
  );
  return (
    <div className="field" data-invalid={error ? "true" : undefined}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": described })}
      {count === undefined ? (
        hintLine
      ) : (
        <div className="field-foot">
          {hintLine}
          <span className="field-count" aria-hidden="true">
            {count}
          </span>
        </div>
      )}
      {said && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

type ChoiceProps<K extends string> = {
  label: string;
  value: K;
  options: readonly (readonly [K, string])[];
  onChange: (value: K) => void;
  error?: string | undefined;
  hint?: ReactNode;
};

// The trigger's height (size lg), each choice's row, and the list's inset above its first row and below its last.
// The row that holds the value sits on the trigger, its 48px band centred on the 44px row: band i starts 44 * i down
const TRIGGER_PX = 48;
const ROW_PX = 44;
const INSET_PX = 2;

const LIST_MAX_PX = 420;

const OPEN_EASE = springEase(300, 26);
const SHUT_MS = 340;
const SHUT_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const SLIDE_MS = 170;

/** Where the trigger's band sits in the list when it is centred on this row, from the list's top. */
const bandOf = (list: HTMLElement, row: HTMLElement | null) => {
  if (!row) return 0;
  const top = row.getBoundingClientRect().top - list.getBoundingClientRect().top + (ROW_PX - TRIGGER_PX) / 2;
  return Math.min(Math.max(0, top), list.offsetHeight - TRIGGER_PX);
};

/**
 * One choice of several, as HeroUI's Select, in the manner of bluma.design's: the trigger opens around its own value,
 * the row of the current choice laid over it and the list growing out above and below while the other choices come
 * in nearest first; picking slides the mark to the new choice, and that row travels back into the trigger as the
 * list folds around it. A mouse opens it when the button is let go, so the release never lands on a choice. Inside
 * a dialog its list opens in the dialog's own top layer, or the modal dialog would hold it out of reach.
 */
export function ChoiceField<K extends string>({ label, value, options, onChange, error, hint }: ChoiceProps<K>) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  // The row laid over the trigger while the list is open: the value when it opened
  const [at, setAt] = useState(0);
  const tag = `choice-${useId().replace(/[^a-z0-9]/gi, "")}`;
  const held = useRef(false);
  const shutting = useRef(false);
  const picked = useRef<string | null>(null);
  const index = Math.max(0, options.findIndex(([key]) => key === value));
  // A list taller than it may grow scrolls, so a row's place in it is not where it shows: that one opens under the
  // trigger instead, scrolled to the value, and folds back onto the trigger from its top
  const long = options.length * ROW_PX + 2 * INSET_PX > LIST_MAX_PX;

  const parts = () => {
    const list = document.querySelector<HTMLElement>(`.${tag}`);
    const scroll = list?.querySelector<HTMLElement>(".choice-list");
    const trigger = host?.querySelector<HTMLElement>(".choice-trigger");
    const mark = list?.querySelector<HTMLElement>(".choice-mark");
    if (!list || !scroll || !trigger || !mark) return null;
    const row = (key: string) => list.querySelector<HTMLElement>(`[role="option"][data-key="${CSS.escape(key)}"]`);
    return { list, scroll, trigger, mark, row, rows: [...list.querySelectorAll<HTMLElement>('[role="option"]')] };
  };

  const place = (mark: HTMLElement, row: HTMLElement | null) => {
    if (row) mark.style.translate = `0 ${row.offsetTop + (ROW_PX - 40) / 2}px`;
  };

  // Opening: the list starts as the trigger's band around the current row and grows to its whole height, its inside
  // held still against the page so the rows stay put while the box opens over them
  useLayoutEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const found = parts();
      if (!found) return;
      const { list, scroll, trigger, mark, row, rows } = found;
      const current = row(options[at]![0]);
      if (long && current) scroll.scrollTop = Math.max(0, current.offsetTop - (scroll.clientHeight - ROW_PX) / 2);
      place(mark, current);
      list.dataset.shown = "true";
      if (prefersReduced()) return;
      const band = long ? 0 : bandOf(list, current);
      // Held off its place near an edge of the screen, the list starts over the trigger all the same
      const shift = trigger.getBoundingClientRect().top - list.getBoundingClientRect().top - band;
      list.animate({ height: [`${TRIGGER_PX}px`, `${list.offsetHeight}px`], translate: [`0 ${band + shift}px`, "0 0"] }, OPEN_EASE);
      scroll.animate({ translate: [`0 ${-band}px`, "0 0"] }, OPEN_EASE);
      rows.forEach((item, position) => {
        const distance = Math.abs(position - at);
        if (distance === 0) return;
        item.animate({ opacity: [0, 1], filter: ["blur(3px)", "blur(0)"] }, { duration: 260, delay: 40 + distance * 26, easing: "ease-out", fill: "backwards" });
      });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per opening; `at` is fixed while it is open
  }, [open]);

  const begin = () => {
    setAt(index);
    setOpen(true);
  };

  // Closing: the mark slides to what was picked, the other rows go, and the box folds around that row while carrying
  // it back onto the trigger; then the trigger shows through as the band fades
  const shut = () => {
    const found = parts();
    const key = picked.current ?? options[at]![0];
    picked.current = null;
    if (!found || prefersReduced()) {
      setOpen(false);
      return;
    }
    shutting.current = true;
    const { list, scroll, trigger, mark, row, rows } = found;
    // Closed while still opening: it folds from where it is
    for (const element of [list, scroll, ...rows]) for (const animation of element.getAnimations()) animation.finish();
    const target = row(key);
    list.dataset.shutting = "true";
    const moved = target !== row(options[at]![0]);
    place(mark, target);
    const wait = moved ? SLIDE_MS - 50 : 0;
    const band = bandOf(list, target);
    const landing = trigger.getBoundingClientRect().top - list.getBoundingClientRect().top;
    for (const item of rows) {
      if (item !== target) item.animate({ opacity: [1, 0], filter: ["blur(0)", "blur(3px)"] }, { duration: 160, delay: wait, easing: "ease-out", fill: "forwards" });
    }
    const timing = { duration: SHUT_MS, delay: wait, easing: SHUT_EASE, fill: "forwards" } as const;
    list.animate({ height: [`${list.offsetHeight}px`, `${TRIGGER_PX}px`], translate: ["0 0", `0 ${landing}px`] }, timing);
    scroll.animate({ translate: ["0 0", `0 ${-band}px`] }, timing);
    list
      .animate({ opacity: [1, 0] }, { duration: 110, delay: wait + SHUT_MS, easing: "linear", fill: "forwards" })
      .finished.then(
        () => {
          shutting.current = false;
          setOpen(false);
        },
        () => {
          shutting.current = false;
        },
      );
  };

  return (
    <div
      className="field"
      data-invalid={error ? "true" : undefined}
      ref={setHost}
      onPointerDownCapture={(event) => {
        if (event.pointerType !== "mouse") return;
        held.current = true;
        addEventListener("pointerup", () => (held.current = false), { once: true, capture: true });
      }}
    >
      <Select
        label={label}
        labelPlacement="outside"
        variant="bordered"
        radius="lg"
        size="lg"
        disallowEmptySelection
        disableAnimation
        isOpen={open}
        onOpenChange={(next) => {
          if (shutting.current) return;
          if (!next) shut();
          // A mouse opens it on letting go, as a click: opened on the press, the list lay under the release and the
          // press's own focus took it straight back to the trigger, closing it again
          else if (held.current)
            addEventListener(
              "pointerup",
              () => {
                held.current = false;
                begin();
              },
              { once: true },
            );
          else begin();
        }}
        selectedKeys={[value]}
        onSelectionChange={(keys) => {
          const [next] = keys === "all" ? [] : [...keys];
          if (next === undefined) return;
          picked.current = String(next);
          onChange(String(next) as K);
        }}
        isInvalid={Boolean(error)}
        errorMessage={error}
        description={hint}
        selectorIcon={<ChevronsUpDown />}
        popoverProps={{
          portalContainer: host?.closest("dialog") ?? undefined,
          offset: long ? 6 : -(TRIGGER_PX + INSET_PX + at * ROW_PX + ROW_PX / 2 - TRIGGER_PX / 2),
          shouldFlip: long,
        }}
        listboxProps={{
          hideSelectedIcon: true,
          topContent: (
            <span className="choice-mark" aria-hidden="true">
              <Check size={16} />
            </span>
          ),
          itemClasses: { base: "choice-option" },
        }}
        maxListboxHeight={LIST_MAX_PX}
        classNames={{ label: "choice-label", trigger: "choice-trigger", popoverContent: `choice-popover ${tag}`, listboxWrapper: "choice-list", listbox: "choice-listbox" }}
      >
        {options.map(([key, text]) => (
          <SelectItem key={key}>{text}</SelectItem>
        ))}
      </Select>
    </div>
  );
}

/**
 * M-15: fields shake, their messages appear and focus moves to the first bad one.
 * `codes` names the field a whole-request error belongs to, such as USERNAME_TAKEN.
 */
export function useFormErrors(codes: Record<string, string> = {}) {
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt === 0 || !form.current) return;
    const invalid = form.current.querySelectorAll<HTMLElement>('[data-invalid="true"]');
    invalid.forEach((field) => {
      field.classList.remove("field-shake");
      // Restarts the animation when the same field fails twice
      void field.offsetWidth;
      field.classList.add("field-shake");
    });
    invalid[0]?.querySelector<HTMLElement>("input, textarea, select")?.focus();
  }, [attempt]);

  const fail = useCallback((fields: Record<string, string>) => {
    setErrors(fields);
    setFormError(null);
    setAttempt((value) => value + 1);
  }, []);

  const failWith = (failure: unknown) => {
    const code = (failure as { code?: string }).code;
    const field = code ? codes[code] : undefined;
    const fields = field ? { [field]: failureMessage(failure) } : fieldMessages(failure);
    if (Object.keys(fields).length > 0) fail(fields);
    else {
      setErrors({});
      setFormError(failureMessage(failure));
    }
  };

  const clear = () => {
    setErrors({});
    setFormError(null);
  };

  return { form, errors, formError, fail, failWith, clear };
}

/** Every message a failed request carries, each as its own toast: one per field, or Core's one line. */
export function toastFailure(failure: unknown) {
  const fields = Object.values(fieldMessages(failure));
  for (const message of fields.length > 0 ? fields : [failureMessage(failure)]) void notify(message, "failed");
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="form-error" role="alert">
      {children}
    </p>
  );
}
