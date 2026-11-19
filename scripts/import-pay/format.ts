import type { PayData } from '../../src/lib/pay/types.ts';

/**
 * Writes the data file in a compact but readable layout: one line per
 * state and per area, so a new release shows up as a clear line-by-line change.
 */
export function formatPayData(data: PayData): string {
  const list = (items: unknown[]) =>
    items.length ? `[\n${items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]` : '[]';
  const parts = [
    `  "occupation": ${JSON.stringify(data.occupation)}`,
    `  "release": ${JSON.stringify(data.release, null, 2).replace(/\n/g, '\n  ')}`,
    `  "symbols": ${JSON.stringify(data.symbols)}`,
    `  "national": ${JSON.stringify(data.national)}`,
    `  "states": ${list(data.states)}`,
    `  "areas": ${list(data.areas)}`,
  ];
  return `{\n${parts.join(',\n')}\n}\n`;
}
