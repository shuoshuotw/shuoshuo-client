import type { BrowserContext } from "@playwright/test";

// With the mock standing in for Supabase, the storage key comes from its host name, and an HS256 token sends getClaims to /auth/v1/user
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "00000000-0000-4000-a000-000000000002", exp: 4102444800, role: "authenticated" })}.c2lnbmF0dXJl`;

export async function signInToMock(context: BrowserContext) {
  const session = { access_token: token, refresh_token: "refresh", expires_at: 4102444800, expires_in: 3600, token_type: "bearer", user: { id: "00000000-0000-4000-a000-000000000002" } };
  await context.addCookies([{ name: "sb-localhost-auth-token", value: `base64-${encode(session)}`, domain: "localhost", path: "/", sameSite: "Lax" }]);
}
