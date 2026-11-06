import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;
  if (!data?.claims && !pathname.startsWith("/auth")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  // To anyone but an admin the back office is not there: the site's own 404, rendered whole. A notFound() thrown in its
  // layout instead made React rebuild <html>, dropping the theme and signed-in classes theme.js had set on it.
  if (pathname.startsWith("/admin") && !(await isAdmin(supabase))) {
    const missing = NextResponse.rewrite(new URL("/404", request.url));
    for (const cookie of response.cookies.getAll()) missing.cookies.set(cookie);
    return missing;
  }
  return response;
}

// Roles live in Core, which verifies the token (§9.7); it refuses every admin call on its own anyway
async function isAdmin(supabase: ReturnType<typeof createServerClient>) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001"}/v1/me`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return false;
  const body = (await response.json()) as { data?: { roles?: string[] } };
  return body.data?.roles?.includes("admin") === true;
}

// Public pages must stay out: a Set-Cookie would make them uncacheable (SPEC §10.5)
export const config = {
  matcher: ["/me/:path*", "/admin/:path*", "/auth/:path*", "/submit"],
};
