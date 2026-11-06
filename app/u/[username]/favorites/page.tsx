import { notFound } from "next/navigation";
import { PrivateList } from "@/components/private-list";
import { QuoteRow } from "@/components/quote-row";
import { RowsEnter } from "@/components/quote-list";
import { StateNote } from "@/components/state-note";
import type { FavoriteItem } from "@/lib/api/client";
import { getProfile, getReactionList } from "@/lib/api/server";

export const revalidate = 60;

export default async function ProfileFavoritesPage({ params }: { params: Promise<{ username: string }> }) {
  const username = decodeURIComponent((await params).username);
  // PV-03: told by the profile itself, so a list kept private never depends on how the list call fails
  const profile = await getProfile(username);
  if (!profile) notFound();
  const items = profile.favorites_public ? await getReactionList<FavoriteItem>(username, "favorites") : "private";
  if (!items) notFound();
  // PV-03: the list is there, its contents only for its owner
  if (items === "private") return <PrivateList username={profile.username} kind="favorite" />;
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
