/**
 * Comparisons, rankings and "Common questions" for a metropolitan area's
 * salary page. Every sentence is worked out from the official figures; a
 * question the data cannot answer is left out.
 */
import type { AreaPay, PayFigures, StatePay } from './types.ts';
import { formatAnnual, formatDollars, formatHourly, formatJobs, formatPercent, numeric } from './format.ts';
import { exactAmount, payFor } from './periods.ts';
import { placeName, rankInWords } from './summary.ts';

export interface RankedArea {
  code: string;
  name: string;
  median: number;
}

/** Areas with a published annual median, highest first (ties by name). */
export function rankAreas(areas: AreaPay[]): RankedArea[] {
  return areas
    .map((a) => ({ code: a.code, name: a.name, median: numeric(a.figures.annual.median) }))
    .filter((a): a is RankedArea => a.median !== undefined)
    .sort((a, b) => b.median - a.median || a.name.localeCompare(b.name));
}

/**
 * Where an area ranks by annual median among `areas` (highest = 1st).
 * Areas with equal medians share a rank. Undefined when it has no median.
 */
export function areaRank(areas: AreaPay[], code: string): { rank: number; of: number } | undefined {
  const ranked = rankAreas(areas);
  const own = ranked.find((a) => a.code === code);
  if (!own) return undefined;
  return { rank: ranked.filter((a) => a.median > own.median).length + 1, of: ranked.length };
}

/**
 * The nearest areas paying strictly more and strictly less than this one.
 * Where several areas share that median, the first by name is chosen.
 */
export function nextHigherAndLower(areas: AreaPay[], code: string): { higher?: RankedArea; lower?: RankedArea } {
  const ranked = rankAreas(areas);
  const own = ranked.find((a) => a.code === code);
  if (!own) return {};
  const above = ranked.filter((a) => a.median > own.median);
  const below = ranked.filter((a) => a.median < own.median);
  const higherMedian = above.length ? Math.min(...above.map((a) => a.median)) : undefined;
  const lowerMedian = below.length ? Math.max(...below.map((a) => a.median)) : undefined;
  return {
    higher: above.find((a) => a.median === higherMedian),
    lower: below.find((a) => a.median === lowerMedian),
  };
}

export interface Benchmark {
  /** How the other figure reads in a sentence, for example "the statewide median in Texas" or "the US median". */
  label: string;
  value: number | undefined;
  /** Said instead when `value` is missing, for example "The survey publishes no statewide median for Kansas." */
  missing: string;
}

/**
 * One plain sentence comparing an area's annual median with a benchmark,
 * for example "The median salary in Houston, TX is $1,200 a year (1.2%)
 * higher than the statewide median in Texas ($99,240)."
 */
export function compareMedian(place: string, here: number | undefined, other: Benchmark): string {
  if (here === undefined) return `There is no published median for ${place} to compare with ${other.label}.`;
  if (other.value === undefined) return other.missing;
  const diff = here - other.value;
  if (diff === 0) return `The median salary in ${place} is the same as ${other.label} (${formatDollars(other.value)} a year).`;
  return `The median salary in ${place} is ${formatDollars(Math.abs(diff))} a year (${formatPercent(diff / other.value)}) ${
    diff > 0 ? 'higher' : 'lower'
  } than ${other.label} (${formatDollars(other.value)}).`;
}

/** Benchmark for a state, with honest wording when the state has no statewide median. */
export function stateBenchmark(state: StatePay): Benchmark {
  const where = placeName(state.name);
  return {
    label: `the statewide median in ${where}`,
    value: numeric(state.figures?.annual.median),
    missing: `The survey publishes no statewide median for ${where}, so there is no state figure to compare with.`,
  };
}

export function nationalBenchmark(national: PayFigures): Benchmark {
  return { label: 'the US median', value: numeric(national.annual.median), missing: 'There is no published US median to compare with.' };
}

export interface StateRank {
  state: StatePay;
  rank: { rank: number; of: number } | undefined;
}

