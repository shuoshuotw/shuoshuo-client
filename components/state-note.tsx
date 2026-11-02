import type { ReactNode } from "react";

/** The empty and failed states of a list or a panel: one line, and what to do about it. */
export function StateNote({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-note">
      <p className="state-note-title">{title}</p>
      {children}
    </div>
  );
}

export function RetryNote({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <StateNote title={title}>
        <button type="button" className="button" onClick={onRetry}>
          重試
        </button>
      </StateNote>
    </div>
  );
}
