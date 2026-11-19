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
export function compareMedian(place: string, here: number | undefined, other: Benchmark, again = false): string {
  if (here === undefined) return `There is no published median for ${place} to compare with ${other.label}.`;
  if (other.value === undefined) return other.missing;
  const diff = here - other.value;
  // A second sentence in a row reads "It is …" rather than repeating the place.
  const subject = again ? 'It' : `The median salary in ${place}`;
  if (diff === 0) return `${subject} is the same as ${other.label} (${formatDollars(other.value)} a year).`;
  return `${subject} is ${formatDollars(Math.abs(diff))} a year (${formatPercent(diff / other.value)}) ${
    diff > 0 ? 'higher' : 'lower'
  } than ${other.label} (${formatDollars(other.value)}).`;
}

/** Benchmark for a state, with honest wording when the state has no statewide median. */
export function stateBenchmark(state: StatePay): Benchmark {
  const where = placeName(state.name);
  return {
    // The District of Columbia is not a state, so its figure is not called "statewide".
    label: state.kind === 'district' ? `the median for ${where}` : `the statewide median in ${where}`,
    value: numeric(state.figures?.annual.median),
    missing: `The survey publishes no ${state.kind === 'district' ? '' : 'statewide '}median for ${where}, so there is no ${state.kind === 'district' ? '' : 'state '}figure to compare with.`,
  };
}

export function nationalBenchmark(national: PayFigures): Benchmark {
  return { label: 'the US median', value: numeric(national.annual.median), missing: 'There is no published US median to compare with.' };
}

/**
 * The comparisons with each state and the US, in order. After the first
 * sentence that names the area, the next ones start "It is …".
 */
