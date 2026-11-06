import { CircleCheck, CircleX, Hourglass } from "lucide-react";
import type { Appeal } from "@/lib/api/client";
import { APPEAL_STATUS } from "@/lib/labels";

/** The back office's tabs for the three states: waiting, accepted, rejected. */
export const APPEAL_ICONS = { pending: Hourglass, accepted: CircleCheck, rejected: CircleX } as const;

const TONES = { pending: undefined, accepted: "success", rejected: "danger" } as const;

/** `enter`: the button it replaces has just been used, so it comes in (blur and a small pop) instead of just standing there. */
export function AppealStatus({ status, enter }: { status: Appeal["status"]; enter?: boolean }) {
  return (
    <span className="status-chip appeal-status" data-tone={TONES[status]} data-enter={enter || undefined}>
      {APPEAL_STATUS[status]}
    </span>
  );
}
