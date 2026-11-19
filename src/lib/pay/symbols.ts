/**
 * The survey's symbols, in one place. Both the import script and the site
 * read this file.
 *
 * Wording and limits are from the official notes in the national file of the
 * May 2025 release (oesm25nat.zip). Check them against the notes in each new
 * release, and update `TOP_PAY_LEVEL` if the limits change.
 */
import type { PaySymbol } from './types.ts';

/** Meaning of each symbol, as worded in the official notes. */
export const SYMBOL_MEANINGS: Record<PaySymbol, string> = {
  '*': 'Indicates that a wage estimate is not available.',
  '**': 'Indicates that an employment estimate is not available.',
  '#': 'Indicates a wage equal to or greater than $115.00 per hour or $239,200 per year.',
  '~': 'Indicates that the percent of establishments reporting the occupation is less than 0.5%.',
};

/**
 * The pay level at or above which the survey shows "#" instead of a figure.
 * The site shows such figures as "At least $239,200" (yearly) or
 * "At least $115.00" (hourly).
 */
export const TOP_PAY_LEVEL = {
  /** The release these limits belong to. */
  release: 'May 2025',
  hourly: 115.0,
  annual: 239200,
} as const;
