/**
 * Checks that every licensing fact on the built site is, word for word, a
 * value in src/data/licensing/ (with overrides). Run after a build:
 *   npm run check-licensing-text
 * Also checks that pages for states in the file show no licensing
 * placeholders, and pages for other states keep theirs.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadLicensing, type LicensingOverride } from '../../src/lib/licensing/validate.ts';
import { factsIn } from '../../src/lib/licensing/content.ts';
import type { LicensingData } from '../../src/lib/licensing/types.ts';
import { STATES_AND_DC, slugify } from '../../src/data/states.ts';
import { placeName } from '../../src/lib/pay/summary.ts';
import { htmlFiles } from './dist-files.ts';
import { checkLicensingPage } from './licensing-rules.ts';

const dir = 'src/data/licensing';
const overrides = (JSON.parse(readFileSync(join(dir, 'overrides.json'), 'utf8')) as { overrides: LicensingOverride[] }).overrides;
let problems = 0;
let checkedFacts = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'overrides.json')) {
  const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as LicensingData;
  const data = loadLicensing(
    raw,
    STATES_AND_DC,
    overrides.filter((o) => o.profession === raw.profession),
  );
  const allFacts = new Set(data.states.flatMap(factsIn));
  const statePages = new Map(STATES_AND_DC.map((s) => [`dist/${raw.profession}/${slugify(s)}/index.html`, s]));
  for (const page of htmlFiles('dist')) {
    const html = readFileSync(page, 'utf8');
    const stateName = statePages.get(page);
    const state = stateName ? { entry: data.states.find((s) => s.state === stateName), where: placeName(stateName) } : undefined;
    checkedFacts += (html.match(/data-licensing-fact/g) ?? []).length;
    for (const p of checkLicensingPage(html, allFacts, state)) {
      console.error(`${page}: ${p}`);
      problems++;
    }
  }
}
console.log(`Licensing facts checked on the built pages: ${checkedFacts}.`);
if (problems) {
  console.error(`Licensing text check failed: ${problems} problem(s).`);
  process.exit(1);
}
console.log('Licensing text check passed: every licensing fact shown is in the licensing file.');
