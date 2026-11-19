/**
 * Site settings. This is the one place to change the site's name, address,
 * company name, search-engine indexing and advert areas.
 *
 * Values in square brackets are placeholders for the owner to fill in.
 */
export const settings = {
  /** The public name of the site, shown in the header, footer and page titles. */
  siteName: '[SITE NAME]',

  /**
   * The full public address of the site, for example "https://www.example.com".
   * Used for canonical links and the sitemap.
   */
  siteUrl: '[SITE URL]',

  /** The legal name of the company that runs the site. */
  companyName: '[COMPANY NAME]',

  /**
   * Leave this as false until launch. While it is false, every page carries a
   * "noindex" robots tag and robots.txt asks search engines not to crawl the site.
   */
  allowIndexing: false,

  /** Set to false to hide every advert area on the site. */
  showAdverts: true,
} as const;

/**
 * Used in canonical links and the sitemap while `siteUrl` is still a placeholder.
 * The ".invalid" ending is reserved and can never be a real website.
 */
const PLACEHOLDER_ORIGIN = 'https://site-url.invalid';

/** The site address as a URL origin, or the placeholder origin if none is set yet. */
export function siteOrigin(): string {
  try {
    return new URL(settings.siteUrl).origin;
  } catch {
    return PLACEHOLDER_ORIGIN;
  }
}
