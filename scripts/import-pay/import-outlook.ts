/**
 * Imports the official state job projections for each profession.
 *
 *   npm run import-outlook      (outlook only)
 *   npm run import-pay          (pay, then outlook)
 *
 * Reads the newest state projections CSV in data/source/ (a file whose name
 * contains "projections" and ends in .csv) and writes one file per
 * profession to src/data/outlook/, for example
 * src/data/outlook/dental-hygienist.json. Matches states by FIPS code.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PayData } from '../../src/lib/pay/types.ts';
import { OUTPUT_DIR, PROFESSIONS, SOURCE_DIR } from './config.ts';
import { parseCsv, toRecords } from './csv.ts';
import { buildOutlook } from './outlook.ts';

const OUTLOOK_DIR = 'src/data/outlook';

export function importOutlook(): void {
  const names = existsSync(SOURCE_DIR) ? readdirSync(SOURCE_DIR) : [];
  const file = names.filter((n) => /projections.*\.csv$/i.test(n)).sort().pop();
  if (!file) {
    console.log(`No state projections file found in ${SOURCE_DIR}/ (a .csv with "projections" in its name). Outlook files left unchanged.`);
    return;
  }
  const rows = toRecords(parseCsv(readFileSync(join(SOURCE_DIR, file), 'utf8')));
  const today = new Date().toISOString().slice(0, 10);
  mkdirSync(OUTLOOK_DIR, { recursive: true });

  for (const profession of PROFESSIONS) {
    const payFile = join(OUTPUT_DIR, `${profession.slug}.json`);
    if (!existsSync(payFile)) throw new Error(`Import the pay figures first: ${payFile} does not exist.`);
    const pay = JSON.parse(readFileSync(payFile, 'utf8')) as PayData;
    const data = buildOutlook(
      rows,
      { code: profession.occCode, title: pay.occupation.title },
      pay.states.map((s) => ({ code: s.code, name: s.name })),
      file,
      today,
    );
    const out = join(OUTLOOK_DIR, `${profession.slug}.json`);
    const lines = data.places.map((p) => `    ${JSON.stringify(p)}`).join(',\n');
    const head = JSON.stringify({ ...data, places: undefined }, null, 2).replace(/\n}$/, '');
    writeFileSync(out, `${head},\n  "places": [\n${lines}\n  ]\n}\n`);

    console.log(`${data.occupation.title} outlook -> ${out}`);
    console.log(`  ${data.source.name}`);
    console.log(`  National: ${JSON.stringify(data.national)}`);
    console.log(`  Places: ${data.places.length}; not in the file: ${data.notInFile.join(', ') || 'none'}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) importOutlook();
