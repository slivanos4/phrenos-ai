import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { Disclaimer, eyebrowClass, panelClass } from "@/components/admin/market-desk-ui";

export const metadata: Metadata = {
  title: "Admin · Market Desk method and sources",
  robots: { index: false, follow: false },
};

const SOURCES: [string, string, string][] = [
  ["CoinGecko", "Crypto prices, market value, supply, all-time highs, trending, descriptions", "About every 10 minutes for the market strip, daily for the rankings"],
  ["Yahoo Finance", "Shares, ETFs, currencies, commodity futures, news, company profiles, options", "Daily for the rankings, live when you open an asset. Unofficial feed, so it can be delayed or briefly unavailable"],
  ["Twelve Data", "Backup prices for US shares, ETFs, currency pairs and gold", "Only used when Yahoo cannot answer. The free plan does not cover UK or European shares, silver or oil"],
  ["alternative.me", "The Fear and Greed reading for crypto", "Updated once a day"],
  ["SEC EDGAR", "Insider buying and selling (Form 4) and big fund holdings (13F)", "Filings appear days or weeks after the trade, so these are late signals"],
  ["DexScreener and Nasdaq", "New token launches and upcoming share launches", "Daily"],
  ["CoinMetrics", "Bitcoin and Ethereum flows to and from exchanges", "Daily, with a delay"],
];

export default function MethodologyPage() {
  return (
    <section className="relative isolate min-h-[100svh] bg-[#0a100c]">
      <div className="relative z-10 mx-auto max-w-3xl px-5 pt-28 pb-16 sm:px-8 sm:pt-32 lg:pt-36 lg:pb-24">
        <AdminNav current="markets" />
        <div className="space-y-5">
          <Link href="/admin/market-desk" className="text-[11px] font-semibold tracking-[0.18em] text-[#e0c078] uppercase underline-offset-4 hover:underline">← Back to Market Desk</Link>
          <header>
            <h1 className="font-serif text-3xl text-[#f1e8d6]">How Market Desk works</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#a9b0a3]">What each number means, where it comes from, how fresh it is, and what it cannot tell you. Read this before relying on anything on the dashboard.</p>
          </header>

          <section className={`${panelClass} space-y-3`}>
            <p className={eyebrowClass}>The evidence score (0 to 100)</p>
            <p className="text-sm leading-relaxed text-[#d5d0c1]">It describes what an asset&apos;s price history and smart-money signals show. It is not a forecast and not a recommendation. Four parts:</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#d5d0c1]">
              <li><strong className="text-[#f1e8d6]">55%</strong> how much it has gained recently compared with how bumpy the ride was, ranked against everything scanned.</li>
              <li><strong className="text-[#f1e8d6]">20%</strong> whether the price sits above its 50-day and 200-day averages.</li>
              <li><strong className="text-[#f1e8d6]">15%</strong> whether the 1-month and longer trends agree.</li>
              <li><strong className="text-[#f1e8d6]">10%</strong> smart-money signals such as insider buying.</li>
            </ul>
            <p className="text-sm leading-relaxed text-[#d5d0c1]">A sharp recent surge cuts the score by a tenth, and a small crypto market cuts it by a fifth, because both are riskier. It never looks at company earnings or whether a price is fair.</p>
          </section>

          <section className={`${panelClass} space-y-3`}>
            <p className={eyebrowClass}>The risk score (0 safest to 100 most volatile)</p>
            <p className="text-sm leading-relaxed text-[#d5d0c1]">Blended from how much the price has swung in the last 30 days (40%), how far it fell at its worst in the past year (25%), what kind of asset it is (25%), and a small penalty when it is below its 50-day or 200-day average. Crypto in the rankings has less history available, so its risk is estimated from recent swings, market size and its 200-day move, and is shown as an estimate.</p>
          </section>

          <section className={`${panelClass} space-y-3`}>
            <p className={eyebrowClass}>The daily Pulse</p>
            <p className="text-sm leading-relaxed text-[#d5d0c1]">The price line is worked out by our code from the stored prices. The news lines are written by AI from headlines only, each tied to a numbered headline with a link. A line is thrown away if it mentions a figure that is not in the data, sounds like advice, or has no source. Each Pulse shows its date and says when it is out of date.</p>
          </section>

          <section className={`${panelClass} space-y-3`}>
            <p className={eyebrowClass}>The data check</p>
            <p className="text-sm leading-relaxed text-[#d5d0c1]">Before anything is ranked, impossible numbers are blanked: a fall of more than 100%, a rise of more than 10,000%, a negative market value, a price of zero or a reversed yearly range. An asset with no believable price is left out. A rescan tells you how many were repaired or left out. All-time highs for shares listed outside the US are limited to ten years, because older prices on those exchanges are often in different units.</p>
          </section>

          <section className={panelClass}>
            <p className={eyebrowClass}>Where the data comes from</p>
            <ul className="mt-3 space-y-3">
              {SOURCES.map(([name, used, fresh]) => <li key={name} className="text-sm"><span className="font-semibold text-[#f1e8d6]">{name}</span><span className="block text-[#c9c6ba]">{used}</span><span className="block text-[11px] text-[#a9b0a3]">{fresh}</span></li>)}
            </ul>
          </section>

          <section className={`${panelClass} space-y-3`}>
            <p className={eyebrowClass}>What it cannot do</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#d5d0c1]">
              <li>It cannot predict prices. Past moves do not guarantee future ones, and you can lose money.</li>
              <li>Prices can be delayed or wrong. Free and unofficial feeds are used, so check the source links before acting.</li>
              <li>Dollar and euro prices are converted from pounds at the day&apos;s rate. They are not quotes from a dollar or euro market.</li>
              <li>The buying-and-selling figure on the strip counts how many scanned assets are rising. It is not trading orders from an exchange.</li>
              <li>It gives research and risk flags, never advice on what to buy, sell or how much to invest.</li>
            </ul>
          </section>
          <Disclaimer />
        </div>
      </div>
    </section>
  );
}
