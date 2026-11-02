import { QuoteList } from "@/components/quote-list";
import { StateNote } from "@/components/state-note";
import type { Quote } from "@/lib/api/client";
import { getFirstPage } from "@/lib/api/server";

export const revalidate = 60;

export default async function ProfileQuotesPage({ params }: { params: Promise<{ username: string }> }) {
  const path = `/v1/users/${encodeURIComponent(decodeURIComponent((await params).username))}/quotes`;
  const initial = await getFirstPage<Quote>(`${path}?limit=20`);
  return <QuoteList path={path} initial={initial} filter={false} empty={<StateNote title="這個人還沒有提交說說" />} />;
}
