/**
 * Applies the owner's overrides from src/data/prices/overrides.json, in the
 * same way as the pay and outlook overrides. A mistake stops the build.
 */
import type { PriceData } from './types.ts';

export interface PriceOverride {
  /** A state name, for example "Texas", or "District of Columbia". */
  place: string;
  /** A price parity such as 97.5, or "Not available". */
  value: number | string;
  note?: string;
}

export function applyPriceOverrides(data: PriceData, overrides: PriceOverride[]): PriceData {
  const result: PriceData = structuredClone(data);
  for (const o of overrides) {
    const place = result.states.find((s) => s.name === o.place.trim());
    if (!place) throw new Error(`Price override names an unknown place "${o.place}". Use a state name or "District of Columbia".`);
    if (typeof o.value === 'number' && Number.isFinite(o.value) && o.value > 0) place.parity = o.value;
    else if (typeof o.value === 'string' && o.value.trim().toLowerCase() === 'not available') place.parity = null;
    else throw new Error(`Price override for ${o.place}: the value must be a positive number or "Not available".`);
  }
  return result;
}
