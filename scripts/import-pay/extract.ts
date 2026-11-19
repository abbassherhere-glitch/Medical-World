/**
 * Turns rows from the official files into the site's pay data.
 * Everything here works on rows already read from the files, so it can be
 * tested without the files themselves.
 */
import type { AreaPay, PayFigures, PayPercentiles, PaySymbol, PayValue, StateKind, StatePay } from '../../src/lib/pay/types.ts';
import { parseFlag, parseValue } from './parse.ts';

export type Row = Record<string, string>;

const PERCENTILE_COLUMNS = {
  mean: 'MEAN',
  p10: 'PCT10',
  p25: 'PCT25',
  median: 'MEDIAN',
  p75: 'PCT75',
  p90: 'PCT90',
} as const;

function percentiles(row: Row, prefix: 'H' | 'A'): PayPercentiles {
  const decimals = prefix === 'H' ? 2 : 0;
  const entries = Object.entries(PERCENTILE_COLUMNS).map(([key, column]) => {
    const name = `${prefix}_${column}`;
    return [key, parseValue(row[name], name, decimals)];
  });
  return Object.fromEntries(entries) as unknown as PayPercentiles;
}

/** Reads the employment and pay figures from one row. */
export function figuresFromRow(row: Row): PayFigures {
  const figures: PayFigures = {
    employment: parseValue(row.TOT_EMP, 'TOT_EMP', 0),
    hourly: percentiles(row, 'H'),
    annual: percentiles(row, 'A'),
  };
  if (parseFlag(row.ANNUAL, 'ANNUAL')) figures.annualOnly = true;
  if (parseFlag(row.HOURLY, 'HOURLY')) figures.hourlyOnly = true;
  return figures;
}

/** Keeps only the rows for one occupation, across all industries and owners. */
export function rowsForOccupation(rows: Row[], occCode: string): Row[] {
  return rows.filter(
    (row) =>
      row.OCC_CODE?.trim() === occCode &&
      (row.NAICS === undefined || row.NAICS.trim() === '000000' || row.NAICS.trim() === ''),
  );
}

/**
 * Finds the national row for an occupation and checks its title.
 * Throws with a clear message if the code is missing or the title differs.
 */
export function findOccupation(nationalRows: Row[], occCode: string, expectedTitle: string): { row: Row; title: string } {
  const matches = rowsForOccupation(nationalRows, occCode);
  if (matches.length === 0) throw new Error(`Occupation code ${occCode} was not found in the national file.`);
  if (matches.length > 1) throw new Error(`Occupation code ${occCode} appears ${matches.length} times in the national file.`);
  const row = matches[0]!;
  const title = row.OCC_TITLE?.trim() ?? '';
  if (title !== expectedTitle) {
    throw new Error(
      `Occupation code ${occCode} is titled "${title}" in the national file, not "${expectedTitle}". ` +
        'Check the code and update scripts/import-pay/config.ts.',
    );
  }
  return { row, title };
}

function stateKind(areaType: string, name: string): StateKind {
  if (name === 'District of Columbia') return 'district';
  return areaType.trim() === '3' ? 'territory' : 'state';
}

/**
 * Builds the list of states, DC and territories. Every area in the state file
 * is listed, including those with no published figures for this occupation.
 */
export function buildStates(stateRows: Row[], occCode: string): StatePay[] {
  const areas = new Map<string, StatePay>();
  for (const row of stateRows) {
    const code = row.AREA!.trim();
    if (!areas.has(code)) {
      const name = row.AREA_TITLE!.trim();
      areas.set(code, {
        code,
        name,
        abbr: row.PRIM_STATE!.trim(),
        kind: stateKind(row.AREA_TYPE ?? '', name),
        published: false,
      });
    }
  }
  for (const row of rowsForOccupation(stateRows, occCode)) {
    const area = areas.get(row.AREA!.trim())!;
    area.published = true;
    area.figures = figuresFromRow(row);
  }
  return [...areas.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reads the states an area lies in from its title, for example
 * "Texarkana, TX-AR" gives ["TX", "AR"]. Nonmetropolitan areas, whose titles
 * carry no state letters, use the primary state.
 */
export function statesOfArea(title: string, primaryState: string): string[] {
  const suffix = /,\s*([A-Z]{2}(?:-[A-Z]{2})*)\s*$/.exec(title)?.[1];
  const states = suffix ? suffix.split('-') : [];
  if (primaryState && !states.includes(primaryState)) states.unshift(primaryState);
  return states;
}

export function buildAreas(metroRows: Row[], nonmetroRows: Row[], occCode: string): AreaPay[] {
  const toArea = (kind: AreaPay['kind']) => (row: Row): AreaPay => {
    const name = row.AREA_TITLE!.trim();
    const primaryState = row.PRIM_STATE!.trim();
    return {
      code: row.AREA!.trim(),
      name,
      kind,
      states: statesOfArea(name, primaryState),
      primaryState,
      figures: figuresFromRow(row),
    };
  };
  return [
    ...rowsForOccupation(metroRows, occCode).map(toArea('metro')),
    ...rowsForOccupation(nonmetroRows, occCode).map(toArea('nonmetro')),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

/** Lists every symbol used in a set of figures. */
export function symbolsUsed(figures: PayFigures[]): PaySymbol[] {
  const found = new Set<PaySymbol>();
  const visit = (value: PayValue) => {
    if (typeof value === 'object') found.add(value.symbol);
  };
  for (const f of figures) {
    visit(f.employment);
    Object.values(f.hourly).forEach(visit);
    Object.values(f.annual).forEach(visit);
  }
  return [...found].sort();
}
