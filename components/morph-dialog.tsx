"use client";

import { CircleAlert, CircleQuestionMark, X } from "lucide-react";
import { type ReactNode, startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { closeMorph, followContents, type MorphParts, openMorph } from "@/motion/dialog-morph";
import { prefersReduced } from "@/motion/log";

type Props = {
  label: ReactNode;
  title: string;
  triggerClassName?: string;
  /** For a trigger whose label is not text alone */
  triggerLabel?: string;
  /** The trigger pulls toward the pointer like the controls around it */
  magnet?: boolean;
  /** On the <dialog>, for a dialog laid out apart from the rest */
  className?: string;
  /** An X beside the title closes it, for a dialog with no buttons of its own at its foot */
  closeButton?: boolean;
  /** The card grows out of the button itself, not the bar or card around it */
  fromTrigger?: boolean;
  /** What the dialog asks: a warning that keeps signalling (a step out of the account), or a question */
  tone?: "warning" | "question";
  /** Once the card is back in its button; a change made then shows on the button instead of in the closing card */
  onClosed?: () => void;
  /** Names the label: when it changes the button eases to its new width and the new words come in */
  labelKey?: string;
  /** A function renders its own buttons and is handed `close`, so a form can close itself when it is done. */
  children: ReactNode | ((close: () => void) => ReactNode);
};

const TONES = { warning: CircleAlert, question: CircleQuestionMark };

// The dialogs open now, the last one on top: Esc and the focus belong to that one
const stack: HTMLDialogElement[] = [];

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * While a dialog is open everything else on the body is hidden from assistive technology, and its focus cannot leave it.
 * This is what showModal gave, without its cost: showModal made the whole page inert and moved the dialog into the top
 * layer, a restyle of every element and a repaint that held a phone up for several frames as the card landed and again
 * as it went. Hands back what it hid.
 */
function hold(dialog: HTMLDialogElement) {
  const hidden = [...document.body.children].filter((element) => element !== dialog && !element.hasAttribute("aria-hidden"));
  for (const element of hidden) element.setAttribute("aria-hidden", "true");
  const keep = (event: FocusEvent) => {
    if (stack.at(-1) !== dialog || dialog.contains(event.target as Node)) return;
    dialog.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  };
  document.addEventListener("focusin", keep);
  return () => {
    for (const element of hidden) element.removeAttribute("aria-hidden");
    document.removeEventListener("focusin", keep);
  };
}

/**
 * M-04. A native <dialog>, opened without being modal (see hold), so returning focus to the button stays the browser's
 * and the rest is kept here. The card grows out of what the button sits in: the whole bar or card marked
 * data-morph-origin, or the button itself. That origin fades out while the card is open and the card shrinks back into
 * it (dialog-morph.ts). The dialog lives on the body, so no tilted card or docked bar around the button ever holds it in.
 */
export function MorphDialog({ label, title, triggerClassName = "button", triggerLabel, magnet, className, closeButton, fromTrigger, tone, onClosed, labelKey, children }: Props) {
  const closed = useRef(onClosed);
  closed.current = onClosed;
  // The label the button was first drawn with: a later one comes in with its own small move
  const firstLabel = useRef(labelKey);
  const width = useRef(0);
  const Tone = tone ? TONES[tone] : null;
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  // A press that began on the backdrop: a click that starts on a control and ends elsewhere (a list that unfolded over
  // its select) lands on the dialog too, and must not close it
  const pressedBackdrop = useRef(false);
  // Lets go of the page (hold) and of Esc once the dialog has closed
  const letGo = useRef<(() => void) | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  // The contents are first rendered on the first open: a page of cards keeps one closed dialog each
  const [used, setUsed] = useState(false);
  useEffect(() => setHost(document.body), []);
  // Once its parts are on the body: the open card follows what is in it as that grows or shrinks
  useEffect(() => {
    if (!host || !dialog.current || !card.current || !inner.current) return;
    return followContents({ dialog: dialog.current, card: card.current, inner: inner.current });
  }, [host]);
  // Left while open (a link in it went to another page): the page is given back all the same
  useEffect(() => () => letGo.current?.(), []);

  // A new label: the button eases from its old width to its new one (a width is not something CSS eases to from auto)
  useLayoutEffect(() => {
    const button = trigger.current;
    if (!button || !labelKey) return;
    const before = width.current;
    const now = button.offsetWidth;
    width.current = now;
    if (!before || Math.abs(before - now) < 1 || prefersReduced()) return;
    button.animate({ width: [`${before}px`, `${now}px`] }, { duration: 380, easing: "cubic-bezier(0.32, 0.72, 0, 1)" });
  }, [labelKey]);

  const parts = (): MorphParts | null => {
    const from = origin.current;
    if (!dialog.current || !card.current || !inner.current || !scrim.current || !from) return null;
    return { dialog: dialog.current, card: card.current, inner: inner.current, scrim: scrim.current, origin: from };
  };

  // The contents are built as soon as the pointer or the focus comes to the button (a finger: as it touches down), so a
  // first open has little left to do while the card grows; built in slices, so the press itself still springs at once
  const prepare = () => {
    if (!used) startTransition(() => setUsed(true));
  };

  const open = () => {
    const button = trigger.current;
    // Not again while the card is still growing: the dialog only becomes open once it has landed
    if (!button || dialog.current?.open || dialog.current?.dataset.morphing) return;
    // Rendered before the card is measured, so it grows to its real size
    flushSync(() => setUsed(true));
    origin.current = fromTrigger ? button : (button.closest<HTMLElement>("[data-morph-origin]") ?? button);
    const morph = parts();
    if (!morph) return;
    // Esc turns the card round where it is, or closes it once open, before the page's own Esc (the way back from a
    // quote) can take it. Only the dialog on top, and not while a list in it is open, whose own Esc that is
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || stack.at(-1) !== morph.dialog || (event.target as Element | null)?.closest?.("[role='listbox']")) return;
      event.preventDefault();
      close();
    };
    addEventListener("keydown", escape, true);
    stack.push(morph.dialog);
    let release: (() => void) | null = null;
    // Held until the card is back in its origin
    letGo.current = () => {
      release?.();
      stack.splice(stack.indexOf(morph.dialog), 1);
      removeEventListener("keydown", escape, true);
      letGo.current = null;
    };
    void openMorph(morph, () => {
      morph.dialog.inert = false;
      morph.dialog.show();
      release = hold(morph.dialog);
    });
  };

  const close = () => {
    const morph = parts();
    // Also while the card is still growing
    if (!morph || !(morph.dialog.open || morph.dialog.dataset.morphing)) return;
    void closeMorph(morph, () => {
      morph.dialog.close();
      morph.dialog.inert = true;
      letGo.current?.();
    }).then(() => {
      trigger.current?.focus();
      closed.current?.();
    });
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={triggerClassName}
        aria-label={triggerLabel}
        data-magnet={magnet || undefined}
        data-label-swap={labelKey ? true : undefined}
        onPointerEnter={prepare}
        onPointerDown={prepare}
        onFocus={prepare}
        onClick={open}
      >
        {labelKey ? (
          <span key={labelKey} className="label-swap" data-changed={labelKey !== firstLabel.current || undefined}>
            {label}
          </span>
        ) : (
          label
        )}
      </button>
      {host &&
        createPortal(
          <dialog
            ref={dialog}
            className={className ? `morph-dialog ${className}` : "morph-dialog"}
            aria-label={title}
            aria-modal="true"
            // Laid out even while closed (so the morph can measure it), so kept out of reach and out of the tree
            inert
            onCancel={(event) => {
              event.preventDefault();
              close();
            }}
            onPointerDown={(event) => {
              pressedBackdrop.current = event.target === scrim.current;
            }}
            onClick={(event) => {
              if (pressedBackdrop.current && event.target === scrim.current) close();
              pressedBackdrop.current = false;
            }}
          >
            <div ref={scrim} className="morph-scrim" />
            <div ref={card} className="morph-card">
              <div ref={inner} className="morph-inner">
                {Tone && (
                  <span className="dialog-tone" data-tone={tone} aria-hidden="true">
                    <Tone size={30} />
                  </span>
                )}
                {closeButton ? (
                  <div className="dialog-head">
                    <h2 className="dialog-title">{title}</h2>
                    <button type="button" className="dialog-close" aria-label="關閉" data-magnet onClick={close}>
                      <X aria-hidden="true" size={20} />
                    </button>
                  </div>
                ) : (
                  <h2 className="dialog-title">{title}</h2>
                )}
                {used &&
                  (typeof children === "function" ? (
                    children(close)
                  ) : (
                    <>
                      <div className="morph-body">{children}</div>
                      <button type="button" className="button button-primary" onClick={close}>
                        關閉
                      </button>
                    </>
                  ))}
              </div>
            </div>
          </dialog>,
          host,
        )}
    </>
  );
}
