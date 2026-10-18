import type { FaqItem } from "./types";

/** "2026-10-18T..." → "October 18, 2026" */
export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Admin FAQ text → list of questions.
 * Format (blocks separated by a blank line):
 *   Q: Can I use acrylic yarn?
 *   A: Yes, but cotton is better.
 */
export function parseFaq(text: string): FaqItem[] {
  return (text ?? "")
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) => {
      const q = block.match(/^\s*Q:\s*([\s\S]*?)(?=\n\s*A:|$)/i)?.[1]?.trim() ?? "";
      const a = block.match(/\n\s*A:\s*([\s\S]*)$/i)?.[1]?.trim() ?? "";
      return { q, a };
    })
    .filter((item) => item.q && item.a);
}

/** List of questions → admin FAQ text. */
export function faqToText(faq: FaqItem[] | null | undefined) {
  return (faq ?? []).map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
}

/** Splits "Abbreviation – meaning" lines into pairs for the pattern card. */
export function parseAbbreviations(text: string) {
  return (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s+[–—=:-]\s+(.+)$/);
      return match ? { term: match[1].trim(), meaning: match[2].trim() } : { term: line, meaning: "" };
    });
}

export const difficultyLabel: Record<string, string> = {
  beginner: "Beginner",
  easy: "Easy",
  intermediate: "Intermediate",
  experienced: "Experienced",
};
