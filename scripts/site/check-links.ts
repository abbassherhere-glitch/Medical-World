/**
 * Checks the built site in dist/ against the rules in link-rules.ts: no
 * broken links or sections, every form and every state picker choice goes
 * to a real page, and no menu or list shows an unpublished item.
 * Run after npm run build:
 *
 *   npm run check-links
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { htmlFiles, pagePath } from './dist-files.ts';
import { checkPage, type Site } from './link-rules.ts';

const DIST = 'dist';
const files = htmlFiles(DIST);
const cache = new Map<string, string>();

const fileFor = (path: string) => (path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path));
const read = (file: string) => {
  if (!cache.has(file)) cache.set(file, readFileSync(file, 'utf8'));
  return cache.get(file)!;
};

const site: Site = {
  hasPage: (path) => existsSync(fileFor(path)),
  hasSection: (path, id) => {
    const file = fileFor(path);
    return file.endsWith('.html') && existsSync(file) && read(file).includes(`id="${id}"`);
  },
};

const problems = files.flatMap((file) => {
  const page = pagePath(DIST, file);
  return checkPage(read(file), page, site).map((p) => `${page}: ${p}`);
});

if (problems.length) {
  console.error(`Link check failed:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`Link check passed: ${files.length} pages, no broken links, forms or menu items.`);
