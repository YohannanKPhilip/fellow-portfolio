import { getClient } from './client';
import type { Json, Tables, TablesInsert, TablesUpdate } from './database.types';

/** Hero documents and themes are plain JSON objects; this tells the types so. */
export const asJson = (value: unknown): Json => value as Json;

/** The signed-in fellow's own page row. Unlike the public pages, this includes a draft. */
export type MyFellow = Tables<'fellows'>;

/** Thrown when another fellow already has the page address. */
export class SlugTakenError extends Error {
  constructor() {
    super('That page address is already taken. Please choose another.');
    this.name = 'SlugTakenError';
  }
}

/** The fellow's own page, or null if they haven't set one up yet. */
export async function getMyFellow(userId: string): Promise<MyFellow | null> {
  const { data, error } = await getClient()
    .from('fellows')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Creates the fellow's page as a draft. The owner is filled in by the database from the sign-in. */
export async function createMyFellow(
  input: Omit<TablesInsert<'fellows'>, 'user_id' | 'status'>,
): Promise<MyFellow> {
  const { data, error } = await getClient().from('fellows').insert(input).select().single();
  if (error) {
    // 23505 = unique violation: the page address (slug) is already used.
    if (error.code === '23505') throw new SlugTakenError();
    throw new Error(error.message);
  }
  return data;
}

/** The fields a fellow edits on their page. */
export type FellowPatch = Omit<
  TablesUpdate<'fellows'>,
  'user_id' | 'status' | 'created_at' | 'updated_at'
>;

/** Saves changes to the fellow's own page (including a new page address). */
export async function updateMyFellow(userId: string, patch: FellowPatch): Promise<MyFellow> {
  const { data, error } = await getClient()
    .from('fellows')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new SlugTakenError();
    throw new Error(error.message);
  }
  return data;
}

export async function setMyFellowStatus(
  userId: string,
  status: 'draft' | 'published',
): Promise<MyFellow> {
  const { data, error } = await getClient()
    .from('fellows')
    .update({ status })
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
