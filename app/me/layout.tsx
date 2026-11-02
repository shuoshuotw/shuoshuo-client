import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MeNav } from "@/components/me-nav";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "個人中心 · 說說", robots: { index: false } };

export default function MeLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell className="me">
      <MeNav />
      <div className="me-main">{children}</div>
    </PageShell>
  );
}
