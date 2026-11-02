import { accessToken, api } from "@/lib/api/browser";
import { ApiFailure } from "@/lib/api/client";
import type { ReactionKind } from "@/stores/reactions";

export class SignInRequired extends Error {}

export async function isSignedIn() {
  return (await accessToken().catch(() => null)) !== null;
}

export async function sendReaction(quoteId: string, kind: ReactionKind, active: boolean) {
  if (!(await isSignedIn())) throw new SignInRequired();
  const body = await api<Record<string, number | boolean | string>>(`/v1/quotes/${quoteId}/${kind}`, { method: active ? "PUT" : "DELETE" });
  const activeField = kind === "like" ? "liked" : "favorited";
  const countField = kind === "like" ? "like_count" : "favorite_count";
  if (typeof body[activeField] !== "boolean" || typeof body[countField] !== "number") {
    throw new ApiFailure(500, "INTERNAL_ERROR");
  }
  return { active: body[activeField], count: body[countField] };
}

export async function fetchQuoteState(quoteId: string) {
  const { states } = await api<{ states: Record<string, { liked: boolean; favorited: boolean }> }>(`/v1/me/quote-states?ids=${quoteId}`);
  return states[quoteId];
}
