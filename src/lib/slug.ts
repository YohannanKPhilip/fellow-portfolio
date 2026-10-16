/** Words the site uses for its own routes (and files), so a fellow can't take them as an address. Mirrors the database check. */
export const RESERVED_SLUGS = [
  'me',
  'login',
  'auth',
  'r',
  'admin',
  'about',
  'api',
  'setup',
  'assets',
  '404',
] as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

export const isReservedSlug = (slug: string) =>
  (RESERVED_SLUGS as readonly string[]).includes(slug);

/** "Priya Sharma" becomes "priya-sharma". Accents are dropped; anything else becomes a hyphen. */
export function slugFromName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

/** Returns a message for the fellow, or undefined when the address is fine. */
export function slugProblem(slug: string): string | undefined {
  if (slug.length < SLUG_MIN) return `Use at least ${SLUG_MIN} characters.`;
  if (slug.length > SLUG_MAX) return `Use at most ${SLUG_MAX} characters.`;
  if (!SLUG_PATTERN.test(slug)) {
    return 'Use only lowercase letters, numbers and single hyphens, with no hyphen at the start or end.';
  }
  if (isReservedSlug(slug)) return 'That word is used by the site. Please choose another address.';
  return undefined;
}
