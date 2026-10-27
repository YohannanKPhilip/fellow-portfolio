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

export interface BackgroundOption {
  label: string;
  /** Whether the page is light or dark with this background; undefined follows the device. */
  mode?: 'light' | 'dark';
  /**
   * Colors for the picker's preview tile: page, text, and the theme's own accent. `bg2` adds a second
   * half to the tile (used by "Match device", which is light or dark).
   */
  preview: { bg: string; ink: string; accent: string; bg2?: string };
}

export const BACKGROUNDS = {
  auto: {
    label: 'Match device',
    preview: { bg: '#f4f4f2', bg2: '#111110', ink: '#8a8a85', accent: '#ee6a1b' },
  },
  light: {
    label: 'Light',
    mode: 'light',
    preview: { bg: '#f4f4f2', ink: '#141414', accent: '#ee6a1b' },
  },
  dark: {
    label: 'Dark',
    mode: 'dark',
    preview: { bg: '#111110', ink: '#f3f3f1', accent: '#ff8240' },
  },
  warm: {
    label: 'Warm',
    mode: 'light',
    preview: { bg: '#f6efe3', ink: '#2b2118', accent: '#ee6a1b' },
  },
  warmblack: {
    label: 'Warm black',
    mode: 'dark',
    preview: { bg: '#131110', ink: '#f6f1e9', accent: '#ff7f3f' },
  },
  chalkboard: {
    label: 'Chalkboard',
    mode: 'dark',
    preview: { bg: '#15211d', ink: '#f3f0e6', accent: '#ffa24a' },
  },
} as const satisfies Record<string, BackgroundOption>;
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
  const mode = background ? (BACKGROUNDS[background] as BackgroundOption).mode : undefined;
  return mode ?? (systemDark ? 'dark' : 'light');
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

export const INK_ON_ACCENT = { dark: '#141414', light: '#ffffff' } as const;

/** Text color for sitting on an accent-colored button: whichever of near-black or white reads better. */
export function inkOnAccent(accentHex: string): string {
  const l = luminance(accentHex);
  const contrastWithDark = (l + 0.05) / (luminance(INK_ON_ACCENT.dark) + 0.05);
  const contrastWithLight = 1.05 / (l + 0.05);
  return contrastWithDark >= contrastWithLight ? INK_ON_ACCENT.dark : INK_ON_ACCENT.light;
}

/** The accent color to use, or undefined for the site's own orange. */
export function accentColor(theme: Theme, mode: 'light' | 'dark'): string | undefined {
  return theme.accent && theme.accent !== 'orange' ? ACCENTS[theme.accent][mode] : undefined;
}
