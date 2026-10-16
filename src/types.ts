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

/** A resource a fellow shares. One row of the "resources" tab. */
export interface Resource {
  id: string;
  fellowId: string;
  title: string;
  subject: string;
  grade: string;
  board: string;
  chapter: string;
  length: string;
  summary: string;
  about: string;
  inMyClassroom: string;
  whatIdChange: string;
  driveLink: string;
  files: ResourceFile[];
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