export function compareAll(place: string, median: number | undefined, states: StatePay[], national: PayFigures): string[] {
  const benchmarks = [...states.map(stateBenchmark), nationalBenchmark(national)];
  let named = false;
  return benchmarks.map((b) => {
    const sentence = compareMedian(place, median, b, named);
    if (sentence.startsWith('The median salary in')) named = true;
    return sentence;
  });
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
      answer: compareAll(place, median, states, national).join(' '),
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

export interface HighlightInput {
  place: string;
  area: AreaPay;
  /** Each state the area lies in, with every area that includes it. */
  states: { state: StatePay; areas: AreaPay[] }[];
  national: PayFigures;
  plural: string;
  /** Its rank among all metropolitan areas in the US. */
  nationalRank?: { rank: number; of: number };
  /** The nearest higher and lower paying metropolitan areas, with the states they lie in. */
  higher?: { name: string; states: string[] };
  lower?: { name: string; states: string[] };
}

/** Spread of pay: (top 10% − lowest 10%) as a share of the median. */
function spread(f: PayFigures): number | undefined {
  const [p10, mid, p90] = [numeric(f.annual.p10), numeric(f.annual.median), numeric(f.annual.p90)];
  return p10 !== undefined && mid !== undefined && p90 !== undefined && mid > 0 ? (p90 - p10) / mid : undefined;
}

/** Spread of the middle half: (75th − 25th percentile) as a share of the median. */
function middleSpread(f: PayFigures): number | undefined {
  const [p25, mid, p75] = [numeric(f.annual.p25), numeric(f.annual.median), numeric(f.annual.p75)];
  return p25 !== undefined && mid !== undefined && p75 !== undefined && mid > 0 ? (p75 - p25) / mid : undefined;
}

/**
 * "At a glance": short points worked out from this area's figures that set it
 * apart: where it sits among its state's areas, how wide its pay range is
 * compared with the national range, whether it has the most jobs in its
 * state, and whether the areas paying just above and below it are nearby.
 */
export function areaHighlights(input: HighlightInput): string[] {
  const { place, area, states, national, plural, higher, lower, nationalRank } = input;
  const points: string[] = [];

  for (const { state, areas } of states) {
    const where = placeName(state.name);
    const rank = areaRank(areas, area.code);
    if (!rank || rank.of < 2) continue;
    const third = rank.of / 3;
    points.push(
      rank.rank === 1
        ? `It is the highest paying area that includes ${where}.`
        : rank.rank === rank.of
          ? `It is the lowest paying area that includes ${where}.`
          : rank.rank <= third
            ? `It is among the higher paying areas that include ${where}.`
            : rank.rank > rank.of - third
              ? `It is among the lower paying areas that include ${where}.`
              : `It is near the middle of the areas that include ${where}.`,
    );
    const stateMedian = numeric(state.figures?.annual.median);
    const areaMedian = numeric(area.figures.annual.median);
    if (stateMedian !== undefined && areaMedian !== undefined) {
      const d = (areaMedian - stateMedian) / stateMedian;
      const of = state.kind === 'district' ? `the median for ${where}` : `the statewide median in ${where}`;
      points.push(
        Math.abs(d) <= 0.02
          ? `Its median is close to ${of}, within 2%.`
          : `Its median is ${Math.abs(d) > 0.1 ? 'well ' : ''}${d > 0 ? 'above' : 'below'} ${of}, by ${Math.abs(d) > 0.1 ? 'more than 10%' : 'between 2% and 10%'}.`,
      );
    }
    const jobs = (a: AreaPay) => numeric(a.figures.employment);
    const own = jobs(area);
    const counted = areas.filter((a) => jobs(a) !== undefined);
    if (own !== undefined && counted.length > 1) {
      const most = Math.max(...counted.map((a) => jobs(a)!));
      const fewest = Math.min(...counted.map((a) => jobs(a)!));
      const more = counted.filter((a) => jobs(a)! > own).length;
      if (own === most) points.push(`The survey counts more ${plural} here than in any other area that includes ${where}.`);
      else if (own === fewest) points.push(`The survey counts fewer ${plural} here than in any other area that includes ${where}.`);
      else if (more < counted.length / 3) points.push(`It is one of the larger areas that include ${where} by number of ${plural}.`);
      else if (more >= (counted.length * 2) / 3) points.push(`It is one of the smaller areas that include ${where} by number of ${plural}.`);
      else points.push(`It is a mid-sized area among those that include ${where}, by number of ${plural}.`);
    }
  }

  const median = numeric(area.figures.annual.median);
  const usMedian = numeric(national.annual.median);
  if (median !== undefined && usMedian !== undefined) {
    const d = (median - usMedian) / usMedian;
    points.push(
      Math.abs(d) <= 0.02
        ? 'Its median is close to the US median, within 2%.'
        : d > 0.1
          ? 'Its median is well above the US median, by more than 10%.'
          : d < -0.1
            ? 'Its median is well below the US median, by more than 10%.'
            : d > 0
              ? 'Its median is above the US median, by between 2% and 10%.'
              : 'Its median is below the US median, by between 2% and 10%.',
    );
  }

  if (nationalRank && nationalRank.of >= 4) {
    const share = nationalRank.rank / nationalRank.of;
    points.push(
      `It is in the ${
        share <= 0.25 ? 'top quarter' : share <= 0.5 ? 'second quarter' : share <= 0.75 ? 'third quarter' : 'bottom quarter'
      } of US metropolitan areas by median salary.`,
    );
  }

  const here = spread(area.figures);
  const us = spread(national);
  if (here !== undefined && us !== undefined) {
    const diff = here - us;
    points.push(
      Math.abs(diff) < 0.02
        ? 'The gap between the lowest-paid 10% and the top 10% is about as wide as it is nationally, compared with the median.'
        : diff > 0
          ? 'The gap between the lowest-paid 10% and the top 10% is wider than it is nationally, compared with the median.'
          : 'The gap between the lowest-paid 10% and the top 10% is narrower than it is nationally, compared with the median.',
    );
  }

  const mid = middleSpread(area.figures);
  const usMid = middleSpread(national);
  if (mid !== undefined && usMid !== undefined) {
    points.push(
      Math.abs(mid - usMid) < 0.02
        ? 'The middle half of salaries, between the lowest 25% and the top 25%, spans about the same range as nationally, compared with the median.'
        : `The middle half of salaries, between the lowest 25% and the top 25%, spans a ${mid > usMid ? 'wider' : 'narrower'} range than nationally, compared with the median.`,
    );
  }

  const own = new Set(area.states);
  const near = [higher, lower].filter((n): n is { name: string; states: string[] } => !!n);
  if (near.length) {
    const sameState = near.filter((n) => n.states.some((s) => own.has(s))).length;
    points.push(
      sameState === near.length
        ? `The ${near.length === 2 ? 'areas paying just above and just below it are' : 'nearest area by pay is'} in the same state.`
        : sameState === 0
          ? `The ${near.length === 2 ? 'areas paying just above and just below it are' : 'nearest area by pay is'} in other states.`
          : 'Of the areas paying just above and just below it, one is in the same state and one is not.',
    );
  }
  return points.map((p) => p.replace(/^It /, `${place} `).replace(/^Its median/, `The median salary in ${place}`).replace(/ here /, ` in ${place} `));
}
