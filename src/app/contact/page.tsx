import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Report an error, suggest a brand, or get in touch with MatchaDB.",
  alternates: { canonical: `${SITE_URL}/contact` },
};

export default function ContactPage() {
  return (
    <LegalPage eyebrow="Contact" title="Get in touch">
      <p>
        Found a wrong price, a missing brand, or a claim that doesn&apos;t match the source? Tell us
        and include the product page link so we can check it against the brand&apos;s own page.
      </p>
      {CONTACT_EMAIL ? (
        <p>
          Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      ) : (
        <p>Contact details are coming soon.</p>
      )}
      <p>For brands: we list products as your own pages describe them and link to your site.</p>
    </LegalPage>
  );
}
