/**
 * "Common questions" for a state page, every answer worked out from that
 * state's own figures. A question the data cannot answer for a state is left
 * out rather than answered with something made up.
 */
import type { AreaPay, PayFigures, StatePay } from './types.ts';
import { formatAnnual, formatHourly, formatJobs, numeric } from './format.ts';
import { capitalize, compareWithNational, placeName, rankByMedian, rankInWords, rankOf } from './summary.ts';

export interface QuestionInput {
  state: StatePay;
  /** Every state and DC, for the ranking. */
  allStates: StatePay[];
  /** The areas that include this state. */
  areas: AreaPay[];
  /** The bordering states. */
  neighbors: StatePay[];
  national: PayFigures;
  /** For example "dental hygienists". */
  plural: string;
  /** For example "the May 2025 Occupational Employment and Wage Statistics survey". */
  survey: string;
}

export interface Question {
  question: string;
  answer: string;
}

interface Ranked {
  name: string;
  median: number;
}

function areaMedians(areas: AreaPay[]): Ranked[] {
  return areas
    .map((a) => ({ name: a.name, median: numeric(a.figures.annual.median) }))
    .filter((a): a is Ranked => a.median !== undefined)
    .sort((a, b) => b.median - a.median || a.name.localeCompare(b.name));
}

export function stateQuestions(input: QuestionInput): Question[] {
  const { state, allStates, areas, neighbors, national, plural, survey } = input;
  const where = placeName(state.name);
  const Where = capitalize(where);
  const figures = state.figures;
  const median = numeric(figures?.annual.median);
  const hourly = numeric(figures?.hourly.median);
  const byArea = areaMedians(areas);
  const questions: Question[] = [];

  // 1. How much they make.
  if (median !== undefined) {
    questions.push({
      question: `How much do ${plural} make in ${where}?`,
      answer: `The median pay for ${plural} in ${where} is ${formatAnnual(median)} a year${
        hourly !== undefined ? `, or ${formatHourly(hourly)} an hour` : ''
      }, according to ${survey}. Half earn more than this and half earn less. The lowest-paid 10% earn less than ${formatAnnual(
        figures?.annual.p10,
      )} a year and the top 10% earn more than ${formatAnnual(figures?.annual.p90)}.`,
    });
  } else {
    const range =
      byArea.length >= 2
        ? ` Median pay in the areas that include ${where} runs from ${formatAnnual(byArea[byArea.length - 1]!.median)} in ${
            byArea[byArea.length - 1]!.name
          } to ${formatAnnual(byArea[0]!.median)} in ${byArea[0]!.name}.`
        : byArea.length === 1
          ? ` The only area with published figures that includes ${where} is ${byArea[0]!.name}, with a median of ${formatAnnual(byArea[0]!.median)} a year.`
          : '';
    questions.push({
      question: `How much do ${plural} make in ${where}?`,
      answer: `${capitalize(survey)} has no statewide pay figures for ${plural} in ${where}.${range}`,
    });
  }

  // 2. Compared with the national median.
  const comparison = compareWithNational(state.name, figures, national);
  if (comparison) {
    questions.push({
      question: `How does pay in ${where} compare with the national median?`,
      answer:
        hourly !== undefined
          ? `${comparison} By the hour, the median is ${formatHourly(hourly)} in ${where}, against ${formatHourly(national.hourly.median)} nationally.`
          : comparison,
    });
  }

  // 3. Which area pays the most (needs at least two areas with figures).
  if (byArea.length >= 2) {
    const top = byArea[0]!;
    const bottom = byArea[byArea.length - 1]!;
    questions.push({
      question: `Which area in ${where} pays ${plural} the most?`,
      answer: `Of the ${byArea.length} areas that include ${where} with published figures, ${top.name} has the highest median pay, at ${formatAnnual(
        top.median,
      )} a year. The lowest is ${bottom.name}, at ${formatAnnual(bottom.median)}.`,
    });
  }

  // 4. How many work there.
  const jobs = numeric(figures?.employment);
  if (jobs !== undefined) {
    questions.push({
      question: `How many ${plural} work in ${where}?`,
      answer: `The survey counts ${formatJobs(jobs)} ${plural.replace(/s$/, '')} jobs in ${where}, out of ${formatJobs(national.employment)} in the US as a whole.`,
    });
  }

  // 5. How the state ranks.
  const rank = rankOf(allStates, state.name);
  if (rank) {
    questions.push({
      question: `How does ${where} rank for ${plural.replace(/s$/, '')} pay?`,
      answer: `${Where} ranks ${rankInWords(rank)} by median yearly pay, among the states and DC with published figures.`,
    });
  }

  // 6. Compared with bordering states.
  const near = rankByMedian(neighbors);
  if (near.length > 0) {
    const top = near[0]!;
    const bottom = near[near.length - 1]!;
    let answer: string;
    if (median === undefined) {
      answer = `There is no statewide figure for ${where} to compare. Among its neighbors, ${placeName(top.name)} has the highest median pay (${formatAnnual(top.median)} a year)${
        near.length > 1 ? ` and ${placeName(bottom.name)} the lowest (${formatAnnual(bottom.median)})` : ''
      }.`;
    } else if (near.every((n) => median > n.median)) {
      answer = `${Where} pays more than every state it borders. The highest-paying neighbor is ${placeName(top.name)}, at ${formatAnnual(top.median)} a year, against ${formatAnnual(median)} in ${where}.`;
    } else if (near.every((n) => median < n.median)) {
      answer = `${Where} pays less than every state it borders. The lowest-paying neighbor is ${placeName(bottom.name)}, at ${formatAnnual(bottom.median)} a year, against ${formatAnnual(median)} in ${where}.`;
    } else {
      answer = `Among the states that border ${where}, ${placeName(top.name)} has the highest median pay (${formatAnnual(top.median)} a year) and ${placeName(
        bottom.name,
      )} the lowest (${formatAnnual(bottom.median)}). ${Where} is in between, at ${formatAnnual(median)}.`;
    }
    questions.push({ question: `How does pay in ${where} compare with nearby states?`, answer });
  }

  return questions;
}
