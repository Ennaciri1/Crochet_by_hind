import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/StaticPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${site.name} collects, uses and protects your data, including cookies used by Google AdSense.`,
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy" path="/privacy-policy" updated="October 18, 2026">
      <p>
        This Privacy Policy explains what information {site.name} (“we”, “us”, “{site.url.replace(/^https?:\/\//, "")}”)
        collects when you visit the site, how it is used, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Contact form:</strong> when you send a message, we store your name, email address and message so we
          can reply. We never sell this information or add you to a mailing list.
        </li>
        <li>
          <strong>Log data:</strong> our hosting provider automatically records technical information such as your IP
          address, browser type and the pages you visit, for security and performance.
        </li>
        <li>
          <strong>Cookies:</strong> small files stored on your device, mostly by our advertising partner (see below).
        </li>
      </ul>

      <h2>Advertising and Google AdSense cookies</h2>
      <p>
        We use Google AdSense to show ads on this site. Third-party vendors, including Google, use cookies to serve ads
        based on a user’s prior visits to this website or other websites.
      </p>
      <p>
        Google’s use of advertising cookies enables it and its partners to serve ads to our users based on their visit to
        this site and/or other sites on the Internet.
      </p>
      <p>
        You may opt out of personalized advertising by visiting{" "}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener">
          Google Ads Settings
        </a>
        . Alternatively, you can opt out of a third-party vendor’s use of cookies for personalized advertising by visiting{" "}
        <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener">
          www.aboutads.info
        </a>
        .
      </p>
      <p>
        To learn more, read{" "}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">
          How Google uses information from sites or apps that use its services
        </a>
        .
      </p>

      <h2>Visitors in the EEA, the UK and Switzerland</h2>
      <p>
        If you visit from the European Economic Area, the United Kingdom or Switzerland, we ask for your consent before
        personalized ads and non-essential cookies are used, through a consent message provided by Google (a certified
        consent management platform). You can change or withdraw your consent at any time using the privacy settings
        link shown by that message. If you do not consent, you may still see non-personalized ads.
      </p>

      <h2>How we use your information</h2>
      <ul>
        <li>To answer your messages</li>
        <li>To keep the site secure and working well</li>
        <li>To show ads that keep the patterns free</li>
      </ul>

      <h2>Data retention and your rights</h2>
      <p>
        Contact messages are deleted once they are no longer needed. You can ask us at any time to access, correct or
        delete the personal data we hold about you by writing to{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>. Depending on where you live (for example under the GDPR or
        the CCPA), you may have additional rights, including the right to complain to a data protection authority.
      </p>

      <h2>External links</h2>
      <p>
        Our posts link to other websites such as Etsy and Pinterest. Their own privacy policies apply when you visit
        them.
      </p>

      <h2>Children</h2>
      <p>This site is not directed at children under 13, and we do not knowingly collect their personal information.</p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The date at the top of this page shows the latest version.
        Questions? <Link href="/contact">Contact us</Link>.
      </p>
    </StaticPage>
  );
}
