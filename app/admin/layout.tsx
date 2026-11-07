import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MeContent } from "@/components/me-content";
import { MeNav } from "@/components/me-nav";
import { PageShell } from "@/components/site-chrome";
import "@/styles/admin.css";

export const metadata: Metadata = { title: "管理後台 · 說說", robots: { index: false } };

/** The back office lives in the personal centre, under its column's own heading. proxy.ts shows anyone else a 404. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell className="me">
      <MeNav />
      <MeContent>{children}</MeContent>
    </PageShell>
  );
}
