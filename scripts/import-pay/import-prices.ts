/**
 * Imports the official state price levels (Regional Price Parities).
 *
 *   npm run import-prices      (price levels only)
 *   npm run import-pay         (pay, then outlook, schools and price levels)
 *
 * Reads the newest CSV in data/source/ whose name contains "price-parities"
 * (or "price_parities") and writes src/data/prices/regional-price-parities.json.
 * Matches states by FIPS code against the pay data.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { PayData } from '../../src/lib/pay/types.ts';
import { OUTPUT_DIR, PROFESSIONS, SOURCE_DIR } from './config.ts';
import { parseCsv, toRecords } from './csv.ts';
import { buildPrices } from './prices.ts';

export const PRICES_FILE = 'src/data/prices/regional-price-parities.json';

export function importPrices(): void {
  const names = existsSync(SOURCE_DIR) ? readdirSync(SOURCE_DIR) : [];
  const file = names.filter((n) => /price[-_]parities.*\.csv$/i.test(n)).sort().pop();
  if (!file) {
    console.log(`No price parities file found in ${SOURCE_DIR}/ (a .csv with "price-parities" in its name). Price levels left unchanged.`);
    return;
  }
  const text = readFileSync(join(SOURCE_DIR, file), 'utf8').replace(/^﻿/, '');
  const rows = toRecords(parseCsv(text));
  // States and DC, from the first profession's pay data (territories have no price levels).
  const first = PROFESSIONS[0];
  const payFile = join(OUTPUT_DIR, `${first?.slug}.json`);
  if (!existsSync(payFile)) throw new Error(`Import the pay figures first: ${payFile} does not exist.`);
  const pay = JSON.parse(readFileSync(payFile, 'utf8')) as PayData;
  const places = pay.states.filter((s) => s.kind !== 'territory').map((s) => ({ code: s.code, name: s.name }));

  const data = buildPrices(rows, places, file, new Date().toISOString().slice(0, 10));
  mkdirSync('src/data/prices', { recursive: true });
  const lines = data.states.map((s) => `    ${JSON.stringify(s)}`).join(',\n');
  const head = JSON.stringify({ ...data, states: undefined }, null, 2).replace(/\n}$/, '');
  writeFileSync(PRICES_FILE, `${head},\n  "states": [\n${lines}\n  ]\n}\n`);

  const missing = data.states.filter((s) => s.parity === null).map((s) => s.name);
  console.log(`Price levels -> ${PRICES_FILE}`);
  console.log(`  ${data.source.name}`);
  console.log(`  States and DC: ${data.states.length}; not available: ${missing.join(', ') || 'none'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) importPrices();
