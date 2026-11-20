/**
 * Salary adjusted for state price levels. One shared helper, so every page
 * works the figure out the same way:
 *
 *   adjusted salary = official median annual salary ÷ (price parity ÷ 100),
 *   rounded to the nearest $10.
 *
 * It is never worked out when the salary is missing or carries a symbol
 * (for example Kansas, which has no statewide figure), or when the price
 * level is missing.
 */
import type { PayValue } from '../pay/types.ts';

export function adjustedSalary(median: PayValue | undefined, parity: number | null | undefined): number | undefined {
  if (typeof median !== 'number' || !Number.isFinite(median)) return undefined;
  if (typeof parity !== 'number' || !Number.isFinite(parity) || parity <= 0) return undefined;
  return Math.round(median / (parity / 100) / 10) * 10;
}

/** "10.7% above the national average", "13.1% below …" or "the same as …". */
export function priceLevelInWords(parity: number): string {
  const diff = parity - 100;
  if (Math.abs(diff) < 0.05) return 'the same as the national average';
  return `${Math.abs(diff).toFixed(1)}% ${diff > 0 ? 'above' : 'below'} the national average`;
}

export interface AdjustNoteInput {
  /** For example "May 2025". */
  payPeriod: string;
  /** For example 2024. */
  priceYear: number;
}

/** The note shown wherever an adjusted figure appears. */
export function adjustNote({ payPeriod, priceYear }: AdjustNoteInput): string {
  return `The adjusted salary is a calculation: the official median salary divided by the state's price level (where 100 is the national average), rounded to the nearest $10. The salary is from ${payPeriod} and the price levels are for ${priceYear}. Price levels are averages across a whole state, so they do not describe any one city or household.`;
}
