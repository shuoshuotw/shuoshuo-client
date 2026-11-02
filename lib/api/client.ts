import type { components } from "@/openapi/types";

export type Quote = components["schemas"]["Quote"];

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export class ApiFailure extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

export async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as { data?: T; error?: { code?: string } } | null;
  if (!response.ok || !body || body.data === undefined) {
    throw new ApiFailure(response.status, body?.error?.code ?? "SERVICE_UNAVAILABLE");
  }
  return body.data;
}

export type QuoteFilter = { categories?: string[] };

export function randomQuotePath(filter: QuoteFilter, format?: "text") {
  const query = new URLSearchParams();
  if (filter.categories?.length) query.set("categories", filter.categories.join(","));
  if (format) query.set("format", format);
  const text = query.toString().replaceAll("%2C", ",");
  return `/v1/quotes/random${text ? `?${text}` : ""}`;
}

export async function fetchRandomQuote(filter: QuoteFilter, signal?: AbortSignal): Promise<Quote> {
  return readResponse<Quote>(await fetch(`${API_BASE}${randomQuotePath(filter)}`, signal ? { signal } : {}));
}
