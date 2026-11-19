import type { PaySymbol, PayValue } from '../../src/lib/pay/types.ts';

/**
 * Meaning of each symbol used in the official files in place of a number,
 * as given in the survey's published field descriptions.
 */
export const SYMBOL_MEANINGS: Record<PaySymbol, string> = {
  '*': 'A wage estimate is not available.',
  '**': 'An employment estimate is not available.',
  '#': "The wage is at or above the survey's highest published pay level.",
  '~': 'Fewer than 0.5% of establishments reported this occupation.',
};

const SYMBOLS = new Set<string>(Object.keys(SYMBOL_MEANINGS));

/**
 * Reads one figure from a cell. Accepts plain numbers, numbers with thousands
 * commas ("1,234") and scientific notation ("1.2E-2"). Symbols are kept as
 * symbols. An empty cell, or anything else, stops the import with an error,
 * so a figure is never guessed.
 */
export function parseValue(raw: string | undefined, column: string, decimals: number): PayValue {
  const text = (raw ?? '').trim();
  if (SYMBOLS.has(text)) return { symbol: text as PaySymbol };

  const cleaned = text.replace(/,/g, '');
  if (cleaned === '' || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(cleaned)) {
    throw new Error(`Unexpected value "${text}" in column ${column}.`);
  }
  const factor = 10 ** decimals;
  return Math.round(Number(cleaned) * factor) / factor;
}

/** Reads the ANNUAL and HOURLY flag columns ("TRUE" or empty). */
export function parseFlag(raw: string | undefined, column: string): boolean {
  const text = (raw ?? '').trim().toUpperCase();
  if (text === '') return false;
  if (text === 'TRUE') return true;
  throw new Error(`Unexpected value "${raw}" in column ${column}.`);
}
