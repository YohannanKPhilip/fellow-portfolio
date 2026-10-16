const dataSource = (import.meta.env.VITE_DATA_SOURCE ?? 'sheet').trim().toLowerCase();

/** Build-time settings from VITE_* environment variables (see .env.example). */
export const config = {
  /** Where the site reads its data: the Google Sheet (default) or Supabase. */
  dataSource: dataSource === 'supabase' ? 'supabase' : 'sheet',
  sheetId: (import.meta.env.VITE_SHEET_ID ?? '').trim(),
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, ''),
  supabasePublishableKey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim(),
  /** Cloudflare Turnstile site key (public). Empty means the sign-in form has no bot check. */
  turnstileSiteKey: (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim(),
  defaultFellow: (import.meta.env.VITE_DEFAULT_FELLOW ?? 'yohannan').trim(),
  siteName: 'Fellow Portfolio',
} as const;
