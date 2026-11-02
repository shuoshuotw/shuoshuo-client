import type { ApiKeyScope, ReportReason, Standing } from "@/lib/api/client";
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

export function standingText(standing: Standing) {
  if (standing.status === "banned") return "帳號已停權";
  if (standing.status === "suspended" && standing.suspended_until) return `暫停提交至 ${formatTime(standing.suspended_until)}`;
  return "狀態正常";
}
