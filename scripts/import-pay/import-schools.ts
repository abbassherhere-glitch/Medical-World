/**
 * Imports the colleges that reported awards in a profession's program, from
 * the IPEDS completions file.
 *
 *   npm run import-schools      (schools only)
 *   npm run import-pay          (pay, outlook, then schools)
 *
 * Reads the newest CSV in data/source/ whose name contains "ipeds" and writes
 * one file per profession to src/data/schools/, for example
 * src/data/schools/dental-hygienist.json.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PayData } from '../../src/lib/pay/types.ts';
import { OUTPUT_DIR, PROFESSIONS, SOURCE_DIR } from './config.ts';
import { parseCsv, toRecords } from './csv.ts';
import { buildSchools } from './schools.ts';

const SCHOOLS_DIR = 'src/data/schools';

export function importSchools(): void {
  const names = existsSync(SOURCE_DIR) ? readdirSync(SOURCE_DIR) : [];
  const file = names.filter((n) => /ipeds.*\.csv$/i.test(n)).sort().pop();
  if (!file) {
    console.log(`No IPEDS schools file found in ${SOURCE_DIR}/ (a .csv with "ipeds" in its name). School files left unchanged.`);
    return;
  }
  const rows = toRecords(parseCsv(readFileSync(join(SOURCE_DIR, file), 'utf8').replace(/^﻿/, '')));
  const today = new Date().toISOString().slice(0, 10);
  mkdirSync(SCHOOLS_DIR, { recursive: true });

  for (const profession of PROFESSIONS) {
    if (!('cip' in profession)) continue;
    const pay = JSON.parse(readFileSync(join(OUTPUT_DIR, `${profession.slug}.json`), 'utf8')) as PayData;
    const known = new Map(pay.states.map((s) => [s.code, s.abbr]));
    const data = buildSchools(rows, profession.cip, known, file, today);
    const out = join(SCHOOLS_DIR, `${profession.slug}.json`);
    const head = JSON.stringify({ ...data, schools: undefined }, null, 2).replace(/\n}$/, '');
    writeFileSync(out, `${head},\n  "schools": [\n${data.schools.map((s) => `    ${JSON.stringify(s)}`).join(',\n')}\n  ]\n}\n`);

    const awards = data.schools.reduce((sum, s) => sum + s.levels.reduce((a, l) => a + l.awards, 0), 0);
    console.log(`${data.program.title} (${data.program.cip}) schools -> ${out}`);
    console.log(`  ${data.source.name}, ${data.source.awardYear}`);
    console.log(`  Colleges: ${data.schools.length}; awards: ${awards}; states: ${new Set(data.schools.map((s) => s.state)).size}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) importSchools();
