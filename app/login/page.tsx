import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPanel } from "@/components/login-panel";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "登入 · 說說", robots: { index: false } };

export const revalidate = 300;

export default function LoginPage() {
  return (
    <PageShell className="login">
      {/* useSearchParams: the page itself stays static and cacheable */}
      <Suspense>
        <LoginPanel />
      </Suspense>
    </PageShell>
  );
}
