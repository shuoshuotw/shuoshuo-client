"use client";

import { type ReactNode, useRef, useState } from "react";
import { failureMessage } from "@/lib/api/client";
import { FormError } from "./form";

type Props = {
  label: ReactNode;
  title: string;
  body: ReactNode;
  confirm: string;
  triggerClassName?: string;
  /** Throwing keeps the dialog open with the message in it. */
  onConfirm: () => Promise<void>;
};

/** M-05. A plain dialog in CSS, so a list of rows does not pull HeroUI's Modal in for a yes or no. */
export function ConfirmButton({ label, title, body, confirm, triggerClassName = "text-button", onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      dialog.current?.close();
    } catch (failure) {
      setError(failureMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => dialog.current?.showModal()}>
        {label}
      </button>
      <dialog ref={dialog} className="plain-dialog" aria-label={title}>
        <div className="morph-card">
          <h2 className="dialog-title">{title}</h2>
          <div>{body}</div>
          <FormError>{error}</FormError>
          <div className="dialog-actions">
            <button type="button" className="button button-primary" disabled={busy} onClick={() => void run()}>
              {confirm}
            </button>
            <button type="button" className="button" onClick={() => dialog.current?.close()}>
              取消
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
