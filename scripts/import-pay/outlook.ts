/**
 * Turns rows of the state projections file into the site's outlook data.
 * Works on rows already read, so it can be tested without the file.
 */
import type { OutlookData, OutlookFigures, OutlookValue } from '../../src/lib/outlook/types.ts';
import type { Row } from './extract.ts';

const COLUMNS = ['state_fips', 'area', 'occupation_code', 'base_year', 'projected_year', 'base_employment', 'projected_employment', 'percent_change', 'average_annual_openings'];

/**
 * Reads one figure. Numbers may be negative ("-1.7"), zero, or have
 * thousands commas. A blank cell or a symbol is recorded as not available
 * (null), never as a number.
 */
export function parseOutlookValue(raw: string | undefined): OutlookValue {
  const text = (raw ?? '').trim().replace(/,/g, '');
  if (text === '') return null;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  return Number(text);
}

function figuresFromRow(row: Row): OutlookFigures {
  return {
    baseJobs: parseOutlookValue(row.BASE_EMPLOYMENT),
    projectedJobs: parseOutlookValue(row.PROJECTED_EMPLOYMENT),
    percentChange: parseOutlookValue(row.PERCENT_CHANGE),
    openings: parseOutlookValue(row.AVERAGE_ANNUAL_OPENINGS),
  };
}

/** Normalizes a FIPS code to two digits, for example "6" to "06". */
export function fips(code: string | undefined): string {
  return (code ?? '').trim().padStart(2, '0');
}

/** The source name shown on the site, for the projection years. */
export function sourceName(baseYear: number, projectedYear: number): string {
  return `Projections Central, State Occupational Projections, long-term projections ${baseYear} to ${projectedYear}, sponsored by the US Department of Labor`;
}

/**
 * Builds the outlook data for one occupation. `knownPlaces` are the states,
 * DC and territories in the pay data (code and name), used to match by FIPS
 * code and to list any the file leaves out.
 */
export function buildOutlook(
  rows: Row[],
  occupation: { code: string; title: string },
  knownPlaces: { code: string; name: string }[],
  fileRead: string,
  importedOn: string,
): OutlookData {
  const header = Object.keys(rows[0] ?? {});
  const missingColumns = COLUMNS.filter((c) => !header.includes(c.toUpperCase()));
  if (missingColumns.length) throw new Error(`The projections file is missing columns: ${missingColumns.join(', ')}.`);

  const mine = rows.filter((r) => r.OCCUPATION_CODE?.trim() === occupation.code);
  if (mine.length === 0) throw new Error(`Occupation code ${occupation.code} was not found in the projections file.`);

  const years = new Set(mine.map((r) => `${r.BASE_YEAR?.trim()}-${r.PROJECTED_YEAR?.trim()}`));
  if (years.size !== 1) throw new Error(`The projections file mixes projection periods: ${[...years].join(', ')}.`);
  const [baseYear, projectedYear] = [...years][0]!.split('-').map(Number) as [number, number];

  const nationalRow = mine.find((r) => fips(r.STATE_FIPS) === '00');
  if (!nationalRow) throw new Error('The projections file has no United States row (FIPS 00).');

  const byCode = new Map(knownPlaces.map((p) => [p.code, p.name]));
  const places = mine
    .filter((r) => fips(r.STATE_FIPS) !== '00')
    .map((r) => {
      const code = fips(r.STATE_FIPS);
      const name = byCode.get(code);
      if (!name) throw new Error(`FIPS code ${code} (${r.AREA}) in the projections file is not a state, DC or territory in the pay data.`);
      return { code, name, figures: figuresFromRow(r) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const found = new Set(places.map((p) => p.code));

  return {
    occupation,
    source: { name: sourceName(baseYear, projectedYear), baseYear, projectedYear, fileRead, importedOn },
    national: figuresFromRow(nationalRow),
    places,
    notInFile: knownPlaces.filter((p) => !found.has(p.code)).map((p) => p.name).sort(),
  };
}
