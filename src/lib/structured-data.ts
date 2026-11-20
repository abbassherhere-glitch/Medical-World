/**
 * Structured data (JSON-LD, schema.org) built from the same values as the
 * visible page, so the two can never disagree. Placeholders such as
 * "[AUTHOR NAME]" or "[DATE]" are never put in structured data: anything
 * that is still a placeholder is left out.
 *
 * Types used, and why (see README):
 * - BreadcrumbList on every page with a visible breadcrumb.
 * - WebSite on the home page, with its name, address and a SearchAction
 *   pointing at /search/.
 * - Article on guides, state pages and area pages.
 * - FAQPage wherever "Common questions" is shown.
 */

export type JsonLd = Record<string, unknown>;

/** True when text contains a square-bracket placeholder such as "[DATE]". */
export function hasPlaceholder(text: string | undefined): boolean {
  return typeof text === 'string' && /\[[^\]]+\]/.test(text);
}

/** A real value, or undefined while it is empty or still a placeholder. */
function real(text: string | undefined): string | undefined {
  const t = text?.trim();
  return t && !hasPlaceholder(t) ? t : undefined;
}

/** JSON for a <script type="application/ld+json"> tag, safe to put in HTML. */
export function jsonLdText(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export interface Crumb {
  label: string;
  /** Absolute address of the step, or undefined for a step shown as text. */
  url?: string;
}

/**
 * Breadcrumbs, matching the visible trail. The last step is the current page,
 * which is not a link on the page and so has no address here either.
 */
export function breadcrumbList(crumbs: Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => {
      const url = i === crumbs.length - 1 ? undefined : c.url;
      return { '@type': 'ListItem', position: i + 1, name: c.label, ...(url ? { item: url } : {}) };
    }),
  };
}

export interface SiteInfo {
  name: string;
  /** The site's origin, for example "https://scrubpath.com". */
  origin: string;
}

/** The site, with its search page, for the home page. */
export function website(site: SiteInfo): JsonLd {
  const home = `${site.origin}/`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: home,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${site.origin}/search/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface ArticleInput {
  headline: string;
  description: string;
  url: string;
  site: SiteInfo;
  /** As shown in the byline; left out while it is a placeholder. */
  authorName?: string;
  /** As shown in the byline ("Last checked …"); left out unless it is a real date. */
  dateShown?: string;
}

/** A date as YYYY-MM-DD, or undefined if the text is not a real date. */
export function isoDate(text: string | undefined): string | undefined {
  const t = real(text);
  if (!t) return undefined;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T00:00:00Z` : `${t} UTC`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export function article(input: ArticleInput): JsonLd {
  const author = real(input.authorName);
  const date = isoDate(input.dateShown);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url,
    mainEntityOfPage: input.url,
    publisher: { '@type': 'Organization', name: input.site.name, url: `${input.site.origin}/` },
    ...(author ? { author: { '@type': 'Person', name: author } } : {}),
    ...(date ? { dateModified: date } : {}),
  };
}

/** The questions and answers exactly as shown in "Common questions". */
export function faqPage(items: { question: string; answer: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({ '@type': 'Question', name: q.question, acceptedAnswer: { '@type': 'Answer', text: q.answer } })),
  };
}

/** Every string value in a piece of structured data, for checks. */
export function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === 'object') return Object.values(value).flatMap(stringsIn);
  return [];
}
