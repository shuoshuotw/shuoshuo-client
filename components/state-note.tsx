import { Button } from "@heroui/react";
import { CircleAlert, Feather, type LucideIcon, RotateCw } from "lucide-react";
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

export function RetryNote({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div role="alert">
      <StateNote title={title} icon={CircleAlert}>
        <Button radius="full" variant="bordered" data-magnet startContent={<RotateCw aria-hidden="true" size={18} />} onPress={onRetry}>
          重試
        </Button>
      </StateNote>
    </div>
  );
}
