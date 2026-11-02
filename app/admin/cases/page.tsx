"use client";

import Link from "next/link";
import { useState } from "react";
import { ListFooter } from "@/components/list-footer";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { RetryNote, StateNote } from "@/components/state-note";
import type { CaseSummary } from "@/lib/api/client";
import { formatTime } from "@/lib/format";
import { reasonLabel } from "@/lib/labels";
import { usePagedList } from "@/lib/use-paged-list";

const TYPES = [
  { key: "all", label: "全部" },
  { key: "quote", label: "說說" },
  { key: "comment", label: "留言" },
] as const;

export default function CasesPage() {
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("all");
  const { items, status: listStatus, hasMore, loadMore, reload } = usePagedList<CaseSummary>(`/v1/admin/cases?status=${status}&limit=50`);
  const rows = type === "all" ? items : items.filter(({ target_type }) => target_type === type);
  const count = (key: (typeof TYPES)[number]["key"]) => {
    const size = key === "all" ? items.length : items.filter(({ target_type }) => target_type === key).length;
    return hasMore ? `${size}+` : String(size);
  };

  return (
    <>
      <div className="admin-head">
        <h1 className="admin-title">審核佇列</h1>
        <div className="segmented" role="group" aria-label="案件狀態">
          <button type="button" aria-pressed={status === "open"} onClick={() => setStatus("open")}>
            待處理
          </button>
          <button type="button" aria-pressed={status === "resolved"} onClick={() => setStatus("resolved")}>
            已處理
          </button>
        </div>
      </div>
      {/* Count cards that filter (§12.7): the number is the question this screen answers */}
      <div className="count-cards" role="group" aria-label="案件類型">
        {TYPES.map(({ key, label }) => (
          <button key={key} type="button" className="count-card" aria-pressed={type === key} onClick={() => setType(key)}>
            <span className="count-card-number">{listStatus === "loading" ? "–" : count(key)}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
      {listStatus === "loading" ? (
        <TableSkeleton />
      ) : listStatus === "error" && items.length === 0 ? (
        <RetryNote title="佇列沒有載入成功" onRetry={() => void reload()} />
      ) : rows.length === 0 ? (
        <StateNote title={status === "open" ? "佇列已清空" : "還沒有處理過的案件"} />
      ) : (
        <div className="table-scroll" tabIndex={0} role="region" aria-label="案件清單">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">內容</th>
                <th scope="col">類型</th>
                <th scope="col">主要原因</th>
                <th scope="col" className="numeric">
                  有效 / 全部檢舉
                </th>
                <th scope="col">建立於</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td className="case-preview-cell">
                    <Link className="text-link case-preview" href={`/admin/cases/${item.id}`}>
                      {item.preview ?? "內容已不存在"}
                    </Link>
                  </td>
                  <td>{item.target_type === "quote" ? "說說" : "留言"}</td>
                  <td>{reasonLabel(item.top_reason)}</td>
                  <td className="numeric">
                    {item.effective_reporter_count} / {item.reporter_count}
                  </td>
                  <td>{formatTime(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ListFooter status={listStatus} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
    </>
  );
}
