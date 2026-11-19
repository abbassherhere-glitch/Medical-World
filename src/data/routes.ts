import { getCollection } from 'astro:content';
import { getPublishedStatePages } from './state-pages';
import { linkIsLive, switchedOffGuides } from '../lib/links';

/**
 * Every public page address. This is the one list the site uses to decide
 * whether a page exists: the sitemap is built from it, and links to
 * addresses that are not on it are shown as plain text (see SmartLink).
 * When a new kind of page is added, add its addresses here.
 * The 404 page is left out on purpose.
 */
export async function getPublicRoutes(): Promise<string[]> {
  const [professions, salaryGuides, becomeGuides, topicPages, statePages, pages] = await Promise.all([
    getCollection('professions'),
    getCollection('salaryGuides'),
    getCollection('becomeGuides'),
    getCollection('topicPages'),
    getPublishedStatePages(),
    getCollection('pages'),
  ]);

  return [
    '/',
    // Site-wide index pages in the top menu. They list only professions with pages.
    '/professions/',
    '/salaries/',
    '/schools/',
    '/licensing/',
    ...professions.filter((p) => p.data.overview).map((p) => `/${p.id}/`),
    ...salaryGuides.map((g) => `/${g.data.profession.id}/salary/`),
    ...salaryGuides.map((g) => `/${g.data.profession.id}/salary/calculator/`),
    ...becomeGuides.map((g) => `/${g.data.profession.id}/how-to-become/`),
    ...topicPages.flatMap((t) => ['schools', 'licensing', 'board-exam'].map((page) => `/${t.data.profession.id}/${page}/`)),
    ...statePages.map((p) => p.path),
    ...pages.map((p) => `/${p.id}/`),
  ];
}

let state: Promise<{ published: Set<string>; switchedOff: Set<string> }> | undefined;

function linkState() {
  state ??= Promise.all([getPublicRoutes(), getCollection('guideLinks')]).then(([routes, files]) => ({
    published: new Set(routes),
    switchedOff: switchedOffGuides(files.flatMap((f) => f.data.guides)),
  }));
  return state;
}

/**
 * True when a link leads somewhere that exists: a published page that is not
 * switched off in the guide-link files, a section of the current page
 * ("#…"), or another website.
 */
export async function isLive(href: string): Promise<boolean> {
  const { published, switchedOff } = await linkState();
  return linkIsLive(href, published, switchedOff);
}

/**
 * Keeps only the links that lead somewhere real. Use this for every menu,
 * list and panel of links, so they never show an item that goes nowhere.
 */
export async function liveLinks<T extends { href: string }>(links: readonly T[]): Promise<T[]> {
  const keep = await Promise.all(links.map((link) => isLive(link.href)));
  return links.filter((_, i) => keep[i]);
}
