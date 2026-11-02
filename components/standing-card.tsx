import type { Standing } from "@/lib/api/client";
import { standingText } from "@/lib/labels";

export function StandingCard({ standing }: { standing: Standing }) {
  return (
    <section className="panel standing-card" data-status={standing.status}>
      <h2 className="block-title">帳號狀態</h2>
      <p className="standing-text">{standingText(standing)}</p>
      <p>
        違規 {standing.strike_count} / {standing.strike_limit} 次。達 {standing.strike_limit} 次時帳號會停權。
      </p>
    </section>
  );
}
