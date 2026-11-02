"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { CaseDetailView } from "@/components/admin/case-detail";
import { StateNote } from "@/components/state-note";
import type { CaseSummary } from "@/lib/api/client";
import { usePagedList } from "@/lib/use-paged-list";

/** The queue beside the case on a wide screen; only the case on a phone, without the panels (§12.8). */
export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const media = matchMedia("(min-width: 1024px)");
    const update = () => setWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!wide) {
    return (
      <>
        <Link className="text-link" href="/admin/cases">
          回到佇列
        </Link>
        <CaseDetailView id={id} />
      </>
    );
  }

  return (
    <Group className="case-panels" orientation="horizontal">
      <Panel id="queue" defaultSize="28%" minSize="20%" maxSize="45%">
        <CaseQueue current={id} />
      </Panel>
      <Separator className="case-separator" aria-label="調整佇列寬度" />
      <Panel id="case" minSize="40%">
        <div className="case-pane">
          <CaseDetailView id={id} />
        </div>
      </Panel>
    </Group>
  );
}

function CaseQueue({ current }: { current: string }) {
  const { items, status } = usePagedList<CaseSummary>("/v1/admin/cases?status=open&limit=50");
  return (
    <nav className="case-queue" aria-label="案件佇列">
      <Link className="block-title" href="/admin/cases">
        審核佇列
      </Link>
      {status === "ready" && items.length === 0 && <StateNote title="佇列已清空" />}
      {items.map((item) => (
        <Link key={item.id} className="case-queue-item" href={`/admin/cases/${item.id}`} aria-current={item.id === current ? "page" : undefined}>
          <span className="case-preview">{item.preview ?? "內容已不存在"}</span>
          <span className="field-hint">
            {item.target_type === "quote" ? "說說" : "留言"} · 有效檢舉 {item.effective_reporter_count}
          </span>
        </Link>
      ))}
    </nav>
  );
}
