/**
 * The site's single way to read pay figures. It loads the imported data for a
 * profession and applies the owner's overrides.
 */
import type { AreaPay, PayData, StatePay } from './types.ts';
import { applyOverrides, type Override } from './overrides.ts';
import { numeric } from './format.ts';
import overridesFile from '../../data/pay/overrides.json';

const files = import.meta.glob<PayData>(['../../data/pay/*.json', '!../../data/pay/overrides.json'], {
  eager: true,
  import: 'default',
});

const bySlug = new Map(
  Object.entries(files).map(([path, data]) => [path.replace(/^.*\/([^/]+)\.json$/, '$1'), data]),
);
const overrides = (overridesFile as { overrides: Override[] }).overrides;
const cache = new Map<string, PayData>();

/** Pay data for a profession, with overrides applied. Throws if there is none. */
export function getPayData(profession: string): PayData {
  const cached = cache.get(profession);
  if (cached) return cached;
  const data = bySlug.get(profession);
  if (!data) throw new Error(`No pay data for "${profession}". Run npm run import-pay.`);
  const result = applyOverrides(data, profession, overrides, [...bySlug.keys()]);
  cache.set(profession, result);
  return result;
}

export function hasPayData(profession: string): boolean {
  return bySlug.has(profession);
}

/** The 50 states and DC (territories left out), in alphabetical order. */
export function statesAndDc(data: PayData): StatePay[] {
  return data.states.filter((s) => s.kind !== 'territory');
}

export function findState(data: PayData, name: string): StatePay | undefined {
  return data.states.find((s) => s.name === name);
}

/** States sorted by annual median, highest first. States without a median go last. */
export function byMedianDescending<T extends { figures?: StatePay['figures'] }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const x = numeric(a.figures?.annual.median);
    const y = numeric(b.figures?.annual.median);
    if (x === undefined && y === undefined) return 0;
    if (x === undefined) return 1;
    if (y === undefined) return -1;
    return y - x;
  });
}

/** Areas that lie wholly or partly in a state, highest median first. */
export function areasInState(data: PayData, abbr: string): AreaPay[] {
  return byMedianDescending(data.areas.filter((a) => a.states.includes(abbr)));
}

/** The release in words, for example "Occupational Employment and Wage Statistics, May 2025". */
export function releaseName(data: PayData): string {
  return `${data.release.survey}, ${data.release.referencePeriod}`;
}

export type { PayData, StatePay, AreaPay } from './types.ts';
export * from './format.ts';
