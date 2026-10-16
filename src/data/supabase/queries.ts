import { config } from '../../config';
import type { Dataset } from '../../types';
import { getClient } from './client';
import { toDataset, type FellowRow } from './mappers';

/**
 * Loads one fellow's public page: their profile and published resources, with
 * files and media, in a single request. An unknown or unpublished fellow gives
 * an empty dataset, which the pages show as "doesn't exist".
 */
export async function loadFellowDataset(slug: string, signal?: AbortSignal): Promise<Dataset> {
  let query = getClient()
    .from('fellows')
    .select('*, resources(*, resource_files(*), resource_media(*))')
    .eq('slug', slug)
    // Row Level Security already hides drafts from visitors. These filters also keep a
    // signed-in fellow's own drafts off the public pages.
    .eq('status', 'published')
    .eq('resources.status', 'published');
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { fellows: [], resources: [] };
  return toDataset(data as unknown as FellowRow, config.supabaseUrl);
}
