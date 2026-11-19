/**
 * Finds and reads the official files in data/source/. Two layouts work:
 *
 *  1. The official zip files as downloaded: oesmYYnat.zip, oesmYYst.zip and
 *     oesmYYma.zip (each holds a spreadsheet).
 *  2. CSV row extracts of those files, with the original header row, whose
 *     names contain "national", "state", "metro" and "nonmetro" and the
 *     release, for example oews-m2025-state.csv.
 *
 * When both are present, the official zip files are used.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv, toRecords } from './csv.ts';
import { readSheet } from './xlsx.ts';
import { findEntry, readEntry } from './zip.ts';
import type { Row } from './extract.ts';

export interface SourceSet {
  year: number;
  layout: 'zip' | 'csv';
  filesRead: string[];
  national: Row[];
  state: Row[];
  metro: Row[];
  nonmetro: Row[];
}

function latestYear(names: string[], pattern: RegExp, toYear: (match: RegExpExecArray) => number): number | undefined {
  const years = names.map((n) => pattern.exec(n)).filter((m): m is RegExpExecArray => !!m).map(toYear);
  return years.length ? Math.max(...years) : undefined;
}

async function rowsFromZipSheet(zip: Buffer, zipName: string, pattern: RegExp, codes: Set<string>): Promise<Row[]> {
  const entry = findEntry(zip, pattern);
  if (!entry) throw new Error(`${zipName} does not contain a file matching ${pattern}.`);
  const xlsx = readEntry(zip, entry);
  const rows = await readSheet(xlsx, (cells) => cells.some((cell) => codes.has(cell.trim())));
  return toRecords(rows);
}

/**
 * Reads the newest release found in `dir`. Only rows for the given occupation
 * codes are kept from the large spreadsheets.
 */
export async function readSources(dir: string, codes: Set<string>): Promise<SourceSet> {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    throw new Error(`The folder ${dir}/ does not exist. Put the official files there first.`);
  }

  const zipYear = latestYear(names, /^oesm(\d{2})(nat|st|ma)\.zip$/i, (m) => 2000 + Number(m[1]));
  if (zipYear !== undefined) {
    const yy = String(zipYear).slice(2);
    const files = { nat: `oesm${yy}nat.zip`, st: `oesm${yy}st.zip`, ma: `oesm${yy}ma.zip` };
    const missing = Object.values(files).filter((f) => !names.includes(f));
    if (missing.length) throw new Error(`Missing official files in ${dir}/: ${missing.join(', ')}.`);

    const load = (f: string) => readFileSync(join(dir, f));
    const ma = load(files.ma);
    return {
      year: zipYear,
      layout: 'zip',
      filesRead: Object.values(files),
      national: await rowsFromZipSheet(load(files.nat), files.nat, /national_M\d{4}_dl\.xlsx$/i, codes),
      state: await rowsFromZipSheet(load(files.st), files.st, /state_M\d{4}_dl\.xlsx$/i, codes),
      metro: await rowsFromZipSheet(ma, files.ma, /MSA_M\d{4}_dl\.xlsx$/i, codes),
      nonmetro: await rowsFromZipSheet(ma, files.ma, /BOS_M\d{4}_dl\.xlsx$/i, codes),
    };
  }

  const csvYear = latestYear(names, /m(\d{4}).*\.csv$/i, (m) => Number(m[1]));
  if (csvYear === undefined) {
    throw new Error(`No official files found in ${dir}/. See the README section "Updating pay figures".`);
  }
  const csvFor = (kind: 'national' | 'state' | 'metro' | 'nonmetro') => {
    const name = names.find((n) => {
      const lower = n.toLowerCase();
      if (!lower.endsWith('.csv') || !lower.includes(`m${csvYear}`)) return false;
      if (kind === 'metro') return lower.includes('metro') && !lower.includes('nonmetro');
      return lower.includes(kind);
    });
    if (!name) throw new Error(`No ${kind} CSV file for ${csvYear} found in ${dir}/.`);
    return name;
  };
  const files = { national: csvFor('national'), state: csvFor('state'), metro: csvFor('metro'), nonmetro: csvFor('nonmetro') };
  const load = (f: string) => toRecords(parseCsv(readFileSync(join(dir, f), 'utf8')));
  return {
    year: csvYear,
    layout: 'csv',
    filesRead: Object.values(files),
    national: load(files.national),
    state: load(files.state),
    metro: load(files.metro),
    nonmetro: load(files.nonmetro),
  };
}
