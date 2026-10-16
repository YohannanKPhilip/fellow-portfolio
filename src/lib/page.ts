import {
  defaultHero,
  HERO_LIMITS,
  isHeroColor,
  legacyHero,
  parseHero,
  type HeroBlock,
  type HeroColor,
  type LegacyHero,
} from './hero';
import type { Resource } from '../types';
import { isBlurhash } from './blurhash';

/**
 * A fellow's page is an ordered list of sections, each of one known type. Fellows pick from fixed
 * colors and options; no HTML or CSS can be stored. The database enforces the same shape
 * (private.valid_page). See docs/PAGE-BUILDER-PLAN.md.
 */

export interface HeroSection {
  id: string;
  type: 'hero';
  blocks: HeroBlock[];
}

/** A piece of a section heading, with an optional palette color. */
export interface TitleRun {
  t: string;
  c?: HeroColor;
}

export interface ResourcesFilter {
  subjects?: string[];
  tags?: string[];
}

export interface ResourcesSection {
  id: string;
  type: 'resources';
  title?: TitleRun[];
  subtitle?: string;
  filter?: ResourcesFilter;
  /** Show the subject chips above the cards. Default true. */
  showFilters?: boolean;
  /** "oldest" is the order the resources were published in; "newest" reverses it. Default oldest. */
  sort?: 'oldest' | 'newest';
  limit?: number | null;
}

/**
 * One link in a links section. The address is always https. A link can have a picture the fellow
 * uploaded (a path in their own storage folder, with its blurhash); that needs the consent
 * confirmation, as for covers and classroom photos. A YouTube link shows its thumbnail without one.
 */
export interface LinkItem {
  label: string;
  url: string;
  image?: string;
  blurhash?: string;
  consent?: true;
}

export interface LinksSection {
  id: string;
  type: 'links';
  title?: TitleRun[];
  items: LinkItem[];
}

export type Section = HeroSection | ResourcesSection | LinksSection;

export interface PageDoc {
  v: 1;
  sections: Section[];
}

/** Limits match the database. */
export const PAGE_LIMITS = {
  sections: 20,
  title: 8,
  titleRun: 120,
  subtitle: 300,
  listItems: 10,
  listItem: 40,
  limit: 100,
  id: 64,
  links: 12,
  linkLabel: 60,
  linkUrl: 500,
} as const;

export const DEFAULT_RESOURCES_TITLE: TitleRun[] = [
  { t: 'Resources ' },
  { t: 'from my classroom.', c: 'muted' },
];
export const DEFAULT_RESOURCES_SUBTITLE =
  'Lesson plans, worksheets and classroom systems. Free to use and adapt.';

export const DEFAULT_LINKS_TITLE: TitleRun[] = [
  { t: 'Links ' },
  { t: 'worth a look.', c: 'muted' },
];

export const newSectionId = () => crypto.randomUUID();

/** A new, empty links section. */
export function defaultLinksSection(id: string): LinksSection {
  return { id, type: 'links', title: DEFAULT_LINKS_TITLE.map((r) => ({ ...r })), items: [] };
}

