/** Salaries by state, ranked before and after counting state price levels. */
import type { PriceData } from './types.ts';
import { adjustedSalary } from './adjust.ts';
import type { StatePay } from '../pay/types.ts';
import { numeric } from '../pay/format.ts';

export function priceLevelFor(data: PriceData, name: string): number | null | undefined {
  return data.states.find((s) => s.name === name)?.parity;
}

export interface CostOfLivingRow {
  name: string;
  median: number;
  parity: number;
  adjusted: number;
  /** Rank by median salary (highest = 1), among places with both figures. Ties share a rank. */
  rank: number;
  /** Rank by adjusted salary. */
  adjustedRank: number;
  /** Positive when the place moves up once prices are counted. */
  change: number;
}

function ranks(values: number[]): number[] {
  return values.map((v) => values.filter((x) => x > v).length + 1);
}

/**
 * Every state (and DC) with both a median salary and a price level, sorted by
 * adjusted salary, highest first, with both ranks and the change in rank.
 * Places without a statewide salary (Kansas) are left out, never estimated.
 */
export function costOfLivingTable(states: StatePay[], prices: PriceData): CostOfLivingRow[] {
  const rows = states.flatMap((s) => {
    const median = numeric(s.figures?.annual.median);
    const parity = priceLevelFor(prices, s.name);
    const adjusted = adjustedSalary(s.figures?.annual.median, parity);
    return median !== undefined && typeof parity === 'number' && adjusted !== undefined ? [{ name: s.name, median, parity, adjusted }] : [];
  });
  const byMedian = ranks(rows.map((r) => r.median));
  const byAdjusted = ranks(rows.map((r) => r.adjusted));
  return rows
    .map((r, i) => ({ ...r, rank: byMedian[i]!, adjustedRank: byAdjusted[i]!, change: byMedian[i]! - byAdjusted[i]! }))
    .sort((a, b) => b.adjusted - a.adjusted || a.name.localeCompare(b.name));
}

