/** Words and numbers for the job outlook, worked out from the figures. */
import type { OutlookData, OutlookFigures, OutlookPlace, OutlookValue } from './types.ts';

export const NOT_AVAILABLE = 'Not available';

/** The one-sentence explanation of "average openings a year". */
export const OPENINGS_NOTE =
  'Average openings a year are openings from growth and from workers who leave the occupation or the workforce.';

/** The note on rounding shown under outlook figures. */
export const ROUNDING_NOTE =
  'Job counts are rounded by the source. The percent change is the source’s own figure, so it may not match the rounded job counts exactly.';

const count = new Intl.NumberFormat('en-US');

export function formatCount(value: OutlookValue): string {
  return value === null ? NOT_AVAILABLE : count.format(value);
}

/** "+7%", "-1.7%", "0%". */
export function formatPercentChange(value: OutlookValue): string {
  if (value === null) return NOT_AVAILABLE;
  if (value === 0) return '0%';
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}%`;
}

/** The change in jobs, projected minus base, for example "+1,000" or "−50". */
export function jobChange(figures: OutlookFigures): OutlookValue {
  if (figures.baseJobs === null || figures.projectedJobs === null) return null;
  return figures.projectedJobs - figures.baseJobs;
}

export function formatJobChange(value: OutlookValue): string {
  if (value === null) return NOT_AVAILABLE;
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${count.format(Math.abs(value))}`;
}

/** Within this many percentage points of the national rate counts as "about the same". */
export const ABOUT_THE_SAME = 1;

export type Pace = 'faster' | 'slower' | 'same' | 'falling' | 'unknown';

/** How a place's projected growth compares with the national rate. */
export function pace(local: OutlookValue, national: OutlookValue): Pace {
  if (local === null || national === null) return 'unknown';
  if (local < 0) return 'falling';
  if (Math.abs(local - national) <= ABOUT_THE_SAME) return 'same';
  return local > national ? 'faster' : 'slower';
}

/** One plain sentence on how a place's projected growth compares with the nation's. */
export function outlookSentence(place: string, local: OutlookFigures | undefined, national: OutlookFigures, years: string): string {
  if (!local || local.percentChange === null) return `There is no published job projection for ${place} for ${years}.`;
  const p = pace(local.percentChange, national.percentChange);
  const us = formatPercentChange(national.percentChange);
  const here = formatPercentChange(local.percentChange);
  switch (p) {
    case 'falling':
      return `Jobs in ${place} are projected to fall by ${Math.abs(local.percentChange)}% from ${years}, while nationally they are projected to grow by ${us.replace('+', '')}.`;
    case 'faster':
      return `Jobs in ${place} are projected to grow faster than the national rate from ${years}: ${here} against ${us} nationally.`;
    case 'slower':
      return local.percentChange === 0
        ? `Jobs in ${place} are projected to stay about level from ${years} (${here}), while nationally they are projected to grow by ${us.replace('+', '')}.`
        : `Jobs in ${place} are projected to grow more slowly than the national rate from ${years}: ${here} against ${us} nationally.`;
    case 'same':
      return `Jobs in ${place} are projected to grow at about the same rate as the nation from ${years}: ${here} against ${us} nationally.`;
    default:
      return `There is no published national projection to compare ${place} with.`;
  }
}

/** Places with a published percent change, fastest growth first. Ties share a rank. */
export function rankByGrowth(places: OutlookPlace[]): { name: string; percentChange: number; rank: number }[] {
  const ranked = places
    .filter((p): p is OutlookPlace & { figures: { percentChange: number } } => p.figures.percentChange !== null)
    .map((p) => ({ name: p.name, percentChange: p.figures.percentChange }))
    .sort((a, b) => b.percentChange - a.percentChange || a.name.localeCompare(b.name));
  return ranked.map((r) => ({ ...r, rank: ranked.filter((o) => o.percentChange > r.percentChange).length + 1 }));
}

/** "2024 to 2034". */
export function projectionYears(data: OutlookData): string {
  return `${data.source.baseYear} to ${data.source.projectedYear}`;
}
