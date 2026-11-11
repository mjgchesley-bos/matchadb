import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/LegalPage";
import { isLocale, type Locale } from "@/i18n/config";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using MatchaDB, including data accuracy, trademark notices, and our affiliate, advertising and sponsorship disclosures.",
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  if (!isLocale(raw)) notFound();
  const lang: Locale = raw;
  return (
    <LegalPage lang={lang} englishOnly eyebrow="Legal" title="Terms of Use" updated="November 11, 2026">
      <p>By using matchadb.com you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>

      <h2>Informational use only</h2>
      <p>
        MatchaDB compiles pricing, sourcing, grade, and tasting information from brands&apos; own
        product pages and published research. It is provided for general information, not as
        professional, medical, or purchasing advice. MatchaDB does not make health or medical claims
        about any product. Where a brand states a nutrient figure on its own product page we may show it, labeled as the
        brand&apos;s statement; we do not estimate or add figures of our own. The research library describes what
        published studies examine and is not medical advice.
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

      <h2>Links, ads, affiliate relationships, and sponsored content</h2>
      <p>
        The site links to third-party websites and may show third-party ads or affiliate links. We
        aren&apos;t responsible for their content, products, or practices, and any transaction is
        between you and that seller.
      </p>
      <p>
        <strong>Affiliate links.</strong> Some links to brand, retailer, or other websites may be
        affiliate links. If you click one and make a purchase, MatchaDB may earn a commission from the
        seller. This costs you nothing extra, and the price you pay is the same as without the link. We
        aim to mark pages and links that contain affiliate links.
      </p>
      <p>
        <strong>Independence.</strong> Commissions, advertising, and any other compensation do not decide
        which products, brands, stores, or cafés we list, how we describe them, or how they are ordered.
        Product, brand, store, and café information comes from the seller&apos;s own published pages and
        other public sources, as described on each page, and a listing is not an endorsement or a
        recommendation.
      </p>
      <p>
        <strong>Sponsored content.</strong> If a brand, store, or café ever pays for placement, a featured
        listing, or other promotion, we will label it clearly as sponsored or an ad. Ratings and reviews
        written by members are never edited or ranked in exchange for payment.
      </p>
      <p>
        <strong>Advertising and your choices.</strong> Ads and advertising cookies are used only if you
        choose Accept in the cookie banner; see our Privacy Policy for how data is handled and how to opt
        out.
      </p>

      <h2>Accounts and user content</h2>
      <p>
        You can use MatchaDB without an account. If you sign in and post ratings, reviews, comments or
        photos, you are responsible for what you write and upload. Photos must be yours to share and must
        not show other people or private information. Reviews must be your own honest experience with the product.
        They must not contain ads, links, personal information, hate or harassment, or health or medical claims (for example
        that a product treats, cures or prevents a condition), and must not be
        posted by or for a brand about its own products or its competitors&apos; products. You keep
        ownership of what you write and give MatchaDB a free, worldwide licence to display it on the
        site. Reviews are checked before they appear. We may decline, hide or remove any content, or
        close any account, at our discretion. Reviews are individual opinions of their authors, not
        statements by MatchaDB.
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
