/**
 * Checks the structured data (JSON-LD) on every built page:
 *   npm run check-structured-data
 * Fails if any block is not valid JSON, contains a square-bracket
 * placeholder, has a question or answer that is not shown on the page, or
 * has breadcrumbs that differ from the visible trail. Also reports how much
 * the structured data adds to the pages.
 */
import { readFileSync } from 'node:fs';
import { checkStructuredData, jsonLdBlocks } from './structured-data-rules.ts';
import { htmlFiles } from './dist-files.ts';

const files = htmlFiles('dist');
let failures = 0;
let bytes = 0;
let pagesBytes = 0;
const types = new Map<string, number>();
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  pagesBytes += Buffer.byteLength(html);
  for (const block of jsonLdBlocks(html)) {
    bytes += Buffer.byteLength(block) + '<script type="application/ld+json"></script>'.length;
    try {
      const type = String((JSON.parse(block) as { '@type'?: string })['@type']);
      types.set(type, (types.get(type) ?? 0) + 1);
    } catch {
      /* reported below */
    }
  }
  for (const problem of checkStructuredData(html)) {
    console.error(`${file}: ${problem}`);
    failures++;
  }
}
console.log(`Structured data on ${files.length} pages: ${[...types].map(([t, n]) => `${t} ${n}`).join(', ')}.`);
console.log(`It adds ${(bytes / 1024).toFixed(0)} KB in all, ${((bytes / pagesBytes) * 100).toFixed(1)}% of the pages' HTML.`);
if (failures) {
  console.error(`Structured data check failed: ${failures} problem(s).`);
  process.exit(1);
}
console.log('Structured data check passed.');
