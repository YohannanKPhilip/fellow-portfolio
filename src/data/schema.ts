/**
 * The Google Sheet contract. Tab names and column headers here must match the
 * sheet exactly (headers are compared lowercase). Change them in both places.
 */
export const TABS = {
  fellows: 'fellows',
  resources: 'resources',
  files: 'files',
  media: 'media',
} as const;

export const COLUMNS = {
  fellows: [
    'fellow_id',
    'status',
    'name',
    'first_name',
    'headline_role',
    'headline_highlight',
    'status_text',
    'intro',
    'school',
    'city',
    'cohort',
    'photo_url',
  ],
  resources: [
    'resource_id',
    'fellow_id',
    'status',
    'title',
    'subject',
    'grade',
    'length',
    'tags',
    'cover_url',
    'summary',
    'description',
    'drive_link',
  ],
  files: ['resource_id', 'order', 'file_name', 'file_link'],
  media: ['resource_id', 'order', 'url', 'caption', 'type'],
} as const;

/** IDs are lowercase letters, digits and hyphens, e.g. "yohannan-fractions-rotis". */
export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PUBLISHED = 'published';
