import { PenLine, Quote as QuoteIcon } from "lucide-react";
import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { QuoteList } from "@/components/quote-list";
import { PageHead, PageShell } from "@/components/site-chrome";
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
      <PageHead icon={QuoteIcon} title="所有說說" />
      <QuoteList
        path="/v1/quotes"
        initial={initial}
        empty={
          <StateNote title="此類別還沒有說說">
            <LinkButton href="/submit" color="primary" radius="full" data-magnet startContent={<PenLine aria-hidden="true" size={18} />}>
              提交第一句
            </LinkButton>
          </StateNote>
        }
      />
    </PageShell>
  );
}
