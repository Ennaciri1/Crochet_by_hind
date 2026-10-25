import { cache } from "react";
import { getPublicClient } from "./supabase/public";

export type StaticPageSlug = "about" | "privacy-policy" | "terms" | "disclaimer";

export type StaticPageContent = { slug: StaticPageSlug; title: string; content: string };

/** Fallback Markdown, used when the DB row is missing/unavailable (e.g. before running schema.sql). */
const fallbackPages: Record<StaticPageSlug, StaticPageContent> = {
  about: {
    slug: "about",
    title: "About",
    content: `Hi, I'm The Designer — the hands behind My Crochet Blog.

I design crochet patterns that are calm to make and lovely to use: soft amigurumi friends, warm wearables and simple pieces for the home. Every pattern on this site is written in **US crochet terms**, tested, and photographed step by step.

## Why the patterns are free

I believe everyone should be able to learn to crochet. The patterns on this blog are free to read, and the site is supported by ads. If you would rather have a clean, printable copy without ads, you can buy the PDF version in my [Etsy shop](https://www.etsy.com). Every purchase helps me publish more free patterns.

## What you will find here

- Free patterns with stitch counts for every round
- Beginner-friendly tutorials for stitches and techniques
- Printable pattern cards — no ads on paper

## Say hello

I love seeing what you make! Share your finished projects on [Pinterest](https://www.pinterest.com) or send me a note through the [contact page](/contact).
`,
  },
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    content: `This Privacy Policy explains what information My Crochet Blog ("we", "us") collects when you visit the site, how it is used, and the choices you have.

## Information we collect

- **Contact form:** when you send a message, we store your name, email address and message so we can reply. We never sell this information, and we do not add you to the mailing list unless you sign up for it yourself.
- **Mailing list:** if you sign up through the form at the end of a pattern, we store the first name and email address you give us, together with the post you signed up from, so we can send you new patterns.
- **Log data:** our hosting provider automatically records technical information such as your IP address, browser type and the pages you visit, for security and performance.
- **Visitor statistics:** we count visits with Vercel Web Analytics to learn which patterns are popular. It uses no cookies and does not identify you: visits are counted anonymously, as totals by page, country, device and referring website.
- **Cookies:** small files stored on your device, mostly by our advertising partner (see below).

## Advertising and Google AdSense cookies

We use Google AdSense to show ads on this site. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.

Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to this site and/or other sites on the Internet.

You may opt out of personalized advertising by visiting [Google Ads Settings](https://adssettings.google.com). Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting [www.aboutads.info](https://www.aboutads.info/choices/).

To learn more, read [How Google uses information from sites or apps that use its services](https://policies.google.com/technologies/partner-sites).

## Visitors in the EEA, the UK and Switzerland

If you visit from the European Economic Area, the United Kingdom or Switzerland, we ask for your consent before personalized ads and non-essential cookies are used, through a consent message provided by Google (a certified consent management platform). You can change or withdraw your consent at any time using the privacy settings link shown by that message. If you do not consent, you may still see non-personalized ads.

## How we use your information

- To answer your messages
- To send you new patterns, but only if you signed up for them
- To keep the site secure and working well
- To show ads that keep the patterns free

## The mailing list

Joining the mailing list is optional: you only hear from us if you fill in the sign-up form yourself. We use your email address to send new patterns, tutorials and the occasional free file — nothing else.

We never sell, rent or share your email address. The list is managed with [Brevo](https://www.brevo.com), a company based in the European Union, which stores it on our behalf. Any email we send you will include an unsubscribe link, and you can ask us to remove you at any time through the [contact page](/contact). Once you unsubscribe, we delete your address from the list.

## Where your information is stored

This website is hosted by **Vercel**, and everything described above — contact messages, mailing-list addresses and the photos on the site — is stored in a **Supabase** database. If you join the mailing list, your first name and email address are also stored with **Brevo**, the service we use to send those emails. All three companies process this data only on our instructions, as service providers, and are not allowed to use it for their own purposes.

Their servers may be located outside your own country, including in the United States, so your information may be transferred to and processed there.

## Data retention and your rights

Contact messages are deleted once they are no longer needed. You can ask us at any time to access, correct or delete the personal data we hold about you by writing to [hello@example.com](mailto:hello@example.com). Depending on where you live (for example under the GDPR or the CCPA), you may have additional rights, including the right to complain to a data protection authority.

## External links

Our posts link to other websites such as Etsy and Pinterest. Their own privacy policies apply when you visit them.

## Children

This site is not directed at children under 13, and we do not knowingly collect their personal information.

## Changes

We may update this policy from time to time. The date at the top of this page shows the latest version. Questions? [Contact us](/contact).
`,
  },
  terms: {
    slug: "terms",
    title: "Terms of Use",
    content: `By using My Crochet Blog, you agree to these terms. If you do not agree, please do not use the site.

## Copyright of patterns and photos

All patterns, text and photos on this site are © The Designer and protected by copyright. The patterns are free to read and to use for your own crocheting.

- **You may** make items from the patterns for yourself, as gifts, for charity, or to sell in small quantities. Please credit My Crochet Blog with a link when you sell or share them.
- **You may not** copy, translate, republish, share or sell the pattern text or photos, in whole or in part, online or in print. Sharing a link to the post is always welcome.

## Pinterest and social media

You are welcome to pin our photos with the "Save to Pinterest" button, or share one photo with a link back to the original post.

## Purchases

PDF patterns are sold through [Etsy](https://www.etsy.com). Etsy's terms and refund policies apply to those purchases.

## No warranty

Patterns are tested carefully, but mistakes can happen and results depend on your yarn, hook and tension. The site is provided "as is", without warranties of any kind. See our [Disclaimer](/disclaimer).

## Limitation of liability

To the extent permitted by law, The Designer is not liable for any damage resulting from the use of this site or its patterns.

## Changes

We may update these terms at any time. Continued use of the site means you accept the latest version. Questions? [Contact us](/contact).
`,
  },
  disclaimer: {
    slug: "disclaimer",
    title: "Disclaimer",
    content: `## Advertising

My Crochet Blog is supported by advertising. Ads are served by Google AdSense and are clearly labelled "Advertisement". We do not choose the individual ads you see, and showing an ad does not mean we endorse the product. Read our [Privacy Policy](/privacy-policy) to learn how ad cookies work.

## Our own products

Some links point to our own [Etsy shop](https://www.etsy.com), where we sell ad-free PDF versions of our patterns. If a post ever contains an affiliate link, it will be mentioned in that post.

## Safety: toys and items for babies

**Plastic safety eyes, buttons, beads and other small parts are a choking hazard** and are not safe for babies and children under 3 years old. For toys made for babies and young children, embroider the eyes and details with yarn instead, sew all parts on very securely, and check the toy regularly for wear.

Never leave a baby unattended with a toy, and do not put crocheted toys, blankets or loose items in a sleeping infant's crib. Items made from our patterns are made at your own risk, and you are responsible for the safety of anything you make, give or sell.

## Accuracy

Patterns are tested, but errors can still happen, and your finished size may differ depending on yarn, hook and tension. If you find a mistake, please [tell us](/contact) so we can fix it.
`,
  },
};

/** Static page content (About / Privacy / Terms / Disclaimer), editable from /admin/pages. */
export const getStaticPage = cache(async (slug: StaticPageSlug): Promise<StaticPageContent> => {
  const supabase = getPublicClient();
  if (!supabase) return fallbackPages[slug];

  const { data } = await supabase.from("pages").select("slug, title, content").eq("slug", slug).maybeSingle();
  if (!data) return fallbackPages[slug];
  return data as StaticPageContent;
});
