import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using MatchaDB, including data accuracy and trademark notices.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of Use" updated="October 3, 2026">
      <p>By using matchadb.com you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>

      <h2>Informational use only</h2>
      <p>
        MatchaDB compiles pricing, sourcing, grade, and tasting information from brands&apos; own
        product pages and published research. It is provided for general information, not as
        professional, medical, or purchasing advice. The composition figures shown (L-theanine, EGCG)
        are either what a brand states or published grade- or cultivar-level estimates, not lab results
        for a specific product.
      </p>

      <h2>Accuracy and prices</h2>
      <p>
        We work to keep data correct and current, but prices, availability, formulations, and claims
        change, and we can make mistakes. Always confirm price, size, and details on the seller&apos;s
        site before you buy. We provide the site &ldquo;as is,&rdquo; without warranties of any kind.
      </p>

      <h2>No affiliation; trademarks</h2>
      <p>
        Brand names, logos, and trademarks belong to their owners and are used only to identify and link
        to each brand&apos;s own products. MatchaDB is independent and is not affiliated with,
        sponsored by, or endorsed by any brand listed. Rankings and ordering reflect our own editorial
        judgment and are not endorsements.
      </p>

      <h2>Links, ads, and affiliate relationships</h2>
      <p>
        The site links to third-party websites and may show third-party ads or affiliate links. We
        aren&apos;t responsible for their content, products, or practices, and any transaction is
        between you and that seller.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t scrape the site at a rate that degrades it for others, attempt to disrupt or breach
        it, or republish its compiled dataset wholesale without permission.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, MatchaDB and its owner are not liable for any indirect or
        consequential loss arising from your use of the site or reliance on its information.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms; continued use after a change means you accept it.</p>
    </LegalPage>
  );
}