/** True for an https address with no spaces and a host, the only kind of link a page can hold. */
export function isLinkUrl(value: string): boolean {
  const v = value.trim();
  if (v.length < 9 || v.length > PAGE_LIMITS.linkUrl || /\s/.test(v)) return false;
  try {
    const url = new URL(v);
    return url.protocol === 'https:' && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/** An uploaded link picture: "<user id>/links/<name>", the only place the database lets one live. */
const LINK_IMAGE = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/links\/[A-Za-z0-9._-]+$/;
export const isLinkImage = (value: string) => LINK_IMAGE.test(value);

/** A link as it is stored: only known fields, and a picture only together with its consent. */
export function cleanLink(item: LinkItem): LinkItem {
  const link: LinkItem = { label: item.label.trim(), url: item.url.trim() };
  if (item.image && isLinkImage(item.image) && item.consent === true) {
    link.image = item.image;
    link.consent = true;
    if (item.blurhash && isBlurhash(item.blurhash)) link.blurhash = item.blurhash;
  }
  return link;
}

/** The uploaded pictures a page uses, so ones that are no longer used can be deleted. */
export function pageImages(page: PageDoc): string[] {
  return page.sections.flatMap((s) =>
    s.type === 'links' ? s.items.flatMap((i) => (i.image ? [i.image] : [])) : [],
  );
}

/** The site name shown on a link, e.g. "youtube.com" for https://www.youtube.com/watch?v=x. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** The "all my resources" section a page starts with. */
export function defaultResourcesSection(id = 'resources'): ResourcesSection {
  return {
    id,
    type: 'resources',
    title: DEFAULT_RESOURCES_TITLE.map((r) => ({ ...r })),
    subtitle: DEFAULT_RESOURCES_SUBTITLE,
    filter: {},
    showFilters: true,
    sort: 'oldest',
  };
}

/** A page that is the given hero followed by all resources, which draws what the site always drew. */
export function pageFromHero(blocks: HeroBlock[]): PageDoc {
  return {
    v: 1,
    sections: [{ id: 'hero', type: 'hero', blocks }, defaultResourcesSection()],
  };
}

/** The page for a Sheet row, or an old database row, that has the hero as separate fields. */
export const legacyPage = (fields: LegacyHero): PageDoc => pageFromHero(legacyHero(fields).blocks);

/** What a page shows when it has none of its own. */
export const defaultPage = (firstName: string): PageDoc =>
  pageFromHero(defaultHero(firstName).blocks);

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function parseStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, PAGE_LIMITS.listItem))
    .filter(Boolean)
    .slice(0, PAGE_LIMITS.listItems);
  return out;
}

/** A section heading from stored data: known pieces and colors only. Undefined if it isn't a list. */
function parseTitle(value: unknown): TitleRun[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const title: TitleRun[] = [];
  for (const r of value.slice(0, PAGE_LIMITS.title)) {
    if (!isObject(r) || typeof r.t !== 'string' || r.t.length === 0) continue;
    const run: TitleRun = { t: r.t.slice(0, PAGE_LIMITS.titleRun) };
    if (isHeroColor(r.c)) run.c = r.c;
    title.push(run);
  }
  return title;
}

function parseLinksSection(raw: Record<string, unknown>, id: string): LinksSection {
  const section: LinksSection = { id, type: 'links', items: [] };
  const title = parseTitle(raw.title);
  if (title) section.title = title;
  if (Array.isArray(raw.items)) {
    for (const i of raw.items.slice(0, PAGE_LIMITS.links)) {
      if (!isObject(i) || typeof i.label !== 'string' || typeof i.url !== 'string') continue;
      const label = i.label.trim().slice(0, PAGE_LIMITS.linkLabel);
      const url = i.url.trim();
      if (!label || !isLinkUrl(url)) continue;
      section.items.push(
        cleanLink({
          label,
          url,
          image: typeof i.image === 'string' ? i.image : undefined,
          blurhash: typeof i.blurhash === 'string' ? i.blurhash : undefined,
          consent: i.consent === true ? true : undefined,
        }),
      );
    }
  }
  return section;
}

function parseResourcesSection(raw: Record<string, unknown>, id: string): ResourcesSection {
  const section: ResourcesSection = { id, type: 'resources' };

  const title = parseTitle(raw.title);
  if (title) section.title = title;
  if (typeof raw.subtitle === 'string')
    section.subtitle = raw.subtitle.slice(0, PAGE_LIMITS.subtitle);

  if (isObject(raw.filter)) {
    const filter: ResourcesFilter = {};
    const subjects = parseStringList(raw.filter.subjects);
    const tags = parseStringList(raw.filter.tags);
    if (subjects) filter.subjects = subjects;
    if (tags) filter.tags = tags;
    section.filter = filter;
  }
  if (typeof raw.showFilters === 'boolean') section.showFilters = raw.showFilters;
  if (raw.sort === 'oldest' || raw.sort === 'newest') section.sort = raw.sort;
  if (raw.limit === null) section.limit = null;
  else if (typeof raw.limit === 'number' && Number.isInteger(raw.limit)) {
    section.limit = Math.min(PAGE_LIMITS.limit, Math.max(1, raw.limit));
  }
  return section;
}

