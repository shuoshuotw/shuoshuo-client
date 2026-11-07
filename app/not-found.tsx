import { House, Quote } from "lucide-react";
import { LinkButton } from "@/components/link-button";
import { MissingPoem } from "@/components/missing-poem";
import { PageShell } from "@/components/site-chrome";

export default function NotFound() {
  return (
    <PageShell className="missing">
      <picture className="missing-art">
        <source srcSet="/not-found.webp" type="image/webp" />
        {/* eslint-disable-next-line @next/next/no-img-element -- the artwork ships as its own webp and png */}
        <img src="/not-found.png" alt="404 Not Found：找不到你要的頁面" width={1920} height={1080} />
      </picture>
      <div className="missing-text">
        <h1 className="section-title">
          這一格缺字
          <span className="caret caret-blink" aria-hidden="true" />
        </h1>
        <p>
          <MissingPoem />
          <br />
          你所尋找的頁面不存在。
        </p>
        <div className="missing-actions">
          <LinkButton href="/" color="primary" radius="full" data-magnet startContent={<House aria-hidden="true" size={18} />}>
            回首頁
          </LinkButton>
          <LinkButton href="/quotes" radius="full" variant="bordered" data-magnet startContent={<Quote aria-hidden="true" size={18} />}>
            瀏覽說說
          </LinkButton>
        </div>
      </div>
    </PageShell>
  );
}
