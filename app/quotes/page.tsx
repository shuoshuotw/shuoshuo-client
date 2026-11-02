import type { Metadata } from "next";
import Link from "next/link";
import { QuoteList } from "@/components/quote-list";
import { PageShell } from "@/components/site-chrome";
import { StateNote } from "@/components/state-note";
import type { Quote } from "@/lib/api/client";
import { getFirstPage } from "@/lib/api/server";

export const metadata: Metadata = { title: "說說 · 瀏覽" };

// ISR bound from SPEC §10.5
export const revalidate = 60;

export default async function QuotesPage() {
  const initial = await getFirstPage<Quote>("/v1/quotes?limit=20");
  return (
    <PageShell className="list-page">
      <h1 className="section-title">所有說說</h1>
      <QuoteList
        path="/v1/quotes"
        initial={initial}
        empty={
          <StateNote title="此類別還沒有說說">
            <Link className="button button-primary" href="/submit">
              提交第一句
            </Link>
          </StateNote>
        }
      />
    </PageShell>
  );
}
