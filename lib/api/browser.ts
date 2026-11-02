import { API_BASE, type Page, readPage, readResponse } from "./client";

const SESSION_COOKIE = /(?:^|; )sb-[^=]+-auth-token/;

/** Anonymous visitors never load the Supabase SDK: this cookie is the whole check. */
export const hasSessionCookie = () => SESSION_COOKIE.test(document.cookie);

export async function browserAuth() {
  const { createClient } = await import("@/lib/supabase/browser");
  return createClient().auth;
}

export async function accessToken() {
  if (!hasSessionCookie()) return null;
  const auth = await browserAuth();
  const { data } = await auth.getSession();
  return data.session?.access_token ?? null;
}

type Init = { method?: "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown };

async function send(path: string, { method, body }: Init = {}) {
  const token = await accessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${API_BASE}${path}`, {
    headers,
    // Public routes send stale-while-revalidate. Someone signed in has just changed something and must not read the old copy.
    ...(token ? { cache: "no-store" as const } : {}),
    ...(method ? { method } : {}),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export async function api<T>(path: string, init?: Init): Promise<T> {
  const response = await send(path, init);
  // 204: nothing to read
  if (response.status === 204) return undefined as T;
  return readResponse<T>(response);
}

export async function apiPage<T>(path: string): Promise<Page<T>> {
  return readPage<T>(await send(path));
}
