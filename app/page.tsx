import { ApiSlip, CasePlate, SubmitInvite } from "@/components/home-sections";
import { CurlLine } from "@/components/curl-line";
import { LatestSpines } from "@/components/latest-spines";
import { QuoteStage } from "@/components/quote-stage";
import { Reveal } from "@/components/reveal";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getLatestQuotes, getRandomQuote } from "@/lib/api/server";

// ISR bound from SPEC §10.5
export const revalidate = 60;

export default async function HomePage() {
  const [quote, latest] = await Promise.all([getRandomQuote(), getLatestQuotes(6)]);

  return (
    <>
      <div className="page-body">
        <SiteHeader />
        <main>
          <h1 className="slogan">說說，讓文字不僅止於說說</h1>
          <QuoteStage initial={quote} />
          <Reveal>
            <CurlLine />
            <LatestSpines quotes={latest} />
            <CasePlate />
            <ApiSlip />
            <SubmitInvite />
          </Reveal>
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
