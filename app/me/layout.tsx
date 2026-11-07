import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MeContent } from "@/components/me-content";
import { MeNav } from "@/components/me-nav";
import { PageShell } from "@/components/site-chrome";

export const metadata: Metadata = { title: "個人中心 · 說說", robots: { index: false } };

export default function MeLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell className="me">
      <MeNav />
      <MeContent>{children}</MeContent>
    </PageShell>
  );
}
