"use client";

import { type ReactNode, useId, useRef } from "react";
import { morphDialog } from "@/motion/anime";

type Props = {
  label: ReactNode;
  title: string;
  triggerClassName?: string;
  /** A function renders its own buttons and is handed `close`, so a form can close itself when it is done. */
  children: ReactNode | ((close: () => void) => ReactNode);
};

/**
 * M-04. A native <dialog>, so the focus trap, Esc, the backdrop and returning focus to the button all
 * belong to the browser; the animation only has to move things.
 */
export function MorphDialog({ label, title, triggerClassName = "button", children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const layoutId = useId();

  const open = () => {
    const element = dialog.current;
    if (element && !element.open) void morphDialog(element, true, () => element.showModal());
  };

  const close = () => {
    const element = dialog.current;
    if (!element?.open) return;
    // The button is hidden while the layout animates, so focus can only return to it afterwards
    void morphDialog(element, false, () => element.close()).then(() => trigger.current?.focus());
  };

  return (
    <>
      <button ref={trigger} type="button" className={triggerClassName} data-layout-id={layoutId} onClick={open}>
        {label}
      </button>
      <dialog
        ref={dialog}
        className="morph-dialog"
        aria-label={title}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <div className="morph-card" data-layout-id={layoutId}>
          <h2 className="dialog-title">{title}</h2>
          {typeof children === "function" ? (
            children(close)
          ) : (
            <>
              <div className="morph-body">{children}</div>
              <button type="button" className="button button-primary" onClick={close}>
                關閉
              </button>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
