/**
 * The pay calculator's data and logic. This file runs both when the site is
 * built (to write the calculator's small data file) and in the visitor's
 * browser, so it uses no site-building code.
 */
import type { PayData, PayFigures, PayPercentiles, PaySymbol, PayValue } from './types.ts';
import { exactAmount, formatPeriodAmount, PERIODS, payFor, type Period, type PeriodAmount } from './periods.ts';

/** Figures packed into a short list: jobs, then hourly and annual 10th, 25th, median, 75th and 90th. */
export type PackedFigures = (number | PaySymbol)[];

const KEYS = ['p10', 'p25', 'median', 'p75', 'p90'] as const;

export interface CalculatorState {
  slug: string;
  name: string;
  /** Missing when the survey has no statewide figures. */
  figures?: PackedFigures;
  /** Codes of the areas that include this state. */
  areas: string[];
}

export interface CalculatorData {
  /** For example "US Bureau of Labor Statistics". */
  publisher: string;
  /** For example "Occupational Employment and Wage Statistics, May 2025". */
  release: string;
  national: PackedFigures;
  states: CalculatorState[];
  areas: Record<string, { name: string; figures: PackedFigures }>;
}

const packValue = (value: PayValue): number | PaySymbol => (typeof value === 'number' ? value : value.symbol);
const unpackValue = (value: number | PaySymbol | undefined): PayValue =>
  typeof value === 'number' ? value : { symbol: value ?? '*' };

export function packFigures(figures: PayFigures): PackedFigures {
  return [
    packValue(figures.employment),
    ...KEYS.map((k) => packValue(figures.hourly[k])),
    ...KEYS.map((k) => packValue(figures.annual[k])),
  ];
}

export function unpackFigures(packed: PackedFigures): PayFigures {
  const part = (offset: number) =>
    ({
      // The calculator does not use the mean; it is marked as not available.
      mean: { symbol: '*' },
      ...Object.fromEntries(KEYS.map((k, i) => [k, unpackValue(packed[offset + i])])),
    }) as PayPercentiles;
  return { employment: unpackValue(packed[0]), hourly: part(1), annual: part(1 + KEYS.length) };
}

/**
 * Builds the calculator's data: the national figures, every published state
 * (with or without statewide figures) and the areas in those states. Only
 * the figures the calculator shows are included, to keep the file small.
 */
export function buildCalculatorData(
  pay: PayData,
  published: { name: string; slug: string }[],
  release: string,
): CalculatorData {
  const areas: CalculatorData['areas'] = {};
  const states = published.map(({ name, slug }) => {
    const state = pay.states.find((s) => s.name === name);
    if (!state) throw new Error(`"${name}" is not in the pay data.`);
    const inState = pay.areas
      .filter((a) => a.states.includes(state.abbr))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const area of inState) areas[area.code] = { name: area.name, figures: packFigures(area.figures) };
    const entry: CalculatorState = { slug, name, areas: inState.map((a) => a.code) };
    if (state.figures) entry.figures = packFigures(state.figures);
    return entry;
  });
  return { publisher: pay.release.publisher, release, national: packFigures(pay.national), states, areas };
}

export type Difference =
  | { kind: 'higher' | 'lower'; dollars: number; percent: number }
  | { kind: 'equal' }
  | { kind: 'missing' };

/**
 * How `here` compares with `base`: higher, lower or equal, by how many dollars
 * and by what percent of `base`. If either side is missing or only known as
 * "at least", no difference is worked out.
 */
export function difference(here: PeriodAmount, base: PeriodAmount): Difference {
  const a = exactAmount(here);
  const b = exactAmount(base);
  if (a === undefined || b === undefined || b === 0) return { kind: 'missing' };
  const diff = Math.round((a - b) * 100) / 100;
  if (diff === 0) return { kind: 'equal' };
  return { kind: diff > 0 ? 'higher' : 'lower', dollars: Math.abs(diff), percent: Math.abs(diff) / b };
}

const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/** "$1,140 (1.2%) higher", "The same", or "Not available". */
export function formatDifference(diff: Difference, period: Period): string {
  if (diff.kind === 'missing') return 'Not available';
  if (diff.kind === 'equal') return 'The same';
  const money = period === 'hour' ? cents.format(diff.dollars) : whole.format(diff.dollars);
  return `${money} (${(diff.percent * 100).toFixed(1)}%) ${diff.kind}`;
}

/** Shortcut: the difference between two places' median pay for a period. */
export function medianDifference(here: PayFigures | undefined, base: PayFigures | undefined, period: Period): Difference {
  return difference(payFor(here, 'median', period), payFor(base, 'median', period));
}

export interface Choices {
  state?: string;
  area?: string;
  compareState?: string;
  compareArea?: string;
  period: Period;
  /** Choices in the page address that do not exist, so were ignored. */
  ignored: string[];
}

/** The page address parameters the calculator uses. */
export const PARAMS = { state: 'state', area: 'area', compareState: 'vs', compareArea: 'vsarea', period: 'per' } as const;

