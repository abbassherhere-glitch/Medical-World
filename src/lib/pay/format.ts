/** Turns pay figures into the words and numbers shown on the site. */
import type { PayValue } from './types.ts';
import { TOP_PAY_LEVEL } from './symbols.ts';

export const NOT_AVAILABLE = 'Not available';

/** The number in a figure, or undefined if the survey shows a symbol instead. */
export function numeric(value: PayValue | undefined): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const count = new Intl.NumberFormat('en-US');

export function formatDollars(amount: number): string {
  return dollars.format(amount);
}

/** Formats a yearly figure, for example "$98,100". */
export function formatAnnual(value: PayValue | undefined): string {
  if (typeof value === 'number') return dollars.format(value);
  if (value?.symbol === '#') return `At least ${dollars.format(TOP_PAY_LEVEL.annual)}`;
  return NOT_AVAILABLE;
}

/** Formats an hourly figure, for example "$47.16". */
export function formatHourly(value: PayValue | undefined): string {
  if (typeof value === 'number') return cents.format(value);
  if (value?.symbol === '#') return `At least ${cents.format(TOP_PAY_LEVEL.hourly)}`;
  return NOT_AVAILABLE;
}

/** Formats a number of jobs, for example "16,380". */
export function formatJobs(value: PayValue | undefined): string {
  return typeof value === 'number' ? count.format(value) : NOT_AVAILABLE;
}

/** Formats a percentage difference, for example "1.2%". */
export function formatPercent(fraction: number): string {
  return `${(Math.abs(fraction) * 100).toFixed(1)}%`;
}
