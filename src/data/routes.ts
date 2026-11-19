import { getCollection } from 'astro:content';
import { getPublishedStatePages } from './state-pages';

/**
 * Every public page address. This is the one list the site uses to decide
 * whether a page exists: the sitemap is built from it, and links to
 * addresses that are not on it are shown as plain text (see SmartLink).
 * When a new kind of page is added, add its addresses here.
 * The 404 page is left out on purpose.
 */
export async function getPublicRoutes(): Promise<string[]> {
  const [professions, salaryGuides, becomeGuides, statePages, pages] = await Promise.all([
    getCollection('professions'),
    getCollection('salaryGuides'),
    getCollection('becomeGuides'),
    getPublishedStatePages(),
    getCollection('pages'),
  ]);

  return [
    '/',
    ...professions.filter((p) => p.data.overview).map((p) => `/${p.id}/`),
    ...salaryGuides.map((g) => `/${g.data.profession.id}/salary/`),
    ...becomeGuides.map((g) => `/${g.data.profession.id}/how-to-become/`),
    ...statePages.map((p) => p.path),
    ...pages.map((p) => `/${p.id}/`),
  ];
}

let routes: Promise<Set<string>> | undefined;

/**
 * True when a link leads somewhere that exists: a page on the site, a
 * section of the current page ("#…"), or another website.
 */
export async function isLive(href: string): Promise<boolean> {
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return true;
  routes ??= getPublicRoutes().then((list) => new Set(list));
  const path = href.split(/[?#]/)[0] ?? '';
  return (await routes).has(path.endsWith('/') ? path : `${path}/`);
}