/**
 * For example "Houston, TX ranks 9th highest of 28 areas that include Texas,
 * and 120th highest of 377 metropolitan areas in the US."
 */
export function areaRankSentence(place: string, stateRanks: StateRank[], national: { rank: number; of: number } | undefined): string {
  const parts = stateRanks
    .filter((s): s is StateRank & { rank: { rank: number; of: number } } => s.rank !== undefined)
    .map(({ state, rank }) =>
      rank.of === 1
        ? `it is the only area that includes ${placeName(state.name)} with published figures`
        : `${rankInWords(rank)} areas that include ${placeName(state.name)}`,
    );
  const nationally = national ? `${rankInWords(national)} metropolitan areas in the US` : undefined;
  const ranks = parts.filter((p) => !p.startsWith('it is'));
  const only = parts.filter((p) => p.startsWith('it is'));
  const ranked = [...ranks, ...(nationally ? [nationally] : [])];
  const first = ranked.length ? `${place} ranks ${joinAnd(ranked)} by median salary.` : '';
  const second = only.length ? ` ${capitalizeFirst(joinAnd(only))}.` : '';
  return (first + second).trim();
}

function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface AreaQuestionInput {
  /** The short name, for example "Houston, TX". */
  place: string;
  area: AreaPay;
  /** Each state the area lies in. */
  states: StatePay[];
  national: PayFigures;
  stateRanks: StateRank[];
  nationalRank: { rank: number; of: number } | undefined;
  /** For example "dental hygienists". */
  plural: string;
  /** For example "the May 2025 Occupational Employment and Wage Statistics survey". */
  survey: string;
}

export interface Question {
  question: string;
  answer: string;
}

export function areaQuestions(input: AreaQuestionInput): Question[] {
  const { place, area, states, national, stateRanks, nationalRank, plural, survey } = input;
  const f = area.figures;
  const questions: Question[] = [];
  const median = numeric(f.annual.median);
  const hourly = numeric(f.hourly.median);

  if (median !== undefined) {
    const p10 = numeric(f.annual.p10);
    const p90 = numeric(f.annual.p90);
    questions.push({
      question: `How much do ${plural} make in ${place}?`,
      answer: [
        `The median salary for ${plural} in ${place} is ${formatAnnual(median)} a year${hourly !== undefined ? `, or ${formatHourly(hourly)} an hour` : ''}, according to ${survey}.`,
        p10 !== undefined && p90 !== undefined
          ? `The lowest-paid 10% earn less than ${formatAnnual(p10)} a year and the top 10% earn more than ${formatAnnual(p90)}.`
          : '',
      ]
        .filter(Boolean)
        .join(' '),
    });

    const week = exactAmount(payFor(f, 'median', 'week'));
    const month = exactAmount(payFor(f, 'median', 'month'));
    if (week !== undefined && month !== undefined) {
      questions.push({
        question: `What is the median salary in ${place} per month and per week?`,
        answer: `About ${formatDollars(month)} a month or ${formatDollars(week)} a week. These are worked out from the official yearly median of ${formatAnnual(median)} (divided by 12 and by 52), which the survey bases on full-time, year-round work.`,
      });
    }

    questions.push({
      question: `How does the salary in ${place} compare with ${states.length === 1 ? placeName(states[0]!.name) : 'its states'} and the US?`,
      answer: [...states.map((s) => compareMedian(place, median, stateBenchmark(s))), compareMedian(place, median, nationalBenchmark(national))].join(' '),
    });

    const rankText = areaRankSentence(place, stateRanks, nationalRank);
    if (rankText) questions.push({ question: `How does ${place} rank for ${plural.replace(/s$/, '')} pay?`, answer: rankText });
  }

  const jobs = numeric(f.employment);
  if (jobs !== undefined) {
    questions.push({
      question: `How many ${plural} work in ${place}?`,
      answer: `The survey counts ${formatJobs(jobs)} ${plural} in ${place}. This is the survey's own estimate of jobs in the area, rounded by the source.`,
    });
  }
  return questions.slice(0, 5);
}
