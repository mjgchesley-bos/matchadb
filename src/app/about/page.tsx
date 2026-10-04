import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE_URL } from "@/lib/site";
import { getStats } from "@/lib/db";

export const metadata: Metadata = {
  title: "About MatchaDB and How We Research",
  description:
    "What MatchaDB is, where its matcha data comes from, how products are ordered, and how we treat gaps and contradictions.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default async function AboutPage() {
  const { brandCount, productCount } = await getStats();
  return (
    <LegalPage eyebrow="About" title="What MatchaDB is, and how we research it">
      <p>
        MatchaDB is an independent database of matcha: {productCount.toLocaleString()} products from{" "}
        {brandCount.toLocaleString()} brands, from historic Uji tea houses to grocery-store tins. It
        exists because matcha buying is hard. Labels like &ldquo;ceremonial&rdquo; aren&apos;t
        regulated, sourcing is often vague, and prices are listed in different sizes and currencies.
      </p>

      <h2>Where the data comes from</h2>
      <p>
        Every product entry is built from the brand&apos;s own product page. We record price, size,
        grade, cultivar, growing region, certifications, and tasting notes as the brand states them,
        and link back to the source. Prices are re-checked from the live pages weekly, and yen, pound,
        and euro prices are converted to dollars daily at the current exchange rate.
      </p>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t invent data. If a brand doesn&apos;t say where a matcha was grown, we show that gap rather than guess.</li>
        <li>We don&apos;t smooth over contradictions. When a brand&apos;s own pages disagree with themselves, the entry says so.</li>
        <li>We don&apos;t draw farm boundaries we can&apos;t verify. Map outlines are real administrative boundaries (town, province, country), never a guessed property line.</li>
        <li>We remove products and brands we can&apos;t verify exist.</li>
      </ul>

      <h2>How results are ordered</h2>
      <p>
        With hundreds of products, order matters. Default results favor brands with a genuine
        reputation for matcha craft, such as long-established Japanese tea houses and careful
        direct-sourcing importers, over mass-market private-label tins and generic resellers. This is
        an editorial judgment, not a sales or paid ranking, and no brand can pay to move up.
      </p>

      <h2>Composition figures</h2>
      <p>
        L-theanine and EGCG values are shown either as the brand states them or as published
        grade- or cultivar-level research estimates, labeled with the study. They are not lab results
        for the specific tin.
      </p>

      <h2>Independence and money</h2>
      <p>
        MatchaDB isn&apos;t affiliated with any brand listed. The site may show ads or use affiliate
        links to cover its costs; we disclose that on the pages involved and in our{" "}
        <a href="/privacy">privacy policy</a>, and it doesn&apos;t change how products are listed.
      </p>

      <p>
        Spot an error or want a brand added? <a href="/contact">Tell us</a>.
      </p>
    </LegalPage>
  );
}
