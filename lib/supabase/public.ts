import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for PUBLIC pages (no cookies, no login).
 * Because it does not read cookies, pages can be cached and rebuilt every
 * 5 minutes (ISR). Security comes from Row Level Security in the database.
 *
 * Returns null when the env variables are missing (e.g. first build), so the
 * site still builds and simply shows "no posts yet".
 */
let client: SupabaseClient | null = null;

export function getPublicClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
