import { createHmac } from "node:crypto";
import { API_BASE, type Quote, readResponse } from "./client";

// §7.7. The first secret signs; Core accepts every secret in its list, so rotation needs no coordination.
function internalHeaders(path: string): HeadersInit {
  const secret = process.env.INTERNAL_HMAC_SECRETS?.split(",")[0];
  if (!secret) return {};
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.GET.${path}`).digest("hex");
  return { "X-Shuoshuo-Internal": `v1.${timestamp}.${signature}` };
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: internalHeaders(path), next: { revalidate: 60 } });
  return readResponse<T>(response);
}

// null lets the page render its other sections when Core is down, and lets `next build` run without Core
export async function getRandomQuote(): Promise<Quote | null> {
  return get<Quote>("/v1/quotes/random").catch(() => null);
}

export async function getLatestQuotes(limit: number): Promise<Quote[]> {
  return get<Quote[]>(`/v1/quotes?limit=${limit}`).catch(() => []);
}
