/**
 * The site's single way to read state price levels (Regional Price Parities),
 * with overrides applied, and to compare salaries once prices are counted.
 */
import type { PriceData, PriceLevel } from './types.ts';
import { applyPriceOverrides, type PriceOverride } from './overrides.ts';
import raw from '../../data/prices/regional-price-parities.json';
import overridesFile from '../../data/prices/overrides.json';

let cache: PriceData | undefined;

export function getPrices(): PriceData {
  cache ??= applyPriceOverrides(raw as PriceData, (overridesFile as { overrides: PriceOverride[] }).overrides);
  return cache;
}

export type { PriceData, PriceLevel };
export * from './adjust.ts';
export * from './table.ts';
