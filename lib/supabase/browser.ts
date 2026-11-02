import { createBrowserClient } from "@supabase/ssr";

// Passkey methods are on by default since supabase-js 2.117; the old experimental flag is a no-op
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
