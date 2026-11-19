/**
 * Checks the built site in dist/: every link to a page on the site must
 * lead to a page that exists, and every link to a section ("#…") must lead
 * to a section that exists. Run after npm run build:
 *
 *   npm run check-links
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { htmlFiles, pagePath } from './dist-files.ts';

const DIST = 'dist';
const files = htmlFiles(DIST);
const broken: string[] = [];
const cache = new Map<string, string>();
const read = (file: string) => {
  if (!cache.has(file)) cache.set(file, readFileSync(file, 'utf8'));
  return cache.get(file)!;
};
const hasId = (html: string, id: string) => html.includes(`id="${id}"`);

for (const file of files) {
  const html = read(file);
  for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    if (!href || /^(https?:|mailto:|tel:)/i.test(href)) continue;
    const [path = '', fragment] = href.split('#');
    if (path === '') {
      if (fragment && !hasId(html, fragment)) broken.push(`${pagePath(DIST, file)}: ${href} (no such section)`);
      continue;
    }
    const target = path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
    if (!existsSync(target)) {
      broken.push(`${pagePath(DIST, file)}: ${href} (no such page)`);
    } else if (fragment && target.endsWith('.html') && !hasId(read(target), fragment)) {
      broken.push(`${pagePath(DIST, file)}: ${href} (no such section)`);
    }
  }
}

if (broken.length) {
  console.error(`Broken links found:\n${broken.map((b) => `  ${b}`).join('\n')}`);
  process.exit(1);
}
console.log(`Link check passed: ${files.length} pages, no broken links.`);
