/** Build-time settings from VITE_* environment variables (see .env.example). */
export const config = {
  sheetId: (import.meta.env.VITE_SHEET_ID ?? '').trim(),
  defaultFellow: (import.meta.env.VITE_DEFAULT_FELLOW ?? 'yohannan').trim(),
  siteName: 'Fellow Portfolio',
} as const;
