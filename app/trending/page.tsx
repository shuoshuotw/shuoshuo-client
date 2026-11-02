import type { Metadata } from "next";
import Link from "next/link";
import { QuoteList } from "@/components/quote-list";
import { PageShell } from "@/components/site-chrome";
import { StateNote } from "@/components/state-note";
import type { Quote } from "@/lib/api/client";
import { getFirstPage } from "@/lib/api/server";

export const metadata: Metadata = { title: "說說 · 近期熱門" };

export const revalidate = 60;

export default async function TrendingPage() {
  const initial = await getFirstPage<Quote>("/v1/quotes/trending?limit=50");
  return (
    <PageShell className="list-page">
      <h1 className="section-title">近期熱門</h1>
      <QuoteList
        path="/v1/quotes/trending"
        limit={50}
        initial={initial}
        empty={
          <StateNote title="最近還沒有熱門說說">
            <Link className="button button-primary" href="/submit">
              提交一句
            </Link>
          </StateNote>
        }
      />
    </PageShell>
  );
}
