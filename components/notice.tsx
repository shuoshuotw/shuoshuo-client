import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  /** A link or a button to act on it, on the right (under the words on a phone) */
  action?: ReactNode;
  /** warning: something to look at (a sanction notice, a suspension); danger: a ban */
  tone?: "warning" | "danger";
};

/**
 * Something about the account the reader should know about where it matters: its mark in a disc of its colour, a
 * title and a line, and what to do about it. It rises in once, and glows faintly from its mark's side.
 */
export function Notice({ icon: Icon, title, children, action, tone = "warning" }: Props) {
  return (
    <div className="notice" data-tone={tone} role="status">
      <span className="notice-mark" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className="notice-text">
        <p className="notice-title">{title}</p>
        {children && <p className="notice-body">{children}</p>}
      </div>
      {action && <div className="notice-action">{action}</div>}
    </div>
  );
}
