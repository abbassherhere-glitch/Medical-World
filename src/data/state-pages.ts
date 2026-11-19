import { getCollection } from 'astro:content';
import { getPayData, statesAndDc } from '../lib/pay';
import { publishedStates } from '../lib/publishing';
import { slugify } from './states';

export interface StatePageRef {
  profession: string;
  state: string;
  slug: string;
  path: string;
}

/**
 * Every published state page, from the owner's lists in
 * src/content/state-pages/. Territories never get a page.
 */
export async function getPublishedStatePages(): Promise<StatePageRef[]> {
  const lists = await getCollection('statePages');
  return lists.flatMap((list) => {
    const profession = list.data.profession.id;
    const known = statesAndDc(getPayData(profession)).map((s) => s.name);
    return publishedStates(list.data.pages, known, profession).map((state) => {
      const slug = slugify(state);
      return { profession, state, slug, path: `/${profession}/${slug}/` };
    });
  });
}
