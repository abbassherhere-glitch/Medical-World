/**
 * Pay per hour, week, month and year, from the official figures.
 *
 * - Per hour and per year: the official hourly and annual figures, as
 *   published.
 * - Per week: the official annual figure divided by 52, rounded to the
 *   nearest dollar. A calculation, not an official figure.
 * - Per month: the official annual figure divided by 12, rounded to the
 *   nearest dollar. A calculation, not an official figure.
 *
 * A figure the survey does not publish stays "not available": no
 * arithmetic is ever done on a missing figure. For a figure at or above the
 * survey's top pay level ("#"), the weekly and monthly results are worked out
 * from that published level and shown as "At least".
 */
import type { PayFigures, PayPercentiles, PayValue } from './types.ts';
import { TOP_PAY_LEVEL } from './symbols.ts';

export type Period = 'hour' | 'week' | 'month' | 'year';
export const PERIODS: readonly Period[] = ['hour', 'week', 'month', 'year'];

export const PERIOD_LABELS: Record<Period, string> = {
  hour: 'Per hour',
  week: 'Per week',
  month: 'Per month',
  year: 'Per year',
};

/** Periods that are calculated from the annual figure, not published. */
export const CALCULATED_PERIODS: readonly Period[] = ['week', 'month'];

/** The note shown wherever weekly or monthly figures appear. */
export const PERIOD_NOTE =
  'Weekly and monthly figures are calculated from the official annual figure (divided by 52 and by 12, rounded to the nearest dollar). The survey bases its annual figures on full-time, year-round work.';

export type PeriodAmount =
  | { kind: 'value'; amount: number; calculated: boolean }
  | { kind: 'atLeast'; amount: number; calculated: boolean }
  | { kind: 'missing' };

const DIVISOR = { week: 52, month: 12 } as const;

/**
 * One figure for one period. `key` is which figure, for example "median" or
 * "p10".
 */
export function payFor(figures: PayFigures | undefined, key: keyof PayPercentiles, period: Period): PeriodAmount {
  if (!figures) return { kind: 'missing' };
  if (period === 'hour') return fromValue(figures.hourly[key], TOP_PAY_LEVEL.hourly, false);
  const annual = figures.annual[key];
  if (period === 'year') return fromValue(annual, TOP_PAY_LEVEL.annual, false);
  const divisor = DIVISOR[period];
  if (typeof annual === 'number') return { kind: 'value', amount: Math.round(annual / divisor), calculated: true };
  if (annual?.symbol === '#') return { kind: 'atLeast', amount: Math.round(TOP_PAY_LEVEL.annual / divisor), calculated: true };
  return { kind: 'missing' };
}

function fromValue(value: PayValue | undefined, top: number, calculated: boolean): PeriodAmount {
  if (typeof value === 'number') return { kind: 'value', amount: value, calculated };
  if (value?.symbol === '#') return { kind: 'atLeast', amount: top, calculated };
  return { kind: 'missing' };
}

const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/** "$98,100", "$47.16", "At least $239,200" or "Not available". */
export function formatPeriodAmount(amount: PeriodAmount, period: Period): string {
  if (amount.kind === 'missing') return 'Not available';
  const text = period === 'hour' ? cents.format(amount.amount) : whole.format(amount.amount);
  return amount.kind === 'atLeast' ? `At least ${text}` : text;
}

/** The number in an amount, or undefined when it is missing or only "at least". */
export function exactAmount(amount: PeriodAmount): number | undefined {
  return amount.kind === 'value' ? amount.amount : undefined;
}
