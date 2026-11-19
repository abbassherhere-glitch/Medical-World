import { getCollection, type CollectionEntry } from 'astro:content';
import { isLive } from './routes';

/**
 * Professions that have pages on the site (their overview page is
 * published), in alphabetical order. Lists grow automatically when a
 * profession is added; a profession with no pages is never listed.
 */
export async function professionsWithPages(): Promise<CollectionEntry<'professions'>[]> {
  const all = await getCollection('professions');
  const live = await Promise.all(all.map((p) => isLive(`/${p.id}/`)));
  return all.filter((_, i) => live[i]).sort((a, b) => a.data.name.localeCompare(b.data.name));
}
