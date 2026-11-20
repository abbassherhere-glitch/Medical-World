/**
 * The pay calculator's data and logic. This file runs both when the site is
 * built (to write the calculator's small data file) and in the visitor's
 * browser, so it uses no site-building code.
 */
import type { PayData, PayFigures, PayPercentiles, PaySymbol, PayValue } from './types.ts';
import { exactAmount, formatPeriodAmount, PERIODS, payFor, type Period, type PeriodAmount } from './periods.ts';
import type { OutlookData, OutlookFigures } from '../outlook/types.ts';
import { formatCount, formatPercentChange, pace } from '../outlook/summary.ts';
import { adjustedSalary } from '../prices/adjust.ts';
import type { PriceData } from '../prices/types.ts';

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
  /** `page` is the area's own salary page, when it has one. */
  areas: Record<string, { name: string; figures: PackedFigures; page?: string }>;
  /** Job outlook from the state projections, if available. */
  outlook?: CalculatorOutlook;
  /** State price levels, if available. Published for whole states only, never for areas. */
  prices?: CalculatorPrices;
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
  areaPages: Map<string, string> = new Map(),
): CalculatorData {
  const areas: CalculatorData['areas'] = {};
  const states = published.map(({ name, slug }) => {
    const state = pay.states.find((s) => s.name === name);
    if (!state) throw new Error(`"${name}" is not in the pay data.`);
    const inState = pay.areas
      .filter((a) => a.states.includes(state.abbr))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const area of inState) {
      const page = areaPages.get(area.code);
      areas[area.code] = { name: area.name, figures: packFigures(area.figures), ...(page ? { page } : {}) };
    }
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

/* ---------- Job outlook in the calculator (from the state projections) ---------- */

/** Outlook packed into a short list: jobs in the base year, projected jobs, percent change, openings a year. */
export type PackedOutlook = (number | null)[];

export interface CalculatorOutlook {
  /** The source name to show, for example "Projections Central, …". */
  source: string;
  baseYear: number;
  projectedYear: number;
  national: PackedOutlook;
  /** By state slug. States the projections do not cover are absent. */
  states: Record<string, PackedOutlook>;
}

export function packOutlook(f: OutlookFigures): PackedOutlook {
  return [f.baseJobs, f.projectedJobs, f.percentChange, f.openings];
}

export function unpackOutlook(p: PackedOutlook | undefined): OutlookFigures | undefined {
  if (!p) return undefined;
  return { baseJobs: p[0] ?? null, projectedJobs: p[1] ?? null, percentChange: p[2] ?? null, openings: p[3] ?? null };
}

export function buildCalculatorOutlook(outlook: OutlookData, published: { name: string; slug: string }[]): CalculatorOutlook {
  const states: Record<string, PackedOutlook> = {};
  for (const { name, slug } of published) {
    const place = outlook.places.find((p) => p.name === name);
    if (place) states[slug] = packOutlook(place.figures);
  }
  return {
    source: outlook.source.name,
    baseYear: outlook.source.baseYear,
    projectedYear: outlook.source.projectedYear,
    national: packOutlook(outlook.national),
    states,
  };
}

export interface OutlookSnapshot {
  /** For example "Job outlook, 2024 to 2034" or "Job outlook for Texas, 2024 to 2034". */
  heading: string;
  jobs: string;
  growth: string;
  openings: string;
  /** For example "Faster than the US (+7%)" or "14.8 percentage points higher than Texas". */
  comparedWith: string;
}

/**
 * The outlook rows of a snapshot card. `base` is what to compare with: the
 * national figures for the first card, the first card's figures for the
 * second.
 */
export function outlookSnapshot(
  figures: OutlookFigures | undefined,
  scope: string,
  years: { base: number; projected: number },
  base: { figures: OutlookFigures | undefined; name: string; isNation: boolean } | undefined,
): OutlookSnapshot {
  const span = `${years.base} to ${years.projected}`;
  const heading = scope ? `Job outlook for ${scope}, ${span}` : `Job outlook, ${span}`;
  if (!figures) {
    return { heading, jobs: 'Not available', growth: 'Not available', openings: 'Not available', comparedWith: base ? 'Not available' : '–' };
  }
  const jobs =
    figures.baseJobs !== null && figures.projectedJobs !== null
      ? `${formatCount(figures.baseJobs)} to ${formatCount(figures.projectedJobs)}`
      : 'Not available';
  let comparedWith = '–';
  if (base) {
    const here = figures.percentChange;
    const there = base.figures?.percentChange ?? null;
    if (here === null || there === null) comparedWith = 'Not available';
    else if (base.isNation) {
      const p = pace(here, there);
      comparedWith =
        p === 'falling'
          ? `Falling, while the US grows ${formatPercentChange(there)}`
          : p === 'faster'
            ? `Faster than the US (${formatPercentChange(there)})`
            : p === 'slower'
              ? `Slower than the US (${formatPercentChange(there)})`
              : `About the same as the US (${formatPercentChange(there)})`;
    } else {
      const diff = Math.round((here - there) * 10) / 10;
      comparedWith =
        diff === 0
          ? `The same as ${base.name}`
          : `${Math.abs(diff)} percentage points ${diff > 0 ? 'higher' : 'lower'} than ${base.name}`;
    }
  }
  return { heading, jobs, growth: formatPercentChange(figures.percentChange), openings: formatCount(figures.openings), comparedWith };
}

/* ---------- Salary and cost of living ---------- */

export interface CalculatorPrices {
  /** The source name to show. */
  source: string;
  year: number;
  /** Price level (US = 100) by state slug. States without one are absent. */
  states: Record<string, number>;
}

export function buildCalculatorPrices(prices: PriceData, published: { name: string; slug: string }[]): CalculatorPrices {
  const states: Record<string, number> = {};
  for (const { name, slug } of published) {
    const parity = prices.states.find((s) => s.name === name)?.parity;
    if (typeof parity === 'number') states[slug] = parity;
  }
  return { source: prices.source.name, year: prices.source.year, states };
}

export interface PriceSnapshot {
  priceLevel: string;
  /** Adjusted median per year (a calculation), or why there is none. */
  adjusted: string;
  /** The adjusted figure compared with the first place, or "–". */
  comparedWith: string;
  /** The adjusted figure as a number, for comparing two places. */
  value?: number;
}

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/**
 * The cost-of-living rows of one snapshot card. Adjusted figures are worked
 * out only for a whole state with a published median and price level. The
 * US shows its price level (100) and no adjusted figure; an area shows none,
 * because price levels are published for whole states only.
 */
export function priceSnapshot(
  kind: 'nation' | 'state' | 'area',
  figures: PayFigures | undefined,
  parity: number | undefined,
  base?: { value?: number; name: string },
): PriceSnapshot {
  if (kind === 'nation') return { priceLevel: '100.000 (US average)', adjusted: '–', comparedWith: '–' };
  if (kind === 'area') return { priceLevel: 'Whole states only', adjusted: 'Not for areas', comparedWith: '–' };
  const value = adjustedSalary(figures?.annual.median, parity);
  const priceLevel = typeof parity === 'number' ? parity.toFixed(3) : 'Not available';
  const adjusted = value === undefined ? 'Not available' : dollars.format(value);
  let comparedWith = '–';
  if (base) {
    if (value === undefined || base.value === undefined) comparedWith = 'Not available';
    else if (value === base.value) comparedWith = `The same as ${base.name}`;
    else {
      const diff = value - base.value;
      comparedWith = `${dollars.format(Math.abs(diff))} (${((Math.abs(diff) / base.value) * 100).toFixed(1)}%) ${diff > 0 ? 'higher' : 'lower'} than ${base.name}`;
    }
  }
  return { priceLevel, adjusted, comparedWith, ...(value !== undefined ? { value } : {}) };
}
