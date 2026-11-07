"use client";

import { DateRangePicker } from "@heroui/react";
import { ArrowUpRight, Braces, ScrollText, UserRound, X } from "lucide-react";
import Link from "next/link";
import { type ComponentProps, useEffect, useState } from "react";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { Avatar } from "@/components/avatar";
import { ChoiceField, Field } from "@/components/form";
import { LinkButton } from "@/components/link-button";
import { ListFooter } from "@/components/list-footer";
import { MorphDialog } from "@/components/morph-dialog";
import { useRowsEnter } from "@/components/quote-list";
import { Reveal } from "@/components/reveal";
import { PageHead } from "@/components/site-chrome";
import { RetryNote, StateNote } from "@/components/state-note";
import { ACTOR_TYPES, AUDIT_ACTIONS, AUDIT_TARGETS, auditAction } from "@/lib/api/admin";
import type { AuditLog } from "@/lib/api/client";
import { formatDate, formatStamp } from "@/lib/format";
import { usePagedList } from "@/lib/use-paged-list";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The days are Taipei's, the zone every time on the site is shown in (lib/format.ts)
const dayStart = (day: string) => `${day}T00:00:00+08:00`;
const dayEnd = (day: string) => `${day}T23:59:59.999+08:00`;

type Range = ComponentProps<typeof DateRangePicker>["value"];

