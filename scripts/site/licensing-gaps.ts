/**
 * Lists, by state, every licensing value that is null or an empty list, so
 * the owner knows what is still to collect:
 *   npm run licensing-gaps
 * It only reports; it never stops the build.
 */
import { readFileSync } from 'node:fs';
import { missingValues } from '../../src/lib/licensing/content.ts';
import type { LicensingData } from '../../src/lib/licensing/types.ts';

const data = JSON.parse(readFileSync('src/data/licensing/dental-hygienist.json', 'utf8')) as LicensingData;
let total = 0;
for (const entry of [...data.states].sort((a, b) => a.state.localeCompare(b.state))) {
  const gaps = missingValues(entry);
  total += gaps.length;
  console.log(`${entry.state} (${gaps.length}): ${gaps.length ? gaps.join('; ') : 'nothing missing'}`);
}
console.log(`\nTotal values still to collect: ${total}, across ${data.states.length} states.`);
