"use server";

import { addSubscriberToBrevo } from "@/lib/brevo";
import { getPublicClient } from "@/lib/supabase/public";

export type SubscribeState = { ok: boolean; message: string } | null;

/**
 * Hands the address to Brevo after it is safely stored in our own database.
 * A failure is logged and swallowed: the reader already subscribed, and the
 * address can be pushed to Brevo later from /admin/subscribers.
 */
async function syncToBrevo(email: string, name: string) {
  const result = await addSubscriberToBrevo({ email, name });
  if (!result.synced && result.reason !== "BREVO_API_KEY is not set") {
    console.error(`brevo: could not add ${email} — ${result.reason}`);
  }
}

/**
 * Saves an email sign-up from the box at the bottom of a post (table
 * "subscribers"). Row Level Security allows the insert but no public read, so
 * the list can never be pulled back out from the site.
 */
export async function subscribe(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  // Honeypot: real people never see this field. If it is filled, it is a bot.
  // We pretend everything worked so the bot does not try again.
  if (String(formData.get("website") ?? "").length > 0) {
    return { ok: true, message: "Thank you! Check your inbox to confirm." };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const source = String(formData.get("source") ?? "").trim().slice(0, 200);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const supabase = getPublicClient();
  if (!supabase) return { ok: false, message: "The sign-up form is not configured yet." };

  const { error } = await supabase.from("subscribers").insert({ name, email, source });

  if (error) {
    // 23505 = the unique index on email: they already signed up, which is not
    // an error worth showing as one. Still push to Brevo, because an address
    // saved before Brevo was connected would otherwise never get there.
    if (error.code === "23505") {
      await syncToBrevo(email, name);
      return { ok: true, message: "You are already on the list — thank you!" };
    }
    console.error("subscribe:", error.message);
    return { ok: false, message: "Sorry, something went wrong. Please try again later." };
  }

  await syncToBrevo(email, name);
  return { ok: true, message: "You're in! New patterns will land in your inbox." };
}
