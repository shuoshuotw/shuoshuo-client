import { Flame, PenLine } from "lucide-react";
import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { QuoteList } from "@/components/quote-list";
import { PageHead, PageShell } from "@/components/site-chrome";
import { StateNote } from "@/components/state-note";
import type { Quote } from "@/lib/api/client";
import { getFirstPage } from "@/lib/api/server";

export const metadata: Metadata = { title: "說說 · 近期熱門" };

export const revalidate = 60;

export default async function TrendingPage() {
  const initial = await getFirstPage<Quote>("/v1/quotes/trending?limit=50");
  return (
    <PageShell className="list-page">
      <PageHead icon={Flame} title="近期熱門" />
      <QuoteList
        path="/v1/quotes/trending"
        limit={50}
        layout="ranking"
        initial={initial}
        empty={
          <StateNote title="最近還沒有熱門說說" icon={Flame}>
            <LinkButton href="/submit" color="primary" radius="full" data-magnet startContent={<PenLine aria-hidden="true" size={18} />}>
              提交一句
            </LinkButton>
          </StateNote>
        }
      />
    </PageShell>
  );
}
