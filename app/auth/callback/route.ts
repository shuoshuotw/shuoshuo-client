import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code) {
    const error = searchParams.get("error_description") ?? "missing_code";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const target = error ? `/login?error=${encodeURIComponent(error.message)}` : "/";
  return NextResponse.redirect(`${origin}${target}`);
}
