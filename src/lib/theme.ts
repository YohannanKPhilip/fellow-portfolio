/**
 * A fellow's page style: accent color, background and headline font. Fixed choices only, so a page
 * is always readable and still looks like part of the same site. The database enforces the same
 * values (private.valid_theme).
 */

export interface AccentOption {
  label: string;
  /** Used on light backgrounds / on dark backgrounds. Chosen to stay readable on each. */
  light: string;
  dark: string;
}

export const ACCENTS = {
  orange: { label: 'Orange', light: '#ee6a1b', dark: '#ff8240' },
  blue: { label: 'Blue', light: '#2563d6', dark: '#6aa8ff' },
  green: { label: 'Green', light: '#1a8f4d', dark: '#3ddc84' },
  pink: { label: 'Pink', light: '#d1327a', dark: '#ff7ab6' },
  purple: { label: 'Purple', light: '#6d3fe0', dark: '#b08cff' },
  teal: { label: 'Teal', light: '#0e8f83', dark: '#3ccfc0' },
} as const satisfies Record<string, AccentOption>;
export type AccentName = keyof typeof ACCENTS;

export const BACKGROUNDS = {
  auto: { label: 'Match device' },
  light: { label: 'Light' },
  dark: { label: 'Dark' },
  warm: { label: 'Warm' },
} as const;
export type BackgroundName = keyof typeof BACKGROUNDS;

export const FONTS = {
  modern: { label: 'Modern', stack: undefined, link: undefined },
  friendly: {
    label: 'Friendly',
    stack: "'Nunito', 'Geist', system-ui, sans-serif",
    link: 'https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700&display=swap',
  },
  classic: {
    label: 'Classic',
    stack: "'Fraunces', Georgia, 'Times New Roman', serif",
    link: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap',
  },
} as const;
export type FontName = keyof typeof FONTS;

export interface Theme {
  accent?: AccentName;
  background?: BackgroundName;
  font?: FontName;
}

const pick = <T extends object>(table: T, value: unknown): keyof T | undefined =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(table, value)
    ? (value as keyof T)
    : undefined;

/** Reads a stored theme. Unknown values are ignored, giving the site's default look. */
export function parseTheme(value: unknown): Theme {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const theme: Theme = {};
  const accent = pick(ACCENTS, v.accent);
  const background = pick(BACKGROUNDS, v.background);
  const font = pick(FONTS, v.font);
  if (accent) theme.accent = accent;
  if (background) theme.background = background;
  if (font) theme.font = font;
  return theme;
}

/** Which mode the page is in once the background choice is applied. */
export function effectiveMode(
  background: BackgroundName | undefined,
  systemDark: boolean,
): 'light' | 'dark' {
  if (background === 'dark') return 'dark';
  if (background === 'light' || background === 'warm') return 'light';
  return systemDark ? 'dark' : 'light';
}

/** The accent color to use, or undefined for the site's own orange. */
export function accentColor(theme: Theme, mode: 'light' | 'dark'): string | undefined {
  return theme.accent && theme.accent !== 'orange' ? ACCENTS[theme.accent][mode] : undefined;
}
