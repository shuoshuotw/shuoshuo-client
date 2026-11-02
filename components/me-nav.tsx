"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionStore } from "@/stores/session";

const LINKS = [
  { href: "/me", label: "概況" },
  { href: "/me/quotes", label: "我的提交" },
  { href: "/me/favorites", label: "我的收藏" },
  { href: "/me/likes", label: "我的按讚" },
  { href: "/me/api-keys", label: "API Key" },
  { href: "/me/security", label: "安全設置" },
  { href: "/me/standing", label: "違規與申訴" },
];

export function MeNav() {
  const pathname = usePathname();
  const admin = useSessionStore((state) => state.me?.roles.includes("admin") ?? false);
  return (
    <nav className="me-nav" aria-label="個人中心">
      {LINKS.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
      {admin && <Link href="/admin/cases">管理後台</Link>}
    </nav>
  );
}
