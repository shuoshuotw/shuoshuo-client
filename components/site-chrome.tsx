import { BookOpen, FileText, Flame, type LucideIcon, PenLine, Quote, Rocket, Shield } from "lucide-react";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { GitHubIcon } from "./brand-icons";
import { Logo } from "./logo";
import { DOCS_URL } from "./site-header";

/** A page's title with its icon at the title's own size, and an optional line under it. */
export function PageHead({ icon: Icon, title, children }: { icon: LucideIcon; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <h1 className="section-title">
        <Icon aria-hidden="true" />
        {title}
      </h1>
      {children}
    </header>
  );
}

/** The header lives in the root layout (AppFrame); a page brings its own main and the footer. */
export function PageShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <>
      <main className={className ? `page-main ${className}` : "page-main"}>{children}</main>
      <SiteFooter />
    </>
  );
}

type FooterLink = { href: string; label: string; icon: ComponentType<{ size?: number; "aria-hidden"?: "true" }>; external?: boolean };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "瀏覽",
    links: [
      { href: "/quotes", label: "說說", icon: Quote },
      { href: "/trending", label: "近期熱門", icon: Flame },
      { href: "/submit", label: "提交", icon: PenLine },
    ],
  },
  {
    title: "開發者",
    links: [
      { href: DOCS_URL, label: "API 文件", icon: BookOpen, external: true },
      { href: `${DOCS_URL}/quickstart`, label: "快速上手", icon: Rocket, external: true },
      { href: "https://github.com/shuoshuotw", label: "GitHub", icon: GitHubIcon, external: true },
    ],
  },
  {
    title: "條款",
    links: [
      { href: "/terms", label: "服務條款", icon: FileText },
      { href: "/privacy", label: "隱私權", icon: Shield },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link className="wordmark" href="/" aria-label="說說首頁">
            <Logo />
            <span>說說</span>
          </Link>
          {/* The slogan's one place on every page (UI-11) */}
          <p className="footer-slogan">
            說說
            <br />
            讓文字不僅止於說說
          </p>
        </div>
        <nav className="footer-columns" aria-label="頁尾導覽">
          {COLUMNS.map(({ title, links }) => (
            <div key={title}>
              <h2>{title}</h2>
              <ul>
                {links.map(({ href, label, icon: Icon, external }) => (
                  <li key={href}>
                    {external ? (
                      <a href={href}>
                        <Icon aria-hidden="true" size={16} />
                        {label}
                      </a>
                    ) : (
                      <Link href={href}>
                        <Icon aria-hidden="true" size={16} />
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <p className="footer-base">© 2026 說說 ShuoShuo</p>
    </footer>
  );
}
