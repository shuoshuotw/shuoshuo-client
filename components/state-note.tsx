import { Feather, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** The empty and failed states of a list or a panel: one line, and what to do about it. */
export function StateNote({ title, icon: Icon = Feather, large = false, children }: { title: string; icon?: LucideIcon; large?: boolean; children?: ReactNode }) {
  return (
    <div className="state-note">
      <span className="state-note-icon" aria-hidden="true">
        <Icon size={large ? 40 : 22} />
      </span>
      <p className="state-note-title">{title}</p>
      {children}
    </div>
  );
}