/**
 * Reads the visitor's choices from the page address, for example
 * "?state=texas&area=12420&vs=ohio&per=month". Unknown states, areas that are
 * not in the chosen state, and unknown periods are ignored and reported.
 */
export function readChoices(search: string, data: CalculatorData): Choices {
  const params = new URLSearchParams(search);
  const ignored: string[] = [];
  const choices: Choices = { period: 'year', ignored };

  const pickState = (key: string) => {
    const value = params.get(key)?.trim().toLowerCase();
    if (!value) return undefined;
    const state = data.states.find((s) => s.slug === value);
    if (!state) ignored.push(`${key}=${value}`);
    return state;
  };
  const pickArea = (key: string, state: CalculatorState | undefined) => {
    const value = params.get(key)?.trim();
    if (!value) return undefined;
    if (!state || !state.areas.includes(value)) {
      ignored.push(`${key}=${value}`);
      return undefined;
    }
    return value;
  };

  const state = pickState(PARAMS.state);
  if (state) choices.state = state.slug;
  const area = pickArea(PARAMS.area, state);
  if (area) choices.area = area;
  const compare = pickState(PARAMS.compareState);
  if (compare) choices.compareState = compare.slug;
  const compareArea = pickArea(PARAMS.compareArea, compare);
  if (compareArea) choices.compareArea = compareArea;

  const period = params.get(PARAMS.period)?.trim().toLowerCase();
  if (period) {
    if ((PERIODS as readonly string[]).includes(period)) choices.period = period as Period;
    else ignored.push(`${PARAMS.period}=${period}`);
  }
  return choices;
}

/** Writes choices back into a page address query, leaving out empty ones and the default period. */
export function writeChoices(choices: Omit<Choices, 'ignored'>): string {
  const params = new URLSearchParams();
  if (choices.state) params.set(PARAMS.state, choices.state);
  if (choices.state && choices.area) params.set(PARAMS.area, choices.area);
  if (choices.compareState) params.set(PARAMS.compareState, choices.compareState);
  if (choices.compareState && choices.compareArea) params.set(PARAMS.compareArea, choices.compareArea);
  if (choices.period !== 'year') params.set(PARAMS.period, choices.period);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/* ---------- What a "pay snapshot" shows, shared by the built page and the browser ---------- */

export const SNAPSHOT_ROWS = [
  { key: 'p10', label: 'Lowest 10% earn less than' },
  { key: 'p25', label: '25% earn less than' },
  { key: 'median', label: 'Median (half earn more, half less)' },
  { key: 'p75', label: '25% earn more than' },
  { key: 'p90', label: 'Top 10% earn more than' },
] as const;

const count = new Intl.NumberFormat('en-US');

export interface Snapshot {
  rows: { key: string; label: string; value: string }[];
  jobs: string;
  /** For example "$1,140 (1.2%) higher than the national median". */
  comparedWith: string;
  /** Marker positions on the range bar, as percentages, or undefined if any figure is missing. */
  bar?: { p25: number; median: number; p75: number };
  /** A text version of the range bar, for screen readers and as a caption. */
  barText: string;
}

/** Everything one snapshot card shows, for one place and period. */
export function snapshot(figures: PayFigures | undefined, base: PayFigures | undefined, baseName: string, period: Period): Snapshot {
  const amounts = Object.fromEntries(SNAPSHOT_ROWS.map((r) => [r.key, payFor(figures, r.key, period)])) as Record<
    (typeof SNAPSHOT_ROWS)[number]['key'],
    PeriodAmount
  >;
  const rows = SNAPSHOT_ROWS.map((r) => ({ key: r.key, label: r.label, value: formatPeriodAmount(amounts[r.key], period) }));
  const jobs = figures && typeof figures.employment === 'number' ? count.format(figures.employment) : 'Not available';

  const diff = base ? medianDifference(figures, base, period) : undefined;
  const comparedWith = !diff
    ? '–'
    : diff.kind === 'missing'
      ? 'Not available'
      : diff.kind === 'equal'
        ? `The same as ${baseName}`
        : `${formatDifference(diff, period)} than ${baseName}`;

  const [low, p25, mid, p75, high] = (['p10', 'p25', 'median', 'p75', 'p90'] as const).map((k) => exactAmount(amounts[k]));
  let bar: Snapshot['bar'];
  if ([low, p25, mid, p75, high].every((v) => v !== undefined) && high! > low!) {
    const at = (v: number) => Math.round(((v - low!) / (high! - low!)) * 1000) / 10;
    bar = { p25: at(p25!), median: at(mid!), p75: at(p75!) };
  }
  const barText = bar
    ? `Pay range: the lowest 10% earn less than ${rows[0]!.value}, half earn less than ${rows[2]!.value}, and the top 10% earn more than ${rows[4]!.value}.`
    : 'Pay range: not available, because one or more figures are not published.';
  return { rows, jobs, comparedWith, bar, barText };
}
