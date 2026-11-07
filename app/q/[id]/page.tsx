import { EyeOff, House } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/comment-section";
import { LinkButton } from "@/components/link-button";
import { QuoteDetail } from "@/components/quote-detail";
import { PageShell } from "@/components/site-chrome";
import { lookUpQuote } from "@/lib/api/server";
import { reasonLabel } from "@/lib/labels";

export const revalidate = 60;

// Empty on purpose: without it Next renders every request and the page never reaches the CDN (§10.5)
export const generateStaticParams = () => [];

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await lookUpQuote((await params).id).catch(() => null);
  if (found?.kind !== "found") return { title: "說說", robots: { index: false } };
  return { title: `${found.quote.content} · 說說`, description: `${found.quote.content}——${found.quote.source_from}` };
}

export default async function QuotePage({ params }: Props) {
  const found = await lookUpQuote((await params).id);
  if (found.kind === "missing") notFound();
  if (found.kind === "removed") {
    return (
      <PageShell className="tombstone">
        <span className="tombstone-icon" aria-hidden="true">
          <EyeOff size={28} />
        </span>
        <h1 className="section-title">這則說說已移除</h1>
        <p>原因類別：{reasonLabel(found.reason)}</p>
        <LinkButton href="/" color="primary" radius="full" data-magnet startContent={<House aria-hidden="true" size={18} />}>
          回首頁
        </LinkButton>
      </PageShell>
    );
  }
  return (
    <PageShell className="detail">
      <QuoteDetail initial={found.quote}>
        <CommentSection quoteId={found.quote.id} ownerId={found.quote.submitter.deleted ? null : found.quote.submitter.id} />
      </QuoteDetail>
    </PageShell>
  );
}
