"use client";

import { getSupabaseBrowser } from "@/lib/supabase-browser";

export async function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase.auth.getSession();

  const headers = new Headers(init?.headers);
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  return fetch(input, { ...init, headers });
}
