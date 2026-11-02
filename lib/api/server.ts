import { createHmac } from "node:crypto";
import { API_BASE, ApiFailure, type FavoriteItem, type LikeItem, type Page, type PublicProfile, type Quote, readPage, readResponse } from "./client";

// §7.7. The first secret signs; Core accepts every secret in its list, so rotation needs no coordination.
function internalHeaders(path: string): HeadersInit {
  const secret = process.env.INTERNAL_HMAC_SECRETS?.split(",")[0];
  if (!secret) return {};
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.GET.${path}`).digest("hex");
  return { "X-Shuoshuo-Internal": `v1.${timestamp}.${signature}` };
}

const request = (path: string) => fetch(`${API_BASE}${path}`, { headers: internalHeaders(path), next: { revalidate: 60 } });

async function get<T>(path: string): Promise<T> {
  return readResponse<T>(await request(path));
}

// null lets the page render its other sections when Core is down, and lets `next build` run without Core
export async function getRandomQuote(): Promise<Quote | null> {
  return get<Quote>("/v1/quotes/random").catch(() => null);
}

export async function getLatestQuotes(limit: number): Promise<Quote[]> {
  return get<Quote[]>(`/v1/quotes?limit=${limit}`).catch(() => []);
}

/** A first page for a list page. null when Core is down: the list then fetches for itself in the browser. */
export async function getFirstPage<T>(path: string): Promise<Page<T> | null> {
  return request(path)
    .then((response) => readPage<T>(response))
    .catch(() => null);
}

export type QuoteLookup = { kind: "found"; quote: Quote } | { kind: "missing" } | { kind: "removed"; reason: string | null };

// Anything but a 404 or 410 throws: an ISR page keeps serving its last good copy instead of caching a failure
export async function lookUpQuote(id: string): Promise<QuoteLookup> {
  try {
    return { kind: "found", quote: await get<Quote>(`/v1/quotes/${encodeURIComponent(id)}`) };
  } catch (error) {
    if (error instanceof ApiFailure && error.status === 404) return { kind: "missing" };
    if (error instanceof ApiFailure && error.status === 410) return { kind: "removed", reason: (error.details?.reason as string | undefined) ?? null };
    throw error;
  }
}

const userPath = (username: string) => `/v1/users/${encodeURIComponent(username)}`;

export async function getProfile(username: string): Promise<PublicProfile | null> {
  try {
    return await get<PublicProfile>(userPath(username));
  } catch (error) {
    if (error instanceof ApiFailure && error.status === 404) return null;
    throw error;
  }
}

/**
 * shortcut: first 50 rows only, because these two lists refuse anonymous browsers and only this server can sign for them.
 * Upgrade to a signed proxy route when someone has more than 50 worth paging through.
 */
export async function getReactionList<T extends LikeItem | FavoriteItem>(username: string, kind: "likes" | "favorites"): Promise<T[] | null> {
  try {
    return await get<T[]>(`${userPath(username)}/${kind}?limit=50`);
  } catch (error) {
    if (error instanceof ApiFailure && (error.status === 401 || error.status === 403 || error.status === 404)) return null;
    throw error;
  }
}
