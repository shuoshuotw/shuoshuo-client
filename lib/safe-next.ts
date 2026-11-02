const BASE = "https://shuoshuotw.invalid";

export const NEXT_COOKIE = "auth_next";

/** SEC-12: only a path on this site may follow a sign-in. Everything else goes home. */
export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const url = new URL(value, BASE);
    return url.origin === BASE ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch {
    return "/";
  }
}
