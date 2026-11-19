import { getCollection } from 'astro:content';

/** Every public page address, for the sitemap. The 404 page is left out on purpose. */
export async function getPublicRoutes(): Promise<string[]> {
  const [salaryGuides, stateGuides, pages] = await Promise.all([
    getCollection('salaryGuides'),
    getCollection('stateGuides'),
    getCollection('pages'),
  ]);

  return [
    '/',
    ...salaryGuides.map((g) => `/${g.data.profession.id}/salary/`),
    ...stateGuides.map((g) => `/${g.data.profession.id}/${g.data.stateSlug}/`),
    ...pages.map((p) => `/${p.id}/`),
  ];
}
