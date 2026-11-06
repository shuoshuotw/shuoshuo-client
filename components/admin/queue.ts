import { CheckCheck, Inbox, Layers, MessageSquare, Quote } from "lucide-react";

export const CASE_TYPES = [
  { key: "all", label: "全部", icon: Layers },
  { key: "quote", label: "說說", icon: Quote },
  { key: "comment", label: "留言", icon: MessageSquare },
] as const;

export const CASE_STATUSES = [
  { key: "open", label: "待處理", icon: Inbox },
  { key: "resolved", label: "已處理", icon: CheckCheck },
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number]["key"];
export type CaseType = (typeof CASE_TYPES)[number]["key"];

/**
 * Which part of the queue a case was opened from (?status=resolved&type=quote), carried into the case so the way back
 * and on through the queue stays in it. The defaults are left out of the address.
 */
export function queueOf(params: URLSearchParams) {
  const status: CaseStatus = params.get("status") === "resolved" ? "resolved" : "open";
  const type: CaseType = CASE_TYPES.find(({ key }) => key === params.get("type"))?.key ?? "all";
  const query = new URLSearchParams();
  if (status !== "open") query.set("status", status);
  if (type !== "all") query.set("type", type);
  const text = query.toString();
  return { status, type, query: text ? `?${text}` : "" };
}
