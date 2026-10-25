import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Source_Serif_4 } from "next/font/google";
import { getSiteSettings, SITE_LOCALE, SITE_URL } from "@/lib/site";
import "./globals.css";

// Fonts are self-hosted by next/font: no layout shift, no request to Google at runtime.
const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const grotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-grotesque",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${site.name} – Free Crochet Patterns`,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    applicationName: site.name,
    authors: [{ name: site.author }],
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: SITE_LOCALE,
    },
    twitter: { card: "summary_large_image" },
    // Let Google show big photo previews (Google Images, Discover) and full
    // text snippets. Pages that must stay out of Google set their own robots.
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    // Lets browsers and feed readers find the RSS feed from any page.
    alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: site.name }] } },
    // AdSense site verification: <meta name="google-adsense-account" content="ca-pub-...">
    other: site.adsenseClient ? { "google-adsense-account": site.adsenseClient } : {},
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${grotesque.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
