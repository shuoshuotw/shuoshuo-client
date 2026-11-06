import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test as base, type BrowserContext, expect, type Page } from "@playwright/test";

export { expect };

export const CORE = "http://localhost:3001";
const SUPABASE = "http://127.0.0.1:54321";

// CI passes it in; locally Core's own env file holds the CLI's default
function secretKey() {
  if (process.env.SUPABASE_SECRET_KEY) return process.env.SUPABASE_SECRET_KEY;
  const file = "../shuoshuo-core/.env.local";
  const line = existsSync(file) ? readFileSync(file, "utf8").match(/^SUPABASE_SECRET_KEY=(.+)$/m) : null;
  if (!line?.[1]) throw new Error("SUPABASE_SECRET_KEY is not set");
  return line[1].trim();
}

const SECRET = secretKey();
const adminHeaders = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" };

const randomIp = () => `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

/** Each test gets its own address, so a whole run from one machine does not spend one address's AUTH-GUARD quota (§10.4). */
export async function distinctCaller(context: BrowserContext) {
  const ip = randomIp();
  await context.route(`${CORE}/**`, (route) => route.continue({ headers: { ...route.request().headers(), "cf-connecting-ip": ip } }));
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await distinctCaller(context);
    await use(context);
  },
});

export type TestUser = { id: string; email: string; password: string; username: string };

async function checked(response: Response) {
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.url} ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

/** The Admin API skips the signup Hook (§6.7), so tests can have password users. The name comes from the auth trigger. */
export async function newUser(metadata: Record<string, unknown> = {}): Promise<TestUser> {
  const email = `${randomUUID()}@example.com`;
  const password = randomUUID();
  const fullName = `測試${randomUUID().slice(0, 8)}`;
  const created = await checked(
    await fetch(`${SUPABASE}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName, ...metadata } }),
    }),
  );
  const [profile] = await rest(`profiles?id=eq.${created.id}&select=username`);
  return { id: created.id, email, password, username: profile.username };
}

/** Service-role PostgREST, for the state a test cannot reach through the product. */
export async function rest(path: string, init: { method?: string; body?: unknown; schema?: string } = {}) {
  return checked(
    await fetch(`${SUPABASE}/rest/v1/${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...adminHeaders,
        Prefer: "return=representation",
        ...(init.schema ? { "Content-Profile": init.schema, "Accept-Profile": init.schema } : {}),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    }),
  );
}

export async function makeAdmin(user: TestUser) {
  await rest("user_roles", { method: "POST", body: { user_id: user.id, role: "admin" } });
}

/** Reports only count toward the threshold from accounts at least 7 days old (§9.2). */
export async function ageAccount(user: TestUser) {
  await rest(`profiles?id=eq.${user.id}`, { method: "PATCH", body: { created_at: "2020-01-01T00:00:00Z" } });
}

export async function signIn(page: Page, user: TestUser) {
  await page.goto("/dev/sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/me");
  await expect(page.getByRole("heading", { level: 1, name: "我的帳號" })).toBeVisible();
}

export async function signOut(page: Page) {
  await page.goto("/me");
  await page.getByRole("button", { name: "從此裝置登出" }).click();
  await page.getByRole("dialog", { name: "從此裝置登出" }).getByRole("button", { name: "登出", exact: true }).click();
  await page.waitForURL("/");
}

/** A Traditional Chinese quote that has never existed, so duplicate detection stays out of the way. */
export const uniqueQuote = (text = "測試") => `${text}${randomUUID().replaceAll("-", "").replace(/\d/g, (digit) => "零一二三四五六七八九"[Number(digit)]!).slice(0, 20)}`;

export async function submitQuote(page: Page, content = uniqueQuote()) {
  await page.goto("/submit");
  await page.getByLabel("說說", { exact: true }).fill(content);
  await page.getByLabel("出處").fill("全堆疊測試");
  await page.getByRole("radio", { name: "原創" }).check({ force: true });
  // M-08 ends on the home page, so the new quote's id comes from Core's answer
  const created = page.waitForResponse((response) => response.url().endsWith("/v1/quotes") && response.request().method() === "POST");
  await page.getByRole("button", { name: "送出" }).click();
  const id = ((await (await created).json()) as { data: { id: string } }).data.id;
  await page.waitForURL("/");
  await page.goto(`/q/${id}`);
  return { content, id };
}

export const quoteHeading = (page: Page) => page.getByTestId("quote-text");

export async function coreToken(user: TestUser) {
  const session = await checked(
    await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH", "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: user.password }),
    }),
  );
  return session.access_token as string;
}

/** A different caller for each request, so a test's setup does not spend the browser's per-IP quota. */
export async function coreCall(path: string, { method = "GET", token, body }: { method?: string; token?: string; body?: unknown } = {}) {
  const response = await fetch(`${CORE}${path}`, {
    method,
    headers: {
      "cf-connecting-ip": randomIp(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: (await response.json().catch(() => null)) as { data?: never; error?: { code: string } } | null };
}
