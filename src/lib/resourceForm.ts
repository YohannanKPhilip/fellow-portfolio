import { blurhashFor, isStoragePath } from '../data/supabase/mappers';
import { cleanRatio } from './blurhash';
import { slugFromName } from './slug';

/** Subjects offered while typing. Any other subject can still be typed. */
export const SUBJECT_SUGGESTIONS = [
  'Maths',
  'English',
  'EVS',
  'Science',
  'Social Science',
  'Hindi',
  'Kannada',
  'SEL',
  'Classroom culture',
  'Art',
];

/** Limits match the database, which refuses anything outside them. */
export const LIMITS = {
  title: 120,
  slug: 80,
  summary: 300,
  description: 5000,
  short: 40, // subject, grade, length
  tags: 8,
  tag: 40,
  fileName: 200, // the database's limit
  fileTag: 60, // what the editor allows for one "What's inside" name
  files: 12, // how many "What's inside" names the editor allows
  caption: 300,
} as const;

export interface FileDraft {
  key: string;
  name: string;
  link: string;
}

export interface MediaDraft {
  key: string;
  url: string;
  caption: string;
  hint: '' | 'image' | 'video';
  /** Blurred stand-in for an uploaded photo ('' for a link). */
  blurhash: string;
  /** Width / height of an uploaded photo (0 when not known). */
  ratio: number;
  /** "I have consent for any students who can be identified." The database refuses media without it. */
  consent: boolean;
}

export interface ResourceDraft {
  /** Set once the resource has been saved. */
  id?: string;
  slug: string;
  status: 'draft' | 'published';
  title: string;
  subject: string;
  grade: string;
  length: string;
  tags: string[];
  coverPath: string;
  /** Blurred stand-in for an uploaded cover ('' for a link or no cover). */
  coverBlurhash: string;
  coverConsent: boolean;
  summary: string;
  description: string;
  driveLink: string;
  files: FileDraft[];
  media: MediaDraft[];
}

export const newKey = () => crypto.randomUUID();

export function emptyDraft(): ResourceDraft {
  return {
    slug: '',
    status: 'draft',
    title: '',
    subject: '',
    grade: '',
    length: '',
    tags: [],
    coverPath: '',
    coverBlurhash: '',
    coverConsent: false,
    summary: '',
    description: '',
    driveLink: '',
    files: [],
    media: [],
  };
}

/** "Fractions with rotis!" becomes "fractions-with-rotis". */
export const slugFromTitle = (title: string) => slugFromName(title).slice(0, LIMITS.slug);

/**
 * Adds a tag typed by the fellow: trimmed, no duplicates (ignoring case). By default at most 8 tags,
 * each under 40 characters; "What's inside" passes its own limits.
 */
export function addTag(
  tags: string[],
  raw: string,
  max: number = LIMITS.tags,
  maxLength: number = LIMITS.tag,
): string[] {
  const tag = raw.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  if (!tag) return tags;
  if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return tags;
  if (tags.length >= max) return tags;
  return [...tags, tag];
}

/**
 * "What's inside" is a list of names. The editor edits it as tags; this turns the names back into
 * file rows, keeping the row (and its saved id) when the name at that place is unchanged.
 */
export function filesFromNames(names: string[], previous: FileDraft[]): FileDraft[] {
  return names.map((name, i) => {
    const old = previous[i];
    return old && old.name === name ? old : { key: newKey(), name, link: '' };
  });
}

const isHttps = (value: string) => /^https:\/\//i.test(value.trim());

/** A grade is a whole number ("5") or a range of them ("5-7"), matching the database. */
export const isGrade = (value: string) => /^\d{1,2}(-\d{1,2})?$/.test(value);

/** "5 - 7" and "5–7" become "5-7"; anything else is left for validation to reject. */
const tidyGrade = (value: string) => value.trim().replace(/\s*[-–]\s*/, '-');
const isImageRef = (value: string) => isHttps(value) || isStoragePath(value.trim());
const blankFile = (f: FileDraft) => !f.name.trim();
const blankMedia = (m: MediaDraft) => !m.url.trim() && !m.caption.trim();

