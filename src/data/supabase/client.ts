import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../../config';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | undefined;

/**
 * The one Supabase client. It only ever holds the publishable key, which is safe
 * in the browser because Row Level Security decides what each visitor can see.
 */
export function getClient(): SupabaseClient<Database> {
  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    throw new Error(
      'VITE_DATA_SOURCE is "supabase" but VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing.',
    );
  }
  client ??= createClient<Database>(config.supabaseUrl, config.supabasePublishableKey, {
    // The sign-in page finishes the link itself (token_hash), so Supabase
    // must not also try to read the address bar.
    auth: { detectSessionInUrl: false },
  });
  return client;
}
