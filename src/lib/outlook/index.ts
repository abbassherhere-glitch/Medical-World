/**
 * The site's single way to read job outlook figures, with overrides applied.
 *
 * These come from the state projections, a different source from the pay
 * survey: they count jobs differently and for different years. Never mix the
 * two in one sentence or sum.
 */
import type { OutlookData, OutlookFigures, OutlookPlace, OutlookValue } from './types.ts';
import { applyOutlookOverrides, type OutlookOverride } from './overrides.ts';
import overridesFile from '../../data/outlook/overrides.json';

const files = import.meta.glob<OutlookData>(['../../data/outlook/*.json', '!../../data/outlook/overrides.json'], {
  eager: true,
  import: 'default',
});
const bySlug = new Map(Object.entries(files).map(([path, data]) => [path.replace(/^.*\/([^/]+)\.json$/, '$1'), data]));
const overrides = (overridesFile as { overrides: OutlookOverride[] }).overrides;
const cache = new Map<string, OutlookData>();

/** Outlook data for a profession, with overrides applied, or undefined if there is none. */
export function getOutlook(profession: string): OutlookData | undefined {
  if (cache.has(profession)) return cache.get(profession);
  const data = bySlug.get(profession);
  if (!data) return undefined;
  const result = applyOutlookOverrides(data, profession, overrides, [...bySlug.keys()]);
  cache.set(profession, result);
  return result;
}

export function findOutlookPlace(data: OutlookData, name: string): OutlookPlace | undefined {
  return data.places.find((p) => p.name === name);
}

export type { OutlookData, OutlookFigures, OutlookPlace, OutlookValue };
export * from './summary.ts';