/**
 * Reads a page from stored data. Anything unexpected is dropped rather than trusted: unknown section
 * types, repeated ids, a second hero. Returns null if no usable section is left.
 */
export function parsePage(value: unknown): PageDoc | null {
  if (!isObject(value) || !Array.isArray(value.sections)) return null;
  const sections: Section[] = [];
  const ids = new Set<string>();
  let heroSeen = false;

  for (const raw of value.sections.slice(0, PAGE_LIMITS.sections)) {
    if (!isObject(raw) || typeof raw.id !== 'string') continue;
    const id = raw.id.slice(0, PAGE_LIMITS.id);
    if (!id || ids.has(id)) continue;

    if (raw.type === 'hero') {
      if (heroSeen) continue;
      const hero = parseHero({ v: 1, blocks: raw.blocks });
      if (!hero) continue;
      heroSeen = true;
      ids.add(id);
      sections.push({ id, type: 'hero', blocks: hero.blocks });
    } else if (raw.type === 'resources') {
      ids.add(id);
      sections.push(parseResourcesSection(raw, id));
    } else if (raw.type === 'links') {
      ids.add(id);
      sections.push(parseLinksSection(raw, id));
    }
  }
  return sections.length ? { v: 1, sections } : null;
}

export const heroSectionOf = (page: PageDoc): HeroSection | undefined =>
  page.sections.find((s): s is HeroSection => s.type === 'hero');

const norm = (s: string) => s.trim().toLowerCase();

/**
 * The resources a section shows: those matching its filter (a subject AND a tag when both are set;
 * an empty or missing filter matches everything), in its chosen order, up to its limit.
 * `resources` come in the order they were published, oldest first.
 */
export function sectionResources(section: ResourcesSection, resources: Resource[]): Resource[] {
  const subjects = (section.filter?.subjects ?? []).map(norm);
  const tags = (section.filter?.tags ?? []).map(norm);
  let shown = resources.filter((r) => {
    if (subjects.length && !subjects.includes(norm(r.subject))) return false;
    if (tags.length && !r.tags.some((t) => tags.includes(norm(t)))) return false;
    return true;
  });
  if (section.sort === 'newest') shown = [...shown].reverse();
  if (typeof section.limit === 'number') shown = shown.slice(0, section.limit);
  return shown;
}

/** Number of characters in a section heading, for limit messages. */
export const titleChars = (title: TitleRun[] | undefined) =>
  (title ?? []).reduce((n, r) => n + r.t.length, 0);

// ---------------------------------------------------------------------------------------------
// Editing a links section.

/** Adds a link, or replaces the one at `index`. Returns the same section if it can't be added. */
export function setLink(section: LinksSection, item: LinkItem, index?: number): LinksSection {
  const clean = cleanLink(item);
  if (index === undefined) {
    if (section.items.length >= PAGE_LIMITS.links) return section;
    return { ...section, items: [...section.items, clean] };
  }
  return { ...section, items: section.items.map((it, i) => (i === index ? clean : it)) };
}

export function removeLink(section: LinksSection, index: number): LinksSection {
  return { ...section, items: section.items.filter((_, i) => i !== index) };
}

/** Moves a link one place earlier or later. Returns the same section if it can't move. */
export function moveLink(section: LinksSection, index: number, by: -1 | 1): LinksSection {
  const to = index + by;
  if (index < 0 || to < 0 || to >= section.items.length) return section;
  const items = [...section.items];
  const [moved] = items.splice(index, 1);
  items.splice(to, 0, moved as LinkItem);
  return { ...section, items };
}

/** Re-exported so callers that edit sections don't also need the hero module for its limits. */
export { HERO_LIMITS };

// ---------------------------------------------------------------------------------------------
// Editing helpers. They return a new page and leave the old one untouched, so undo is simple.

