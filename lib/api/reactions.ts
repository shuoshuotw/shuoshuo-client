import { API_BASE, ApiFailure, readResponse } from "@/lib/api/client";
import type { ReactionKind } from "@/stores/reactions";

export class SignInRequired extends Error {}

async function accessToken() {
  const { createClient } = await import("@/lib/supabase/browser");
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? null;
}

export async function isSignedIn() {
  return (await accessToken().catch(() => null)) !== null;
}

export async function sendReaction(quoteId: string, kind: ReactionKind, active: boolean) {
  const token = await accessToken();
  if (!token) throw new SignInRequired();
  const response = await fetch(`${API_BASE}/v1/quotes/${quoteId}/${kind}`, {
    method: active ? "PUT" : "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await readResponse<Record<string, number | boolean | string>>(response);
  const activeField = kind === "like" ? "liked" : "favorited";
  const countField = kind === "like" ? "like_count" : "favorite_count";
  if (typeof body[activeField] !== "boolean" || typeof body[countField] !== "number") {
    throw new ApiFailure(500, "INTERNAL_ERROR");
  }
  return { active: body[activeField], count: body[countField] };
}
