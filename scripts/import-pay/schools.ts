/**
 * Turns rows of the IPEDS completions file into the site's schools data.
 * Works on rows already read, so it can be tested without the file. Names,
 * cities and web addresses are kept exactly as in the file.
 */
import type { AwardLevel, Control, School, SchoolsData } from '../../src/lib/schools/types.ts';
import type { Row } from './extract.ts';
import { fips } from './outlook.ts';

const COLUMNS = ['unitid', 'institution', 'city', 'state', 'state_fips', 'website', 'control', 'award_level_code', 'award_level', 'cip_code', 'program', 'completions', 'award_year'];
const CONTROLS: Control[] = ['Public', 'Private nonprofit', 'Private for-profit'];

export const SCHOOLS_SOURCE =
  'US Department of Education, National Center for Education Statistics, Integrated Postsecondary Education Data System (IPEDS), Completions';

/** Reads the number of awards; it must be a whole number, which can be 0. */
export function parseAwards(raw: string | undefined, where: string): number {
  const text = (raw ?? '').trim().replace(/,/g, '');
  if (!/^\d+$/.test(text)) throw new Error(`Unexpected number of awards "${raw}" for ${where}.`);
  return Number(text);
}

/**
 * Builds the schools data for one program code. Each college's rows (one per
 * award level) are grouped into one entry. `knownStates` maps FIPS code to
 * postal abbreviation, from the pay data, to match states by FIPS code.
 */
export function buildSchools(
  rows: Row[],
  cip: string,
  knownStates: Map<string, string>,
  fileRead: string,
  importedOn: string,
): SchoolsData {
  const header = Object.keys(rows[0] ?? {});
  const missing = COLUMNS.filter((c) => !header.includes(c.toUpperCase()));
  if (missing.length) throw new Error(`The schools file is missing columns: ${missing.join(', ')}.`);

  const mine = rows.filter((r) => r.CIP_CODE?.trim() === cip);
  if (mine.length === 0) throw new Error(`Program code ${cip} was not found in the schools file.`);
  const years = new Set(mine.map((r) => r.AWARD_YEAR!.trim()));
  if (years.size !== 1) throw new Error(`The schools file mixes award years: ${[...years].join(', ')}.`);

  const byId = new Map<string, School>();
  for (const r of mine) {
    const id = r.UNITID!.trim();
    const where = `${r.INSTITUTION} (${id})`;
    const stateCode = fips(r.STATE_FIPS);
    const abbr = knownStates.get(stateCode);
    if (!abbr) throw new Error(`FIPS code ${stateCode} for ${where} is not a state, DC or territory in the pay data.`);
    if (abbr !== r.STATE!.trim()) throw new Error(`${where}: FIPS code ${stateCode} is ${abbr}, but the state column says ${r.STATE}.`);
    const control = r.CONTROL!.trim() as Control;
    if (!CONTROLS.includes(control)) throw new Error(`Unexpected type "${r.CONTROL}" for ${where}.`);

    const level: AwardLevel = {
      code: Number(r.AWARD_LEVEL_CODE),
      name: r.AWARD_LEVEL!.trim(),
      awards: parseAwards(r.COMPLETIONS, where),
    };
    const existing = byId.get(id);
    if (existing) {
      if (existing.levels.some((l) => l.code === level.code)) throw new Error(`${where} lists award level ${level.name} twice.`);
      existing.levels.push(level);
      continue;
    }
    byId.set(id, {
      id,
      name: r.INSTITUTION!,
      city: r.CITY!,
      state: abbr,
      stateCode,
      website: r.WEBSITE!.trim(),
      control,
      levels: [level],
    });
  }

  const schools = [...byId.values()]
    .map((s) => ({ ...s, levels: s.levels.sort((a, b) => a.code - b.code) }))
    .sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
  return {
    program: { cip, title: mine[0]!.PROGRAM!.trim() },
    source: { name: SCHOOLS_SOURCE, awardYear: [...years][0]!, fileRead, importedOn },
    schools,
  };
}
