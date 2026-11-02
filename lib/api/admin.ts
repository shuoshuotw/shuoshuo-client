import type { paths } from "@/openapi/types";

type Data<Operation> = Operation extends { responses: { 200: { content: { "application/json": { data: infer Body } } } } } ? Body : never;

export type AdminAppeal = Data<paths["/v1/admin/appeals"]["get"]>[number];
export type AdminUser = Data<paths["/v1/admin/users/{id}"]["get"]>;
export type ResolveCaseResult = Data<paths["/v1/admin/cases/{id}/resolve"]["post"]>;

// §9.8
export const AUDIT_ACTIONS = [
  "case.resolve",
  "quote.edit",
  "quote.review_expired",
  "comment.remove",
  "sanction.create",
  "sanction.lift",
  "account.ban",
  "account.unban",
  "api_key.revoke_all",
  "appeal.resolve",
  "account.delete",
  "api_key.create",
  "api_key.regenerate",
  "api_key.delete",
  "profile.reset",
  "report.threshold_reached",
] as const;
