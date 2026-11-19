/**
 * Rules for which links are shown. Kept free of site-building code so it
 * can be tested on its own.
 */
export interface GuideSwitch {
  title: string;
  href: string;
  published: boolean;
}

/** Turns "/a/b" and "/a/b/#x" into "/a/b/", the form used in the list of pages. */
export function normalizePath(href: string): string {
  const path = href.split(/[?#]/)[0] ?? '';
  return path.endsWith('/') ? path : `${path}/`;
}

/** Addresses of guides switched off in the guide-link files. Checks for mistakes. */
export function switchedOffGuides(switches: GuideSwitch[]): Set<string> {
  const seen = new Set<string>();
  const off = new Set<string>();
  for (const guide of switches) {
    if (!guide.href.startsWith('/')) {
      throw new Error(`Guide link "${guide.title}": the address must start with "/", not "${guide.href}".`);
    }
    const path = normalizePath(guide.href);
    if (seen.has(path)) throw new Error(`Guide link "${guide.title}": ${path} is listed twice.`);
    seen.add(path);
    if (!guide.published) off.add(path);
  }
  return off;
}

/**
 * True when a link leads somewhere that exists: another website, a section
 * of the current page, or a published page that is not switched off.
 */
export function linkIsLive(href: string, published: Set<string>, switchedOff: Set<string>): boolean {
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return true;
  const path = normalizePath(href);
  return published.has(path) && !switchedOff.has(path);
}
