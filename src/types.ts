import type { PageDoc } from './lib/page';
import type { Theme } from './lib/theme';

/** A fellow's public profile. One row of the "fellows" tab. */
export interface Fellow {
  id: string;
  name: string;
  firstName: string;
  /** The page: an ordered list of sections (the top of the page, lists of resources, ...). */
  page: PageDoc;
  /** Accent color, background and font. Empty means the site's default look. */
  theme: Theme;
  school: string;
  city: string;
  cohort: string;
  photoUrl: string;
  /** Blurred stand-in shown while an uploaded photo loads. Empty when there is none. */
  photoBlurhash?: string;
}

/** One file inside a resource. One row of the "files" tab. */
export interface ResourceFile {
  name: string;
  link: string;
  order: number;
}

/** A photo, video or embed showing the resource in use. One row of the "media" tab. */
export interface MediaItem {
  url: string;
  caption: string;
  /** Optional hint from the sheet: "image" or "video". Empty means auto-detect. */
  hint: string;
  order: number;
  /** Blurred stand-in shown while an uploaded photo loads. Empty when there is none. */
  blurhash?: string;
  /** Width / height of an uploaded photo, so its space is held while it loads. 0 or missing: not known. */
  ratio?: number;
}

/** A resource a fellow shares. One row of the "resources" tab. */
export interface Resource {
  id: string;
  fellowId: string;
  title: string;
  subject: string;
  grade: string;
  length: string;
  tags: string[];
  /** Cover image link. Empty means the resource has no cover and none is shown. */
  coverUrl: string;
  /** Blurred stand-in shown while an uploaded cover loads. Empty when there is none. */
  coverBlurhash?: string;
  summary: string;
  description: string;
  driveLink: string;
  files: ResourceFile[];
  media: MediaItem[];
}

export interface Dataset {
  fellows: Fellow[];
  resources: Resource[];
}

/** Where the data on screen came from. */
export type DataOrigin = 'sheet' | 'supabase' | 'cache' | 'sample';

export interface LoadedData {
  dataset: Dataset;
  origin: DataOrigin;
  /** ISO time the data was fetched from the live source (not set for sample data). */
  fetchedAt?: string;
  warnings: string[];
}
