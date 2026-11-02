"use client";

import Link from "next/link";
import { useState } from "react";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { Field } from "@/components/form";
import { ListFooter } from "@/components/list-footer";
import { RetryNote, StateNote } from "@/components/state-note";
import { AUDIT_ACTIONS } from "@/lib/api/admin";
import type { AuditLog } from "@/lib/api/client";
import { formatTime } from "@/lib/format";
import { usePagedList } from "@/lib/use-paged-list";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [target, setTarget] = useState("");
  const query = new URLSearchParams({ limit: "50" });
  if (action) query.set("action", action);
  // Half a UUID is a 400 from Core: wait until it is whole
  if (UUID.test(target.trim())) query.set("target_id", target.trim());
  const { items, status, hasMore, loadMore, reload } = usePagedList<AuditLog>(`/v1/admin/audit-logs?${query}`);

  return (
    <>
      <h1 className="admin-title">稽核日誌</h1>
      <div className="audit-filters">
        <Field label="動作">
          {(props) => (
            <select {...props} className="input" value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="">全部</option>
              {AUDIT_ACTIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="目標 ID">
          {(props) => <input {...props} className="input" value={target} onChange={(event) => setTarget(event.target.value)} />}
        </Field>
      </div>
      {status === "loading" ? (
        <TableSkeleton />
      ) : status === "error" && items.length === 0 ? (
        <RetryNote title="日誌沒有載入成功" onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <StateNote title="沒有符合的紀錄" />
      ) : (
        <div className="table-scroll" tabIndex={0} role="region" aria-label="稽核紀錄">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">時間</th>
                <th scope="col">動作</th>
                <th scope="col">操作者</th>
                <th scope="col">目標</th>
                <th scope="col">內容</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatTime(entry.created_at)}</td>
                  <td>
                    <code>{entry.action}</code>
                  </td>
                  <td>
                    {entry.actor_id ? (
                      <Link className="text-link" href={`/admin/users/${entry.actor_id}`}>
                        {entry.actor_type}
                      </Link>
                    ) : (
                      entry.actor_type
                    )}
                  </td>
                  <td>
                    <code>{entry.target_type ? `${entry.target_type} ${entry.target_id?.slice(0, 8)}` : "–"}</code>
                  </td>
                  <td>
                    {Object.keys(entry.metadata).length > 0 ? (
                      <details>
                        <summary>查看</summary>
                        <pre className="audit-metadata">{JSON.stringify(entry.metadata, null, 2)}</pre>
                      </details>
                    ) : (
                      "–"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ListFooter status={status} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
    </>
  );
}
