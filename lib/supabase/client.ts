"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for the browser (used in the admin for image uploads and login). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
