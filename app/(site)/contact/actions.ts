"use server";

import { getPublicClient } from "@/lib/supabase/public";

export type ContactState = { ok: boolean; message: string } | null;

/** Saves a contact form message in Supabase (table "messages"). */
export async function sendMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: real people never see this field. If it is filled, it is a bot.
  // We pretend everything worked so the bot does not try again.
  if (String(formData.get("website") ?? "").length > 0) {
    return { ok: true, message: "Thank you! Your message has been sent." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!name || name.length > 100) return { ok: false, message: "Please enter your name (100 characters max)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)
    return { ok: false, message: "Please enter a valid email address." };
  if (body.length < 10 || body.length > 5000)
    return { ok: false, message: "Your message should be between 10 and 5000 characters." };

  const supabase = getPublicClient();
  if (!supabase) return { ok: false, message: "The contact form is not configured yet." };

  const { error } = await supabase.from("messages").insert({ name, email, body });
  if (error) {
    console.error("sendMessage:", error.message);
    return { ok: false, message: "Sorry, something went wrong. Please try again later." };
  }
  return { ok: true, message: "Thank you! Your message has been sent. I’ll reply as soon as I can." };
}
