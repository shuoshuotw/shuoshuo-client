import { CircleX, Shield, ShieldCheck, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import type { Standing } from "@/lib/api/client";
import { heldUntilText, standingText, suspensionText } from "@/lib/labels";

// Green while all is well, yellow while suspended, red once banned; the card's corner glows in the same colour
export const MARKS = { active: ShieldCheck, suspended: TriangleAlert, banned: CircleX };

/**
 * The account's standing, with how many of its strikes are used up as a bar that fills toward the limit. A suspension
 * names itself and says until when on a line of its own; a ban says so instead of counting. Its owner is spoken to;
 * the back office (`about`) reads the same facts about someone else, without the advice.
 */
export function StandingCard({ standing, about = false }: { standing: Standing; about?: boolean }) {
  const Mark = MARKS[standing.status as keyof typeof MARKS] ?? TriangleAlert;
  const until = about ? heldUntilText(standing) : suspensionText(standing);
  const banned = standing.status === "banned";
  return (
    <section className="panel standing-card" data-status={standing.status}>
      <h2 className="block-title">
        <Shield aria-hidden="true" />
        帳號狀態
      </h2>
      <div className="standing-head">
        <p className="standing-text">
          <Mark className="standing-mark" aria-hidden="true" />
          {standingText(standing)}
        </p>
        {until && <p className="standing-until">{until}</p>}
      </div>
      <span className="strike-meter" aria-hidden="true" style={{ "--fill": standing.strike_count / standing.strike_limit } as CSSProperties} />
      <p>
        {about
          ? banned
            ? "該帳號已被系統停權"
            : `該使用者違規 ${standing.strike_count} / ${standing.strike_limit} 次，達 ${standing.strike_limit} 次時帳號將自動停權。`
          : banned
            ? "很抱歉，您的帳號已被系統停權"
            : `違規 ${standing.strike_count} / ${standing.strike_limit} 次。請隨時注意您的帳號狀態，違規達 ${standing.strike_limit} 次時您的帳號將被停權。`}
      </p>
    </section>
  );
}
