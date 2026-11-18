"use client";

import { type ReactNode, useState } from "react";
import { failureMessage } from "@/lib/api/client";
import { FormError } from "./form";
import { MorphDialog } from "./morph-dialog";

type Props = {
  label: ReactNode;
  title: string;
  /** Left out when the title asks the whole question */
  body?: ReactNode;
  confirm: string;
  triggerClassName?: string;
  /** The trigger pulls toward the pointer like the controls around it */
  magnet?: boolean;
  /** A warning (signing out, deleting the account) or a question, shown above the title */
  tone?: "warning" | "question";
  /** Runs once the card is back in its button (MorphDialog) */
  onClosed?: () => void;
  /** Names the label, so a change of it eases in (MorphDialog) */
  labelKey?: string;
  /** Throwing keeps the dialog open with the message in it. */
  onConfirm: () => Promise<void>;
  /** A yes that takes nothing away (pinning a comment) is the page's main button, not the red one */
  plain?: boolean;
};

/** A yes or no that grows out of its button like every other dialog (M-04). */
export function ConfirmButton({ label, title, body, confirm, triggerClassName = "text-button", magnet, tone, onClosed, labelKey, onConfirm, plain }: Props) {
  return (
    <MorphDialog label={label} title={title} triggerClassName={triggerClassName} magnet={magnet} tone={tone} onClosed={onClosed} labelKey={labelKey}>
      {(close) => <Confirm body={body} confirm={confirm} onConfirm={onConfirm} close={close} plain={plain} />}
    </MorphDialog>
  );
}

function Confirm({ body, confirm, onConfirm, close, plain }: Pick<Props, "body" | "confirm" | "onConfirm" | "plain"> & { close: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      close();
    } catch (failure) {
      setError(failureMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {body && <div className="morph-body">{body}</div>}
      <FormError>{error}</FormError>
      <div className="dialog-actions">
        <button type="button" className={`button ${plain ? "button-primary" : "button-danger"}`} disabled={busy} onClick={() => void run()}>
          {confirm}
        </button>
        <button type="button" className="button" onClick={close}>
          取消
        </button>
      </div>
    </>
  );
}
