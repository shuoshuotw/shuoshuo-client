import type { ApiKeyScope, Appeal, ReportReason, ReportReasonInput, Sanction, Standing } from "@/lib/api/client";
import { formatTime } from "./format";

/** What a removal or a case was decided as: the name of the category, as a moderator and the person removed read it. */
export const REPORT_REASONS: Record<ReportReason, string> = {
  harassment: "騷擾、霸凌或虐待",
  hate: "仇恨或過激言論",
  self_harm: "自傷或自殘",
  violence: "暴力、冒犯性或惡意內容",
  spam: "垃圾內容",
  misinformation: "詐欺或不實內容",
  sexual: "色情內容",
  privacy: "侵害隱私",
  intellectual_property: "侵害著作權",
  simplified_chinese: "使用簡體中文",
  security_risk: "安全風險",
  other: "其他",
};

/**
 * The same reasons as the person reporting is asked them, in the order they are offered. 我就是不喜歡 is answered like
 * the rest and never becomes a report (Core, §9.2); 其他 is no longer offered.
 */
export const REPORT_CHOICES: [ReportReasonInput, string][] = [
  ["harassment", "騷擾、霸凌或虐待"],
  ["hate", "仇恨或過激言論"],
  ["self_harm", "自傷或自殘"],
  ["violence", "暴力、冒犯性或惡意內容"],
  ["spam", "垃圾內容"],
  ["misinformation", "詐欺或不實內容"],
  ["sexual", "色情內容"],
  ["privacy", "侵害了我或者其他人的隱私"],
  ["intellectual_property", "侵害了我或其他人的著作權"],
  ["simplified_chinese", "使用了簡體中文"],
  ["security_risk", "使平台或使用者帶來安全風險"],
  ["dislike", "我就是不喜歡"],
];

export const reasonLabel = (reason: string | null | undefined) => (reason ? (REPORT_REASONS[reason as ReportReason] ?? reason) : "違反內容規範");

/** A key reads and submits. Editing, deleting and commenting take the person signed in (Core, §7.5). */
export const API_SCOPES: Record<ApiKeyScope, string> = {
  "quotes:read": "讀取說說與留言",
  "quotes:write": "提交說說",
  "reactions:write": "按讚與收藏",
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
