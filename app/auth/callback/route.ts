import { type NextRequest, NextResponse } from "next/server";
import { NEXT_COOKIE, safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/** A code, never the provider's words: nothing from the query string is shown to the user as text. */
function errorCode(message: string | null, code: string | null) {
  if (/account blocked/i.test(message ?? "")) return "account_blocked";
  if (/email.*not.*(confirm|verif)/i.test(message ?? "")) return "email_unverified";
  if (code === "identity_already_exists" || /identity.*already/i.test(message ?? "")) return "identity_already_exists";
  if (code === "access_denied") return "access_denied";
  return "signin_failed";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5002";
  if (process.env.NODE_ENV === "production" && !siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be set in production");
  }
  const origin = siteUrl ? new URL(siteUrl).origin : request.nextUrl.origin;
  // The redirect allow-list holds exact URLs (§7.1), so `next` travels in a short-lived cookie the login page sets
  const next = safeNext(searchParams.get("next") ?? request.cookies.get(NEXT_COOKIE)?.value);
  const code = searchParams.get("code");

  // Linking an identity comes back here too, and its errors belong on the page that started it
  const failed = (failure: string) => {
    const page = next.startsWith("/me/security") ? "/me/security" : "/login";
    return NextResponse.redirect(`${origin}${page}?error=${failure}`);
  };

  let response: NextResponse;
  if (!code) {
    response = failed(errorCode(searchParams.get("error_description"), searchParams.get("error_code") ?? searchParams.get("error")));
  } else {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    response = error ? failed(errorCode(error.message, error.code ?? null)) : NextResponse.redirect(`${origin}${next}`);
  }
  response.cookies.delete(NEXT_COOKIE);
  return response;
}
