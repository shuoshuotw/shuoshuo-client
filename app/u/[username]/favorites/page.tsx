import { notFound } from "next/navigation";
import { QuoteRow } from "@/components/quote-row";
import { RowsEnter } from "@/components/quote-list";
import { StateNote } from "@/components/state-note";
import type { FavoriteItem } from "@/lib/api/client";
import { getReactionList } from "@/lib/api/server";

export const revalidate = 60;

export default async function ProfileFavoritesPage({ params }: { params: Promise<{ username: string }> }) {
  const items = await getReactionList<FavoriteItem>(decodeURIComponent((await params).username), "favorites");
  // PV-03: a list that has gone private has no page at all
  if (!items) notFound();
  const quotes = items.flatMap(({ quote }) => (quote ? [quote] : []));
  if (quotes.length === 0) return <StateNote title="還沒有收藏任何說說" />;
  return (
    <RowsEnter>
      {quotes.map((quote) => (
        <QuoteRow key={quote.id} quote={quote} />
      ))}
    </RowsEnter>
  );
}
