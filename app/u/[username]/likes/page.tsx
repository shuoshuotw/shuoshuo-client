import { notFound } from "next/navigation";
import { QuoteRow } from "@/components/quote-row";
import { RowsEnter } from "@/components/quote-list";
import { StateNote } from "@/components/state-note";
import type { LikeItem } from "@/lib/api/client";
import { getReactionList } from "@/lib/api/server";

export const revalidate = 60;

export default async function ProfileLikesPage({ params }: { params: Promise<{ username: string }> }) {
  const items = await getReactionList<LikeItem>(decodeURIComponent((await params).username), "likes");
  // PV-03: a list that has gone private has no page at all
  if (!items) notFound();
  const quotes = items.flatMap(({ quote }) => (quote ? [quote] : []));
  if (quotes.length === 0) return <StateNote title="還沒有按讚任何說說" />;
  return (
    <RowsEnter>
      {quotes.map((quote) => (
        <QuoteRow key={quote.id} quote={quote} />
      ))}
    </RowsEnter>
  );
}
