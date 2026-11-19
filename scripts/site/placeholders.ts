/**
 * Lists every [SQUARE-BRACKET PLACEHOLDER] still shown on the built site,
 * grouped by page, with a total and the most common ones. This is the to-do
 * list before launch. It only reports: it never fails.
 *
 *   npm run build
 *   npm run placeholders
 */
import { existsSync, readFileSync } from 'node:fs';
import { STATES_AND_DC } from '../../src/data/states.ts';
import { htmlFiles, pagePath } from './dist-files.ts';

const DIST = 'dist';

/** The visible text of a page, including its title and description. */
function visibleText(html: string): string {
  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return `${description} ${body}`
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
}

/** Treats "[Requirement in Texas …]" and "[Requirement in Ohio …]" as the same to-do. */
const stateNames = [...STATES_AND_DC].sort((a, b) => b.length - a.length);
function normalize(placeholder: string): string {
  let text = placeholder.replace(/\bthe District of Columbia\b/g, '{state}');
  for (const name of stateNames) text = text.replace(new RegExp(`\\b${name}\\b`, 'g'), '{state}');
  return text;
}

if (!existsSync(DIST)) {
  console.log('No built site found in dist/. Run npm run build first, then npm run placeholders.');
  process.exit(0);
}

const byPage = new Map<string, Map<string, number>>();
const overall = new Map<string, number>();
let total = 0;

for (const file of htmlFiles(DIST)) {
  const found = visibleText(readFileSync(file, 'utf8')).match(/\[[^\[\]]*[A-Za-z][^\[\]]*\]/g) ?? [];
  if (found.length === 0) continue;
  const counts = new Map<string, number>();
  for (const placeholder of found) {
    counts.set(placeholder, (counts.get(placeholder) ?? 0) + 1);
    const key = normalize(placeholder);
    overall.set(key, (overall.get(key) ?? 0) + 1);
    total++;
  }
  byPage.set(pagePath(DIST, file), counts);
}

console.log('Placeholders still on the built site\n');
for (const [page, counts] of byPage) {
  const pageTotal = [...counts.values()].reduce((a, b) => a + b, 0);
  console.log(`${page}  (${pageTotal})`);
  for (const [placeholder, n] of counts) console.log(`  ${n > 1 ? `${n} x ` : ''}${placeholder}`);
  console.log('');
}

console.log('Most common (state names shown as {state})');
for (const [placeholder, n] of [...overall].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${String(n).padStart(5)}  ${placeholder}`);
}
console.log(`\nTotal: ${total} placeholders on ${byPage.size} pages (${overall.size} different kinds).`);
