import { getCollection } from 'astro:content';
import { getPayData } from '../lib/pay';
import { areasWithPages, buildAreaPages, type AreaPageRef } from '../lib/pay/areas';
import names from './area-names.json';

let cache: Promise<Map<string, AreaPageRef[]>> | undefined;

/**
 * Every metropolitan area page, published or not, for each profession, from
 * the owner's lists in src/content/area-pages/ and the short names in
 * src/data/area-names.json. The build stops if the files do not match the data.
 */
function allAreaPages(): Promise<Map<string, AreaPageRef[]>> {
  cache ??= getCollection('areaPages').then(
    (lists) =>
      new Map(
        lists.map((list) => {
          const profession = list.data.profession.id;
          return [profession, buildAreaPages(profession, areasWithPages(getPayData(profession)), names.areas, list.data.pages)];
        }),
      ),
  );
  return cache;
}

/** Published area pages for one profession, or for every profession. */
export async function getPublishedAreaPages(profession?: string): Promise<(AreaPageRef & { profession: string })[]> {
  const all = await allAreaPages();
  return [...all.entries()]
    .filter(([p]) => profession === undefined || p === profession)
    .flatMap(([p, pages]) => pages.filter((page) => page.published).map((page) => ({ ...page, profession: p })));
}
