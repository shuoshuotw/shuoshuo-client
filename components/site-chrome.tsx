import Link from "next/link";
import credits from "@/public/images/credits.json";
import { FooterCurtain } from "./footer-curtain";
import { ThemeToggle } from "./theme-toggle";

const DOCS_URL = "https://docs.shuoshuotw.xyz";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="說說首頁">
        說說
      </Link>
      <nav className="site-nav" aria-label="主要導覽">
        <Link href="/quotes">說說</Link>
        <Link href="/trending">近期熱門</Link>
        <Link href="/submit">提交</Link>
        <a href={DOCS_URL}>API 文件</a>
      </nav>
      <div className="site-tools">
        <ThemeToggle />
        <Link className="button" href="/login">
          登入
        </Link>
      </div>
    </header>
  );
}

/** The back of the sheet: the name returns at full width, with the terms and picture credits. */
export function SiteFooter() {
  return (
    <FooterCurtain>
      <div className="footer-columns">
        <nav aria-label="頁尾導覽">
          <Link href="/terms">服務條款</Link>
          <Link href="/privacy">隱私權</Link>
          <a href={DOCS_URL}>API 文件</a>
          <a href="https://github.com/shuoshuotw">GitHub</a>
        </nav>
        <p className="footer-credits">
          圖片來源：
          {credits.map((credit, index) => (
            <span key={credit.file}>
              {index > 0 && "、"}
              <a href={credit.page}>{credit.title}</a>（{credit.creator}，{credit.license}）
            </span>
          ))}
        </p>
      </div>
      <p className="footer-mark" aria-hidden="true">
        說說
      </p>
    </FooterCurtain>
  );
}
