"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MeGate } from "@/components/me-gate";
import { StateNote } from "@/components/state-note";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/admin/cases", label: "審核佇列" },
  { href: "/admin/appeals", label: "申訴" },
  { href: "/admin/audit", label: "稽核日誌" },
];

/** Open plane (§12.7): the navigation sits straight on the ground, with no bar above it. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="admin">
      <aside className="admin-side">
        <Link className="wordmark" href="/" aria-label="回到說說首頁">
          說說
        </Link>
        <nav className="admin-nav" aria-label="管理後台">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-tools">
          <ThemeToggle />
        </div>
      </aside>
      <main className="admin-main">
        {/* Only for the person's sake: Core refuses every call on its own (§9.7) */}
        <MeGate>
          {(me) =>
            me.roles.includes("admin") ? (
              children
            ) : (
              <StateNote title="這裡只有管理員能進來">
                <Link className="button" href="/">
                  回首頁
                </Link>
              </StateNote>
            )
          }
        </MeGate>
      </main>
    </div>
  );
}
