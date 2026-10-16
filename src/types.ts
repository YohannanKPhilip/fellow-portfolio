/** A fellow's public profile. One row of the "fellows" tab. */
export interface Fellow {
  id: string;
  name: string;
  firstName: string;
  headlineRole: string;
  headlineHighlight: string;
  statusText: string;
  intro: string;
  school: string;
  city: string;
  cohort: string;
  photoUrl: string;
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
export type DataOrigin = 'sheet' | 'cache' | 'sample';

export interface LoadedData {
  dataset: Dataset;
  origin: DataOrigin;
  /** ISO time the data was fetched from the sheet (sheet and cache only). */
  fetchedAt?: string;
  warnings: string[];
}
