import type { BrowserContext } from "@playwright/test";

// With the mock standing in for Supabase, the storage key comes from its host name, and an HS256 token sends getClaims to /auth/v1/user
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const ME_ID = "00000000-0000-4000-a000-000000000002";

/** Signed in as 小明, an admin; any other id is an ordinary reader to the mock (mock-core.mjs) */
export async function signInToMock(context: BrowserContext, sub = ME_ID) {
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub, exp: 4102444800, role: "authenticated" })}.c2lnbmF0dXJl`;
  const session = { access_token: token, refresh_token: "refresh", expires_at: 4102444800, expires_in: 3600, token_type: "bearer", user: { id: sub } };
  await context.addCookies([{ name: "sb-localhost-auth-token", value: `base64-${encode(session)}`, domain: "localhost", path: "/", sameSite: "Lax" }]);
}
