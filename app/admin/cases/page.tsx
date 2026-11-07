"use client";

import { CheckCheck, Inbox, ListChecks } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useState } from "react";
import { CASE_STATUSES, CASE_TYPES, type CaseStatus, type CaseType, queueOf } from "@/components/admin/queue";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { Digits } from "@/components/digits";
import { ListFooter } from "@/components/list-footer";
import { useRowsEnter } from "@/components/quote-list";
import { Reveal } from "@/components/reveal";
import { usePressRipple } from "@/components/ripple";
import { Segmented } from "@/components/segmented";
import { PageHead } from "@/components/site-chrome";
import { SlidePane } from "@/components/slide-pane";
import { RetryNote, StateNote } from "@/components/state-note";
import type { CaseSummary } from "@/lib/api/client";
import { formatStamp } from "@/lib/format";
import { reasonLabel } from "@/lib/labels";
import { usePagedList } from "@/lib/use-paged-list";

const TYPES = CASE_TYPES;
const STATUSES = CASE_STATUSES;
type Status = CaseStatus;
type Type = CaseType;

export default function CasesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Cases />
    </Suspense>
  );
}

function Cases() {
  const router = useRouter();
  const pathname = usePathname();
  const { status, type, query } = queueOf(useSearchParams());
  const choose = (next: { status?: Status; type?: Type }) => {
    const params = new URLSearchParams({ status: next.status ?? status, type: next.type ?? type });
    router.replace(`${pathname}${queueOf(params).query}`, { scroll: false });
  };
  const { items, status: listStatus, hasMore, loadMore, reload } = usePagedList<CaseSummary>(`/v1/admin/cases?status=${status}&limit=50`);
  const rows = type === "all" ? items : items.filter(({ target_type }) => target_type === type);
  const list = useRowsEnter<HTMLTableSectionElement>(listStatus === "loading" ? 0 : rows.length);

  // The numbers stay while the other half of the queue loads, then change in place (number pop-in)
  const [counts, setCounts] = useState<Record<Type, number> | null>(null);
  if (listStatus !== "loading") {
    const now = { all: items.length, quote: 0, comment: 0 };
    for (const { target_type } of items) now[target_type] += 1;
    if (!counts || TYPES.some(({ key }) => counts[key] !== now[key])) setCounts(now);
  }

  return (
    <>
      {/* On a phone the title, the tabs and the counts stay at the top while the queue scrolls under them */}
      <div className="admin-head">
        <div className="me-head">
          <PageHead icon={ListChecks} title="審核佇列" />
          <Segmented label="案件狀態" options={STATUSES} value={status} onChange={(next) => choose({ status: next })} />
        </div>
        {/* Count cards that filter (§12.7): the number is the question this screen answers */}
        <div className="count-cards" role="group" aria-label="案件類型">
          {TYPES.map(({ key, label, icon: Icon }) => (
            <CountCard key={key} pressed={type === key} onPress={() => choose({ type: key })}>
              <span className="count-card-number">
                {counts ? (
                  <>
                    <Digits value={counts[key]} />
                    {hasMore && "+"}
                  </>
                ) : (
                  "–"
                )}
              </span>
              <span className="count-card-label">
                <Icon aria-hidden="true" size={16} />
                {label}
              </span>
            </CountCard>
          ))}
        </div>
      </div>
      <SlidePane index={STATUSES.findIndex(({ key }) => key === status)}>
        <Reveal loading={listStatus === "loading"} skeleton={<TableSkeleton />}>
          {listStatus === "error" && items.length === 0 ? (
            <RetryNote title="佇列沒有載入成功" onRetry={() => void reload()} />
          ) : rows.length === 0 ? (
            <StateNote title={status === "open" ? "沒有待審核的內容" : "還沒有處理過的案件"} icon={status === "open" ? CheckCheck : Inbox} large />
          ) : (
            <div className="table-scroll" tabIndex={0} role="region" aria-label="案件清單">
              {/* The roles keep it a table to a screen reader where a phone lays its rows out as cards */}
              <table className="table table-cards" role="table">
                <thead role="rowgroup">
                  <tr role="row">
                    <th scope="col" role="columnheader">
                      內容
                    </th>
                    <th scope="col" role="columnheader">
                      類型
                    </th>
                    <th scope="col" role="columnheader">
                      主要原因
                    </th>
                    <th scope="col" role="columnheader" className="numeric">
                      有效 / 全部檢舉
                    </th>
                    <th scope="col" role="columnheader" className="table-nowrap">
                      建立於
                    </th>
                  </tr>
                </thead>
                <tbody ref={list} role="rowgroup">
                  {rows.map((item) => (
                    <tr key={item.id} role="row">
                      <td role="cell" className="case-preview-cell">
                        <Link className="text-link case-preview" href={`/admin/cases/${item.id}${query}`}>
                          {item.preview ?? "內容已不存在"}
                        </Link>
                      </td>
                      <td role="cell" className="table-nowrap" data-label="類型">
                        {item.target_type === "quote" ? "說說" : "留言"}
                      </td>
                      <td role="cell" className="table-nowrap" data-label="原因">
                        {reasonLabel(item.top_reason)}
                      </td>
                      <td role="cell" className="numeric" data-label="檢舉">
                        {item.effective_reporter_count} / {item.reporter_count}
                      </td>
                      <td role="cell" className="table-nowrap" data-label="建立於">
                        {formatStamp(item.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Reveal>
        <ListFooter status={listStatus} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
      </SlidePane>
    </>
  );
}

/** A count that filters, with HeroUI's ripple spreading from where it was pressed (from its middle for a key). */
function CountCard({ pressed, onPress, children }: { pressed: boolean; onPress: () => void; children: ReactNode }) {
  const { spread, ripples } = usePressRipple();
  return (
    <button
      type="button"
      className="count-card"
      data-magnet="soft"
      aria-pressed={pressed}
      onClick={(event) => {
        spread(event);
        onPress();
      }}
    >
      {children}
      {ripples}
    </button>
  );
}
