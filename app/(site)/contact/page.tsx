import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/StaticPage";
import { site } from "@/lib/site";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${site.author} about patterns, collaborations or questions.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <StaticPage
      title="Contact"
      path="/contact"
      intro="Questions about a pattern, a collaboration idea, or just want to say hi? I read every message."
    >
      <p>
        You can also email me at <a href={`mailto:${site.email}`}>{site.email}</a>. Before writing about a pattern,
        please check the FAQ at the end of the post — your answer may be there already. For orders of PDF patterns,
        please contact me through{" "}
        <a href={site.etsy} target="_blank" rel="noopener">
          Etsy
        </a>
        .
      </p>
      <ContactForm />
      <p className="hint" style={{ marginTop: "1.5rem" }}>
        Your name, email and message are stored only to answer you. See the <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>
    </StaticPage>
  );
}