/** Drops empty rows and trims text, ready to validate and save. A blurhash is kept only with an uploaded picture. */
export function cleanDraft(d: ResourceDraft): ResourceDraft {
  const coverPath = d.coverPath.trim();
  return {
    ...d,
    slug: d.slug.trim(),
    title: d.title.trim(),
    subject: d.subject.trim(),
    grade: tidyGrade(d.grade),
    length: d.length.trim(),
    summary: d.summary.trim(),
    description: d.description.trim(),
    driveLink: d.driveLink.trim(),
    coverPath,
    coverBlurhash: blurhashFor(coverPath, d.coverBlurhash),
    files: d.files
      .filter((f) => !blankFile(f))
      // Files are names only for now: any link on a file is dropped.
      .map((f) => ({ ...f, name: f.name.trim(), link: '' })),
    media: d.media
      .filter((m) => !blankMedia(m))
      .map((m) => {
        const url = m.url.trim();
        const blurhash = blurhashFor(url, m.blurhash);
        return {
          ...m,
          url,
          caption: m.caption.trim(),
          blurhash,
          ratio: blurhash ? cleanRatio(m.ratio) : 0,
        };
      }),
  };
}

export type DraftErrors = Partial<
  Record<
    | 'title'
    | 'slug'
    | 'subject'
    | 'grade'
    | 'length'
    | 'summary'
    | 'description'
    | 'cover'
    | 'driveLink'
    | 'files'
    | 'media',
    string
  >
>;

/** The same rules the database enforces, so a fellow sees a clear message instead of an error code. */
export function validateDraft(draft: ResourceDraft): DraftErrors {
  const d = cleanDraft(draft);
  const errors: DraftErrors = {};
  if (!d.title) errors.title = 'Give your resource a title.';
  else if (d.title.length > LIMITS.title)
    errors.title = `Keep the title under ${LIMITS.title} characters.`;

  if (!d.slug) errors.slug = 'The address is empty.';
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) {
    errors.slug = 'Use only lowercase letters, numbers and single hyphens.';
  } else if (d.slug === 'new') {
    // /<username>/me/r/new is the "add a resource" page.
    errors.slug = 'That word is used by the site. Please choose another address.';
  } else if (d.slug.length > LIMITS.slug) {
    errors.slug = `Keep the address under ${LIMITS.slug} characters.`;
  }

  if (!d.subject) errors.subject = 'Choose or type a subject.';
  for (const field of ['subject', 'length'] as const) {
    if (d[field].length > LIMITS.short)
      errors[field] = `Keep this under ${LIMITS.short} characters.`;
  }
  if (d.grade && !isGrade(d.grade)) errors.grade = 'Use a number like 5, or a range like 5-7.';
  if (d.summary.length > LIMITS.summary)
    errors.summary = `Keep the summary under ${LIMITS.summary} characters.`;
  if (d.description.length > LIMITS.description) {
    errors.description = `Keep the description under ${LIMITS.description} characters.`;
  }

  if (d.coverPath) {
    if (!isImageRef(d.coverPath))
      errors.cover = 'The cover must be an uploaded image or a link starting with https://';
    else if (!d.coverConsent)
      errors.cover = 'Please confirm you have consent for any students shown in the cover.';
  }
  if (!d.driveLink) errors.driveLink = 'Add the link to your resource.';
  else if (!isHttps(d.driveLink) || /\s/.test(d.driveLink))
    errors.driveLink = 'The link must start with https:// and have no spaces.';

  if (d.files.length > LIMITS.files) {
    errors.files = `List at most ${LIMITS.files} things under "What's inside".`;
  } else if (d.files.some((f) => f.name.length > LIMITS.fileName)) {
    errors.files = 'A name under "What\'s inside" is too long.';
  }

  const badMedia = d.media.find(
    (m) => !m.url || !isImageRef(m.url) || m.caption.length > LIMITS.caption || !m.consent,
  );
  if (badMedia) {
    errors.media = !badMedia.url
      ? 'Every classroom photo or video needs a link or an uploaded photo.'
      : !isImageRef(badMedia.url)
        ? 'Classroom links must start with https://'
        : badMedia.caption.length > LIMITS.caption
          ? 'A caption is too long.'
          : 'Please confirm you have consent for any students shown in each photo or video.';
  }
  return errors;
}

export const hasErrors = (errors: DraftErrors) => Object.keys(errors).length > 0;

/** Moves an item one place up or down. Returns the same array if it can't move. */
export function moveItem<T>(list: T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(to, 0, item as T);
  return copy;
}
