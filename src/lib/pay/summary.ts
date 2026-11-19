/** Plain-English summaries worked out from the pay figures. */
import type { PayFigures, StatePay } from './types.ts';
import { formatAnnual, formatDollars, formatHourly, formatPercent, numeric } from './format.ts';

export interface Ranked {
  name: string;
  median: number;
}

/** States with a published annual median, highest first. */
export function rankByMedian(states: StatePay[]): Ranked[] {
  return states
    .map((s) => ({ name: s.name, median: numeric(s.figures?.annual.median) }))
    .filter((s): s is Ranked => s.median !== undefined)
    .sort((a, b) => b.median - a.median || a.name.localeCompare(b.name));
}

/** The highest and lowest paying states by median. Ties are listed together. */
export function highestAndLowest(states: StatePay[]): { highest: Ranked[]; lowest: Ranked[] } | undefined {
  const ranked = rankByMedian(states);
  if (ranked.length === 0) return undefined;
  const top = ranked[0]!.median;
  const bottom = ranked[ranked.length - 1]!.median;
  return {
    highest: ranked.filter((s) => s.median === top),
    lowest: ranked.filter((s) => s.median === bottom),
  };
}

/** A place name as it reads inside a sentence: "the District of Columbia", "Texas". */
export function placeName(name: string): string {
  return name === 'District of Columbia' ? 'the District of Columbia' : name;
}

/** Capitalizes the first letter, for a place name at the start of a sentence. */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Joins names as "A", "A and B" or "A, B and C", in sentence form. */
export function joinNames(names: string[]): string {
  const words = names.map(placeName);
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/**
 * One sentence comparing a place's annual median with the national one,
 * for example "The median pay in Texas is $1,140 (1.2%) higher than the
 * national median of $98,100." Returns undefined if either figure is missing.
 */
export function compareWithNational(place: string, local: PayFigures | undefined, national: PayFigures): string | undefined {
  const here = numeric(local?.annual.median);
  const us = numeric(national.annual.median);
  if (here === undefined || us === undefined) return undefined;
  const diff = here - us;
  place = placeName(place);
  if (diff === 0) return `The median pay in ${place} is the same as the national median of ${formatDollars(us)} a year.`;
  const direction = diff > 0 ? 'higher' : 'lower';
  return `The median pay in ${place} is ${formatDollars(Math.abs(diff))} a year (${formatPercent(diff / us)}) ${direction} than the national median of ${formatDollars(us)}.`;
}

/** "$98,100 a year, or $47.16 an hour" — or whichever half is published. */
export function medianInWords(figures: PayFigures): string {
  const year = numeric(figures.annual.median);
  const hour = numeric(figures.hourly.median);
  if (year !== undefined && hour !== undefined) return `${formatAnnual(year)} a year, or ${formatHourly(hour)} an hour`;
  if (year !== undefined) return `${formatAnnual(year)} a year`;
  if (hour !== undefined) return `${formatHourly(hour)} an hour`;
  return 'not available';
}
