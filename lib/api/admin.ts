import type { paths } from "@/openapi/types";

type Data<Operation> = Operation extends { responses: { 200: { content: { "application/json": { data: infer Body } } } } } ? Body : never;

export type AdminAppeal = Data<paths["/v1/admin/appeals"]["get"]>[number];
export type AdminUser = Data<paths["/v1/admin/users/{id}"]["get"]>;
export type ResolveCaseResult = Data<paths["/v1/admin/cases/{id}/resolve"]["post"]>;

// §9.8, each said the way the log reads it
export const AUDIT_ACTIONS = {
  "case.resolve": "處理檢舉",
  "quote.edit": "編輯說說",
  "quote.review_expired": "審核逾時",
  "comment.remove": "移除留言",
  "sanction.create": "新增處分",
  "sanction.lift": "解除處分",
  "account.ban": "停權帳號",
  "account.unban": "解除停權",
  "api_key.revoke_all": "撤銷全部 API Key",
  "appeal.resolve": "處理申訴",
  "account.delete": "刪除帳號",
  "api_key.create": "建立 API Key",
  "api_key.regenerate": "重新產生 API Key",
  "api_key.delete": "刪除 API Key",
  "profile.reset": "重設名稱",
  "report.threshold_reached": "檢舉達門檻",
} as const;

export const auditAction = (action: string) => AUDIT_ACTIONS[action as keyof typeof AUDIT_ACTIONS] ?? action;

export const AUDIT_TARGETS: Record<string, string> = {
  quote: "說說",
  comment: "留言",
  user: "使用者",
  case: "檢舉",
  sanction: "處分",
  appeal: "申訴",
  api_key: "API Key",
};

export const ACTOR_TYPES = { admin: "管理員", user: "使用者", system: "系統" } as const;
