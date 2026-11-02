import Link from "next/link";
import { PageShell } from "@/components/site-chrome";
import { CATEGORIES } from "@/lib/categories";

export default function NotFound() {
  return (
    <PageShell className="missing">
      <div className="missing-case" aria-hidden="true">
        {CATEGORIES.map(({ key, name }, index) => (
          <span key={key} className="case-cell" data-gone={index === 6}>
            {index === 6 ? "" : name}
          </span>
        ))}
      </div>
      <div>
        <h1 className="section-title">這一格缺字</h1>
        <p>這個頁面不存在，或已經被移走了。</p>
        <Link className="button button-primary" href="/">
          回首頁
        </Link>
      </div>
    </PageShell>
  );
}
