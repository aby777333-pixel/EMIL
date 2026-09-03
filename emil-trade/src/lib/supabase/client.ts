import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Return a stub during SSR/build when env vars are not available
    // This prevents build-time crashes for 'use client' pages
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }
  return createBrowserClient(url, key);
}