/** Typing a name asks Core once the typing stops, not once a key. */
function useSettled(value: string) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
}

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [target, setTarget] = useState("");
  const [range, setRange] = useState<Range>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const name = useSettled(actor.trim());
  const query = new URLSearchParams({ limit: "50" });
  if (action) query.set("action", action);
  if (name) query.set(UUID.test(name) ? "actor_id" : "actor", name);
  // Half a UUID is a 400 from Core: wait until it is whole
  if (UUID.test(target.trim())) query.set("target_id", target.trim());
  // A calendar date prints as 2026-11-06
  if (range?.start) query.set("from", dayStart(range.start.toString()));
  if (range?.end) query.set("to", dayEnd(range.end.toString()));
  const { items, status, hasMore, loadMore, reload } = usePagedList<AuditLog>(`/v1/admin/audit-logs?${query}`);
  const list = useRowsEnter<HTMLTableSectionElement>(status === "loading" ? 0 : items.length);

  return (
    <>
      <PageHead icon={ScrollText} title="稽核日誌" />
      <div className="audit-filters">
        <ChoiceField
          label="動作"
          value={action || "all"}
          options={[["all", "全部"], ...(Object.entries(AUDIT_ACTIONS) as [string, string][])]}
          onChange={(next) => setAction(next === "all" ? "" : next)}
        />
        <Field label="操作者">
          {(props) => <input {...props} className="input" placeholder="名稱或 UUID" value={actor} onChange={(event) => setActor(event.target.value)} />}
        </Field>
        <Field label="操作目標 ID">
          {(props) => <input {...props} className="input" placeholder="UUID" value={target} onChange={(event) => setTarget(event.target.value)} />}
        </Field>
        {/* The whole field opens the calendar: the magnet draws the field toward the pointer and lights it whole, so its
            small calendar button alone was a target hard to find under it */}
        <div
          className="field audit-range"
          onClickCapture={(event) => {
            if (!(event.target as Element).closest(".range-clear")) setRangeOpen(true);
          }}
        >
          <DateRangePicker
            label="期間"
            labelPlacement="outside"
            variant="bordered"
            radius="lg"
            size="lg"
            isOpen={rangeOpen}
            onOpenChange={setRangeOpen}
            value={range}
            onChange={setRange}
            endContent={
              range && (
                <button type="button" className="range-clear" aria-label="清除期間" onClick={() => setRange(null)}>
                  <X aria-hidden="true" size={16} />
                </button>
              )
            }
            classNames={{ label: "choice-label", inputWrapper: "choice-trigger" }}
          />
        </div>
      </div>
      <Reveal loading={status === "loading"} skeleton={<TableSkeleton />}>
        {status === "error" && items.length === 0 ? (
          <RetryNote title="日誌沒有載入成功" onRetry={() => void reload()} />
        ) : items.length === 0 ? (
          <StateNote title="沒有符合的紀錄" icon={ScrollText} large />
        ) : (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="稽核紀錄">
            {/* The roles keep it a table to a screen reader where a phone lays its rows out as cards */}
            <table className="table table-cards" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader" className="table-nowrap">
                    時間
                  </th>
                  <th scope="col" role="columnheader">
                    動作
                  </th>
                  <th scope="col" role="columnheader">
                    操作者
                  </th>
                  <th scope="col" role="columnheader">
                    操作目標
                  </th>
                  <th scope="col" role="columnheader" className="table-center">
                    詳細內容
                  </th>
                </tr>
              </thead>
              <tbody ref={list} role="rowgroup">
                {items.map((entry) => (
                  <tr key={entry.id} role="row">
                    <td role="cell" className="table-nowrap numeric-time" data-label="時間">
                      {formatStamp(entry.created_at)}
                    </td>
                    <td role="cell" className="table-lead">
                      <span className="audit-action">{auditAction(entry.action)}</span>
                    </td>
                    <td role="cell" data-label="操作者">
                      {entry.actor ? <ActorCard entry={entry} /> : ACTOR_TYPES[entry.actor_type]}
                    </td>
                    <td role="cell" data-label="操作目標">
                      <AuditTarget entry={entry} />
                    </td>
                    <td role="cell" className="table-center" data-label="詳細內容">
                      {Object.keys(entry.metadata).length > 0 ? (
                        <MorphDialog
                          label={
                            <>
                              <Braces aria-hidden="true" />
                              查看
                            </>
                          }
                          title={auditAction(entry.action)}
                          className="audit-dialog"
                          triggerClassName="text-button"
                          closeButton
                          magnet
                        >
                          {() => <pre className="audit-metadata">{JSON.stringify(entry.metadata, null, 2)}</pre>}
                        </MorphDialog>
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
      </Reveal>
      <ListFooter status={status} hasMore={hasMore} empty={items.length === 0} loadMore={loadMore} auto={false} />
    </>
  );
}

/** What the entry was done to: its kind, and the start of its id, which leads to it where the back office has a page for it. */
function AuditTarget({ entry }: { entry: AuditLog }) {
  if (!entry.target_type || !entry.target_id) return "–";
  const kind = AUDIT_TARGETS[entry.target_type] ?? entry.target_type;
  const id = <code>{entry.target_id.slice(0, 8)}</code>;
  const href = entry.target_type === "user" ? `/admin/users/${entry.target_id}` : entry.target_type === "case" ? `/admin/cases/${entry.target_id}` : null;
  return (
    <span className="audit-target">
      {kind}
      {href ? (
        <Link className="text-link" href={href}>
          {id}
        </Link>
      ) : (
        id
      )}
    </span>
  );
}

/**
 * Who did it, by the name they go by now; pressed, what the back office may know of them: their id, in what capacity
 * they acted, since when they have been here. Nothing private (no email, no sign-in).
 */
function ActorCard({ entry }: { entry: AuditLog }) {
  const actor = entry.actor!;
  return (
    <MorphDialog
      label={
        <>
          {actor.username}
          <ArrowUpRight aria-hidden="true" />
        </>
      }
      title="操作者"
      className="actor-dialog"
      triggerClassName="text-button actor-trigger cell-button"
      closeButton
      magnet
    >
      {() => (
        <>
          <div className="actor-head">
            <Avatar url={actor.avatar_url} name={actor.username} size={48} />
            <div>
              <p className="actor-name">{actor.username}</p>
              <p className="field-hint">
                {ACTOR_TYPES[entry.actor_type]}
                {actor.deleted && "・帳號已刪除"}
              </p>
            </div>
          </div>
          <dl className="actor-facts">
            <div>
              <dt>UUID</dt>
              <dd>
                <code>{actor.id}</code>
              </dd>
            </div>
            <div>
              <dt>加入日期</dt>
              <dd>{formatDate(actor.created_at)}</dd>
            </div>
          </dl>
          <LinkButton href={`/admin/users/${actor.id}`} radius="full" variant="bordered" data-magnet startContent={<UserRound aria-hidden="true" size={18} />}>
            查看使用者
          </LinkButton>
        </>
      )}
    </MorphDialog>
  );
}
