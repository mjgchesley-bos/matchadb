import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How MatchaDB handles analytics, cookies, advertising, and your choices.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy Policy" updated="October 3, 2026">
      <p>
        MatchaDB (&ldquo;we,&rdquo; &ldquo;us&rdquo;) is a research database of matcha products. This
        policy explains what information is collected when you use matchadb.com and the choices you
        have. We don&apos;t require an account, and we don&apos;t ask you for personal information to
        browse.
      </p>

      <h2>Information collected</h2>
      <ul>
        <li>
          <strong>Usage data</strong> (pages viewed, approximate location, device and browser type,
          referring page) collected through Google Analytics, only if you accept cookies.
        </li>
        <li>
          <strong>Map requests.</strong> The sourcing map loads map tiles from Mapbox, which receives
          your IP address and browser details as part of serving those tiles. See{" "}
          <a href="https://www.mapbox.com/legal/privacy" rel="noopener noreferrer" target="_blank">
            Mapbox&apos;s privacy policy
          </a>
          .
        </li>
        <li>
          <strong>Server logs.</strong> Our hosting provider (AWS) records standard request logs such as
          IP address and timestamps for security and operations.
        </li>
        <li>
          <strong>Your cookie choice,</strong> stored in your browser&apos;s local storage so we
          remember it.
        </li>
      </ul>

      <h2>Cookies and consent</h2>
      <p>
        Analytics and advertising storage are off by default. They turn on only if you choose Accept in
        the cookie banner. You can change your mind at any time with the &ldquo;Cookie settings&rdquo;
        link in the footer, or by clearing this site&apos;s data in your browser.
      </p>

      <h2>Advertising</h2>
      <p>
        MatchaDB may display advertising from third-party networks. Those vendors, including Google, may
        use cookies and similar technologies to serve and measure ads, and, if you accept, to
        personalize them based on your visits to this and other sites. You can opt out of personalized
        advertising at{" "}
        <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">
          adssettings.google.com
        </a>{" "}
        or{" "}
        <a href="https://www.aboutads.info" rel="noopener noreferrer" target="_blank">
          aboutads.info
        </a>
        .
      </p>

      <h2>Affiliate links</h2>
      <p>
        Some links to brand and retailer websites may be affiliate links. If you buy through one, we may
        earn a commission at no extra cost to you. This never changes how products are listed or
        ranked.
      </p>

      <h2>Third-party links</h2>
      <p>
        Product pages link to brand and retailer sites we don&apos;t control. Their privacy practices
        are their own.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live (for example the EEA, UK, or California), you may have the right to
        access, correct, delete, or object to the use of personal data about you. Because we don&apos;t
        keep accounts, most of this data sits with the analytics and advertising providers above;
        you can also contact us and we&apos;ll help where we can.
      </p>

      <h2>Children</h2>
      <p>MatchaDB is not directed to children under 13, and we don&apos;t knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>We&apos;ll update this page when our practices change and revise the date above.</p>

      <h2>Contact</h2>
      <p>
        {CONTACT_EMAIL ? (
          <>
            Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </>
        ) : (
          <>
            Questions: see the <a href="/contact">contact page</a>.
          </>
        )}
      </p>
    </LegalPage>
  );
}
