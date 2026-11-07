import { CircleX, TriangleAlert } from "lucide-react";
import type { Standing } from "@/lib/api/client";
import { standingText, suspensionText } from "@/lib/labels";
import { LinkButton } from "./link-button";
import { StateNote } from "./state-note";

/** What a page shows in place of what the account may not do now (submitting, keys): why, and the way to appeal. */
export function BarredNote({ standing }: { standing: Standing }) {
  const banned = standing.status === "banned";
  const until = suspensionText(standing);
  return (
    <StateNote title={standingText(standing)} icon={banned ? CircleX : TriangleAlert} large>
      {until && <p className="state-note-body">{until}</p>}
      {banned && <p className="state-note-body">很抱歉，您的帳號已被系統停權</p>}
      <LinkButton href="/me/standing" color="primary" radius="full" data-magnet>
        查看原因與申訴
      </LinkButton>
    </StateNote>
  );
}