/** Moves a section one place up or down. Returns the same page if it can't move. */
export function moveSection(page: PageDoc, id: string, by: -1 | 1): PageDoc {
  const from = page.sections.findIndex((s) => s.id === id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= page.sections.length) return page;
  const sections = [...page.sections];
  const [moved] = sections.splice(from, 1);
  sections.splice(to, 0, moved as Section);
  return { ...page, sections };
}

/** Removes a section. A page always keeps at least one section. */
export function removeSection(page: PageDoc, id: string): PageDoc {
  if (page.sections.length <= 1) return page;
  return { ...page, sections: page.sections.filter((s) => s.id !== id) };
}

/** Inserts a section after the one with `afterId` (or first, if afterId is undefined). */
export function insertSection(page: PageDoc, section: Section, afterId?: string): PageDoc {
  if (page.sections.length >= PAGE_LIMITS.sections) return page;
  const at = afterId === undefined ? 0 : page.sections.findIndex((s) => s.id === afterId) + 1;
  const sections = [...page.sections];
  sections.splice(at, 0, section);
  return { ...page, sections };
}

/** Copies a resources or links section right after itself, with a new id. A hero can't be copied (one per page). */
export function duplicateSection(page: PageDoc, id: string): PageDoc {
  const source = page.sections.find((s) => s.id === id);
  if (!source || source.type === 'hero') return page;
  const copy = JSON.parse(JSON.stringify(source)) as ResourcesSection | LinksSection;
  copy.id = newSectionId();
  return insertSection(page, copy, id);
}

/** Replaces one section, matched by id. */
export function updateSection(page: PageDoc, section: Section): PageDoc {
  return { ...page, sections: page.sections.map((s) => (s.id === section.id ? section : s)) };
}

/** A message for the fellow if the page is over a limit, otherwise undefined. */
export function pageProblem(page: PageDoc): string | undefined {
  if (page.sections.length === 0) return 'A page needs at least one section.';
  if (page.sections.length > PAGE_LIMITS.sections) {
    return `Use at most ${PAGE_LIMITS.sections} sections.`;
  }
  for (const s of page.sections) {
    if (s.type !== 'hero' && (s.title ?? []).length > PAGE_LIMITS.title) {
      return `A section heading has too many differently colored pieces (limit ${PAGE_LIMITS.title}).`;
    }
    if (s.type === 'links' && s.items.length > PAGE_LIMITS.links) {
      return `A links section can hold at most ${PAGE_LIMITS.links} links.`;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Settings for a resources section.

/** Choices offered for "show at most". Anything else already stored is kept as it is. */
export const LIMIT_OPTIONS = [3, 6, 9, 12, 24] as const;

/**
 * The distinct non-empty values in a list (subjects or tags), case-insensitively, keeping the first
 * spelling, sorted. Used to offer the fellow their own subjects and tags to filter by.
 */
export function collectValues(values: (string | null | undefined)[]): string[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    const value = (v ?? '').trim();
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Adds or removes one subject or tag from a section's filter. An empty filter shows everything. */
export function toggleFilterValue(
  section: ResourcesSection,
  key: 'subjects' | 'tags',
  value: string,
): ResourcesSection {
  const current = section.filter?.[key] ?? [];
  const has = current.some((v) => norm(v) === norm(value));
  const next = has
    ? current.filter((v) => norm(v) !== norm(value))
    : [...current, value].slice(0, PAGE_LIMITS.listItems);
  return { ...section, filter: { ...section.filter, [key]: next } };
}

/** Sets how many resources a section shows at most, or null for all of them. */
export function setLimit(section: ResourcesSection, limit: number | null): ResourcesSection {
  return { ...section, limit };
}

/** A short description of what a section shows, for its settings summary. */
export function describeFilter(section: ResourcesSection): string {
  const parts = [
    ...(section.filter?.subjects ?? []),
    ...(section.filter?.tags ?? []).map((t) => '#' + t),
  ];
  return parts.length ? parts.join(', ') : 'All resources';
}
