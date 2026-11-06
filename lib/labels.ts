import type { ApiKeyScope, Appeal, ReportReason, Sanction, Standing } from "@/lib/api/client";
import { formatTime } from "./format";

export const REPORT_REASONS: Record<ReportReason, string> = {
  harassment: "騷擾或霸凌",
  hate: "仇恨言論",
  sexual: "色情內容",
  violence: "暴力內容",
  privacy: "侵犯隱私",
  spam: "垃圾內容",
  misinformation: "不實資訊",
  simplified_chinese: "使用簡體中文",
  other: "其他",
};

export const reasonLabel = (reason: string | null | undefined) => (reason ? (REPORT_REASONS[reason as ReportReason] ?? reason) : "違反內容規範");

export const API_SCOPES: Record<ApiKeyScope, string> = {
  "quotes:read": "讀取說說",
  "quotes:write": "提交與編輯說說",
  "reactions:write": "按讚與收藏",
  "comments:write": "留言",
  "me:read": "讀取我的資料",
};

export const SANCTION_KINDS: Record<Sanction["kind"], string> = {
  submit_suspension: "暫停提交",
  account_ban: "帳號停權",
};

export const APPEAL_STATUS: Record<Appeal["status"], string> = {
  pending: "審核中",
  accepted: "已接受",
  rejected: "已駁回",
};

export function standingText(standing: Standing) {
  if (standing.status === "banned") return "帳號已停權";
  if (standing.status === "suspended") return "暫停提交";
  return "狀態正常";
}

/** The same suspension as the back office reads it: about the account, not to its owner. */
export function heldUntilText(standing: Standing) {
  if (standing.status !== "suspended" || !standing.suspended_until) return null;
  return `該使用者在 ${formatTime(standing.suspended_until)} 前處於封禁狀態`;
}

/** The line under a suspension's title: until when, and what it stops (說說 on the cards, 留言 under a quote). */
export function suspensionText(standing: Standing, what: "說說" | "留言" = "說說") {
  if (standing.status !== "suspended" || !standing.suspended_until) return null;
  return `直至 ${formatTime(standing.suspended_until)}，你無法發表新的${what}`;
}
