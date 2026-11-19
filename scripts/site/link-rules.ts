/**
 * Rules the built site must follow, checked page by page:
 *
 * 1. Every link to a page on the site leads to a page that exists, and
 *    every link to a section ("#…") leads to a section that exists.
 * 2. Every form sends visitors to a page that exists. For the state
 *    pickers, every choice in the list must lead to a page that exists.
 * 3. A link whose page is not published yet (shown as plain text) may
 *    appear only inside body text or tables, never in a menu, a list of
 *    links, the header, the footer, a side panel or a form.
 *
 * These functions only read text, so they can be tested without a build.
 */

export interface Site {
  /** True if the address is a page in the build, for example "/texas/". */
  hasPage(path: string): boolean;
  /** True if the page at `path` has an element with this id. */
  hasSection(path: string, id: string): boolean;
}

/** Elements a pending (plain-text) link must never be inside. */
const NO_PENDING_INSIDE = new Set(['nav', 'header', 'footer', 'aside', 'ul', 'ol', 'form', 'button', 'select']);
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** The page without its scripts, styles and comments, which are not visible content. */
export function stripCode(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];
}

function decode(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

/** Checks a link or form address. Returns a problem, or undefined if it is fine. */
export function checkTarget(href: string, page: string, site: Site): string | undefined {
  if (/^(https?:|mailto:|tel:)/i.test(href)) return undefined;
  const [rawPath = '', fragment] = decode(href).split('#');
  const path = rawPath.split('?')[0] ?? '';
  const target = path === '' ? page : path;
  if (path !== '' && !site.hasPage(target)) return `${href} (no such page)`;
  if (fragment && !site.hasSection(target, fragment)) return `${href} (no such section)`;
  return undefined;
}

/** All problems on one page. `page` is its address, for example "/dental-hygienist/". */
export function checkPage(html: string, page: string, site: Site): string[] {
  const problems: string[] = [];
  const body = stripCode(html);

  // 1. Links.
  for (const [tag] of body.matchAll(/<a\s[^>]*>/gi)) {
    const href = attr(tag, 'href');
    if (href === undefined) continue;
    const problem = checkTarget(href, page, site);
    if (problem) problems.push(`link ${problem}`);
  }

  // 2. Forms, and every choice in a state picker.
  for (const match of body.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)) {
    const form = match[0];
    const open = /<form\b[^>]*>/i.exec(form)![0];
    const action = attr(open, 'action');
    if (action === undefined || action === '') {
      problems.push('form without a destination');
    } else {
      const problem = checkTarget(action, page, site);
      if (problem) problems.push(`form goes to ${problem}`);
    }
    if (/\sdata-state-picker\b/.test(open)) {
      const section = attr(open, 'data-section');
      const optionsOf = (name: string) => {
        const select = new RegExp(`<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)</select>`, 'i').exec(form)?.[1] ?? '';
        return [...select.matchAll(/<option[^>]*value="([^"]*)"/gi)].map((m) => m[1]!).filter(Boolean);
      };
      const professions = optionsOf('profession');
      const fixed = attr(open, 'data-profession');
      const states = optionsOf('state');
      for (const profession of professions.length ? professions : fixed ? [fixed] : []) {
        for (const state of states) {
          const problem = checkTarget(`/${profession}/${state}/${section ? `#${section}` : ''}`, page, site);
          if (problem) problems.push(`state picker choice ${problem}`);
        }
      }
    }
  }

  // 3. Pending (plain-text) links only inside body text or tables.
  const open: string[] = [];
  for (const [tag, closing, rawName] of body.matchAll(/<(\/?)([a-zA-Z][\w-]*)\b[^>]*>/g)) {
    const name = rawName!.toLowerCase();
    if (closing) {
      const at = open.lastIndexOf(name);
      if (at >= 0) open.length = at;
      continue;
    }
    if (/\sclass="[^"]*\blink-pending\b/.test(tag)) {
      const inside = open.find((el) => NO_PENDING_INSIDE.has(el));
      if (inside) {
        const text = /class="[^"]*\blink-pending\b[^"]*"[^>]*>([^<]*)/.exec(body.slice(body.indexOf(tag)))?.[1]?.trim();
        problems.push(`unpublished item "${text}" shown inside <${inside}>; menus and lists must show only working items`);
      }
    }
    if (!VOID.has(name) && !tag.endsWith('/>')) open.push(name);
  }

  return problems;
}
