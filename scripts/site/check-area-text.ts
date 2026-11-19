/**
 * Checks that no two metropolitan area salary pages have the same main text
 * once names and numbers are taken out. Run after a build:
 *
 *   npm run check-area-text
 *
 * Each page's main content is reduced to plain text, then every area name,
 * short name and state name becomes "NAME" and every figure becomes "#".
 * Pages whose reduced text is identical are reported, with the closest pairs.
 * It fails if any two pages are identical.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const pay = JSON.parse(readFileSync('src/data/pay/dental-hygienist.json', 'utf8')) as {
  states: { name: string }[];
  areas: { name: string }[];
};
const names = JSON.parse(readFileSync('src/data/area-names.json', 'utf8')) as { areas: { name: string; short: string }[] };

const salaryDir = join(dist, 'dental-hygienist', 'salary');
if (!existsSync(salaryDir)) {
  console.error('Build the site first: npm run build');
  process.exit(1);
}
const skip = new Set(['calculator', 'areas']);
const pages = readdirSync(salaryDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !skip.has(d.name) && existsSync(join(salaryDir, d.name, 'index.html')))
  .map((d) => d.name);

// Longest first, so "Kansas City, MO-KS" is replaced before "Kansas".
const allNames = [
  ...pay.areas.map((a) => a.name),
  ...names.areas.map((a) => a.short),
  ...pay.states.map((s) => s.name),
  ...['TX', 'DC'],
]
  .filter((n, i, list) => n && list.indexOf(n) === i)
  .sort((a, b) => b.length - a.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const namePattern = new RegExp(allNames.map(escape).join('|'), 'g');

function mainText(html: string): string {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  return main
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function reduce(text: string): string {
  return text
    .replace(namePattern, 'NAME')
    .replace(/\$[\d,]+(\.\d+)?/g, '#')
    .replace(/\d[\d,.]*(st|nd|rd|th)?%?/g, '#')
    .replace(/\s+/g, ' ');
}

const reduced = new Map<string, string>();
for (const page of pages) reduced.set(page, reduce(mainText(readFileSync(join(salaryDir, page, 'index.html'), 'utf8'))));

// Exact duplicates.
const groups = new Map<string, string[]>();
for (const [page, text] of reduced) groups.set(text, [...(groups.get(text) ?? []), page]);
const duplicates = [...groups.values()].filter((g) => g.length > 1);

// How close the most similar pages are: share of words in common, in order of position.
function similarity(a: string, b: string): number {
  const x = a.split(' ');
  const y = b.split(' ');
  let same = 0;
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] === y[i]) same++;
  return same / Math.max(x.length, y.length);
}
let closest: { a: string; b: string; score: number } = { a: '', b: '', score: 0 };
const list = [...reduced.entries()];
for (let i = 0; i < list.length; i++) {
  for (let j = i + 1; j < list.length; j++) {
    const score = similarity(list[i]![1], list[j]![1]);
    if (score > closest.score) closest = { a: list[i]![0], b: list[j]![0], score };
  }
}

console.log(`Area pages checked: ${pages.length}`);
console.log(`Different texts once names and numbers are taken out: ${groups.size}`);
console.log(`Most similar pair: ${closest.a} and ${closest.b} (${(closest.score * 100).toFixed(1)}% of words the same, in the same place)`);
if (duplicates.length) {
  console.error(`\n${duplicates.length} groups of pages have the same text apart from names and numbers:`);
  for (const g of duplicates.slice(0, 20)) console.error(`  ${g.join(', ')}`);
  process.exit(1);
}
console.log('No two area pages have the same text apart from names and numbers.');
