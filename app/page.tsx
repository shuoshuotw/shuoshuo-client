import { type CSSProperties, Suspense } from "react";
import { SubmitInvite } from "@/components/home-sections";
import { LatestFan } from "@/components/latest-fan";
import { QuoteStage } from "@/components/quote-stage";
import { SiteFooter } from "@/components/site-chrome";
import { getLatestQuotes, getRandomQuote } from "@/lib/api/server";

// ISR bound from SPEC §10.5
export const revalidate = 60;

export default async function HomePage() {
  const [quote, latest] = await Promise.all([getRandomQuote(), getLatestQuotes(7)]);
  // The light starts in the first quote's colour; QuoteStage moves it with every draw
  const tint = { "--tint": `var(--stock-${quote?.category.key ?? "other"})` } as CSSProperties;

  return (
    <>
      <main className="home" style={tint}>
        <h1 className="sr-only">說說</h1>
        <QuoteStage initial={quote} />
        {/* Each part below the first screen is its own boundary: React then hydrates the page a part at a time and
            can stop between them, instead of holding a phone's main thread for the whole page at once */}
        <Suspense>
          <LatestFan quotes={latest} />
        </Suspense>
        <Suspense>
          <SubmitInvite />
        </Suspense>
      </main>
      <Suspense>
        <SiteFooter />
      </Suspense>
    </>
  );
}
