import type { components } from "@/openapi/types";

type Schemas = components["schemas"];
export type Quote = Schemas["Quote"];
export type OwnQuote = Schemas["OwnQuote"];
export type Comment = Schemas["Comment"];
export type Me = Schemas["Me"];
export type PublicProfile = Schemas["PublicProfile"];
export type ApiKey = Schemas["ApiKey"];
export type ApiKeyWithSecret = Schemas["ApiKeyWithSecret"];
export type ApiKeyScope = Schemas["ApiKeyScope"];
export type ReportReason = Schemas["ReportReason"];
export type FavoriteItem = Schemas["FavoriteItem"];
export type LikeItem = Schemas["LikeItem"];
export type Standing = Schemas["Standing"];
export type Sanction = Schemas["Sanction"];
export type Violation = Schemas["Violation"];
export type Appeal = Schemas["Appeal"];
export type CaseSummary = Schemas["CaseSummary"];
export type CaseDetail = Schemas["CaseDetail"];
export type AuditLog = Schemas["AuditLog"];

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

/** A Core error. `message` is Core's own Traditional Chinese wording, so the client never keeps a second copy. */
export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string = code,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type Envelope<T, M> = {
  data?: T;
  meta?: M;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
};

async function readEnvelope<T, M>(response: Response) {
  const body = (await response.json().catch(() => null)) as Envelope<T, M> | null;
  if (!response.ok || !body || body.data === undefined) {
    const error = body?.error;
    throw new ApiFailure(response.status, error?.code ?? "SERVICE_UNAVAILABLE", error?.message, error?.details);
  }
  return { data: body.data, meta: body.meta };
}

export async function readResponse<T>(response: Response): Promise<T> {
  return (await readEnvelope<T, unknown>(response)).data;
}

export type Page<T> = { items: T[]; nextCursor: string | null };

export async function readPage<T>(response: Response): Promise<Page<T>> {
  const { data, meta } = await readEnvelope<T[], { pagination?: { next_cursor: string | null } }>(response);
  return { items: data, nextCursor: meta?.pagination?.next_cursor ?? null };
}

/** What to show when an action fails: Core's message, or a line about the connection when Core never answered. */
export function failureMessage(error: unknown) {
  return error instanceof ApiFailure && error.message !== error.code ? error.message : "連線沒有成功，請再試一次";
}

/** VALIDATION_FAILED carries one message per field (§8.2.1). */
export function fieldMessages(error: unknown): Record<string, string> {
  if (!(error instanceof ApiFailure) || !Array.isArray(error.details?.fields)) return {};
  const fields = error.details.fields as { field: string; message: string }[];
  return Object.fromEntries(fields.map(({ field, message }) => [field, message]));
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
