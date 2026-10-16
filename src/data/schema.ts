/**
 * The Google Sheet contract. Tab names and column headers here must match the
 * sheet exactly (headers are compared lowercase). Change them in both places.
 */
export const TABS = {
  fellows: 'fellows',
  resources: 'resources',
  files: 'files',
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
    'board',
    'chapter',
    'length',
    'summary',
    'about',
    'in_my_classroom',
    'what_id_change',
    'drive_link',
  ],
  files: ['resource_id', 'order', 'file_name', 'file_link'],
} as const;

/** IDs are lowercase letters, digits and hyphens, e.g. "yohannan-fractions-rotis". */
export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PUBLISHED = 'published';
